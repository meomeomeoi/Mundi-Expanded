import { isScenario, styleOf } from '../core/world.js';
import { placeOn, extraRooms } from './places.js';
import { ownRoom } from './lifeday.js';
import { personaName } from '../st/bridge.js';
import { looseJson } from './jsonfix.js';
import { cardText } from './lifeday.js';
import * as P from './profile.js';
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
/* ---------- the bedrooms, furnished from who lives in them ---------- */
const aboutOf = (g, avatar) => {
    const p = P.profileOf(g, avatar);
    return [cardText(avatar), p?.acts?.length ? `Likes to: ${p.acts.map(a => a.text).join('; ')}.` : ''].filter(Boolean).join(' ');
};
/** One call for the whole house (the mechanics model, else the main one; a guess from the card when it fails).
 *  `who`: the avatars to furnish (all by default); what they got at the start before is replaced, the rest stays.
 *  You are included when you wrote something about yourself in this world. */
export async function furnishBedrooms(g, w, who) {
    if (!furnishOn(w))
        return { model: 0, guessed: 0 };
    seedCommon(g, w);
    const era = eraOf(g);
    const list = who ?? Object.keys(g.cast);
    const people = list.filter(a => g.cast[a]).map(a => ({ key: a, name: g.cast[a].name, about: aboutOf(g, a) }));
    const bio = String(g.player.bio ?? '').trim();
    if (!who && bio)
        people.push({ key: 'player', name: personaName(), about: bio });
    if (!people.length)
        return { model: 0, guessed: 0 };
    let got = {};
    try {
        const { bgAsk } = await import('./regulator.js');
        const ans = await bgAsk(F.furnishPrompt({ people, era, eraLine: E.eraDef(g).lore }), 2500, F.FURNISH_SYSTEM);
        got = F.parseFurnish(looseJson(ans), people, era);
    }
    catch (e) {
        console.warn('[Mundi Expanded] furnishing', e);
    }
    let model = 0, guessed = 0;
    for (const x of people) {
        const room = x.key === 'player' ? F.PLAYER_ROOM : ownRoom(g.cast[x.key]);
        const owner = x.key;
        const mine = got[x.key];
        const things = mine?.things.length ? mine.things : F.guessBedroom(x.about, era);
        if (mine?.things.length)
            model++;
        else
            guessed++;
        // what they got at the start before is replaced (things bought, given or set by hand stay)
        fx(g).items = fx(g).items.filter(f => !(f.room === room && f.owner === owner && f.via === 'start'));
        for (const cat of things)
            F.addFixture(G(g), { cat, room, owner, via: 'start', era });
        for (const d of mine?.decor ?? [])
            F.addFixture(G(g), { name: d, room, owner, via: 'start' });
    }
    fx(g).bedrooms = true;
    return { model, guessed };
}
