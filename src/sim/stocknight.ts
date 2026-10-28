// [expanded] The runtime side of the house's things (rules in stock.ts): what your actions take, what the house
// eats each day, the story read for what happened to things (after each message with a mechanics model, otherwise
// at night), errands and grocery runs at night, coming back from a shop, and what is sent with each scene. Home only.
import { saveGame, toast, type Save } from '../core/store.js';
import { isScenario, type WorldDef } from '../core/world.js';
import { chat, personaName } from '../st/bridge.js';
import { onDay, onAction } from './hooks.js';
import { note } from './facts.js';
import { isMinor } from './family.js';
import { placeOf, playerHomeId } from './places.js';
import { onExchange, bgAsk, perMessage, markRead } from './regulator.js';
import * as S from './stock.js';

const G = (g: Save) => g as unknown as S.GLike;
const adults = (g: Save) => Object.values(g.cast).filter(r => !isMinor(g, r.avatar)).map(r => r.avatar);
const refresh = () => { void import('./prompt.js').then(m => m.refreshPrompt()); };
const ready = (g: Save, w: WorldDef) => { if (!isScenario(w)) return false; S.seed(G(g)); return true; };

// Each day: the housemates eat from the house (the notice says when it is empty).
onDay.push((g, w) => (ready(g, w) ? S.eatDay(G(g), g.day, adults(g)).map(c => c.text) : []));
// Your actions take what they need (checked before, see stockBlock).
onAction.push((g, w, a) => { if (ready(g, w)) S.doAction(G(g), a.id); });

/** Why an action cannot be done for want of food or coffee ('' when it can). */
export function stockBlock(g: Save, w: WorldDef, actionId: string): string {
    return ready(g, w) ? S.blockedBy(G(g), actionId) : '';
}

// What is around the player: the kitchen (fridge and pantry), or the bedroom they are in (and whoever shares it).
export function hereOf(g: Save, w: WorldDef): string[] {
    const loc = g.player.loc;
    if (loc.startsWith('home:')) {
        const who = loc.slice(5) === 'player' ? S.PLAYER : loc.slice(5);
        const mates = Object.values(g.cast).filter(r => { const hw = (r as any).homeWith; return who === S.PLAYER ? hw === '__you' : hw === who; }).map(r => r.avatar);
        return [who, ...mates].map(S.roomOf);
    }
    const p = placeOf(g, w, loc);
    return p && (/kitchen|кухн/i.test(`${p.id} ${p.name}`) || (p.tags ?? []).includes('food')) ? ['kitchen'] : [];
}
export function stockPromptLines(g: Save, w: WorldDef, present: string[]): string[] {
    if (!ready(g, w)) return [];
    return S.stockLines(G(g), hereOf(g, w), present);
}

// The story, read for what happened to things. `fallback`: may use the main model (at night only).
async function readLines(g: Save, text: string, fallback: boolean): Promise<S.Change[]> {
    if (!text.trim()) return [];
    const you = personaName();
    const raw = await bgAsk(S.readPrompt(G(g), text, you), 300, S.READ_SYSTEM, fallback);
    if (!raw) return [];
    return S.applyRead(G(g), S.parseRead(G(g), raw, you), you);
}
const asText = (lines: { name: string; user: boolean; text: string }[], cap: number) => {
    const you = personaName();
    let t = lines.map(l => `${l.user ? you : l.name}: ${l.text.slice(0, 600)}`).join('\n');
    if (t.length > cap) t = t.slice(-cap);
    return t;
};
const say = (list: S.Change[]) => { if (list.length) toast(`Things: ${list.map(c => c.text).join(' · ')}`, 'info', { ms: 7000 }); };

// After each message (with a mechanics model): the exchange that just ended.
onExchange.push(async (g, w, lines) => {
    if (!ready(g, w)) return;
    const changes = await readLines(g, asText(lines, 6000), false);
    if (changes.length) { saveGame(); refresh(); say(changes); }
});

// The night: what was not read yet (the whole day without a mechanics model; the last exchange with one), then the
// housemates' errands and, when food is low, a grocery run by one of them.
export async function stockNight(g: Save, w: WorldDef, day: number, range: { start: number; end: number }): Promise<string[]> {
    if (!ready(g, w)) return [];
    const st = S.stockOf(G(g)); if (st.lastNight === day) return [];
    const notes: string[] = [];
    const read = Number((g as any).regulator?.read ?? range.start);
    const from = perMessage() ? Math.max(range.start, Math.min(read, range.end)) : range.start;
    const lines = chat().slice(from, range.end).filter((m: any) => String(m?.mes ?? '').trim() && !m.extra?.mundi_diary)
        .map((m: any) => ({ name: String(m.name ?? ''), user: !!m.is_user, text: String(m.mes ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() }));
    if (lines.some(l => !l.user)) {
        try { notes.push(...(await readLines(g, asText(lines, 12000), true)).map(c => c.text)); }
        catch (e: any) { notes.push(`the day's things could not be read (${String(e?.message ?? e)})`); }
    }
    markRead(g, range.end);
    const you = personaName();
    const r = S.runErrands(G(g), day);
    for (const e of r.done) { notes.push(`${S.ownerName(G(g), e.by, you)} brought ${e.item} for ${S.ownerName(G(g), e.forWho, you)}`); note(g, '{0} brought {1} for {2}.', [S.ownerName(G(g), e.by, you), e.item, S.ownerName(G(g), e.forWho, you)], [e.by, e.forWho].filter(a => g.cast[a]), playerHomeId, 'life'); }
    for (const e of r.forgot) notes.push(`${S.ownerName(G(g), e.by, you)} forgot to bring ${e.item}`);
    for (const e of r.dropped) note(g, '{0} never brought {1} for {2}.', [S.ownerName(G(g), e.by, you), e.item, S.ownerName(G(g), e.forWho, you)], [e.by, e.forWho].filter(a => g.cast[a]), playerHomeId, 'life');
    const shop = S.houseShop(G(g), day, adults(g));
    if (shop) { const n = g.cast[shop.who]?.name ?? '?'; notes.push(`${n} did the grocery run`); note(g, '{0} did the grocery run for the house.', [n], [shop.who], playerHomeId, 'life'); }
    st.lastNight = day;
    saveGame();
    return notes;
}

// Back home from going out: from a shop, you bring the staples (and what you were asked to bring).
export function backHome(g: Save, w: WorldDef, where: string) {
    if (!ready(g, w) || !S.SHOP_PLACE.test(where)) return;
    const r = S.playerShopped(G(g));
    const you = personaName();
    const parts = [r.n ? 'groceries for the house' : '', ...r.errands.map(e => `${e.item} for ${S.ownerName(G(g), e.forWho, you)}`)].filter(Boolean);
    if (parts.length) toast(`You brought home ${parts.join(', ')}.`, 'success', { ms: 7000 });
    saveGame();
}
