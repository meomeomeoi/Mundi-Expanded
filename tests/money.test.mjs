// [expanded] Tests for money in a Home (src/sim/money.ts, pure logic). Run: node tests/money.test.mjs
import assert from 'node:assert/strict';
import * as M from '../dist/sim/money.js';
import * as S from '../dist/sim/stock.js';

let n = 0;
const test = (name, fn) => { try { fn(); n++; } catch (e) { console.error(`FAIL ${name}\n`, e); process.exit(1); } };
const cast = (...names) => Object.fromEntries(names.map(x => [`${x}.png`, { avatar: `${x}.png`, name: x }]));
const game = (day = 1) => ({ day, minutes: 600, cast: cast('Kathie', 'Finn', 'Masha'), player: { money: 0 } });

test('off by default; turning on gives a start once, after the difficulty', () => {
    const g = game();
    assert.equal(M.moneyOn(g), false);
    M.enable(g, true, 1);
    assert.equal(M.houseOf(g).fund, 250); assert.equal(g.player.money, 150);
    assert.equal(g.ledger[0].text, 'Your savings');
    M.enable(g, false); M.enable(g, true);
    assert.equal(M.houseOf(g).fund, 250, 'no second start');
    const g2 = game(); g2.player.money = 500; M.enable(g2, true, 0.6);
    assert.equal(g2.player.money, 500, 'money you already had is kept'); assert.equal(M.houseOf(g2).fund, 150);
});

test('wallet ↔ fund', () => {
    const g = game(); M.enable(g, true);
    assert.equal(M.contribute(g, 50), ''); assert.equal(g.player.money, 100); assert.equal(M.houseOf(g).fund, 300);
    assert.match(M.contribute(g, 1000), /do not have/);
    assert.equal(M.withdraw(g, 30), ''); assert.equal(g.player.money, 130);
    assert.match(M.withdraw(g, 9999), /fund does not/);
    assert.match(M.contribute(g, 0), /amount/);
});

test('the week: shares in (set or from a job), bills out, once, on days 1, 8, 15…', () => {
    const g = game(8); M.enable(g, true); M.houseOf(g).week = 1;
    M.houseOf(g).tiers['Kathie.png'] = 'high';
    const notes = M.week(g, 8, a => a === 'Finn.png');
    assert.match(notes[0], /Kathie, Finn chipped in/);
    assert.equal(M.houseOf(g).fund, 250 + 140 + 90 - 15 * 4);
    assert.deepEqual(M.week(g, 8), [], 'once a week');
    assert.deepEqual(M.week(g, 9), [], 'only on the first day of a week');
    assert.equal(M.houseOf(g).tight, false);
});

test('bills the fund cannot cover: money is tight, nothing goes below zero', () => {
    const g = game(15); M.enable(g, true); M.houseOf(g).fund = 20; M.houseOf(g).week = 8;
    const notes = M.week(g, 15);
    assert.equal(M.houseOf(g).fund, 0); assert.equal(M.houseOf(g).tight, true);
    assert.match(notes.join(' '), /money is tight/);
    assert.match(M.moneyLines(g, [], v => `$${v}`).join(' '), /Money is tight/);
});

test('groceries: the staples within a budget, food first, a bit of everything', () => {
    const g = game(); M.enable(g, true);
    const r = M.buyStaples(g, 10);
    assert.ok(r.spent <= 10 && r.n > 0);
    const kinds = new Set(S.stockOf(g).items.map(i => i.kind));
    assert.ok(kinds.has('food') || kinds.has('ingredient'));
    assert.ok(S.stockOf(g).items.length >= 4, 'round-robin: several different things');
    const g2 = game(); M.enable(g2, true);
    const full = M.payShop(g2, 'house');
    assert.equal(full.from, 'fund'); assert.ok(full.spent > 0);
    assert.equal(M.houseOf(g2).fund, Math.round((250 - full.spent) * 100) / 100);
    assert.equal(S.foodLevel(g2), 'ok');
    assert.equal(M.payShop(g2, 'house').n, 0, 'nothing short: nothing bought');
});

