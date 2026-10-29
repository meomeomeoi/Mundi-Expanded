// [expanded] Profiles at runtime (rules in profile.ts): where a character with a profile is now (instead of
// upstream's routine), whether they are asleep, what the scene is told, and making profiles from the cards.
import { game, nowAbs, type Save, type Resident } from '../core/store.js';
import { isScenario, getWorld, styleOf, type WorldDef } from '../core/world.js';
import { isWeekend } from './time.js';
import { placeOn, extraRooms, isOuting } from './places.js';
import { whereNow, OUT } from './people.js';
import { homeJobOf, onShift, npcOut } from './hometime.js';
import { charOf, chatLore } from '../st/bridge.js';
import { eraPromptLine } from './era.js';
import * as P from './profile.js';
import * as FU from './furnish.js';   // [expanded] 0.2.0.7
import { houseNotes, presentNotes, phoneNotes, planMods } from './lifehooks.js';
import { textedLines } from './livelog.js';
import { bondsOf, pairKey } from './bonds.js';

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
        // [expanded] 0.2.0.7: where their things are (a modern Home with fixtures): their own room, the house's rooms
        ...(furnished(g, w) ? {
            can: (a: string) => FU.roomsFor(g as any, a as FU.Afford, r.avatar, ownRoom(r)).filter(x => x === ownRoom(r) || !x.startsWith('home:')),
            has: (room: string, a: string) => FU.roomAffords(g as any, room, a as FU.Afford, r.avatar),
        } : {}),
    };
}
// How two characters get along (Mundi Expanded's pair value; 0 when unknown). Read without creating anything.
const pairValue = (g: Save, a: string, b: string) => (bondsOf(g as any).pairs[pairKey(a, b)]?.v ?? 0);
// [expanded] 0.2.0.7: a house with its things set up (a modern Home whose rooms were furnished)
const furnished = (g: Save, w: WorldDef) => isScenario(w) && styleOf(w) === 'modern' && !!(g as any).furnishx?.started;
const memo = new Map<string, Record<string, P.Slot[]>>();
// [expanded] A plan asked for again in the same piece of work (one drawing of the screen, one prompt) is the one just
// made: whereNow asks for everyone's day for each person, dozens of times a drawing, and each time built a key out of
// every profile (JSON.stringify). Forgotten once that work is done (a microtask), so any change is seen next time.
const tick = new Map<number, Record<string, P.Slot[]>>(); let tickOf: object | null = null; let tickQueued = false;
/** Everyone's day at once (each from their profile, then drawn to friends and away from enemies). */
export function housePlan(g: Save, w: WorldDef, day: number): Record<string, P.Slot[]> {
    if (tickOf !== g) { tick.clear(); tickOf = g; }
    const hit = tick.get(day); if (hit) return hit;
    let plan = housePlanNow(g, w, day);
    for (const f of planMods) plan = f(g, w, day, plan);   // [expanded] 0.2.0.8: secret meetings
    tick.set(day, plan);
    if (!tickQueued) { tickQueued = true; queueMicrotask(() => { tick.clear(); tickOf = null; tickQueued = false; }); }
    return plan;
}
function housePlanNow(g: Save, w: WorldDef, day: number): Record<string, P.Slot[]> {
    const lx = P.lifexOf(G(g));
    const people = Object.values(g.cast).filter(r => lx.profiles[r.avatar]);
    if (!people.length) return {};
    const ctxs = people.map(r => ctxFor(g, w, r, day));
    const pairs = people.flatMap((a, i) => people.slice(i + 1).map(b => pairValue(g, a.avatar, b.avatar)));
    const key = JSON.stringify([day, people.map(r => [r.avatar, lx.profiles[r.avatar], homeJobOf(r)]), ctxs.map(c => [c.own, c.common]), lx.dinner, lx.dinnerAt, npcOut(g), pairs, furnished(g, w) ? FU.furnishOf(g as any).items.map(x => `${x.room}|${x.cat ?? ''}|${x.owner}`) : 0]);
    let plan = memo.get(key);
    if (!plan) {
        const base = Object.fromEntries(people.map((r, i) => [r.avatar, P.dayPlan(lx.profiles[r.avatar], ctxs[i])]));
        plan = P.adjustHouse(base, lx.profiles, (a, b) => pairValue(g, a, b), { day, weekend: isWeekend(day), own: Object.fromEntries(people.map((r, i) => [r.avatar, ctxs[i].own])), common: ctxs[0].common, names: Object.fromEntries(people.map(r => [r.avatar, r.name])) });
        if (memo.size > 60) memo.clear(); memo.set(key, plan);
    }
    return plan;
}
export function planOf(g: Save, w: WorldDef, r: Resident, day: number): P.Slot[] | null {
    return housePlan(g, w, day)[r.avatar] ?? null;
}
export function slotAt(g: Save, w: WorldDef, r: Resident, at: number): P.Slot | null {
    if (!isScenario(w)) return null;
    const plan = planOf(g, w, r, Math.floor(at / 1440));
    const s = plan ? plan[Math.floor((at % 1440) / 60)] : null;
    // woken up (by you): awake for a while, in their room
    return s?.asleep && (P.lifexOf(G(g)).woke?.[r.avatar] ?? 0) > at ? { ...s, asleep: false, kind: 'room', act: 'just woken up, groggy' } : s;
}
/** For upstream's routine: where they are (null: no profile, upstream's routine decides). */
export function lifeWhere(g: Save, w: WorldDef, r: Resident, at: number): string | null {
    const s = slotAt(g, w, r, at); return s ? s.loc : null;
}
/** For upstream's "is she asleep" (plans): null when this character has no profile. */
export function asleepNow(r: Resident, at: number): boolean | null {
    const g = game(); if (!g) return null;
    const p = P.profileOf(G(g), r.avatar); if (!p) return null;
    if ((P.lifexOf(G(g)).woke?.[r.avatar] ?? 0) > at) return false;
    const w = getWorld(g.world); const s = w && slotAt(g, w, r, at);
    return s ? s.asleep : P.asleepAt(p, Math.floor((at % 1440) / 60), isWeekend(Math.floor(at / 1440)));
}

