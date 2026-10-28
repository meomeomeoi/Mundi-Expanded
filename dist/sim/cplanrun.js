// [expanded] The characters' own plans at runtime (rules in cplans.ts): made at midnight for the day, where they
// are while a plan lasts, what it leaves when it is over, their invitations to you, and their answers to yours.
import { nowAbs, saveGame, toast } from '../core/store.js';
import { isScenario } from '../core/world.js';
import { onDay, onHour } from './hooks.js';
import { bondOf, isPartner, social } from './social.js';
import { activeFeelings } from './life.js';
import { bondsOf, pairKey, applyChange } from './bonds.js';
import { routineAt, OUT } from './people.js';
import { isSleeping, isWorking, add as addAppt } from './plans.js';
import { outingId } from './places.js';
import { doAction } from './stock.js';
import { lex } from '../core/lexicon.js';
import { GRUDGE } from './doors.js';
import { personaName } from '../st/bridge.js';
import { slotAt, commonRooms } from './lifeday.js';
import { houseNotes, presentNotes } from './lifehooks.js';
import * as P from './profile.js';
import * as C from './cplans.js';
const G = (g) => g;
const H = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
} h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
export const cplansOf = (g) => { const lx = P.lifexOf(G(g)); return (lx.cplans ??= []); };
const pairValue = (g, a, b) => bondsOf(g).pairs[pairKey(a, b)]?.v ?? 0;
function recent(g, a, b) {
    const f = bondsOf(g).facts.filter(x => x.kind === 'episode' && x.day >= g.day - 2 && x.who.includes(a) && x.who.includes(b) && x.delta).at(-1);
    return f ? Math.sign(f.delta) : 0;
}
// Free at that hour of `day`: awake, in the house, not at work, not at the house's dinner.
export function freeAt(g, w, r, day, h) {
    const at = day * 1440 + h * 60 + 5;
    const s = slotAt(g, w, r, at);
    if (s)
        return s.kind === 'room' || s.kind === 'common';
    return !isSleeping(r, at) && !isWorking(w, r, at) && routineAt(g, w, r, at) !== OUT;
}
const yourBusy = (g) => (a, from, to) => social(g).appts.some(x => x.avatar === a && (x.state === 'set' || x.state === 'met') && x.from < to && from < x.to);
/** The day's plans (called at midnight; again by hand in tests). */
export function makeToday(g, w) {
    const day = g.day;
    const list = cplansOf(g);
    if (list.some(p => Math.floor(p.from / 1440) === day))
        return [];
    const people = Object.values(g.cast).filter(r => !(g.family?.kids ?? []).some((k) => k.avatar === r.avatar)).map(r => ({
        avatar: r.avatar, social: P.profileOf(G(g), r.avatar)?.social ?? 50, free: (h) => freeAt(g, w, r, day, h),
    }));
    const made = C.makeDayPlans({
        day, people, rooms: commonRooms(g, w).map(x => x.id), value: (a, b) => pairValue(g, a, b), recent: (a, b) => recent(g, a, b),
        likesYou: (a) => (g.cast[a]?.met ? bondOf(g, a) : 0), busy: yourBusy(g), roll: (k) => H(`${g.world}|${day}|${k}`),
    });
    list.push(...made);
    // old plans are forgotten after a few days
    const keep = list.filter(p => p.to > nowAbs(g) - 3 * 1440);
    list.length = 0;
    list.push(...keep);
    return made;
}
export const planNow = (g, avatar) => { const now = nowAbs(g); return cplansOf(g).find(p => p.state === 'set' && p.who.includes(avatar) && p.from <= now && now < p.to) ?? null; };
/** For upstream's whereNow: where their own plan puts them now (null: no plan). */
export function cplanWhere(g, w, r) {
    if (!isScenario(w))
        return null;
    const p = planNow(g, r.avatar);
    if (!p)
        return null;
    return p.out ? OUT : p.place;
}
const names = (g, who) => { const n = who.map(a => g.cast[a]?.name ?? '?'); return n.length <= 1 ? n.join('') : `${n.slice(0, -1).join(', ')} and ${n.at(-1)}`; };
// what they do, with where when it is not already said ("at the cinema" needs no "(the cinema)")
export const storyOf = (p) => { const a = C.cactOf(p.act); return p.out && !a.story.includes(p.out.replace(/^(a|the) /, '')) ? `${a.story} (${p.out})` : a.story; };
export const placeText = (g, w, p) => p.out ?? `the ${(w.places.find(x => x.id === p.place)?.name ?? p.place).toLowerCase()}`;
// At midnight: the day's plans.
onDay.push((g, w) => { if (isScenario(w))
    makeToday(g, w); return []; });