test('your grocery run is paid from the pool you chose; an empty pool buys nothing', () => {
    const g = game(); M.enable(g, true); M.houseOf(g).payFrom = 'wallet';
    const r = M.payShop(g, 'player'); assert.equal(r.from, 'wallet'); assert.ok(g.player.money < 150);
    const g2 = game(); M.enable(g2, true); M.houseOf(g2).fund = 0;
    assert.equal(M.payShop(g2, 'house').n, 0);
});

test('your job: a shift a day, pay after the difficulty, a bonus when working hard, raises', () => {
    const g = game(); M.enable(g, true);
    M.setJob(g, 'Barista', 90, 6);
    const r = M.work(g, 'normal', 1);
    assert.equal(r.pay, 90); assert.equal(g.player.money, 240);
    assert.equal(M.work(g, 'normal'), null, 'once a day');
    g.day++; const h = M.work(g, 'hard', 0.8, 0.1);
    assert.equal(h.bonus, Math.round(72 * 0.25)); assert.equal(h.pay, 72 + 18);
    for (let i = 0; i < 6; i++) { g.day++; M.work(g, 'normal'); }
    assert.equal(M.houseOf(g).job.rank, 1); assert.equal(M.shiftPay(M.houseOf(g).job), 103.5);
    M.setJob(g, '', 10, 8); assert.equal(M.houseOf(g).job, null, 'an empty name means no job');
});

test('debts: add, net out the other way, repay', () => {
    const g = game(); M.enable(g, true);
    M.addDebt(g, 'player', 'Kathie.png', 50, 'pizza');
    M.addDebt(g, 'player', 'Kathie.png', 20);
    assert.equal(M.houseOf(g).debts[0].amount, 70);
    assert.equal(M.addDebt(g, 'Kathie.png', 'player', 30), null, 'nets against what you owe her');
    assert.equal(M.houseOf(g).debts[0].amount, 40);
    assert.equal(M.repay(g, 'player', 'Kathie.png', 100), 40);
    assert.equal(M.houseOf(g).debts.length, 0);
    assert.equal(M.addDebt(g, 'player', 'player', 5), null);
});

test('scene line: wallet, fund, debts between the people here', () => {
    const g = game(); assert.deepEqual(M.moneyLines(g, [], String), [], 'off: nothing');
    M.enable(g, true); M.addDebt(g, 'Finn.png', 'player', 25); M.addDebt(g, 'Masha.png', 'Kathie.png', 10);
    const l = M.moneyLines(g, ['Finn.png'], v => `$${v}`);
    assert.match(l[0], /\{\{user\}\} has \$150; the house fund has \$250\./);
    assert.match(l[1], /Finn owes \{\{user\}\} \$25/);
    assert.ok(!l.join(' ').includes('Masha'), 'debts of people not here stay out');
});


test('gift limits: less each time that week, +8 a week, nothing above 80, bad ones in full', () => {
    const g = game(); M.enable(g, true);
    const give = (to, r, bond) => { const x = M.recordGift(g, 'player', to, 'x'); const d = M.giftDelta(g, to, r, bond, x.id); x.delta = d; return d; };
    assert.equal(give('Kathie.png', 'loved', 40), 6);
    assert.equal(give('Kathie.png', 'loved', 46), 2, 'second loved gift this week: 6/2=3, capped by the week (8-6=2)');
    assert.equal(give('Kathie.png', 'liked', 48), 0, 'week cap reached');
    assert.equal(give('Kathie.png', 'offended', 48), -6, 'a bad gift always counts in full');
    assert.equal(give('Finn.png', 'loved', 79), 1, 'only up to 80');
    assert.equal(give('Masha.png', 'loved', 85), 0, 'above 80: gifts alone do nothing');
    g.day += 7;
    assert.equal(give('Kathie.png', 'liked', 42), 3, 'a new week');
    assert.equal(M.giftDelta(g, 'Kathie.png', 'meh', 10), 0);
});