// [expanded] The scene's lines about life in the house come in four blocks of their own (prompt.ts), so a tight budget
// drops the least needed first: where everyone is (and the era) last, your notes never; texts and chats early.
/** "The house": the era, and where everyone else is right now. */
export function houseLines(g: Save, w: WorldDef, present: Resident[]): string[] {
    if (!isScenario(w)) return [];
    const out: string[] = [];
    const era = eraPromptLine(g as any, !!chatLore()); if (era) out.push(era);
    const elsewhere = houseNow(g, w, present); if (elsewhere) out.push(elsewhere);
    return out;
}
/** "Your notes": the OOC notes written for the people here (their profiles). */
export function oocLines(g: Save, w: WorldDef, present: Resident[]): string[] {
    if (!isScenario(w)) return [];
    return present.map(r => P.profileOf(G(g), r.avatar)?.ooc ? `[OOC note about ${r.name}: ${P.profileOf(G(g), r.avatar)!.ooc}]` : '').filter(Boolean);
}
/** "Texts and chats": what the people here texted with {{user}}, and the group chats lately. */
export function phoneLines(g: Save, w: WorldDef, present: Resident[]): string[] {
    if (!isScenario(w)) return [];
    const out: string[] = [];
    for (const f of phoneNotes) out.push(...f(g, w, present));
    out.push(...textedLines(g, present));
    return out;
}
/** For the scene: what the people here are doing (their moment: at the door, woken up, a plan of their own…). */
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
    const lx = P.lifexOf(G(g));
    if (lx.atDoor && lx.atDoor.until > now && present.some(r => r.avatar === lx.atDoor!.avatar)) out.push(`${g.cast[lx.atDoor.avatar]?.name} came to the door of their room to talk with {{user}} in the hallway, without inviting {{user}} in.`);
    if (lx.caught && lx.caught.until > now && present.some(r => r.avatar === lx.caught!.avatar)) { const n = g.cast[lx.caught.avatar]?.name; out.push(`${n} has just come back to their own room and found {{user}} inside, uninvited.${lx.caught.text ? ` How ${n} takes it: ${lx.caught.text}` : ''}`); }
    if (lx.visit && lx.visit.until > now && present.some(r => r.avatar === lx.visit!.avatar)) { const n = g.cast[lx.visit.avatar]?.name; out.push(`Late at night ${n} came to {{user}}'s door: ${n} ${lx.visit.reason}.${lx.visit.door ? ` They talk in the doorway (${n} has not been invited in).` : ` {{user}} let ${n} into their room.`}`); }
    for (const r of present) { const t = lx.woke?.[r.avatar]; if (t && t > now && t - now > 60) out.push(`{{user}} has just woken ${r.name} up: ${r.name} was asleep and is still groggy.`); }
    for (const f of presentNotes) out.push(...f(g, w, present));
    return out;
}


/** Where everyone else in the house is right now (not when {{user}} is out of the house: they would not know). */
export function houseNow(g: Save, w: WorldDef, present: Resident[]): string {
    if (!isScenario(w) || isOuting(g.player.loc)) return '';
    const here = new Set(present.map(r => r.avatar)); const now = nowAbs(g);
    const roomName = (id: string) => w.places.find(p => p.id === id)?.name.toLowerCase() ?? extraRooms(g).find(p => p.id === id)?.name.toLowerCase() ?? '';
    const parts = Object.values(g.cast).filter(r => r.met && !here.has(r.avatar)).slice(0, 10).map(r => {
        for (const f of houseNotes) { const t = f(g, w, r); if (t) return t; }
        const loc = whereNow(g, w, r); const s = slotAt(g, w, r, now);
        if (loc === OUT || isOuting(loc)) return `${r.name}: out of the house`;
        const where = loc === `home:${r.avatar}` || (s && loc === ownRoom(r)) ? 'in their room' : loc === 'home:player' ? "in {{user}}'s room" : loc.startsWith('home:') ? `in ${g.cast[loc.slice(5)]?.name ?? 'someone'}'s room` : `in the ${roomName(loc)}`;
        if (s?.asleep && loc === s.loc) return `${r.name}: asleep ${where}`;
        return `${r.name}: ${where}${s && loc === s.loc ? `, ${s.act}` : ''}`;
    });
    return parts.length ? `Elsewhere in the house right now (current; this overrides anything earlier in the chat about where they are): ${parts.join('; ')}.` : '';
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
            const ans = await bgAsk(P.profilePrompt(r?.name ?? '', text, rooms), 2500, P.PROFILE_SYSTEM);
            const p = P.parseProfile(ans, ids); if (p) return p;
        } catch (e) { console.warn('[Mundi Expanded] profile', e); }
    }
    return P.guessProfile(text, ids);
}
