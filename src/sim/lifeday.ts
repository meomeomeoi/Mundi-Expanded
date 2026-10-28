// [expanded] Profiles at runtime (rules in profile.ts): where a character with a profile is now (instead of
// upstream's routine), whether they are asleep, what the scene is told, and making profiles from the cards.
import { game, nowAbs, type Save, type Resident } from '../core/store.js';
import { isScenario, type WorldDef } from '../core/world.js';
import { isWeekend } from './time.js';
import { placeOn, extraRooms } from './places.js';
import { homeJobOf, onShift, npcOut } from './hometime.js';
import { charOf } from '../st/bridge.js';
import * as P from './profile.js';

const G = (g: Save) => g as unknown as P.GLike;
const FREE_TAGS = ['leisure', 'food', 'sport', 'outdoor'];
/** The house's rooms where people spend time (this game's, not bathrooms or the laundry). */
export function commonRooms(g: Save, w: WorldDef): { id: string; name: string }[] {
    const ok = (p: { id: string; link?: string; tags?: string[]; home?: boolean }) => !p.link && !(p as any).home && (p.tags ?? []).some(t => FREE_TAGS.includes(t));
    return [...w.places.filter(p => ok(p as any) && placeOn(g, w, p.id)), ...extraRooms(g).filter(p => ok(p as any))].map(p => ({ id: p.id, name: p.name }));
}
export const ownRoom = (r: Resident) => ((r as any).homeWith === '__you' ? 'home:player' : (r as any).homeWith ? `home:${(r as any).homeWith}` : `home:${r.avatar}`);
const pick = (list: { id: string }[], re: RegExp) => list.find(p => re.test(p.id))?.id;

export function ctxFor(g: Save, w: WorldDef, r: Resident, day: number): P.DayCtx {
    const rooms = commonRooms(g, w); const lx = P.lifexOf(G(g)); const j = homeJobOf(r);
    return {
        avatar: r.avatar, day, weekend: isWeekend(day), own: ownRoom(r), common: rooms.map(x => x.id),
        kitchen: pick(rooms, /kitchen/), dining: pick(rooms, /dining/), dinner: lx.dinner, dinnerAt: lx.dinnerAt,
        out: (h) => npcOut(g) && onShift(j, day * 1440 + h * 60),
    };
}
const memo = new Map<string, P.Slot[]>();
export function planOf(g: Save, w: WorldDef, r: Resident, day: number): P.Slot[] | null {
    const p = P.profileOf(G(g), r.avatar); if (!p) return null;
    const c = ctxFor(g, w, r, day);
    const key = JSON.stringify([day, r.avatar, p, c.own, c.common, c.dinner, c.dinnerAt, homeJobOf(r), npcOut(g)]);
    let plan = memo.get(key);
    if (!plan) { plan = P.dayPlan(p, c); if (memo.size > 400) memo.clear(); memo.set(key, plan); }
    return plan;
}
export function slotAt(g: Save, w: WorldDef, r: Resident, at: number): P.Slot | null {
    if (!isScenario(w)) return null;
    const plan = planOf(g, w, r, Math.floor(at / 1440));
    return plan ? plan[Math.floor((at % 1440) / 60)] : null;
}
/** For upstream's routine: where they are (null: no profile, upstream's routine decides). */
export function lifeWhere(g: Save, w: WorldDef, r: Resident, at: number): string | null {
    const s = slotAt(g, w, r, at); return s ? s.loc : null;
}
/** For upstream's "is she asleep" (plans): null when this character has no profile. */
export function asleepNow(r: Resident, at: number): boolean | null {
    const g = game(); if (!g) return null;
    const p = P.profileOf(G(g), r.avatar); if (!p) return null;
    const day = Math.floor(at / 1440);
    return P.asleepAt(p, Math.floor((at % 1440) / 60), isWeekend(day));
}

/** For the scene: what the people here are doing, and the notes written for them. */
export function lifeLines(g: Save, w: WorldDef, present: Resident[]): string[] {
    if (!isScenario(w)) return [];
    const now = nowAbs(g); const out: string[] = [];
    const roomName = (id: string) => w.places.find(p => p.id === id)?.name.toLowerCase() ?? extraRooms(g).find(p => p.id === id)?.name.toLowerCase() ?? '';
    const doing = present.map(r => {
        const s = slotAt(g, w, r, now); if (!s) return '';
        if (s.asleep) return `${r.name} is asleep in their room`;
        return `${r.name}: ${s.act} (${s.loc.startsWith('home:') ? 'in their own room' : `in the ${roomName(s.loc)}`})`;
    }).filter(Boolean);
    if (doing.length) out.push(`What they were doing when this moment began (it can change as the scene goes on): ${doing.join('; ')}.`);
    for (const r of present) { const p = P.profileOf(G(g), r.avatar); if (p?.ooc) out.push(`[OOC note about ${r.name}: ${p.ooc}]`); }
    return out;
}

/* ---------- making profiles ---------- */

export const cardText = (avatar: string) => { const c: any = charOf(avatar); return c ? [c.description, c.personality].filter(Boolean).join('\n').replace(/{{char}}/g, c.name) : ''; };
/** A profile for one character: the mechanics model (or the main one), or a guess from the card when that fails. */
export async function makeProfile(g: Save, w: WorldDef, avatar: string, useModel = true): Promise<P.Profile> {
    const r = g.cast[avatar]; const rooms = commonRooms(g, w); const ids = rooms.map(x => x.id);
    const text = cardText(avatar);
    if (useModel) {
        try {
            const { bgAsk } = await import('./regulator.js');
            const ans = await bgAsk(P.profilePrompt(r?.name ?? '', text, rooms), 400, P.PROFILE_SYSTEM);
            const p = P.parseProfile(ans, ids); if (p) return p;
        } catch (e) { console.warn('[Mundi Expanded] profile', e); }
    }
    return P.guessProfile(text, ids);
}