// Each hour: invitations go out (in the afternoon, a few hours before), plans that are over leave their mark.
onHour.push((g, w) => {
    if (!isScenario(w))
        return [];
    const now = nowAbs(g);
    const out = [];
    for (const p of cplansOf(g)) {
        if (p.state !== 'set')
            continue;
        if (p.invite && !p.asked && now >= Math.max(p.from - 240, Math.floor(p.from / 1440) * 1440 + 11 * 60) && now < p.from - 30 && g.cast[p.invite]) {
            p.asked = true;
            sendInvite(g, w, p);
            out.push(`${g.cast[p.invite].name} asks you along: ${C.cactOf(p.act)?.name.toLowerCase()} with ${names(g, p.who.filter(a => a !== p.invite))} (Calendar).`);
        }
        if (now >= p.to) {
            p.state = 'done';
            if (p.act === 'cook')
                doAction(g, 'cook');
            applyChange(g, p.who, 1, `${names(g, p.who)}: ${storyOf(p)}, and had a good time.`, 'offscreen');
        }
    }
    return out;
});
async function sendInvite(g, w, p) {
    const r = g.cast[p.invite];
    const a = C.cactOf(p.act);
    const others = names(g, p.who.filter(x => x !== p.invite));
    const at = `${String(Math.floor((p.from % 1440) / 60)).padStart(2, '0')}:00`;
    try {
        const { textFrom } = await import('./social.js');
        await textFrom(g, w, r.avatar, `${r.name} asks {{user}} to join ${r.name} and ${others}: ${a.story}, today at ${at} (${placeText(g, w, p)}). One short, casual ${lex(w, 'msgNoun')}.`, `${others} and I are doing ${a.name.toLowerCase()} at ${at}, want to come?`);
        social(g).unread[r.avatar] = (social(g).unread[r.avatar] ?? 0) + 1;
        saveGame();
    }
    catch { /* offline: the Calendar still shows it */ }
}
/* ---------- you join, or answer their invitation ---------- */
let joining = '';
/** You say yes: a plan with the one who asked (upstream's own: be there on time), and you are part of theirs. */
export function joinPlan(g, w, id) {
    const p = cplansOf(g).find(x => x.id === id);
    if (!p || p.state !== 'set')
        return 'That plan is over.';
    const host = p.invite && p.who.includes(p.invite) ? p.invite : p.who[0];
    joining = p.id;
    try {
        addAppt(g, host, p.out ? outingId(p.out) : p.place, p.from, 'hangout', false, C.cactOf(p.act)?.name ?? '');
    }
    finally {
        joining = '';
    }
    p.you = 'yes';
    const a = social(g).appts.at(-1);
    if (a)
        a.to = Math.max(a.to, p.to);
    return '';
}
export function declinePlan(g, id) { const p = cplansOf(g).find(x => x.id === id); if (p)
    p.you = 'no'; }
