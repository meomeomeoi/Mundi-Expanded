// [expanded] People who walk off in the story ("I'm heading out to the patio") really go: the expressions call at the end
// of a turn also says who left and where to (a room of the house, their own room, out of the house), and who goes along
// with you. Where someone went wins over the scene lock, company and the routine for an hour of game time
// (people.ts goneTo); after that their day takes them again.
// Everything a turn did is kept with the line it came from: a swipe of that line undoes it before the new text is read
// (Kathie stays if the new swipe has her stay).
import { nowAbs, type Save } from '../core/store.js';
import type { WorldDef } from '../core/world.js';
import { social } from './social.js';
import { OUT } from './people.js';
import { ownRoom } from './lifeday.js';
import { placeOn, extraRooms } from './places.js';
import { personaName } from '../st/bridge.js';

export const GONE_MIN = 60;

/** Where someone can walk off to in the house: every room of this game (common rooms, the bathroom, the laundry, the
 *  garage…, rooms of your own too) and everyone's bedroom ("Masha's room": going to see her; their own is "own room"). */
export function movePlaces(g: Save, w: WorldDef): { id: string; name: string }[] {
    const rooms = [...w.places.filter(p => !(p as any).link && !(p as any).home && placeOn(g, w, p.id)), ...extraRooms(g).filter(p => !(p as any).link)]
        .map(p => ({ id: p.id, name: p.name }));
    const beds = [{ id: 'home:player', name: `${personaName()}'s room` }, ...Object.values(g.cast).map(r => ({ id: ownRoom(r), name: `${r.name}'s room` }))];
    const seen = new Set<string>();
    return [...rooms, ...beds].filter(p => { const k = `${p.id}|${p.name}`; if (seen.has(k)) return false; seen.add(k); return true; });
}
interface Went { loc: string; until: number; line: number; locked?: boolean; withWas?: { avatar: string; until: number } }
interface Followed { line: number }
const wentOf = (g: Save) => (((social(g) as any).went ??= {}) as Record<string, Went>);
const followedOf = (g: Save) => (((social(g) as any).followed ??= {}) as Record<string, Followed>);

/** Undoes what the line `line` did (a swipe of it is read again). */
export function undoLine(g: Save, line: number): boolean {
    const s: any = social(g); const went = wentOf(g); const fol = followedOf(g); let did = false;
    for (const [a, x] of Object.entries(went)) if (x.line === line) {
        did = true;
        if (x.locked && s.lock?.who && !s.lock.who.includes(a)) s.lock.who.push(a);
        if (x.withWas && !s.with.some((c: any) => c.avatar === a)) s.with.push(x.withWas);
        delete went[a];
    }
    for (const [a, x] of Object.entries(fol)) if (x.line === line) { s.with = s.with.filter((c: any) => c.avatar !== a); delete fol[a]; did = true; }
    return did;
}

/** Applies a turn's moves (avatar → room id, 'own' or 'out') and follows: what to tell the player, and whether anyone
 *  is somewhere else now (an undone move too). */
export function applyMoves(g: Save, w: WorldDef, line: number, moves: Record<string, string>, follows: string[]): { told: string[]; changed: boolean } {
    const undone = undoLine(g, line);
    const s: any = social(g); const went = wentOf(g); const fol = followedOf(g); const now = nowAbs(g); const out: string[] = [];
    const placeName = (id: string) => (w.places.find(p => p.id === id)?.name ?? (((g as any).cfg?.extraRooms ?? []) as any[]).find((p: any) => p.id === id)?.name ?? id);
    // old entries that are over are dropped (the save stays small)
    for (const [a, x] of Object.entries(went)) if (now >= x.until) delete went[a];
    for (const [a, dest] of Object.entries(moves)) {
        const r = g.cast[a]; if (!r) continue;
        const loc = dest === 'own' ? ownRoom(r) : dest === 'out' ? OUT : dest;
        if (loc === g.player.loc) continue;
        const withWas = s.with.find((c: any) => c.avatar === a);
        const locked = !!s.lock?.who?.includes(a);
        went[a] = { loc, until: now + GONE_MIN, line, ...(locked ? { locked } : {}), ...(withWas ? { withWas: { ...withWas } } : {}) };
        s.with = s.with.filter((c: any) => c.avatar !== a);
        if (locked) s.lock.who = s.lock.who.filter((x: string) => x !== a);
        const bed = loc.startsWith('home:') ? (loc === 'home:player' ? 'your room' : `${g.cast[loc.slice(5)]?.name ?? 'someone'}'s room`) : '';
        out.push(loc === OUT ? `${r.name} left the house.` : dest === 'own' ? `${r.name} went to their room.` : bed ? `${r.name} went to ${bed}.` : `${r.name} went to the ${placeName(loc).toLowerCase()}.`);
    }
    for (const a of follows) {
        const r = g.cast[a]; if (!r || went[a] || s.with.some((c: any) => c.avatar === a)) continue;
        s.with.push({ avatar: a, until: now + 180 }); fol[a] = { line };
        out.push(`${r.name} comes along with you.`);
    }
    return { told: out, changed: undone || out.length > 0 };
}
