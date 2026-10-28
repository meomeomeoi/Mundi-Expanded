// [expanded] Rooms and their things at runtime (rules in furnish.ts): which games have them (a modern Home: the
// manor's would need a catalog of its own), the rooms of this game, the common rooms furnished from the house's
// template the first time, and what the scene is told about the room you are in.
import { type Save } from '../core/store.js';
import { isScenario, styleOf, type WorldDef } from '../core/world.js';
import { placeOn, extraRooms } from './places.js';
import { ownRoom } from './lifeday.js';
import { personaName } from '../st/bridge.js';
import * as E from './era.js';
import * as F from './furnish.js';

const G = (g: Save) => g as unknown as F.GLike;
/** Fixtures are on in a modern Home. */
export const furnishOn = (w: WorldDef | null | undefined) => !!w && isScenario(w) && styleOf(w) === 'modern';
export const eraOf = (g: Save): F.Era => E.eraxOf(g as any).era as F.Era;
export const fx = (g: Save) => F.furnishOf(G(g));

export interface HouseRoom { id: string; name: string; kind: F.RoomKind | null; owner?: string }
/** The rooms of this game: its common rooms (map links left out) and everyone's bedroom (yours first). */
export function houseRooms(g: Save, w: WorldDef): HouseRoom[] {
    const common = [...w.places.filter(p => !(p as any).link && !(p as any).home && placeOn(g, w, p.id)), ...extraRooms(g).filter(p => !(p as any).link)]
        .map(p => ({ id: p.id, name: p.name, kind: F.roomKind(p.id, p.name, p.tags ?? []) }));
    const beds: HouseRoom[] = [{ id: F.PLAYER_ROOM, name: `${personaName()}'s room`, kind: 'bedroom', owner: 'player' }];
    for (const r of Object.values(g.cast)) { const id = ownRoom(r); if (!beds.some(b => b.id === id)) beds.push({ id, name: `${g.cast[id.slice(5)]?.name ?? r.name}'s room`, kind: 'bedroom', owner: id.slice(5) }); }
    return [...beds, ...common];
}
export const roomName = (g: Save, w: WorldDef, id: string) => houseRooms(g, w).find(r => r.id === id)?.name ?? id;
/** Whose a thing is, in words ("Masha", "you"). */
export const ownerName = (g: Save, o: F.Owner, you = personaName()) => (o === 'house' ? 'the house' : o === 'player' ? you : g.cast[o]?.name ?? o);

/** The first time: the common rooms get the house's template (only once; your edits stay). */
export function seedCommon(g: Save, w: WorldDef): boolean {
    if (!furnishOn(w)) return false;
    const f = fx(g); if (f.started) return false;
    f.started = true;
    const era = eraOf(g); let bath = false;
    for (const r of houseRooms(g, w)) {
        if (r.kind === 'bedroom') continue;
        const first = r.kind === 'bath' && !bath; if (r.kind === 'bath') bath = true;
        for (const cat of F.template(r.kind, era, first)) F.addFixture(G(g), { cat, room: r.id, owner: 'house', via: 'start', era });
    }
    return true;
}

/** For the scene: the things in the room you are in. */
export function roomPromptLines(g: Save, w: WorldDef): string[] {
    if (!furnishOn(w)) return [];
    seedCommon(g, w);
    const here = g.player.loc;
    const rooms = houseRooms(g, w); const r = rooms.find(x => x.id === here); if (!r) return [];
    const name = r.id === F.PLAYER_ROOM ? "{{user}}'s room" : r.kind === 'bedroom' ? r.name : `the ${r.name.toLowerCase()}`;
    const line = F.roomLine(G(g), here, name, (o) => (o === 'player' ? '{{user}}' : ownerName(g, o)));
    return line ? [line] : [];
}