/** Upstream's add() just made a plan with you: their own plan at that time is called off (check() allowed it). */
export function afterYourPlan(g, a) {
    if (joining)
        return;
    const p = C.takenBy(cplansOf(g), a.avatar, a.from, a.to);
    if (!p)
        return;
    const rest = p.who.filter(x => x !== a.avatar);
    if (rest.length >= 2)
        p.who = p.who.filter(x => x !== a.avatar); // three of them: the other two still go
    else
        p.state = 'cancelled';
    if (rest.length) {
        applyChange(g, [a.avatar, ...rest].slice(0, 3), -1, `${g.cast[a.avatar]?.name} called off ${C.cactOf(p.act)?.name.toLowerCase()} with ${names(g, rest)} to spend the time with ${personaName() || 'you'} instead.`, 'offscreen');
        toast(`${g.cast[a.avatar]?.name} cancels on ${names(g, rest)} for you.`, 'info');
    }
}
/** For upstream's check(): their own reasons to say no to you (null: nothing against it). Pure: no changes. */
export function socialCheck(g, w, avatar, place, from, to, kind) {
    if (!isScenario(w))
        return null;
    const partner = isPartner(g, avatar);
    const p = C.takenBy(cplansOf(g), avatar, from, to);
    if (p) {
        const rest = p.who.filter(x => x !== avatar);
        const pv = Math.max(...rest.map(x => pairValue(g, avatar, x)));
        if (!C.outranks(bondOf(g, avatar), partner, pv))
            return { ok: false, why: `They already have plans with ${names(g, rest)} then (${C.cactOf(p.act)?.name.toLowerCase()}).${suggest(g, w, avatar, from, to)}` };
        return null;
    }
    const grudge = activeFeelings(g, avatar).some(f => GRUDGE.test(f.tag));
    const today = social(g).appts.some(x => x.avatar === avatar && (x.state === 'met') && Math.floor(x.from / 1440) === g.day);
    const homebody = (P.profileOf(G(g), avatar)?.social ?? 50) < 30;
    const why = C.softNo({ grudge, homebody, out: place.startsWith('out:'), planToday: today, partner, bond: bondOf(g, avatar) }, H(`${avatar}|${from}|soft`));
    return why ? { ok: false, why: `${why}${grudge ? '' : suggest(g, w, avatar, from, to)}` } : null;
}
// Another time that would suit them (later that day, or the next day at the same hour).
function suggest(g, w, avatar, from, to) {
    const r = g.cast[avatar];
    if (!r)
        return '';
    const len = Math.max(60, to - from), day = Math.floor(from / 1440), h0 = Math.floor((from % 1440) / 60);
    const ok = (d, h) => Array.from({ length: Math.ceil(len / 60) }, (_, k) => h + k).every(x => x < 24 && freeAt(g, w, r, d, x))
        && !C.takenBy(cplansOf(g), avatar, d * 1440 + h * 60, d * 1440 + h * 60 + len);
    for (let h = h0 + 2; h <= 21; h++)
        if (ok(day, h))
            return ` Maybe later that day, at ${String(h).padStart(2, '0')}:00?`;
    if (ok(day + 1, h0))
        return ` Maybe tomorrow at the same time?`;
    return '';
}
/* ---------- for the scene ---------- */
/** People here in a plan of their own: what they are doing (you walked in on it, or joined it). */
export function cplanLines(g, w, present) {
    const seen = new Set();
    const out = [];
    for (const r of present) {
        const p = planNow(g, r.avatar);
        if (!p || seen.has(p.id))
            continue;
        seen.add(p.id);
        out.push(`${names(g, p.who)} have a plan of their own right now: ${storyOf(p)}${p.out ? '' : ` (${placeText(g, w, p)})`}.${p.you === 'yes' ? ' They asked {{user}} along, and {{user}} came.' : ' {{user}} was not part of it.'}`);
    }
    return out;
}
// what the house line and the scene say about them
houseNotes.push((g, w, r) => { const p = planNow(g, r.avatar); if (!p)
    return null; const others = names(g, p.who.filter(x => x !== r.avatar)); return p.out ? `${r.name}: out of the house with ${others}, ${storyOf(p)}` : `${r.name}: in the ${(w.places.find(x => x.id === p.place)?.name ?? p.place).toLowerCase()} with ${others}, ${storyOf(p)}`; });
presentNotes.push(cplanLines);
