// [expanded] What you can do with the things in the room you are in (Mundi Expanded 0.2.0.7), in a modern Home whose
// rooms are furnished. The world's own actions that need a thing (Watch TV, Run on the treadmill, Make coffee, Cook,
// Freelance on the computer, Paint) are offered only where that thing is and you may use it; the room's other things
// add actions of their own (play on the console, the guitar, a bath, a book; a game with someone here, which brings
// you a little closer). Someone else's things only with them in the room.
import type { Save } from '../core/store.js';
import type { WorldDef, ActionDef } from '../core/world.js';
import { actionMods, onAction } from './hooks.js';
import { presentAt } from './people.js';
import { addBond } from './social.js';
import { furnishOn, houseRooms, eraOf } from './furnishrun.js';
import { nowAbs, toast, notify, saveGame } from '../core/store.js';
import { isOuting } from './places.js';
import { outingOf } from './outing.js';
import { onDay } from './hooks.js';
import { SHOPPING, shopRoll } from './orders.js';
import * as F from './furnish.js';

const G = (g: Save) => g as unknown as F.GLike;
/** The world's actions that need a thing, by id. */
export const WORLD_NEEDS: Record<string, F.Afford> = { 'x-games': 'game', 'x-tv': 'watch', 'x-treadmill': 'exercise', 'x-workout': 'exercise', 'x-coffee': 'coffee', cook: 'cook', 'x-freelance': 'work', 'x-paint': 'craft' };
/** [expanded] Mundi 0.2.1's room actions that do what a thing here would offer, without needing it (no second "read"). */
const COVERS: Record<string, F.Afford> = { 'x-read': 'read' };
const low = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const ACTS: Partial<Record<F.Afford, { label: (n: string) => string; icon: string; minutes: number; effects: Record<string, number> }>> = {
    watch: { label: n => `Watch something on the ${low(n)}`, icon: '📺', minutes: 90, effects: { mood: 6, energy: -2 } },
    game: { label: n => `Play on the ${low(n)}`, icon: '🎮', minutes: 60, effects: { mood: 6, energy: -3 } },
    game2: { label: n => `Play with the others (${low(n)})`, icon: '🎲', minutes: 60, effects: { mood: 7, energy: -3 } },
    work: { label: n => `Get some work done (${low(n)})`, icon: '💻', minutes: 120, effects: { energy: -10, mood: -2 } },
    music: { label: n => `Play the ${low(n)}`, icon: '🎸', minutes: 45, effects: { mood: 6, energy: -3 } },
    read: { label: () => 'Read for a while', icon: '📖', minutes: 60, effects: { mood: 4, energy: 3 } },
    exercise: { label: n => `Work out (${low(n)})`, icon: '🏋️', minutes: 45, effects: { energy: -15, hygiene: -20, mood: 4 } },
    bath: { label: n => `Take a long soak (${low(n)})`, icon: '🛁', minutes: 45, effects: { hygiene: 60, mood: 6, energy: 5 } },
    craft: { label: n => `Make something (${low(n)})`, icon: '🎨', minutes: 90, effects: { mood: 5, energy: -5 } },
    chill: { label: n => `Relax on the ${low(n)}`, icon: '🛋️', minutes: 30, effects: { energy: 4, mood: 2 } },
    dress: { label: n => `Get ready at the ${low(n)}`, icon: '💄', minutes: 20, effects: { mood: 3 } },
};
const on = (g: Save, w: WorldDef) => furnishOn(w) && !!(g as any).furnishx?.started;

