// [expanded] Profiles at runtime (rules in profile.ts): where a character with a profile is now (instead of
// upstream's routine), whether they are asleep, what the scene is told, and making profiles from the cards.
import { game, nowAbs } from '../core/store.js';
import { isScenario, getWorld } from '../core/world.js';
import { isWeekend } from './time.js';
import { placeOn, extraRooms, isOuting } from './places.js';
import { whereNow, OUT } from './people.js';
import { homeJobOf, onShift, npcOut } from './hometime.js';
import { charOf, chatLore } from '../st/bridge.js';
import { eraPromptLine } from './era.js';
import * as P from './profile.js';
import { houseNotes, presentNotes } from './lifehooks.js';
import { textedLines } from './livelog.js';
import { bondsOf, pairKey } from './bonds.js';
const G = (g) => g;
const FREE_TAGS = ['leisure', 'food', 'sport', 'outdoor'];
/** The house's rooms where people spend time (this game's, not bathrooms or the laundry). */
export function commonRooms(g, w) {
    const ok = (p) => !p.link && !p.home && (p.tags ?? []).some(t => FREE_TAGS.includes(t));
    return [...w.places.filter(p => ok(p) && placeOn(g, w, p.id)), ...extraRooms(g).filter(p => ok(p))].map(p => ({ id: p.id, name: p.name }));
}
export const ownRoom = (r) => (r.homeWith === '__you' ? 'home:player' : r.homeWith ? `home:${r.homeWith}` : `home:${r.avatar}`);
const pick = (list, re) => list.find(p => re.test(p.id))?.id;
export function ctxFor(g, w, r, day) {
    const rooms = commonRooms(g, w);
    const lx = P.lifexOf(G(g));
    const j = homeJobOf(r);
    return {
        avatar: r.avatar, day, weekend: isWeekend(day), own: ownRoom(r), common: rooms.map(x => x.id),
        kitchen: pick(rooms, /kitchen/), dining: pick(rooms, /dining/), dinner: lx.dinner, dinnerAt: lx.dinnerAt,
        out: (h) => npcOut(g) && onShift(j, day * 1440 + h * 60),
    };
}
// How two characters get along (Mundi Expanded's pair value; 0 when unknown). Read without creating anything.
const pairValue = (g, a, b) => (bondsOf(g).pairs[pairKey(a, b)]?.v ?? 0);
const memo = new Map();
/** Everyone's day at once (each from their profile, then drawn to friends and away from enemies). */
export function housePlan(g, w, day) {
    const lx = P.lifexOf(G(g));
    const people = Object.values(g.cast).filter(r => lx.profiles[r.avatar]);
    if (!people.length)
        return {};
    const ctxs = people.map(r => ctxFor(g, w, r, day));
    const pairs = people.flatMap((a, i) => people.slice(i + 1).map(b => pairValue(g, a.avatar, b.avatar)));
    const key = JSON.stringify([day, people.map(r => [r.avatar, lx.profiles[r.avatar], homeJobOf(r)]), ctxs.map(c => [c.own, c.common]), lx.dinner, lx.dinnerAt, npcOut(g), pairs]);
    let plan = memo.get(key);
    if (!plan) {
        const base = Object.fromEntries(people.map((r, i) => [r.avatar, P.dayPlan(lx.profiles[r.avatar], ctxs[i])]));
        plan = P.adjustHouse(base, lx.profiles, (a, b) => pairValue(g, a, b), { day, weekend: isWeekend(day), own: Object.fromEntries(people.map((r, i) => [r.avatar, ctxs[i].own])), common: ctxs[0].common, names: Object.fromEntries(people.map(r => [r.avatar, r.name])) });
        if (memo.size > 60)
            memo.clear();
        memo.set(key, plan);
    }
    return plan;
}
export function planOf(g, w, r, day) {
    return housePlan(g, w, day)[r.avatar] ?? null;
}
export function slotAt(g, w, r, at) {
    if (!isScenario(w))
        return null;
    const plan = planOf(g, w, r, Math.floor(at / 1440));
    const s = plan ? plan[Math.floor((at % 1440) / 60)] : null;
    // woken up (by you): awake for a while, in their room
    return s?.asleep && (P.lifexOf(G(g)).woke?.[r.avatar] ?? 0) > at ? { ...s, asleep: false, kind: 'room', act: 'just woken up, groggy' } : s;
}
/** For upstream's routine: where they are (null: no profile, upstream's routine decides). */
export function lifeWhere(g, w, r, at) {
    const s = slotAt(g, w, r, at);
    return s ? s.loc : null;
}
/** For upstream's "is she asleep" (plans): null when this character has no profile. */
export function asleepNow(r, at) {
    const g = game();
    if (!g)
        return null;
    const p = P.profileOf(G(g), r.avatar);
    if (!p)
        return null;
    if ((P.lifexOf(G(g)).woke?.[r.avatar] ?? 0) > at)
        return false;
    const w = getWorld(g.world);
    const s = w && slotAt(g, w, r, at);
    return s ? s.asleep : P.asleepAt(p, Math.floor((at % 1440) / 60), isWeekend(Math.floor(at / 1440)));
}
/** For the scene: what the people here are doing, and the notes written for them. */
export function lifeLines(g, w, present) {
    if (!isScenario(w))
        return [];
    const now = nowAbs(g);
    const out = [];
    const era = eraPromptLine(g, !!chatLore());
    if (era)
        out.push(era);
    const roomName = (id) => w.places.find(p => p.id === id)?.name.toLowerCase() ?? extraRooms(g).find(p => p.id === id)?.name.toLowerCase() ?? '';
    const doing = present.map(r => {
        const s = slotAt(g, w, r, now);
        if (!s)
            return '';
        if (s.asleep)
            return `${r.name} is asleep in their room`;
        return `${r.name}: ${s.act} (${s.loc.startsWith('home:') ? 'in their own room' : `in the ${roomName(s.loc)}`})`;
    }).filter(Boolean);
    if (doing.length)
        out.push(`What they were doing when this moment began (it can change as the scene goes on): ${doing.join('; ')}.`);
    for (const r of present) {
        const p = P.profileOf(G(g), r.avatar);
        if (p?.ooc)
            out.push(`[OOC note about ${r.name}: ${p.ooc}]`);
    }
    const lx = P.lifexOf(G(g));
    if (lx.atDoor && lx.atDoor.until > now && present.some(r => r.avatar === lx.atDoor.avatar))
        out.push(`${g.cast[lx.atDoor.avatar]?.name} came to the door of their room to talk with {{user}} in the hallway, without inviting {{user}} in.`);
    if (lx.caught && lx.caught.until > now && present.some(r => r.avatar === lx.caught.avatar)) {
        const n = g.cast[lx.caught.avatar]?.name;
        out.push(`${n} has just come back to their own room and found {{user}} inside, uninvited.${lx.caught.text ? ` How ${n} takes it: ${lx.caught.text}` : ''}`);
    }
    if (lx.visit && lx.visit.until > now && present.some(r => r.avatar === lx.visit.avatar)) {
        const n = g.cast[lx.visit.avatar]?.name;
        out.push(`Late at night ${n} came to {{user}}'s door: ${n} ${lx.visit.reason}.${lx.visit.door ? ` They talk in the doorway (${n} has not been invited in).` : ` {{user}} let ${n} into their room.`}`);
    }
    for (const r of present) {
        const t = lx.woke?.[r.avatar];
        if (t && t > now && t - now > 60)
            out.push(`{{user}} has just woken ${r.name} up: ${r.name} was asleep and is still groggy.`);
    }
    for (const f of presentNotes)
        out.push(...f(g, w, present));
    out.push(...textedLines(g, present));
    const elsewhere = houseNow(g, w, present);
    if (elsewhere)
        out.push(elsewhere);
    return out;
}
/** Where everyone else in the house is right now (not when {{user}} is out of the house: they would not know). */
export function houseNow(g, w, present) {
    if (!isScenario(w) || isOuting(g.player.loc))
        return '';
    const here = new Set(present.map(r => r.avatar));
    const now = nowAbs(g);
    const roomName = (id) => w.places.find(p => p.id === id)?.name.toLowerCase() ?? extraRooms(g).find(p => p.id === id)?.name.toLowerCase() ?? '';
    const parts = Object.values(g.cast).filter(r => r.met && !here.has(r.avatar)).slice(0, 10).map(r => {
        for (const f of houseNotes) {
            const t = f(g, w, r);
            if (t)
                return t;
        }
        const loc = whereNow(g, w, r);
        const s = slotAt(g, w, r, now);
        if (loc === OUT || isOuting(loc))
            return `${r.name}: out of the house`;
        const where = loc === `home:${r.avatar}` || (s && loc === ownRoom(r)) ? 'in their room' : loc === 'home:player' ? "in {{user}}'s room" : loc.startsWith('home:') ? `in ${g.cast[loc.slice(5)]?.name ?? 'someone'}'s room` : `in the ${roomName(loc)}`;
        if (s?.asleep && loc === s.loc)
            return `${r.name}: asleep ${where}`;
        return `${r.name}: ${where}${s && loc === s.loc ? `, ${s.act}` : ''}`;
    });
    return parts.length ? `Elsewhere in the house right now (current; this overrides anything earlier in the chat about where they are): ${parts.join('; ')}.` : '';
}
/* ---------- making profiles ---------- */
export const cardText = (avatar) => { const c = charOf(avatar); return c ? [c.description, c.personality].filter(Boolean).join('\n').replace(/{{char}}/g, c.name) : ''; };
/** A profile for one character: the mechanics model (or the main one), or a guess from the card when that fails. */
export async function makeProfile(g, w, avatar, useModel = true) {
    const r = g.cast[avatar];
    const rooms = commonRooms(g, w);
    const ids = rooms.map(x => x.id);
    const text = cardText(avatar);
    if (useModel) {
        try {
            const { bgAsk } = await import('./regulator.js');
            const ans = await bgAsk(P.profilePrompt(r?.name ?? '', text, rooms), 400, P.PROFILE_SYSTEM);
            const p = P.parseProfile(ans, ids);
            if (p)
                return p;
        }
        catch (e) {
            console.warn('[Mundi Expanded] profile', e);
        }
    }
    return P.guessProfile(text, ids);
}
