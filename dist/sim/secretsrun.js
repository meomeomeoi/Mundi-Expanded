// [expanded] Secrets at runtime (Relationships 2.0, part 2; rules in secrets.ts and knows.ts): secret couples meet in
// the evening (in their day plans), whoever is at home may notice (each hour), and the rest of the house is told the
// cover story ("in her room"). Being in a bedroom with both of them is seeing it. You are one of the people who may
// notice: a suspicion first, then knowing.
import { saveGame, toast } from '../core/store.js';
import { isScenario } from '../core/world.js';
import { onHour } from './hooks.js';
import { planMods, houseNotes } from './lifehooks.js';
import { ownRoom, housePlan } from './lifeday.js';
import { isOuting } from './places.js';
import { profileOf, discreetOf, nosyOf } from './profile.js';
import { YOU, tieWord } from './bonds.js';
import { react } from './consequences.js';
import { clue, learn, tieK, knows } from './knows.js';
import { LOVE, meetsFor, withMeets, accessTo, noticeChance, careOf, MEET_MARK } from './secrets.js';
const H = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
} h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const tiesOf = (g) => (g.living?.ties ?? []);
/** The secret couples among the characters. */
export const secretCouples = (g) => tiesOf(g).filter(t => t.secret && LOVE.has(t.type) && g.cast[t.a] && g.cast[t.b]);
const tieOfPair = (g, a, b) => tiesOf(g).find(t => (t.a === a && t.b === b) || (t.a === b && t.b === a));
const foundOf = (g, t) => ({ id: `t:${t.a}|${t.b}`, parts: [t.a, t.b], text: tieWord(t, (a) => name(g, a)), love: LOVE.has(t.type), k: tieK(t) });
const roomOf = (g, a) => (g.cast[a] ? ownRoom(g.cast[a]) : '');
const name = (g, a) => (a === YOU ? 'you' : g.cast[a]?.name ?? a);
// the evening's meetings, in the day plans
const meetsMemo = new Map();
function meetsOn(g, day, plan) {
    const cs = secretCouples(g);
    if (!cs.length)
        return [];
    const k = `${g.world}|${day}|${cs.map(t => `${t.a}${t.b}`).join(',')}`;
    let m = meetsMemo.get(k);
    if (!m) {
        m = meetsFor(cs.map(t => ({ a: t.a, b: t.b })), plan, day, (x) => H(`${g.world}|${x}`), (a) => roomOf(g, a));
        if (meetsMemo.size > 30)
            meetsMemo.clear();
        meetsMemo.set(k, m);
    }
    return m;
}
planMods.push((g, w, day, plan) => (isScenario(w) ? withMeets(plan, meetsOn(g, day, plan), (a) => name(g, a)) : plan));
// the rest of the house hears the cover story: in their own room
houseNotes.push((g, w, r) => {
    if (!isScenario(w))
        return null;
    const s = housePlan(g, w, g.day)[r.avatar]?.[Math.floor(g.minutes / 60)];
    return s && MEET_MARK.test(s.act) ? `${r.name}: in their room` : null;
});
/** Someone noticed (a clue): a suspicion, or knowing with a second one. Returns what they have now. */
function noticed(g, t, who, what) {
    const r = clue(tieK(t), who, g.day, t);
    if (r) {
        const k = t.know[who];
        k.ver = what;
    }
    if (r === 'knows')
        react(g, foundOf(g, t), who); // what finding out does (consequences.ts)
    if (r && who === YOU)
        setTimeout(() => toast(r === 'knows' ? `You are sure now: ${what.replace(/^saw /, '')}. ${name(g, t.a)} and ${name(g, t.b)} are together, and keep it to themselves.` : `You noticed something: ${what.replace(/^saw /, 'you saw ')}.`, 'info', { ms: 9000 }), 60);
    return r;
}
// each hour: a meeting now may be noticed by whoever is at home (you too)
onHour.push((g, w) => {
    if (!isScenario(w))
        return [];
    const hour = Math.floor(g.minutes / 60);
    const plan = housePlan(g, w, g.day);
    const meets = meetsOn(g, g.day, plan).filter(m => m.hour === hour);
    if (!meets.length)
        return [];
    let changed = false;
    for (const m of meets) {
        const t = tieOfPair(g, m.host, m.guest);
        if (!t)
            continue;
        const care = careOf(discreetOf(profileOf(g, m.host)), discreetOf(profileOf(g, m.guest)));
        const what = `saw ${name(g, m.guest)} slipping out of ${name(g, m.host)}'s room late at night`;
        for (const r of Object.values(g.cast)) {
            if (r.avatar === m.host || r.avatar === m.guest || knows(tieK(t), r.avatar))
                continue;
            const shares = ownRoom(r) === m.room;
            const p = noticeChance(accessTo(plan[r.avatar]?.[hour], m.room, shares), nosyOf(profileOf(g, r.avatar)), care);
            if (H(`${g.world}|${g.day}|${hour}|${r.avatar}|${m.host}|notice`) < p)
                changed = !!noticed(g, t, r.avatar, shares ? `saw ${name(g, m.guest)} and ${name(g, m.host)} together in their room late at night` : what) || changed;
        }
        // you: where you are now (asleep, out, in your room, about the house)
        if (!knows(tieK(t), YOU)) {
            const loc = g.player.loc;
            const me = isOuting(loc) || loc === 'out' ? null : { kind: loc.startsWith('home:') ? 'room' : 'common', loc, act: '', asleep: !!g.asleep };
            const p = loc === m.room ? 1 : noticeChance(accessTo(me, m.room, false), 50, care);
            if (H(`${g.world}|${g.day}|${hour}|you|${m.host}|notice`) < p)
                changed = !!noticed(g, t, YOU, what) || changed;
        }
    }
    if (changed)
        saveGame();
    return [];
});
/** A line of the scene with both of a secret couple in a bedroom with you (and whoever else is there): seen. */
export function sawTogether(g, here, loc) {
    if (!loc.startsWith('home:'))
        return;
    for (const t of secretCouples(g)) {
        if (!here.includes(t.a) || !here.includes(t.b))
            continue;
        for (const x of [YOU, ...here.filter(a => a !== t.a && a !== t.b)])
            if (learn(tieK(t), x, { lvl: 'knows', how: 'saw', day: g.day, ver: `saw ${name(g, t.a)} and ${name(g, t.b)} together in a bedroom` }, t)) {
                if (x === YOU)
                    toast(`${name(g, t.a)} and ${name(g, t.b)}: now you know.`, 'info');
                else
                    react(g, foundOf(g, t), x);
            }
    }
}
