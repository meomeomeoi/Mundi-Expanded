// [expanded] The house's purchases (Home, a modern house; Mundi Expanded 0.2.0.7). Now and then someone proposes in the
// house chat to buy something from the fund: what the house lacks for everyone (a TV, board games, a coffee machine,
// speakers), or what they would like for their own room (harder to get through). Who is awake and home answers, by rules
// (furnish.ts voteOn: how they get along with whoever asks, whether they would use it, what it costs against the fund);
// the AI only words it. You answer with the buttons or in your own words; without you, it is decided a few hours later.
// You propose too, from the online shop ("Propose to the house"): the house answers at once. Bought: ordered from the
// fund (free with money off). Turned down for someone's own room: a little sourness between them and who said no.
import { nowAbs, notify, saveGame, toast, type Save } from '../core/store.js';
import { isScenario, type WorldDef } from '../core/world.js';
import { onHour } from './hooks.js';
import { personaName } from '../st/bridge.js';
import { bondsOf, pairKey, applyChange } from './bonds.js';
import { whereNow, OUT } from './people.js';
import { isSleeping } from './plans.js';
import { moneyOn, houseOf } from './money.js';
import * as P from './profile.js';
import * as C from './chats.js';
import * as F from './furnish.js';
import { write, nameOf, typeMs, flushChat } from './chatrun.js';
import { bondOf } from './social.js';
import { furnishOn, eraOf, houseRooms, roomName } from './furnishrun.js';
import { placeOrder, priceOfCat } from './orders.js';

const G = (g: Save) => g as unknown as F.GLike;
const H = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const pairValue = (g: Save, a: string, b: string) => bondsOf(g as any).pairs[pairKey(a, b)]?.v ?? 0;
const names = (g: Save, who: string[]) => { const n = who.map(a => nameOf(g, a)); return n.length <= 1 ? n.join('') : `${n.slice(0, -1).join(', ')} and ${n.at(-1)}`; };
const WAIT = 3 * 60;   // how long a proposal waits for your answer
export const PROP_FREQS: [NonNullable<F.FurnishX['propFreq']>, string, number][] = [['off', 'Never', 0], ['rare', 'Now and then', 0.15], ['sometimes', 'Often', 0.35]];
export const propFreqOf = (g: Save) => F.furnishOf(G(g)).propFreq ?? 'rare';
const fundOf = (g: Save) => (moneyOn(g as any) ? houseOf(g as any).fund : Infinity);
const priceText = (g: Save, p: F.Proposal) => (moneyOn(g as any) ? `${p.price}, from the house fund` : 'from the house');
const needsOf = (g: Save, a: string): F.Afford[] => [...new Set((P.profileOf(g as any, a)?.acts ?? []).map(x => x.needs ?? F.guessAfford(x.text)).filter(F.isAfford))];
// who in the house chat sees it now: awake, home (not out of the house)
const seeing = (g: Save, w: WorldDef, c: C.Chat, but: string) => { const now = nowAbs(g); return c.members.filter(a => a !== but && g.cast[a] && !isSleeping(g.cast[a], now) && whereNow(g, w, g.cast[a]) !== OUT); };
// asked lately (or on its way): not again for a week
const askedLately = (g: Save, cat: string, owner: F.Owner) => F.propsOf(G(g)).some(p => p.cat === cat && p.owner === owner && g.day - p.day < 7) || F.ordersOf(G(g)).some(o => o.cat === cat && o.state !== 'here' && o.owner === owner);

function votes(g: Save, w: WorldDef, c: C.Chat, p: F.Proposal) {
    const now = nowAbs(g); const cat = F.catOf(p.cat)!;
    for (const a of seeing(g, w, c, p.by)) {
        const v = F.voteOn({ forSelf: p.owner !== 'house', price: p.price, fund: fundOf(g), withProposer: p.by === 'player' ? bondOf(g, a) : pairValue(g, p.by, a),
            wants: cat.affords.some(x => needsOf(g, a).includes(x)), social: P.profileOf(g as any, a)?.social ?? 50 }, H(`${now}|${a}|${p.cat}|vote`));
        p.answers[a] = v.yes ? 'yes' : 'no'; if (!v.yes) p.why[a] = v.why;
    }
}
function newProp(g: Save, w: WorldDef, by: F.Owner, cat: string, room: string, owner: F.Owner): F.Proposal | null {
    const c = F.catOf(cat); if (!c) return null;
    const now = nowAbs(g);
    return { id: `pr${now}${by === 'player' ? 'y' : ''}`, by, cat, name: F.catName(c, eraOf(g)), room, owner, price: moneyOn(g as any) ? priceOfCat(g, c) : 0, day: g.day, until: now + WAIT, answers: {}, why: {}, state: 'open' };
}

