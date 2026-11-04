// [expanded] 0.2.1-15.4: boxes unpacked in the hallway, birthdays on/off and announced, how they feel about you,
// and "Redo the night" taking back what a reading wrote. Run: node tests/rel154.test.mjs [repo root]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stage, browser, seed, world } from './env.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = process.argv[2] ?? path.join(here, '..');
const ext = stage(root, 'rel154');
const meta = {}; browser(meta);
const D = (p) => import(`${ext}/dist/${p}`);
const store = await D('core/store.js'); const W = await D('core/world.js'); await D('core/saves.js');
const gm = await D('sim/game.js'); const homes = await D('sim/homes.js'); const R = await D('sim/ownrun.js'); const hooks = await D('sim/hooks.js'); const O = await D('sim/own.js');
const FR = await D('sim/furnishrun.js'); const F = await D('sim/furnish.js'); await D('sim/furnishacts.js'); const OR = await D('sim/orders.js');
const FS = await D('sim/feelset.js'); const RM = await D('sim/romance.js'); const LV = await D('sim/love.js'); const B = await D('sim/bonds.js'); const RN = await D('sim/redonight.js');
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
const actions = () => hooks.actionMods.reduce((l, f) => f(g, w, l), []);

// --- boxes in the hallway
if (FR.furnishOn(w)) {
    FR.seedCommon(g, w); const hall = FR.hallOf(g, w); ok(!!hall, 'the house has a hallway');
    g.player.loc = hall;
    ok(!actions().some(a => a.id === 'x-fx-unbox'), 'no box, no action');
    const room = FR.houseRooms(g, w).find(r => r.owner === 'player');
    ok(OR.placeOrder(g, w, { cat: 'tv', room: room.id, owner: 'player', pay: 'wallet', now: true }) === '', 'an order is placed');
    F.arrived(g, store.nowAbs(g) + 1);
    ok(F.ordersOf(g).some(o => o.state === 'here'), 'the box is in the hallway');
    const act = actions().find(a => a.id === 'x-fx-unbox'); ok(!!act, 'the hallway offers "Unpack the deliveries"');
    hooks.onAction.forEach(f => f(g, w, act));
    ok(F.ordersOf(g).length === 0 && F.fixturesIn(g, room.id).some(x => x.cat === 'tv'), 'unpacking sets the thing up in its room');
    g.player.loc = 'kitchen';
    ok(!actions().some(a => a.id === 'x-fx-unbox'), 'the action is for the hallway only');
} else console.log('  (skipped: this world is not furnished)');

// --- birthdays
const x = R.ownOf(g); const sd = Math.round(g.cfg?.seasonDays ?? 14);
g.day = 20; x.cal.bday['hana.png'] = O.dayOfYear(23, sd);   // in three days
const hooksOn = () => hooks.onDay.flatMap(f => { try { return f(g, w); } catch { return []; } });
ok(R.ocfg(g).birthdays === true, 'birthdays are on by default');
ok(hooksOn().some(t => /Hana's birthday is in 3 days/.test(t)), 'announced three days before');
x.cal.bday['hana.png'] = O.dayOfYear(21, sd);
ok(hooksOn().some(t => /Hana's birthday is tomorrow/.test(t)), 'and the day before');
x.cfg.birthdays = false;
ok(!hooksOn().some(t => /birthday/.test(t)), 'off: nothing announced');
ok(!R.upcoming(g, 7).some(e => /birthday/.test(e.text)), 'off: not in the calendar');

// --- how they feel about you
FS.setFeel(g, 'hana.png', 'love-secret', g.day);
ok(RM.romValue(g, 'hana.png') === 75 && !LV.loveOf(g).said?.['hana.png>__you'] && FS.feelOf(g, 'hana.png') === 'love-secret', 'secretly in love: a high romance, never said');
FS.setFeel(g, 'hana.png', 'like-told', g.day);
ok(RM.romValue(g, 'hana.png') === 45 && !!LV.loveOf(g).said['hana.png>__you'], 'a crush they told you about');

// --- redo the night: what the last reading wrote is taken back, the numbers with it
const gl = g;
B.syncTies(gl);
const day = 5;
const c = B.applyChange(gl, ['hana.png', 'boruto.png'], 2, 'They argued over the dishes.', 'offscreen', { day });
const before = B.pairOf(gl, 'hana.png', 'boruto.png').v;
ok(c && B.factsOfPair(gl, 'hana.png', 'boruto.png').length >= 1, 'a night moment is written');
const mine = B.addFact(gl, [B.YOU, 'hana.png'], 'You cooked together.', 'episode', 'scene', undefined, { seen: [B.YOU], day }); mine.w = 3;
RN.undoNight(g, 'interactions', day);
ok(B.pairOf(gl, 'hana.png', 'boruto.png').v === before - 2 * B.STEP, 'interactions: the numbers it moved are taken back');
ok(!B.bondsOf(gl).facts.some(f => f.text === 'They argued over the dishes.'), 'interactions: the moment is gone');
ok(B.bondsOf(gl).facts.some(f => f.text === 'You cooked together.'), 'interactions: your own moments stay');
RN.undoNight(g, 'memory', day);
ok(!B.bondsOf(gl).facts.some(f => f.text === 'You cooked together.'), 'memory: the weighed moments of that day are taken back');
const mx = (g.memx ??= { cfg: {}, arc: {}, know: { 'hana.png>boruto.png': [{ id: 'k1', day, text: 'Boruto snores.' }, { id: 'k2', day: 2, text: 'Boruto cooks.' }] }, story: {}, own: {}, seq: 2 });
RN.undoNight(g, 'learned', day);
ok(mx.know['hana.png>boruto.png'].length === 1 && mx.know['hana.png>boruto.png'][0].id === 'k2', 'learned: only that day\'s notes go');
ok(RN.nightRec(g) === null, 'no night is kept before the first sleep');
RN.recordNight(g, 7, { start: 3, end: 9 }); ok(RN.nightRec(g)?.day === 7 && RN.nightRec(g).end === 9, 'a night is kept for redoing');

console.log(`15.4: ${passes} checks passed${fails ? `, ${fails} FAILED` : ''}`);
if (fails) process.exit(1);
process.exit(0);
