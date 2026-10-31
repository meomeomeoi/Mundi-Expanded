// [expanded] Mundi Expanded 15.2: carrying small things to your room and back (sim/furnish.ts + sim/furnishacts.ts).
// Run: node tests/carry.test.mjs [repo root]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stage, browser, seed, world } from './env.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = process.argv[2] ?? path.join(here, '..');
const ext = stage(root, 'carry');
const meta = {}; browser(meta);
const D = (p) => import(`${ext}/dist/${p}`);
const store = await D('core/store.js'); const W = await D('core/world.js'); await D('core/saves.js');
const gm = await D('sim/game.js'); const homes = await D('sim/homes.js'); const F = await D('sim/furnish.js'); const hooks = await D('sim/hooks.js'); const FR = await D('sim/furnishrun.js'); await D('sim/furnishacts.js');
let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.log('  FAIL', m); } };
seed(4);
const w = world(ext, 'house'); W.registerWorld(w);
globalThis.__ctx.characters = ['hana', 'boruto'].map(n => ({ avatar: `${n}.png`, name: n[0].toUpperCase() + n.slice(1), data: {} }));
const zone = w.homes.zones[0];
meta.mundi = { v: 1, world: 'house', lang: 'en', day: 3, minutes: 9 * 60, speed: 0, player: { loc: 'storage', home: { zone: zone.id, kind: zone.kind, x: zone.spots[0][0], y: zone.spots[0][1] }, stats: {}, money: 100, traits: {}, origin: '', job: null, rentPaidDay: 3 }, cast: {}, cfg: { rooms: w.places.map(p => p.id) } };
const g = store.game();
for (const a of ['hana.png', 'boruto.png']) { const r = gm.resident(w, a, homes.takenHomes(g), g.player.home); r.met = true; g.cast[a] = r; }
homes.normalizeHomes(g);
g.furnishx = { items: [], seq: 0, started: true };
const G = g;
const add = (o) => F.addFixture(G, o);
const acts = () => hooks.actionMods.reduce((l, f) => f(g, w, l), []);
const names = () => acts().map(a => a.name);
const doAct = (id) => { const a = acts().find(x => x.id === id); hooks.onAction.forEach(f => f(g, w, a)); return a; };

ok(FR.houseRooms(g, w).some(r => r.id === 'storage') && FR.houseRooms(g, w).some(r => r.id === 'living'), 'the house has a storage room and a living room');
const hh = add({ cat: 'handheld', room: 'storage', owner: 'house', via: 'found' });
const sofa = add({ cat: 'pooltable', room: 'storage', owner: 'house', via: 'hand' });
const deco = add({ name: 'A dusty painting', room: 'storage', owner: 'house', via: 'found' });
const hana = add({ cat: 'handheld', room: 'storage', owner: 'hana.png', via: 'hand' });
ok(hh && sofa && deco && hana, 'things made');
ok(F.catOf('handheld').size === 'small' && F.catOf('pooltable').size === 'big', 'the catalog says what is small');
ok(F.carryable(hh, 'storage') && !F.carryable(sofa, 'storage') && !F.carryable(deco, 'storage') && !F.carryable(hana, 'storage'), 'only small things, not decor, not someone else\'s');
let n = names();
ok(n.includes('Take the handheld game console to your room'), `in the storage room: the offer (${n.filter(x => /Take/.test(x))})`);
ok(!n.some(x => /pool table|painting/i.test(x) && /Take/.test(x)), 'not for a sofa or a painting');
ok(n.filter(x => /Take the .* to your room/.test(x)).length === 1, 'and not for Hana\'s own');

// carrying it: the minute, whose it is now, where it is, what it offers
const a = acts().find(x => x.id === `x-fx-carry-${hh.id}`);
ok(a && a.minutes === 1 && a.icon === '🎒', 'it takes a minute');
doAct(`x-fx-carry-${hh.id}`);
ok(hh.room === 'home:player' && hh.from === 'storage' && hh.ownerWas === 'house', 'it is in your room, and remembers where from and whose');
ok(hh.owner === 'player', 'found by you: it is yours now');
g.player.loc = 'home:player';
n = names();
ok(n.some(x => /game/i.test(x) && !/Take/.test(x)) , `in your room: "play games" is there (${n.filter(x => /game|Take/i.test(x))})`);
ok(n.includes('Take the handheld game console back to the storage room'), 'and the way back');
doAct(`x-fx-back-${hh.id}`);
ok(hh.room === 'storage' && hh.owner === 'house' && !hh.from && !hh.ownerWas, 'put back: where it was, as whose it was, nothing remembered');

// lent: the house's own (not found or bought by you) stays the house's
const lamp = add({ cat: 'handheld', room: 'living', owner: 'house', via: 'hand' });
g.player.loc = 'living'; doAct(`x-fx-carry-${lamp.id}`);
ok(lamp.room === 'home:player' && lamp.owner === 'house', 'a thing that was always the house\'s: still the house\'s (lent)');
// someone's bedroom: only what is yours
const mine = add({ cat: 'handheld', room: 'home:hana.png', owner: 'player', via: 'gift' }); const theirs = add({ cat: 'handheld', room: 'home:hana.png', owner: 'house', via: 'hand' });
ok(F.carryable(mine, 'home:hana.png') && !F.carryable(theirs, 'home:hana.png'), 'in someone\'s bedroom: only what is yours');
// not in your own room, and a full room takes nothing
ok(F.carryToYou(G, lamp.id) === null, 'already in your room: nothing to carry');
const hh2 = add({ cat: 'handheld', room: 'storage', owner: 'house', via: 'found' });
const f = F.furnishOf(G); f.limit = F.fixturesIn(G, 'home:player').length;
ok(F.roomFull(G, 'home:player'), 'your room is full');
g.player.loc = 'storage';
ok(!names().some(x => /^Take the .* to your room/.test(x)) && F.carryToYou(G, hh2.id) === null, 'a full room: no offer, no carrying');
f.limit = 15;
// moved by hand (the editor, the story): not "carried" any more
F.moveFixture(G, lamp.id, 'living'); ok(!lamp.from && !lamp.ownerWas, 'moved by hand: nothing remembered');
// back to a room that is gone: not possible
const t = add({ cat: 'handheld', room: 'storage', owner: 'house', via: 'found' }); F.carryToYou(G, t.id);
ok(F.carryBack(G, t.id, () => false) === null && t.room === 'home:player', 'its room is gone: it stays');
// carrying is upkeep: no reply of its own in "What matters"
const map = await D('ui/map.js');
ok(map.isRoutine({ id: `x-fx-carry-${hh.id}`, effects: {} }) && map.isRoutine({ id: 'x-fx-back-f1', effects: {} }) && !map.isRoutine({ id: 'x-fx-music', effects: {} }), 'carrying is told in a line, not a scene');
console.log(`carry: ${passes} checks passed${fails ? `, ${fails} FAILED` : ''}`);
if (fails) process.exit(1);
process.exit(0);
