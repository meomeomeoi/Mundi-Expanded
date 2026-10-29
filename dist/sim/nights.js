// [expanded] Nights and dates (Mundi Expanded 0.2.0.9). Mundi tracks the state around closeness; the scenes themselves
// are the main model's, with your preset.
//
//  - Sleeping over: a couple (theirs, or your partner with you) spend some nights in one room, in their day plans. A
//    secret one slips back to their own room early in the morning, and an early riser may see them.
//  - Nights together: from the night reader (scenes, yours too), and off-screen for couples who sleep over or meet in
//    secret. Neighbours may hear (the walls, how nosy they are); the next day the scene knows (easy or awkward, by how
//    they are with affection in front of others), and so does whoever heard.
//  - Moving in: your partner may move into your room (a double bed helps).
//  - A date at home: you ask the house for a room tonight; who agrees keeps away from it, who does not may stay or tease.
import { nowAbs, saveGame } from '../core/store.js';
import { isScenario } from '../core/world.js';
import { personaName } from '../st/bridge.js';
import { onDay, onHour } from './hooks.js';
import { planMods, presentNotes } from './lifehooks.js';
import { ownRoom, housePlan, commonRooms } from './lifeday.js';
import { partnersOf, romValue } from './romance.js';
import { bondOf } from './social.js';
import { liveTogether } from './living.js';
import { profileOf, nosyOf } from './profile.js';
import { addFact, bondsOf, YOU } from './bonds.js';
import { learn, clue, tieK, knows } from './knows.js';
import { neighbours, wallsK } from './listen.js';
import { flirtOn } from './love.js';
import { LOVE } from './secrets.js';
const G = (g) => g;
const H = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
} h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const N = (g, a) => (a === YOU ? personaName() : g.cast[a]?.name ?? a);
const list = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
export const STAYS = [['never', 'Never', 0], ['sometimes', 'Sometimes', 0.3], ['often', 'Often', 0.6]];
export const nightsOf = (g) => { const x = (g.nightsx ??= { log: [] }); x.log ??= []; return x; };
const stayK = (g) => STAYS.find(s => s[0] === (nightsOf(g).stay ?? 'sometimes'))[2];
const loveTies = (g) => (G(g).living?.ties ?? []).filter(t => LOVE.has(t.type) && g.cast[t.a] && g.cast[t.b]);
const hideOf = (g) => bondsOf(G(g)).hide ?? {};
/* ---------- sleeping over (in the plans) ---------- */
/** Tonight's sleepovers: [guest, host room], your partner with you included. */
export function sleepovers(g, day) {
    if (!flirtOn(G(g)))
        return [];
    const out = [];
    const k = stayK(g);
    if (!k)
        return out;
    for (const t of loveTies(g)) {
        if (ownRoom(g.cast[t.a]) === ownRoom(g.cast[t.b]))
            continue;
        if (H(`${g.world}|${day}|${t.a}|${t.b}|stay`) >= k * (t.secret ? 0.4 : 1))
            continue;
        const host = H(`${g.world}|${day}|${t.a}|host`) < 0.5 ? t.a : t.b;
        const guest = host === t.a ? t.b : t.a;
        out.push({ guest, room: ownRoom(g.cast[host]), secret: !!t.secret, host });
    }
    for (const a of partnersOf(g)) {
        const r = g.cast[a];
        if (!r || ownRoom(r) === 'home:player')
            continue;
        if (H(`${g.world}|${day}|${a}|youstay`) >= k * (romValue(g, a) >= 60 ? 1 : 0.6))
            continue;
        out.push({ guest: a, room: 'home:player', secret: !!hideOf(g)[a], host: YOU });
    }
    return out;
}
planMods.push((g, w, day, plan) => {
    if (!isScenario(w))
        return plan;
    const st = sleepovers(g, day);
    const d = nightsOf(g).date;
    if (!st.length && !(d && d.day === day))
        return plan;
    const out = { ...plan };
    for (const s of st) {
        const slots = out[s.guest];
        if (!slots)
            continue;
        const copy = [...slots];
        // the night's sleeping hours (evening and early morning), in the other room
        for (let h = 0; h < 24; h++)
            if (copy[h]?.asleep)
                copy[h] = { ...copy[h], loc: s.room };
        if (s.secret) {
            const wake = copy.findIndex((x, h) => h >= 4 && h <= 11 && !x.asleep);
            const back = Math.max(4, (wake < 0 ? 7 : wake) - 1);
            for (let h = back; h < 12 && copy[h]?.asleep; h++)
                copy[h] = { ...copy[h], loc: ownRoom(g.cast[s.guest]) };
        }
        out[s.guest] = copy;
    }
    if (d && d.day === day) { // a date at home: your date is there; who agreed keeps away
        const h0 = Math.floor(d.from / 60) % 24, h1 = Math.floor(d.to / 60) % 24;
        for (let h = h0; h < h1; h++) {
            if (out[d.with]?.[h] && !out[d.with][h].asleep) {
                out[d.with] = [...out[d.with]];
                out[d.with][h] = { kind: 'common', loc: d.room, act: `on a date with ${personaName()}`, asleep: false };
            }
            for (const a of d.away)
                if (out[a]?.[h]?.loc === d.room) {
                    out[a] = [...out[a]];
                    out[a][h] = { ...out[a][h], kind: 'room', loc: ownRoom(g.cast[a]), act: 'giving the house some space' };
                }
        }
    }
    return out;
});
/* ---------- nights together, and who hears ---------- */
/** A night together (the reader, or off-screen): neighbours may hear; secrets may come out. */
export function nightTogether(g, w, who, loc, secret) {
    const x = nightsOf(g);
    const day = g.day;
    if (x.log.some(n => n.day === day && n.who.every(a => who.includes(a))))
        return;
    const n = { day, who, loc, secret, heard: [] };
    for (const r of neighbours(g, w, loc)) {
        if (who.includes(r.avatar))
            continue;
        if (H(`${g.world}|${day}|${who.join()}|${r.avatar}|heard`) >= 0.12 * wallsK(g) * (0.5 + nosyOf(profileOf(g, r.avatar)) / 100))
            continue;
        n.heard.push(r.avatar);
        // what they learn: the secret couple, or your secret partner
        for (const t of loveTies(g))
            if (t.secret && who.includes(t.a) && who.includes(t.b))
                clue(tieK(t), r.avatar, day, t);
        for (const a of who) {
            const h = hideOf(g)[a];
            if (h && who.includes(YOU))
                learn({ parts: [YOU, a], pub: 'private', know: h.know, day: h.day }, r.avatar, { lvl: 'knows', how: 'saw', day, ver: 'heard them through the wall at night' }, h);
        }
    }
    x.log.push(n);
    x.log = x.log.filter(l => day - l.day <= 14).slice(-30);
}
// off-screen: couples who sleep over or meet in secret (about every other time)
onHour.push((g, w) => {
    if (!isScenario(w) || !flirtOn(G(g)) || Math.floor(g.minutes / 60) !== 23)
        return [];
    for (const s of sleepovers(g, g.day))
        if (s.host !== YOU && H(`${g.world}|${g.day}|${s.guest}|night`) < 0.5)
            nightTogether(g, w, [s.host, s.guest], s.room, false);
    const plan = housePlan(g, w, g.day);
    for (const t of loveTies(g).filter(t => t.secret)) {
        const s = plan[t.a]?.[23];
        if (s && s.loc === plan[t.b]?.[23]?.loc && s.loc.startsWith('home:') && H(`${g.world}|${g.day}|${t.a}|snight`) < 0.6)
            nightTogether(g, w, [t.a, t.b], s.loc, true);
    }
    saveGame();
    return [];
});
// the morning: a secret guest slipping back to their own room may be seen by an early riser
onHour.push((g, w) => {
    if (!isScenario(w))
        return [];
    const h = Math.floor(g.minutes / 60);
    if (h < 4 || h > 11)
        return [];
    const plan = housePlan(g, w, g.day);
    for (const s of sleepovers(g, g.day).filter(x => x.secret)) {
        const before = plan[s.guest]?.[h - 1], now = plan[s.guest]?.[h];
        if (!before || !now || before.loc !== s.room || now.loc === s.room)
            continue;
        const t = s.host === YOU ? null : loveTies(g).find(x => (x.a === s.guest && x.b === s.host) || (x.b === s.guest && x.a === s.host));
        const hd = s.host === YOU ? hideOf(g)[s.guest] : null;
        for (const r of Object.values(g.cast)) {
            if (r.avatar === s.guest || r.avatar === s.host || plan[r.avatar]?.[h]?.asleep !== false)
                continue;
            if (H(`${g.world}|${g.day}|${s.guest}|${r.avatar}|morning`) >= 0.08 * (0.5 + nosyOf(profileOf(g, r.avatar)) / 100))
                continue;
            const ver = `saw ${N(g, s.guest)} coming out of ${s.host === YOU ? `${N(g, YOU)}'s` : `${N(g, s.host)}'s`} room early in the morning`;
            if (t && !knows(tieK(t), r.avatar)) {
                const had = !!t.know?.[r.avatar];
                clue(tieK(t), r.avatar, g.day, t);
                if (!had && t.know?.[r.avatar])
                    t.know[r.avatar].ver = ver;
            }
            if (hd)
                learn({ parts: [YOU, s.guest], pub: 'private', know: hd.know, day: hd.day }, r.avatar, { lvl: 'suspects', how: 'saw', day: g.day, ver }, hd);
        }
    }
    return [];
});
/** The scene: who stayed the night here, last night's after (for the ones in it, and whoever heard), a date. */
presentNotes.push((g, w, present) => {
    if (!isScenario(w))
        return [];
    const out = [];
    const ids = present.map(r => r.avatar);
    const x = nightsOf(g);
    const hour = Math.floor(g.minutes / 60);
    for (const s of sleepovers(g, hour < 12 ? g.day - 1 : g.day))
        if (s.host === YOU && ids.includes(s.guest) && g.player.loc === 'home:player' && (hour >= 21 || hour < 11))
            out.push(`${N(g, s.guest)} is staying the night in {{user}}'s room${s.secret ? ' (a secret: they will slip out before the others are up)' : ''}.`);
    for (const n of x.log.filter(l => l.day === g.day - 1 || (l.day === g.day && hour < 12))) {
        const inIt = n.who.filter(a => a === YOU || ids.includes(a));
        if (inIt.length >= 2 && hour < 14) {
            const shy = n.who.some(a => a !== YOU && profileOf(g, a)?.pda === 'shy');
            out.push(`Last night ${list(n.who.map(a => (a === YOU ? '{{user}}' : N(g, a))))} spent the night together. ${ids.length > inIt.filter(a => a !== YOU).length ? (shy ? 'In front of the others this morning it is a little awkward.' : 'This morning there is an ease between them.') : ''}`.trim());
        }
        const heard = (n.heard ?? []).filter(a => ids.includes(a));
        if (heard.length && n.who.some(a => a === YOU || ids.includes(a)))
            out.push(`${list(heard.map(a => N(g, a)))} heard ${list(n.who.map(a => (a === YOU ? '{{user}}' : N(g, a))))} through the wall last night${n.secret ? ' (and now knows what they hid)' : ''}: ${heard.length > 1 ? 'they act' : 'acts'} as if nothing happened, or tease, by who they are.`);
    }
    const d = x.date;
    if (d && d.day === g.day && g.player.loc === d.room && nowAbs(g) % 1440 >= d.from && nowAbs(g) % 1440 < d.to)
        out.push(`A date at home: {{user}} and ${N(g, d.with)} have the ${(w.places.find(p => p.id === d.room)?.name ?? 'room').toLowerCase()} for the evening.${d.stay.filter(a => ids.includes(a)).length ? ` ${list(d.stay.filter(a => ids.includes(a)).map(a => N(g, a)))} did not leave (on purpose or not).` : ''}`);
    return out;
});
/* ---------- moving in, a date at home ---------- */
/** Asks your partner to move into your room: by how they feel. '' : yes; else their answer. */
export function askMoveIn(g, a) {
    const r = g.cast[a];
    if (!r)
        return 'Nobody to ask.';
    if (ownRoom(r) === 'home:player')
        return `${r.name} already lives with you.`;
    if (!partnersOf(g).includes(a))
        return `You are not together with ${r.name}.`;
    if (romValue(g, a) < 55 || bondOf(g, a) < 45)
        return `${r.name}: "I like having my own room for now. Ask me again later?"`;
    liveTogether(g, '__you', a);
    addFact(G(g), [YOU, a], `${r.name} moved into ${personaName()}'s room.`, 'episode', 'offscreen', undefined, { pub: 'public' });
    saveGame();
    return '';
}
export function moveOut(g, a) { const r = g.cast[a]; if (!r)
    return; delete r.homeWith; saveGame(); }
/** You ask the house for a room tonight (20:00–23:00 or from in two hours): who agrees keeps away. */
export function planDate(g, w, a, room) {
    const h0 = Math.max(20, Math.floor(g.minutes / 60) + 2);
    if (h0 > 22)
        return 'Too late for tonight.';
    const away = [], stay = [];
    for (const r of Object.values(g.cast)) {
        if (r.avatar === a)
            continue;
        const p = 0.55 + (bondOf(g, r.avatar) - 50) / 200 - (romValue(g, r.avatar) >= 40 ? 0.35 : 0); // someone with a crush on you is less keen
        (H(`${g.world}|${g.day}|${r.avatar}|date`) < p ? away : stay).push(r.avatar);
    }
    const d = { day: g.day, room, with: a, from: h0 * 60, to: Math.min(24, h0 + 3) * 60, away, stay };
    nightsOf(g).date = d;
    saveGame();
    return d;
}
export const dateRooms = (g, w) => commonRooms(g, w);
onDay.push((g, w) => { if (isScenario(w)) {
    const x = nightsOf(g);
    if (x.date && x.date.day < g.day)
        x.date = null;
} return []; });
