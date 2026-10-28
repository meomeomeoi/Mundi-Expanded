import { getWorld } from '../core/world.js';
import { ownRoom } from './lifeday.js';
import * as F from './furnish.js';
import { furnishOn, eraOf, houseRooms, seedCommon } from './furnishrun.js';
const G = (g) => g;
const norm = (s) => String(s ?? '').toLowerCase().replace(/^the\s+/, '').replace(/[.,!?"'«»“”]/g, '').replace(/\s+/g, ' ').trim();
const on = (g) => { const w = getWorld(g.world); return w && furnishOn(w) ? w : null; };
const ownerOfRoom = (g, w) => (room) => houseRooms(g, w).find(r => r.id === room)?.owner ?? 'house';
const roomOfWho = (g, who) => (who === 'player' ? F.PLAYER_ROOM : g.cast[who] ? ownRoom(g.cast[who]) : '');
/** The reader's extra lines: the rooms and their things now, and how to write what happened to them. */
export function placeReadLines(g, you) {
    const w = on(g);
    if (!w)
        return [];
    seedCommon(g, w);
    const rooms = houseRooms(g, w).map(r => `- ${r.owner === 'player' ? `${you}'s room` : r.name}: ${F.fixturesIn(G(g), r.id).map(x => x.name).slice(0, 14).join(', ') || 'nothing much'}`);
    return ['', 'The rooms of the house and the big things in them:', ...rooms, '', ...F.PLACE_READ];
}
/** Applies the reader's PLACE, RELOCATE and DISCARD lines and big gifts. Short notes of what changed. */
export function applyPlaceRead(g, raw, gifts, you, person) {
    const w = on(g);
    if (!w)
        return [];
    const rooms = houseRooms(g, w);
    const era = eraOf(g);
    const room = (s) => {
        const q = norm(s);
        if (!q)
            return null;
        const hit = rooms.find(r => norm(r.name) === q || norm(r.id) === q);
        if (hit)
            return hit.id;
        if (/^(your|my) room$|^моя комната$/.test(q))
            return F.PLAYER_ROOM;
        const m = q.match(/^(.+?)(?:'s|s)? (?:bed)?room$/) ?? q.match(/^комната (.+)$/);
        if (m) {
            const p = person(m[1]);
            if (p)
                return roomOfWho(g, p) || null;
        }
        const kind = F.roomKind(q, q, []);
        const same = kind && kind !== 'bedroom' ? rooms.filter(r => !r.owner && r.kind === kind) : [];
        return same.length === 1 ? same[0].id : null;
    };
    const names = (id) => (id === F.PLAYER_ROOM ? 'your room' : rooms.find(r => r.id === id)?.name ?? id);
    const out = F.applyPlace(G(g), F.parsePlace(raw, room, (s) => person(s)), era, ownerOfRoom(g, w), names);
    for (const o of gifts) {
        if (o.op !== 'gift' || !o.thing || (o.to !== 'player' && !g.cast[o.to]))
            continue;
        const cat = F.catByName(o.thing);
        const c = cat ? F.catOf(cat) : null;
        const r = roomOfWho(g, o.to);
        if (!c || !F.forEra(c, era) || !r || F.fixturesIn(G(g), r).some(x => x.cat === c.id))
            continue;
        const x = F.addFixture(G(g), { cat: c.id, room: r, owner: o.to, via: 'gift', era });
        if (x)
            out.push(`${x.name} → ${names(r)}`);
    }
    return out;
}
