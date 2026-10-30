// [expanded] Chores (0.2.1-15.1): the week's rota exists as soon as it is asked for, not only after the first midnight,
// so the room's action is there from the first day ("Wash the dishes" in the kitchen) and the Chores page names people.
// Run: node tests/chores.test.mjs [repo root]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stage, browser, seed, world } from './env.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = process.argv[2] ?? path.join(here, '..');
const ext = stage(root, 'chores');
const meta = {}; browser(meta);
const D = (p) => import(`${ext}/dist/${p}`);
const store = await D('core/store.js'); const W = await D('core/world.js'); await D('core/saves.js');
const gm = await D('sim/game.js'); const homes = await D('sim/homes.js'); const R = await D('sim/ownrun.js'); const hooks = await D('sim/hooks.js'); const O = await D('sim/own.js');
let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.log('  FAIL', m); } };
seed(2);
const w = world(ext, 'house'); W.registerWorld(w);
globalThis.__ctx.characters = ['hana', 'boruto'].map(n => ({ avatar: `${n}.png`, name: n[0].toUpperCase() + n.slice(1), data: {} }));
const zone = w.homes.zones[0];
meta.mundi = { v: 1, world: 'house', lang: 'en', day: 1, minutes: 9 * 60, speed: 0, player: { loc: 'kitchen', home: { zone: zone.id, kind: zone.kind, x: zone.spots[0][0], y: zone.spots[0][1] }, stats: {}, money: 100, traits: {}, origin: '', job: null, rentPaidDay: 1 }, cast: {}, cfg: { rooms: w.places.map(p => p.id) } };
const g = store.game();
for (const a of ['hana.png', 'boruto.png']) { const r = gm.resident(w, a, homes.takenHomes(g), g.player.home); r.met = true; g.cast[a] = r; }
homes.normalizeHomes(g);
const actions = () => hooks.actionMods.reduce((l, f) => f(g, w, l), []).map(a => a.name);

ok(R.ownOf(g).chores.week === -1 && !Object.keys(R.ownOf(g).chores.rota).length, 'a new game: no rota yet (it used to wait for the first midnight)');
const kitchen = actions();
ok(kitchen.some(n => /^Wash the dishes \(/.test(n)) && kitchen.some(n => /^Take out the trash \(/.test(n)), `the kitchen offers the dishes and the trash on day 1 (${kitchen.filter(n => /Wash|trash/.test(n))})`);
const x = R.ownOf(g).chores;
ok(x.week === 0 && O.CHORES.every(c => x.rota[c.id]), 'every chore has someone\'s turn, from the first day');
ok(new Set(Object.values(x.rota)).size >= 2 && Object.values(x.rota).some(a => a === '__you'), 'it goes round the people, you too');
g.player.loc = 'living'; ok(actions().some(n => /^Clean the common rooms \(/.test(n)), 'the living room: the common rooms');
g.player.loc = 'bathroom'; ok(actions().some(n => /^Clean the bathroom \(/.test(n)), 'the bathroom: the bathroom');
g.player.loc = 'garage'; ok(!actions().some(n => /Wash the dishes|trash|Clean the/.test(n)), 'no chore in a room it does not belong to');

// asking again does not shuffle it, or forget what was done
x.done.dishes = 3; const before = JSON.stringify(x.rota); R.ensureRota(g);
ok(JSON.stringify(R.ownOf(g).chores.rota) === before && R.ownOf(g).chores.done.dishes === 3, 'asked again the same week: nothing changes');
// a new week: new rota, the count starts again, an undone weekly chore of yours is remembered
const mine = O.CHORES.find(c => x.rota[c.id] === '__you' && c.per < 7);
g.day = 8; R.ensureRota(g);
ok(R.ownOf(g).chores.week === 1 && !R.ownOf(g).chores.done.dishes, 'the next week: a new rota, counts start again');
ok(!mine || R.ownOf(g).chores.skipped.some(s => s.a === '__you' && s.c === mine.id), 'a weekly chore of yours left undone is counted');
// off: nothing
R.ownOf(g).cfg.chores = 'off'; R.ownOf(g).chores.week = -1; R.ownOf(g).chores.rota = {}; g.player.loc = 'kitchen'; g.day = 1;
ok(!actions().some(n => /Wash the dishes/.test(n)) && !Object.keys(R.ownOf(g).chores.rota).length, 'chores off: no actions, no rota');
console.log(`chores: ${passes} checks passed${fails ? `, ${fails} FAILED` : ''}`);
if (fails) process.exit(1);
process.exit(0);
