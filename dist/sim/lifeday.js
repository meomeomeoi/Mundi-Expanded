// [expanded] Profiles at runtime (rules in profile.ts): where a character with a profile is now (instead of
// upstream's routine), whether they are asleep, what the scene is told, and making profiles from the cards.
import { game, nowAbs } from '../core/store.js';
import { isScenario } from '../core/world.js';
import { isWeekend } from './time.js';
import { placeOn, extraRooms } from './places.js';
import { homeJobOf, onShift, npcOut } from './hometime.js';
import { charOf } from '../st/bridge.js';
import * as P from './profile.js';
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
const memo = new Map();
export function planOf(g, w, r, day) {
    const p = P.profileOf(G(g), r.avatar);
    if (!p)
        return null;
    const c = ctxFor(g, w, r, day);
    const key = JSON.stringify([day, r.avatar, p, c.own, c.common, c.dinner, c.dinnerAt, homeJobOf(r), npcOut(g)]);
    let plan = memo.get(key);
    if (!plan) {
        plan = P.dayPlan(p, c);
        if (memo.size > 400)
            memo.clear();
        memo.set(key, plan);
    }
    return plan;
}
export function slotAt(g, w, r, at) {
    if (!isScenario(w))
        return null;
    const plan = planOf(g, w, r, Math.floor(at / 1440));
    return plan ? plan[Math.floor((at % 1440) / 60)] : null;
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
    const day = Math.floor(at / 1440);
    return P.asleepAt(p, Math.floor((at % 1440) / 60), isWeekend(day));
}
/** For the scene: what the people here are doing, and the notes written for them. */
export function lifeLines(g, w, present) {
    if (!isScenario(w))
        return [];
    const now = nowAbs(g);
    const out = [];
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
    return out;
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