/** Settles a proposal: bought (ordered from the fund), turned down, or short (the fund cannot pay now). The line said. */
function settle(g: Save, w: WorldDef, p: F.Proposal): string {
    if (p.state !== 'open') return '';
    const what = `${p.name.toLowerCase()} for ${p.owner === 'house' ? roomName(g, w, p.room).toLowerCase() : `${nameOf(g, p.owner)}'s room`}`;
    if (F.verdict(p) === 'yes') {
        const why = placeOrder(g, w, { cat: p.cat, room: p.room, owner: p.owner, pay: 'fund', by: p.by, prop: p.id });
        p.state = why ? 'short' : 'bought';
        return why ? `The house said yes to the ${what}, but: ${why.toLowerCase()}` : `The house decided: the ${what} is ordered${moneyOn(g as any) ? ' from the fund' : ''}.`;
    }
    p.state = 'rejected';
    const no = Object.keys(p.answers).filter(a => p.answers[a] === 'no');
    if (p.owner !== 'house' && p.by !== 'player' && no.length) applyChange(g as any, [p.by, ...no].slice(0, 3), -1, `${nameOf(g, p.by)} wanted a ${p.name.toLowerCase()} for their room from the house fund; ${names(g, no.slice(0, 2))} said no.`, 'offscreen', { pub: 'public' });   // in the house chat: everyone read it
    return `The house said no to the ${what}.`;
}
const keep = (g: Save) => { const x = F.furnishOf(G(g)); x.props = (x.props ?? []).filter(p => p.state === 'open' || g.day - p.day < 14).slice(-12); };

/** Someone proposes now (null: nothing to ask, nobody to ask it, or nobody to answer). */
export async function propose(g: Save, w: WorldDef): Promise<C.Msg[] | null> {
    if (!furnishOn(w) || F.propsOf(G(g)).some(p => p.state === 'open')) return null;
    const c = C.chatById(g as any, C.HOUSE); if (!c) return null;
    const now = nowAbs(g); const era = eraOf(g);
    const asking = c.members.filter(a => g.cast[a] && !isSleeping(g.cast[a], now) && whereNow(g, w, g.cast[a]) !== OUT && whereNow(g, w, g.cast[a]) !== g.player.loc);
    const items = F.furnishOf(G(g)).items;
    const want = F.pickWant(asking.map(a => ({ who: a, social: P.profileOf(g as any, a)?.social ?? 50, needs: needsOf(g, a), canDo: (x: F.Afford) => F.roomsFor(G(g), x, a).length > 0 })),
        (x) => items.some(i => i.owner === 'house' && F.affordsOf(i).includes(x)), era, (k) => H(`${now}|${k}`));
    if (!want) return null;
    const rooms = houseRooms(g, w); const cat = F.catOf(want.cat)!;
    const room = want.forSelf ? rooms.find(r => r.owner === want.by) : (rooms.find(r => !r.owner && r.kind === 'living' && cat.rooms.includes('living')) ?? rooms.find(r => !r.owner && r.kind && cat.rooms.includes(r.kind)));
    if (!room) return null;
    const owner = want.forSelf ? want.by : 'house';
    if (askedLately(g, want.cat, owner)) return null;
    const p = newProp(g, w, want.by, want.cat, room.id, owner)!;
    if (Number.isFinite(fundOf(g)) && p.price > fundOf(g) && H(`${now}|broke`) < 0.7) return null;   // mostly not asked when the fund cannot pay
    votes(g, w, c, p);
    F.propsOf(G(g)).push(p); keep(g);
    const by = g.cast[want.by].name; const answered = Object.keys(p.answers).slice(0, 4);
    const topic = `${by} proposes to buy ${want.forSelf ? `a ${p.name.toLowerCase()} for ${by}'s own room` : `a ${p.name.toLowerCase()} for the ${room.name.toLowerCase()}, for everyone`} (${priceText(g, p)}), and says why in a few words. Their answers are already decided: ${answered.length ? answered.map(a => `${g.cast[a].name} — ${p.answers[a] === 'yes' ? 'yes' : `no (${p.why[a]})`}`).join('; ') : 'nobody else has seen it yet'}. The others answer exactly that way, in their own words. ${personaName()} has not answered.`;
    const msgs = await write(g, w, c, [want.by, ...answered], topic, []);
    tell(g, c, msgs); return msgs;
}

