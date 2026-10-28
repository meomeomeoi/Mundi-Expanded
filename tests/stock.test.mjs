// [expanded] Tests for the house's things (src/sim/stock.ts, pure logic). Run: node tests/stock.test.mjs
import assert from 'node:assert/strict';
import * as S from '../dist/sim/stock.js';

let n = 0;
const test = (name, fn) => { try { fn(); n++; } catch (e) { console.error(`FAIL ${name}\n`, e); process.exit(1); } };
const cast = (...names) => Object.fromEntries(names.map(x => [`${x}.png`, { avatar: `${x}.png`, name: x }]));
const game = (day = 1) => ({ day, cast: cast('Kathie', 'Finn', 'Masha') });
const qty = (g, name, store) => S.stockOf(g).items.filter(i => i.name.toLowerCase() === name.toLowerCase() && (!store || i.store === store)).reduce((a, i) => a + i.qty, 0);

test('a new Home starts with a stocked kitchen, once', () => {
    const g = game(); S.seed(g);
    assert.equal(qty(g, 'Eggs', 'fridge'), 10); assert.equal(qty(g, 'Coffee', 'pantry'), 12);
    assert.equal(S.foodLevel(g), 'ok');
    S.useItem(g, S.findItem(g, 'eggs'), 10); S.seed(g);
    assert.equal(qty(g, 'Eggs'), 0, 'seeding never runs twice');
});

test('adding merges the same thing with the same owner; catalog things get their kind', () => {
    const g = game();
    S.addItem(g, 'fridge', 'pudding', 1, 'Kathie.png');
    S.addItem(g, 'fridge', 'Pudding', 2, 'Kathie.png');
    S.addItem(g, 'fridge', 'Pudding', 1);
    const items = S.itemsIn(g, 'fridge');
    assert.equal(items.length, 2);
    assert.equal(items.find(i => i.owner === 'Kathie.png').qty, 3);
    assert.equal(items[0].kind, 'snack'); assert.equal(items[0].cat, 'pudding');
    const c = S.addItem(g, 'room:Finn.png', 'Old guitar', 1);
    assert.equal(c.kind, 'thing');
    assert.equal(S.addItem(g, 'room:Nobody.png', 'x'), null, 'unknown rooms refused');
    assert.equal(S.addItem(g, 'fridge', '  ', 1), null);
});

test('actions: blocked when there is nothing, take what they need, cooking leaves leftovers', () => {
    const g = game();
    assert.match(S.blockedBy(g, 'cook'), /Nothing to cook with/);
    assert.match(S.blockedBy(g, 'coffee'), /coffee has run out/);
    assert.equal(S.blockedBy(g, 'water'), '', 'tap water is free');
    S.addItem(g, 'fridge', 'Eggs', 1);
    assert.match(S.blockedBy(g, 'cook'), /Nothing to cook/, 'two ingredients needed');
    S.addItem(g, 'pantry', 'Pasta', 3);
    assert.equal(S.blockedBy(g, 'cook'), '');
    const used = S.doAction(g, 'cook');
    assert.deepEqual(used.sort(), ['Eggs', 'Pasta'], 'one of each where possible');
    assert.equal(qty(g, 'Leftovers', 'fridge'), 1);
    assert.deepEqual(S.doAction(g, 'snack'), ['Leftovers'], 'leftovers go first');
});

test('someone else\'s labelled food is never taken; yours is', () => {
    const g = game();
    S.addItem(g, 'fridge', 'Pudding', 1, 'Kathie.png');
    assert.match(S.blockedBy(g, 'snack'), /nothing for a snack/);
    S.addItem(g, 'fridge', 'Pudding', 1, S.PLAYER);
    assert.equal(S.blockedBy(g, 'snack'), '');
    S.doAction(g, 'snack');
    assert.equal(qty(g, 'Pudding'), 1); assert.equal(S.stockOf(g).items[0].owner, 'Kathie.png');
});

