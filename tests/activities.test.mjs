// [expanded] Tests for plan activities and group plans (src/sim/activities.ts, pure logic). Run: node tests/activities.test.mjs
import assert from 'node:assert/strict';
import * as A from '../dist/sim/activities.js';
import * as M from '../dist/sim/money.js';
import * as S from '../dist/sim/stock.js';

let n = 0;
const test = (name, fn) => { try { fn(); n++; } catch (e) { console.error(`FAIL ${name}\n`, e); process.exit(1); } };
const cast = (...names) => Object.fromEntries(names.map(x => [`${x}.png`, { avatar: `${x}.png`, name: x }]));
const game = (day = 3) => ({ day, minutes: 600, cast: cast('Kathie', 'Finn'), player: { money: 0 } });

test('meta is kept apart, only for known activities, and tidied with old plans', () => {
    const g = game();
    A.setMeta(g, 'a1', { act: 'movie' }); A.setMeta(g, 'a2', { act: 'nope' }); A.setMeta(g, 'a3', { act: 'cook', group: 'g1', treat: true });
    assert.deepEqual(A.metaOf(g, 'a1'), { act: 'movie' });
    assert.equal(A.metaOf(g, 'a2'), null, 'unknown activity, no group: nothing stored');
    assert.deepEqual(A.metaOf(g, 'a3'), { act: 'cook', group: 'g1', treat: true });
    g.plansx.done.old = 1; g.plansx.done.g1 = 3;
    A.tidy(g, ['a3'], 10);
    assert.equal(A.metaOf(g, 'a1'), null); assert.ok(A.metaOf(g, 'a3'));
    assert.ok(!('old' in g.plansx.done)); assert.ok('g1' in g.plansx.done);
});

test('cooking together takes ingredients and leaves leftovers; without any it falls back', () => {
    const g = game(); S.addItem(g, 'fridge', 'Chicken', 1); S.addItem(g, 'pantry', 'Rice', 1);
    const cook = A.actOf('cook');
    assert.equal(A.actBlocked(g, cook), '');
    const o = A.happen(g, cook, 'p1', 1, false);
    assert.ok(o.first && o.used.length >= 1, 'used ' + o.used); assert.equal(o.stats.hunger, 55); assert.equal(o.failed, '');
    assert.ok(S.stockOf(g).items.some(i => i.name === 'Leftovers'));
    const g2 = game();
    assert.ok(A.actBlocked(g2, cook).length > 0);
    const o2 = A.happen(g2, cook, 'p2', 1, false);
    assert.ok(o2.failed.length > 0); assert.equal(o2.stats.hunger, 30); assert.ok(o2.bond >= 1);
    assert.ok(g2.plansx.notes.p2.includes('nothing to cook'));
});

test('once per group: later arrivals only get the closeness', () => {
    const g = game(); S.addItem(g, 'pantry', 'Chips', 2);
    const movie = A.actOf('movie');
    const a = A.happen(g, movie, 'g1', 2, false);
    const b = A.happen(g, movie, 'g1', 2, false);
    assert.ok(a.first && !b.first);
    assert.deepEqual(b.stats, {}); assert.equal(b.bond, movie.bond); assert.deepEqual(b.used, []);
    assert.equal(S.stockOf(g).items.find(i => i.name === 'Chips').qty, 1, 'one snack shared');
});

test('out: your share or the whole bill, only with money on, never into the red', () => {
    const g = game(); const dinner = A.actOf('dinner');
    const off = A.happen(g, dinner, 'x0', 2, true);
    assert.equal(off.paid, 0, 'money off: free');
    M.enable(g, true); g.player.money = 100;
    const mine = A.happen(g, dinner, 'x1', 2, false);
    assert.equal(mine.paid, 18); assert.equal(g.player.money, 82);
    const all = A.happen(g, dinner, 'x2', 2, true, 1.5);
    assert.equal(all.paid, Math.round(18 * 1.5 * 3)); assert.equal(all.bond, dinner.bond + 1, 'treating is a little extra closeness');
    g.player.money = 10;
    const short = A.happen(g, dinner, 'x3', 1, true);
    assert.equal(short.paid, 10); assert.equal(g.player.money, 0);
    assert.ok(short.lines.some(l => /short of money/.test(l)));
    assert.ok(g.ledger.some(e => /paid for everyone/.test(e.text)));
});

test('every activity has a place: a room at home or somewhere out', () => {
    for (const a of A.ACTIVITIES) assert.ok(!!a.home !== !!a.out, a.id);
    assert.ok(A.ACTIVITIES.some(a => a.out && S.SHOP_PLACE.test(a.out)), 'the grocery run counts as shopping when you come back');
});

console.log(`activities: ${n} tests passed`);