/** You propose (from the shop): the house answers at once. The verdict line ('' when it could not be asked). */
export async function proposeByYou(g: Save, w: WorldDef, cat: string, room: string): Promise<string> {
    const c = C.chatById(g as any, C.HOUSE); if (!c || !furnishOn(w)) return '';
    if (F.propsOf(G(g)).some(p => p.state === 'open' && p.by === 'player')) return 'You already asked the house about something.';
    const p = newProp(g, w, 'player', cat, room, 'house'); if (!p) return '';
    if (Number.isFinite(fundOf(g)) && p.price > fundOf(g)) return 'Not enough in the house fund.';
    votes(g, w, c, p);
    const answered = Object.keys(p.answers).slice(0, 4);
    if (!answered.length) return 'Nobody is around to answer now (asleep, or out).';
    F.propsOf(G(g)).push(p); flushChat(c.id);
    C.post(c, C.ME, `How about we get a ${p.name.toLowerCase()} for the ${roomName(g, w, room).toLowerCase()}? ${moneyOn(g as any) ? `It's ${p.price}, from the house fund.` : ''}`.trim(), nowAbs(g));
    const line = settle(g, w, p); keep(g); saveGame(); notify();
    const topic = `${personaName()} proposed to buy a ${p.name.toLowerCase()} for the ${roomName(g, w, room).toLowerCase()} (${priceText(g, p)}). Their answers are already decided: ${answered.map(a => `${g.cast[a].name} — ${p.answers[a] === 'yes' ? 'yes' : `no (${p.why[a]})`}`).join('; ')}. They answer ${personaName()} exactly that way, in their own words${p.state === 'bought' ? '; it is settled: it is ordered' : p.state === 'rejected' ? '; most say no, so it is not bought' : ''}.`;
    void write(g, w, c, answered, topic, [], true).then(m => tell(g, c, m)).catch(e => console.warn('[Mundi Expanded] proposal', e));
    return line;
}

/** You answer a proposal (a button, or your words in the chat): it is settled now. The verdict line. */
export function answerProp(g: Save, w: WorldDef, id: string, yes: boolean): string {
    const p = F.propsOf(G(g)).find(x => x.id === id); if (!p || p.state !== 'open' || p.you) return '';
    p.you = yes ? 'yes' : 'no';
    const line = settle(g, w, p); saveGame(); notify(); return line;
}
/** The proposal waiting for your answer in the house chat (null: none). */
export const pendingProp = (g: Save, chatId: string) => (chatId !== C.HOUSE ? null : F.propsOf(G(g)).filter(p => p.state === 'open' && p.by !== 'player' && !p.you && p.until > nowAbs(g)).at(-1) ?? null);
export const propText = (g: Save, w: WorldDef, p: F.Proposal) => `${nameOf(g, p.by)}: a ${p.name.toLowerCase()} for ${p.owner === 'house' ? `the ${roomName(g, w, p.room).toLowerCase()}` : 'their room'}${moneyOn(g as any) ? ` · ${p.price}` : ''}`;

function tell(g: Save, c: C.Chat, msgs: C.Msg[]) {
    if (!msgs.length) return;
    saveGame(); notify();
    setTimeout(() => import('../ui/phone.js').then(({ P: ph }) => {
        if (!(ph.open && ph.app === 'gchat' && ph.who === c.id)) { if (ph.open) toast(`${c.name} · ${nameOf(g, msgs[0].by)}: ${msgs[0].text.slice(0, 70)}`, 'info'); else void import('../ui/peek.js').then(m => m.pushPeek({ title: `${nameOf(g, msgs[0].by)} · ${c.name}`, text: msgs[0].text, app: 'gchat', who: c.id })); }   // [expanded] 0.2.0.10: the phone buzzes
    }).catch(() => { /* no phone */ }), typeMs(msgs[0].text, true));
}

// Each hour: a proposal nobody answered for a while is settled without you; and on its hour, now and then, a new one.
onHour.push((g, w) => {
    if (!isScenario(w) || !furnishOn(w)) return [];
    const now = nowAbs(g); const out: string[] = [];
    for (const p of F.propsOf(G(g)).filter(x => x.state === 'open' && x.until <= now)) { const line = settle(g, w, p); if (line) out.push(line); }
    if (out.length) { saveGame(); setTimeout(() => toast(out.join(' '), 'info', { ms: 7000 }), 50); }
    const f = PROP_FREQS.find(x => x[0] === propFreqOf(g))![2];
    const h = Math.floor(g.minutes / 60);
    if (f && h === 11 + Math.floor(H(`${g.world}|${g.day}|prop|h`) * 9) && H(`${g.world}|${g.day}|prop`) < f) void propose(g, w).catch(e => console.warn('[Mundi Expanded] proposal', e));
    return [];
});