test('each day the house eats, once a day; household things go down every 4 days', () => {
    const g = game(4); S.seed(g);
    const before = S.stockOf(g).items.filter(i => ['food', 'ingredient', 'snack'].includes(i.kind)).reduce((a, i) => a + i.qty, 0);
    S.eatDay(g, 4, ['Kathie.png', 'Finn.png', 'Masha.png']); S.eatDay(g, 4, ['Kathie.png', 'Finn.png', 'Masha.png']);
    const after = S.stockOf(g).items.filter(i => ['food', 'ingredient', 'snack'].includes(i.kind)).reduce((a, i) => a + i.qty, 0);
    assert.equal(before - after, 3);
    assert.equal(qty(g, 'Toilet paper'), 7);
});

test('food level and the housemates\' grocery run (not two days running)', () => {
    const g = game(5);
    assert.equal(S.foodLevel(g), 'empty');
    const r = S.houseShop(g, 5, ['Finn.png']);
    assert.equal(r.who, 'Finn.png'); assert.ok(r.n > 50);
    assert.equal(S.foodLevel(g), 'ok');
    for (const it of [...S.stockOf(g).items]) S.useItem(g, it, it.qty);
    assert.equal(S.houseShop(g, 6, ['Finn.png']), null, 'shopped yesterday');
    assert.ok(S.houseShop(g, 7, ['Finn.png']));
    assert.equal(S.houseShop(g, 9, ['Finn.png']), null, 'food is ok: nobody shops');
});

test('restock only tops up the shared staples', () => {
    const g = game();
    S.addItem(g, 'fridge', 'Milk', 5); S.addItem(g, 'fridge', 'Eggs', 3, 'Kathie.png');
    S.restock(g);
    assert.equal(qty(g, 'Milk'), 5, 'already above the basket');
    assert.equal(S.stockOf(g).items.find(i => i.name === 'Eggs' && !i.owner).qty, 10, 'Kathie\'s eggs do not count');
});

test('errands: asked, run at night (or forgotten), the player\'s wait for a shop', () => {
    const g = game(3);
    assert.ok(S.addErrand(g, 'Kathie.png', 'Finn.png', 'pudding'));
    assert.equal(S.addErrand(g, 'Kathie.png', 'Finn.png', 'Pudding'), null, 'no duplicates');
    assert.equal(S.addErrand(g, 'Kathie.png', 'Kathie.png', 'x'), null);
    S.addErrand(g, 'Masha.png', S.PLAYER, 'manga');
    let done = 0, guard = 0;
    while (S.stockOf(g).errands.some(e => e.by === 'Finn.png') && guard++ < 10) { done += S.runErrands(g, g.day).done.length; g.day++; }
    assert.equal(done, 1);
    const pud = S.stockOf(g).items.find(i => i.name === 'Pudding');
    assert.equal(pud.owner, 'Kathie.png'); assert.equal(pud.store, 'fridge');
    assert.equal(S.stockOf(g).errands.length, 1, 'the player\'s errand waits');
    const r = S.playerShopped(g);
    assert.equal(r.errands.length, 1);
    const manga = S.stockOf(g).items.find(i => i.name === 'manga');
    assert.equal(manga.store, 'room:Masha.png'); assert.equal(manga.owner, 'Masha.png');
    assert.ok(S.SHOP_PLACE.test('the supermarket')); assert.ok(S.SHOP_PLACE.test('Пятёрочка, продуктовый магазин')); assert.ok(!S.SHOP_PLACE.test('the beach'));
});

test('an errand forgotten three times is dropped', () => {
    const g = game(1); const e = S.addErrand(g, 'Kathie.png', 'Finn.png', 'x');
    e.tries = 2;
    // find a day when it is forgotten
    let day = 1; while (day < 500) { const g2 = structuredClone(g); const r = S.runErrands(g2, day); if (r.dropped.length) break; day++; }
    const r = S.runErrands(g, day);
    assert.equal(r.dropped.length, 1); assert.equal(S.stockOf(g).errands.length, 0);
});

