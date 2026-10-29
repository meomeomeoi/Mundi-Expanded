// [expanded] Listening (Mundi Expanded 0.2.0.9): at a closed door (you, on purpose), through the walls (by themselves),
// and someone listening at your door (rarely: a nosy one, close to you or jealous). What you hear at a door is written
// by the mechanics model: mostly muffled sounds and scraps of words, never graphic. You may be caught, and so may they.
import { nowAbs, saveGame, toast } from '../core/store.js';
import { isScenario } from '../core/world.js';
import { personaName } from '../st/bridge.js';
import { onHour } from './hooks.js';
import { presentNotes } from './lifehooks.js';
import { presentAt, whereNow } from './people.js';
import { slotAt, ownRoom } from './lifeday.js';
import { floorsOn, floorOf } from './plan.js';
import { bondOf, bump } from './social.js';
import { profileOf, nosyOf, discreetOf } from './profile.js';
import { bondsOf, factsOfPair, applyChange, addFact, YOU } from './bonds.js';
import { learn, tieK, knows } from './knows.js';
import { MEET_MARK, caughtChance } from './secrets.js';
import { openTalk } from './consequences.js';
import * as L from './love.js';
const G = (g) => g;
const H = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
} h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const N = (g, a) => (a === YOU ? personaName() : g.cast[a]?.name ?? a);
const list = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
export const WALLS = [['thin', 'Thin', 1.8], ['normal', 'Ordinary', 1], ['thick', 'Thick', 0.4]];
export const wallsOf = (g) => (bondsOf(G(g)).walls ?? 'normal');
export const wallsK = (g) => WALLS.find(x => x[0] === wallsOf(g))[2];
/** Who is a neighbour of a room (the same floor with a floor plan; else every bedroom is). */
export function neighbours(g, w, room) {
    const f = floorsOn(w) ? floorOf(g, w, room) : '';
    return Object.values(g.cast).filter(r => { const at = whereNow(g, w, r); return at !== room && at.startsWith('home:') && (!f || floorOf(g, w, at) === f); });
}
/* ---------- you, at a door ---------- */
const LX = (g) => (g.listenx ??= {});
export const LISTEN_SYSTEM = 'You describe what a character hears through a closed door in an interactive fiction (a role-play between consenting adults). Mostly muffled sounds and scraps of words; never graphic; nothing you are not given. Plain prose only.';
/** The prompt: who is inside, what they are doing, what is going on between them. */
export function listenPrompt(g, w, loc) {
    const inside = presentAt(g, w, loc);
    const now = nowAbs(g);
    const doing = inside.map(r => { const s = slotAt(g, w, r, now); return `${r.name}: ${s?.asleep ? 'asleep' : s && MEET_MARK.test(s.act) ? `in secret with ${s.act.replace(/^quietly with /, '').replace(MEET_MARK, '')}` : s?.act ?? 'in the room'}`; });
    const between = inside.length >= 2 ? factsOfPair(G(g), inside[0].avatar, inside[1].avatar).slice(-3).map(f => f.text) : [];
    const night = g.nightsx?.now?.loc === loc;
    return [`${personaName()} stands at the closed door of ${inside.length ? `the room where ${list(inside.map(r => r.name))} ${inside.length > 1 ? 'are' : 'is'}` : 'a room'} and listens. It is ${String(Math.floor(g.minutes / 60)).padStart(2, '0')}:${String(g.minutes % 60).padStart(2, '0')}. The walls are ${wallsOf(g)}.`,
        `Inside: ${doing.join('; ') || 'quiet'}.${between.length ? ` Lately between them: ${between.join(' ')}` : ''}${night ? ' They are being intimate (say only that the sounds leave little doubt).' : ''}`,
        `Write 2 or 3 short sentences in the second person ("you hear…"): what ${personaName()} hears. Mostly muffled voices and sounds, at most one or two scraps of words in quotes; ${wallsOf(g) === 'thick' ? 'very little gets through' : wallsOf(g) === 'thin' ? 'more gets through than it should' : 'some of it gets through'}. Nothing graphic. If they are asleep: near silence.`].join('\n');
}
/** What you heard: knowledge, a note for the next scene, maybe being caught. Returns what to show. */
export function heard(g, w, loc, text) {
    const lx = LX(g);
    const now = nowAbs(g);
    const inside = presentAt(g, w, loc);
    lx.heard = { loc, text, at: now };
    const tries = (lx.tries ??= {});
    const key = `${g.day}|${loc}`;
    tries[key] = (tries[key] ?? 0) + 1;
    // a secret couple behind the door: you know now
    const ids = inside.map(r => r.avatar);
    for (const t of (G(g).living?.ties ?? []))
        if (t.secret && ids.includes(t.a) && ids.includes(t.b))
            learn(tieK(t), YOU, { lvl: 'knows', how: 'saw', day: g.day, ver: `heard ${N(g, t.a)} and ${N(g, t.b)} through ${N(g, t.a)}'s door` }, t);
    const awake = inside.filter(r => !slotAt(g, w, r, now)?.asleep);
    let caught = '';
    if (H(`${g.world}|${now}|${loc}|caught`) < caughtChance(awake.map(r => nosyOf(profileOf(g, r.avatar))), tries[key] - 1)) {
        const r = awake[Math.floor(H(`${now}|who`) * awake.length)];
        bump(g, r.avatar, -4);
        openTalk(g, r.avatar, YOU, `${N(g, YOU)} listening at their door`);
        addFact(G(g), [YOU, r.avatar], `${r.name} caught ${N(g, YOU)} listening at their door.`, 'episode', 'offscreen', -1, { pub: 'witnessed' });
        caught = `${r.name} opens the door and finds you right there.`;
    }
    saveGame();
    return { text, caught };
}
// the next scene knows what you just heard (half an hour)
presentNotes.push((g) => { const h = LX(g).heard; return h && nowAbs(g) - h.at <= 30 ? [`{{user}} has just listened at a closed door and heard: ${h.text}`] : []; });
/* ---------- keeping an eye on someone ---------- */
export function watch(g, who) { LX(g).watch = { who, until: nowAbs(g) + 180 }; saveGame(); }
export const watching = (g) => { const x = LX(g).watch; return x && x.until > nowAbs(g) ? x : null; };
onHour.push((g, w) => {
    if (!isScenario(w))
        return [];
    const x = watching(g);
    const r = x && g.cast[x.who];
    if (!x || !r)
        return [];
    const now = nowAbs(g);
    const at = whereNow(g, w, r);
    const s = slotAt(g, w, r, now);
    const room = at.startsWith('home:') ? (at === ownRoom(r) ? 'in their room' : `in ${N(g, at.slice(5) === 'player' ? YOU : at.slice(5))}'s room`) : `in the ${(w.places.find(p => p.id === at)?.name ?? at).toLowerCase()}`;
    let note = `You keep an eye on ${r.name}: ${room}${s && !MEET_MARK.test(s.act) ? `, ${s.act}` : ''}.`;
    if (s && MEET_MARK.test(s.act)) {
        for (const t of (G(g).living?.ties ?? []))
            if (t.secret && (t.a === r.avatar || t.b === r.avatar) && !knows(tieK(t), YOU)) {
                learn(tieK(t), YOU, { lvl: 'knows', how: 'saw', day: g.day, ver: `saw ${N(g, t.a)} and ${N(g, t.b)} slip into a room together` }, t);
                note = `You keep an eye on ${r.name}: ${r.name} slips ${room} and closes the door. ${N(g, t.a === r.avatar ? t.b : t.a)} is in there too.`;
            }
    }
    if (H(`${g.world}|${now}|${r.avatar}|spotted`) < 0.08 + nosyOf(profileOf(g, r.avatar)) / 500) {
        bump(g, r.avatar, -3);
        openTalk(g, r.avatar, YOU, `${N(g, YOU)} following them around`);
        LX(g).watch = undefined;
        note += ` ${r.name} notices you watching.`;
    }
    setTimeout(() => toast(note, 'info', { ms: 8000 }), 40);
    saveGame();
    return [];
});
/* ---------- someone at your door ---------- */
// Each hour, when someone is in your room with you: a housemate at home and awake may listen, rarely (a nosy one,
// close to you, or with feelings for you or for whoever is with you); at most once in ten days each.
onHour.push((g, w) => {
    if (!isScenario(w) || g.player.loc !== 'home:player')
        return [];
    const with_ = presentAt(g, w, 'home:player');
    if (!with_.length)
        return [];
    const lx = LX(g);
    const now = nowAbs(g);
    const on = (lx.on ??= {});
    for (const r of neighbours(g, w, 'home:player')) {
        if (with_.some(x => x.avatar === r.avatar) || slotAt(g, w, r, now)?.asleep || g.day - (on[r.avatar] ?? -99) < 10)
            continue;
        const nosy = nosyOf(profileOf(g, r.avatar)), disc = discreetOf(profileOf(g, r.avatar));
        const care = Math.max(L.feelings(G(g), r.avatar, YOU), ...with_.map(x => L.feelings(G(g), r.avatar, x.avatar)), g.romance?.[r.avatar]?.value ?? 0);
        const p = Math.max(0, (nosy - 45) / 55) * 0.02 * (1 + (bondOf(g, r.avatar) >= 50 ? 0.5 : 0) + (care >= 40 ? 2 : 0)) * (1 - disc / 200) * wallsK(g);
        if (H(`${g.world}|${now}|${r.avatar}|atyourdoor`) >= p)
            continue;
        on[r.avatar] = g.day;
        // they learn what you keep to yourselves in there
        const hide = bondsOf(G(g)).hide ?? {};
        for (const x of with_)
            if (hide[x.avatar])
                learn({ parts: [YOU, x.avatar], pub: 'private', know: hide[x.avatar].know, day: hide[x.avatar].day }, r.avatar, { lvl: 'knows', how: 'saw', day: g.day, ver: `listened at ${N(g, YOU)}'s door while ${x.name} was inside` }, hide[x.avatar]);
        if (g.nightsx?.now?.loc === 'home:player')
            applyChange(G(g), [r.avatar, ...with_.map(x => x.avatar)].slice(0, 3), 0, `${r.name} heard ${N(g, YOU)} and ${list(with_.map(x => x.name))} through the door.`, 'offscreen', { pub: 'private', seen: [r.avatar] });
        if (H(`${now}|${r.avatar}|youhear`) < 0.3) {
            (lx.caught ??= {})[r.avatar] = g.day;
            openTalk(g, YOU, r.avatar, `${r.name} listening at your door`);
            setTimeout(() => toast(`A floorboard creaks outside your door. ${r.name} was listening.`, 'warn', { ms: 9000 }), 40);
        }
        saveGame();
        break;
    }
    return [];
});