test('the gift to rate: the open one from the last two days, else a new one', () => {
    const g = game(); M.enable(g, true);
    const a = M.recordGift(g, 'player', 'Kathie.png', 'pudding');
    assert.equal(M.giftToRate(g, 'player', 'Kathie.png', 'pudding').id, a.id);
    a.delta = 3;
    assert.notEqual(M.giftToRate(g, 'player', 'Kathie.png', 'flowers').id, a.id, 'already rated: a new one');
});

test('money in the story: pay, lend, repay, the house fund; nothing with money off', () => {
    const g = game(); M.enable(g, true);
    const person = s => ({ gleb: 'player', kathie: 'Kathie.png', finn: 'Finn.png' })[s.toLowerCase()] ?? null;
    const raw = `GIFT | Gleb | Kathie | pudding | loved
PAY | Gleb | Finn | 20 | pizza
LEND | Kathie | Gleb | 50 | rent
REPAY | Gleb | Kathie | 30
PAY | Finn | house fund | 40 | his share
PAY | Gleb | Nobody | 10 | x
GIFT | Finn | Kathie | flowers | sort of liked it`;
    const ops = M.parseMoney(g, raw, 'Gleb', person);
    assert.deepEqual(ops.map(o => o.op), ['gift', 'pay', 'lend', 'repay', 'pay', 'gift']);
    assert.equal(ops.at(-1).rating, 'liked');
    const notes = M.applyMoney(g, ops, 'Gleb');
    assert.equal(g.player.money, 150 - 20 + 50 - 30);
    assert.equal(M.houseOf(g).fund, 290);
    assert.deepEqual(M.houseOf(g).debts.map(d => [d.from, d.to, d.amount]), [['player', 'Kathie.png', 20]]);
    assert.equal(notes.length, 4);
    const off = game(); M.applyMoney(off, M.parseMoney(off, 'PAY | Gleb | Finn | 20 | x', 'Gleb', person), 'Gleb');
    assert.equal(off.player.money, 0, 'money off: the story moves no money');
});

test('you cannot pay what you do not have', () => {
    const g = game(); M.enable(g, true);
    M.applyMoney(g, [{ op: 'pay', from: 'player', to: 'Finn.png', amount: 9999 }], 'Gleb');
    assert.equal(g.player.money, 150);
});

test('the fund: yours to take back, more only as a loan the house knows about', () => {
    const g = game(); M.enable(g, true); g.player.money = 100;
    assert.equal(M.mineOf(g), 0);
    assert.equal(M.withdraw(g, 40), 'borrow', 'nothing of yours in it: asks first');
    assert.equal(M.contribute(g, 50), ''); assert.equal(M.mineOf(g), 50);
    assert.equal(M.withdraw(g, 20), ''); assert.equal(M.mineOf(g), 30);
    assert.equal(M.withdraw(g, 50), 'borrow');
    const f0 = M.houseOf(g).fund;
    assert.equal(M.withdraw(g, 50, true), ''); assert.equal(M.mineOf(g), 0); assert.equal(M.owedToFund(g), 20);
    assert.equal(M.houseOf(g).fund, f0 - 50);
    assert.ok(M.moneyLines(g, [], v => String(v)).some(l => /owes the house fund 20/.test(l)), 'the scene knows');
    assert.equal(M.contribute(g, 30), ''); assert.equal(M.owedToFund(g), 0, 'paid back first'); assert.equal(M.mineOf(g), 10);
    // your share of the bills comes out of what is yours
    M.contribute(g, 40); const before = M.mineOf(g);
    M.week(g, 8); assert.equal(M.mineOf(g), before - M.BILL_PER_PERSON);
});

console.log(`money: ${n} tests passed`);