test('reading the story: storages and people by name, junk dropped, capped', () => {
    const g = game(); S.seed(g);
    S.addItem(g, 'fridge', 'Pudding', 1, 'Kathie.png');
    const raw = `<think>…</think>
- USE | fridge | milk | 1
USE | the fridge | Eggs | 3
ADD | Finn's room | Switch | 1 | Finn
MOVE | fridge | Masha's room | Pudding | 1 | Masha
ASK | Kathie | Finn | strawberry pudding | x
ASK | Kathie | Nobody | x
USE | garage | car | 1
ADD | your room | flowers | 1 | Gleb
DONE | Finn | nothing open
NONE`;
    const ops = S.parseRead(g, raw, 'Gleb');
    assert.deepEqual(ops.map(o => o.op), ['use', 'use', 'add', 'move', 'ask', 'add', 'done']);
    const ch = S.applyRead(g, ops, 'Gleb');
    assert.equal(qty(g, 'Milk'), 1); assert.equal(qty(g, 'Eggs'), 7);
    assert.equal(S.stockOf(g).items.find(i => i.name === 'Switch').store, 'room:Finn.png');
    const pud = S.stockOf(g).items.find(i => i.name === 'Pudding');
    assert.equal(pud.store, 'room:Masha.png'); assert.equal(pud.owner, 'Masha.png', 'given: the new owner');
    assert.equal(S.stockOf(g).items.find(i => i.name === 'flowers').owner, S.PLAYER);
    assert.equal(S.stockOf(g).errands.length, 1);
    assert.ok(ch.some(c => c.kind === 'ask'));
    const many = Array.from({ length: 40 }, () => 'USE | fridge | eggs | 1').join('\n');
    assert.equal(S.parseRead(g, many, 'Gleb').length, 12, 'a runaway reply is capped');
});

test('an errand is closed when the thing arrives in the story', () => {
    const g = game();
    S.addErrand(g, 'Kathie.png', 'Finn.png', 'pudding');
    S.applyRead(g, S.parseRead(g, 'ADD | fridge | Pudding | 1 | Kathie', 'Gleb'), 'Gleb');
    assert.equal(S.stockOf(g).errands.length, 0);
    S.addErrand(g, 'Masha.png', 'Finn.png', 'tea');
    S.applyRead(g, S.parseRead(g, 'DONE | Finn | tea', 'Gleb'), 'Gleb');
    assert.equal(S.stockOf(g).errands.length, 0);
    assert.equal(S.stockOf(g).items.find(i => i.name === 'Tea').owner, 'Masha.png');
});

test('scene lines: the kitchen, a shared bedroom, low food, errands of the people here', () => {
    const g = game();
    S.addItem(g, 'fridge', 'Pudding', 1, 'Kathie.png'); S.addItem(g, 'pantry', 'Chips', 1);
    S.addItem(g, 'room:Finn.png', 'Switch', 1, 'Finn.png');
    S.addErrand(g, 'Kathie.png', 'Finn.png', 'milk'); S.addErrand(g, 'Masha.png', S.PLAYER, 'manga');
    const k = S.stockLines(g, ['kitchen'], ['Kathie.png']);
    assert.match(k[0], /^In the kitchen\. Fridge: Pudding \(Kathie's\)\. Pantry: Chips\./);
    assert.match(k.join('\n'), /running low/);
    assert.match(k.join('\n'), /Finn is to bring milk for Kathie/);
    assert.match(k.join('\n'), /\{\{user\}\} is to bring manga for Masha/, 'the player\'s own errands are always told');
    const room = S.stockLines(g, ['room:Finn.png', 'room:Masha.png'], []);
    assert.match(room[0], /In Finn's room: Switch \(Finn's\)\./);
    assert.ok(!room.join('\n').includes('Masha\'s room'), 'an empty room says nothing');
    S.restock(g); S.stockOf(g).errands = [];
    assert.deepEqual(S.stockLines(g, [], []), [], 'nothing to say elsewhere');
});

test('the read prompt lists the house and the format', () => {
    const g = game(); S.addItem(g, 'fridge', 'Milk', 1);
    const p = S.readPrompt(g, 'Kathie: I drank the last milk.', 'Gleb');
    assert.match(p, /Gleb \(the player\), Kathie, Finn, Masha/);
    assert.match(p, /- fridge: Milk/); assert.match(p, /- Gleb's room: empty/);
    assert.match(p, /USE \| where \| thing \| how many/); assert.match(p, /answer only: NONE/);
});

console.log(`stock: ${n} tests passed`);