actionMods.push((g, w, list) => {
    if (!on(g, w)) return list;
    const room = g.player.loc;
    const here = presentAt(g, w, room).map(r => r.avatar);
    // what you may use here: the house's, yours, and someone else's while they are here
    const things = F.fixturesIn(G(g), room).filter(x => !x.decor && (x.owner === 'house' || x.owner === 'player' || here.includes(x.owner)));
    const can = (a: F.Afford) => things.find(x => F.affordsOf(x).includes(a)) ?? null;
    const kept = list.filter(a => !WORLD_NEEDS[a.id] || can(WORLD_NEEDS[a.id]));
    const covered = new Set(kept.map(a => WORLD_NEEDS[a.id] ?? COVERS[a.id]).filter(Boolean));
    const add: ActionDef[] = [];
    for (const [afford, d] of Object.entries(ACTS) as [F.Afford, NonNullable<typeof ACTS[F.Afford]>][]) {
        if (covered.has(afford)) continue;
        const x = can(afford); if (!x) continue;
        if (afford === 'game2' && !here.length) continue;   // a game together needs someone to play with
        const whose = x.owner !== 'house' && x.owner !== 'player' ? ` (${g.cast[x.owner]?.name}'s)` : '';
        add.push({ id: `x-fx-${afford}`, name: d.label(x.name), label: `${d.label(x.name)}${whose}`, icon: d.icon, cost: 0, minutes: d.minutes, home: true, effects: d.effects } as ActionDef);
    }
    // out: a shop to look around (its shelves open in the phone)
    if (isOuting(room)) { const kind = F.shopKindOf(outingOf(g)?.place ?? ''); if (kind) add.push({ id: 'x-fx-shop', name: 'Look around', label: `Look around the ${F.SHOP_NAMES[kind]}`, icon: '🛍️', cost: 0, minutes: 20, effects: {} } as ActionDef); }
    // someone left something on the curb today: from the hallway or the front of the house
    const curb = fxx(g).curb; const kind = houseRooms(g, w).find(r => r.id === room)?.kind;
    if (curb && curb.day === g.day && (kind === 'hall' || kind === 'outdoor')) { const c = F.catOf(curb.cat); if (c) add.push({ id: 'x-fx-curb', name: 'Take it in', label: `Take in the ${F.catName(c, eraOf(g)).toLowerCase()} someone left on the curb`, icon: '🪑', cost: 0, minutes: 15, effects: { energy: -4 } } as ActionDef); }
    // [expanded] 0.2.1-15.2: small things go to your room and back (a minute); big ones stay where they are
    if (room !== F.PLAYER_ROOM) { for (const x of F.fixturesIn(G(g), room).filter(y => F.carryable(y, room)).slice(0, 6)) if (!F.roomFull(G(g), F.PLAYER_ROOM)) add.push({ id: `x-fx-carry-${x.id}`, name: `Take the ${x.name.toLowerCase()} to your room`, label: `Take the ${x.name.toLowerCase()} to your room`, icon: '🎒', cost: 0, minutes: 1, home: true, effects: {} } as ActionDef); }
    else for (const x of F.fixturesIn(G(g), room).filter(y => y.from && F.carryable(y, room))) {
        const back = houseRooms(g, w).find(r => r.id === x.from); if (!back || F.roomFull(G(g), back.id)) continue;
        add.push({ id: `x-fx-back-${x.id}`, name: `Take the ${x.name.toLowerCase()} back to the ${back.name.toLowerCase()}`, label: `Take the ${x.name.toLowerCase()} back to the ${back.name.toLowerCase()}`, icon: '🎒', cost: 0, minutes: 1, home: true, effects: {} } as ActionDef);
    }
    // the storage room, once a week
    if (kind === 'storage' && (fxx(g).rummaged ?? -99) <= g.day - 7) add.push({ id: 'x-fx-rummage', name: 'Rummage', label: 'Rummage through the old boxes', icon: '📦', cost: 0, minutes: 30, effects: { hygiene: -5 } } as ActionDef);
    return [...kept, ...add];
});
const fxx = (g: Save) => F.furnishOf(G(g));
onAction.push((g, w, a) => {
    if (a.id === 'x-fx-shop') {
        const o = outingOf(g); const kind = F.shopKindOf(o?.place ?? ''); if (!o || !kind) return;
        Object.assign(SHOPPING, { kind, place: o.place, day: g.day });
        // its shelves: in the phone's shop app (a ui module, loaded when needed)
        void import('../ui/phone.js').then(m => { (m as any).P.open = true; (m as any).P.app = 'order'; notify(); }).catch(() => { /* no phone */ });
        return;
    }
    { const m = /^x-fx-(carry|back)-(.+)$/.exec(a.id);   // [expanded] 0.2.1-15.2
      if (m) {
        const rooms = houseRooms(g, w);
        const x = m[1] === 'carry' ? F.carryToYou(G(g), m[2]) : F.carryBack(G(g), m[2], r => rooms.some(z => z.id === r));
        if (x) { const where = m[1] === 'carry' ? 'your room' : (rooms.find(r => r.id === x.room)?.name ?? 'its place').toLowerCase(); setTimeout(() => toast(`The ${x.name.toLowerCase()} is in ${where === 'your room' ? where : `the ${where}`} now${m[1] === 'carry' && x.owner === 'house' ? ' (lent: it is still the house\'s)' : ''}.`, 'success'), 50); saveGame(); }
        return;
    } }
    if (a.id === 'x-fx-curb') {
        const f = fxx(g); const c = f.curb && F.catOf(f.curb.cat); if (!c) return; delete f.curb;
        const rooms = houseRooms(g, w); const to = rooms.find(r => !r.owner && r.kind && c.rooms.includes(r.kind)) ?? rooms.find(r => r.id === g.player.loc)!;
        const x = F.addFixture(G(g), { cat: c.id, room: to.id, owner: 'house', via: 'found', era: eraOf(g) });
        if (x) setTimeout(() => toast(`The ${x.name.toLowerCase()} is the house's now (${to.name.toLowerCase()}). Move it in Storage → Furniture.`, 'success'), 50);
        saveGame(); return;
    }
    if (a.id === 'x-fx-rummage') {
        const f = fxx(g); f.rummaged = g.day; const room = g.player.loc; const r = shopRoll(`${g.day}|${nowAbs(g)}|rummage`);
        let x: F.Fixture | null = null;
        if (r < 0.35) { const ids = F.RUMMAGE_THINGS.filter(id => F.forEra(F.catOf(id)!, eraOf(g))); x = F.addFixture(G(g), { cat: ids[Math.floor(shopRoll(`${g.day}|t`) * ids.length)], room, owner: 'house', via: 'found', era: eraOf(g) }); }
        else if (r < 0.7) x = F.addFixture(G(g), { name: F.RUMMAGE_DECOR[Math.floor(shopRoll(`${g.day}|d`) * F.RUMMAGE_DECOR.length)], room, owner: 'house', via: 'found' });
        setTimeout(() => toast(x ? `Under the dust: ${x.name.toLowerCase()}. It is the house's now (move it in Storage → Furniture).` : 'Nothing worth keeping, just old boxes.', x ? 'success' : 'info'), 50);
        saveGame(); return;
    }
});
// now and then something is left on the curb (a day's chance)
onDay.push((g, w) => {
    if (!on(g, w)) return [];
    if (shopRoll(`${g.world}|${g.day}|curb`) < 0.06) { fxx(g).curb = { cat: F.CURB[Math.floor(shopRoll(`${g.day}|curbwhat`) * F.CURB.length)], day: g.day }; }
    return [];
});
// a game together: a little closer with everyone who played
onAction.push((g, w, a) => {
    if (a.id !== 'x-fx-game2') return;
    for (const r of presentAt(g, w, g.player.loc)) if (r.met) addBond(g, r.avatar, 1);
});
