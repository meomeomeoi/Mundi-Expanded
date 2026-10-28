import { isScenario, styleOf } from '../core/world.js';
import { placeOn, extraRooms } from './places.js';
import { ownRoom } from './lifeday.js';
import { personaName } from '../st/bridge.js';
import * as E from './era.js';
import * as F from './furnish.js';
const G = (g) => g;
/** Fixtures are on in a modern Home. */
export const furnishOn = (w) => !!w && isScenario(w) && styleOf(w) === 'modern';
export const eraOf = (g) => E.eraxOf(g).era;
export const fx = (g) => F.furnishOf(G(g));
/** The rooms of this game: its common rooms (map links left out) and everyone's bedroom (yours first). */
export function houseRooms(g, w) {
    const common = [...w.places.filter(p => !p.link && !p.home && placeOn(g, w, p.id)), ...extraRooms(g).filter(p => !p.link)]
        .map(p => ({ id: p.id, name: p.name, kind: F.roomKind(p.id, p.name, p.tags ?? []) }));
    const beds = [{ id: F.PLAYER_ROOM, name: `${personaName()}'s room`, kind: 'bedroom', owner: 'player' }];
    for (const r of Object.values(g.cast)) {
        const id = ownRoom(r);
        if (!beds.some(b => b.id === id))
            beds.push({ id, name: `${g.cast[id.slice(5)]?.name ?? r.name}'s room`, kind: 'bedroom', owner: id.slice(5) });
    }
    return [...beds, ...common];
}
export const roomName = (g, w, id) => houseRooms(g, w).find(r => r.id === id)?.name ?? id;
/** Whose a thing is, in words ("Masha", "you"). */
export const ownerName = (g, o, you = personaName()) => (o === 'house' ? 'the house' : o === 'player' ? you : g.cast[o]?.name ?? o);
/** The first time: the common rooms get the house's template (only once; your edits stay). */
export function seedCommon(g, w) {
    if (!furnishOn(w))
        return false;
    const f = fx(g);
    if (f.started)
        return false;
    f.started = true;
    const era = eraOf(g);
    let bath = false;
    for (const r of houseRooms(g, w)) {
        if (r.kind === 'bedroom')
            continue;
        const first = r.kind === 'bath' && !bath;
        if (r.kind === 'bath')
            bath = true;
        for (const cat of F.template(r.kind, era, first))
            F.addFixture(G(g), { cat, room: r.id, owner: 'house', via: 'start', era });
    }
    return true;
}
/** For the scene: the things in the room you are in. */
export function roomPromptLines(g, w) {
    if (!furnishOn(w))
        return [];
    seedCommon(g, w);
    const here = g.player.loc;
    const rooms = houseRooms(g, w);
    const r = rooms.find(x => x.id === here);
    if (!r)
        return [];
    const name = r.id === F.PLAYER_ROOM ? "{{user}}'s room" : r.kind === 'bedroom' ? r.name : `the ${r.name.toLowerCase()}`;
    const line = F.roomLine(G(g), here, name, (o) => (o === 'player' ? '{{user}}' : ownerName(g, o)));
    return line ? [line] : [];
}
