// [expanded] Tests for the characters' own plans (src/sim/cplans.ts, pure logic). Run: node tests/cplans.test.mjs
import assert from 'node:assert/strict';
import * as C from '../dist/sim/cplans.js';

let n = 0;
const test = (name, fn) => { try { fn(); n++; } catch (e) { console.error(`FAIL ${name}\n`, e); process.exit(1); } };
const H = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const ROOMS = ['living', 'kitchen', 'gym', 'pool'];
const person = (avatar, social = 50, free = (h) => h >= 10 && h < 23 && h !== 20) => ({ avatar, social, free });
const make = (o = {}) => ({ day: 5, people: [person('a'), person('b'), person('c'), person('d')], rooms: ROOMS, value: () => 50, recent: () => 0, likesYou: () => 50, roll: (k) => H(`5|${k}`), ...o });
const many = (o, days = 200) => { const out = []; for (let d = 1; d <= days; d++) out.push(...C.makeDayPlans(make({ day: d, roll: (k) => H(`${d}|${k}`), ...o }))); return out; };

test('pairs that get along make plans now and then; close friends more; never right after a fight', () => {
    assert.equal(C.pairChance(10, 50, 50, 0), 0); assert.equal(C.pairChance(60, 50, 50, -1), 0);
    assert.ok(C.pairChance(60, 50, 50, 0) > C.pairChance(30, 50, 50, 0));
    assert.ok(C.pairChance(60, 90, 90, 0) > C.pairChance(60, 20, 20, 0));
    const close = many({ value: () => 60 }).length, good = many({ value: () => 25 }).length, cold = many({ value: () => 0 }).length;
    assert.equal(cold, 0); assert.ok(close > good * 1.5, `${close} vs ${good}`);
});
test('at most two a day, one per person, at a time all of them are free', () => {
    for (let d = 1; d <= 300; d++) {
        const ps = C.makeDayPlans(make({ day: d, value: () => 90, people: [person('a', 100), person('b', 100), person('c', 100), person('d', 100), person('e', 100)], roll: (k) => H(`${d}|${k}`) }));
        assert.ok(ps.length <= C.MAX_A_DAY);
        const who = ps.flatMap(p => p.who); assert.equal(new Set(who).size, who.length);
        for (const p of ps) { const h0 = (p.from % 1440) / 60; for (let h = h0; h < (p.to % 1440 || 1440) / 60; h++) assert.ok(h !== 20 && h >= 10 && h < 23, `hour ${h}`); assert.equal(Math.floor(p.from / 1440), d); }
    }
});
test('homebodies stay in; social people go out, mostly in the evening', () => {
    const shy = many({ people: [person('a', 20), person('b', 20)], value: () => 70 });
    assert.ok(shy.length > 0 && shy.every(p => !p.out), 'homebodies: plans at home only');
    const out = many({ people: [person('a', 95), person('b', 95)], value: () => 70 }).filter(p => p.out);
    assert.ok(out.length > 5);
    assert.ok(out.filter(p => (p.from % 1440) / 60 >= 16).length > out.length * 0.7);
    assert.ok(many({ rooms: [] , people: [person('a', 10), person('b', 10)], value: () => 80 }).length === 0, 'no rooms for it: nothing at home');
});
test('a third joins now and then; the one who likes you most sometimes asks you along (afternoon on)', () => {
    const ps = many({ value: () => 70 }, 400);
    assert.ok(ps.some(p => p.who.length === 3) && ps.filter(p => p.who.length === 3).length < ps.length * 0.4);
    const inv = ps.filter(p => p.invite);
    assert.ok(inv.length > 0 && inv.length < ps.length * 0.5);
    assert.ok(inv.every(p => (p.from % 1440) / 60 >= 15 && p.who.includes(p.invite)));
    assert.equal(many({ value: () => 70, likesYou: () => 20 }).filter(p => p.invite).length, 0, 'nobody close to you: no invitations');
});
test('your plans with them come first', () => {
    const busy = (a, from, to) => a === 'a' && to - Math.floor(from / 1440) * 1440 > 15 * 60;   // you have plans with a from 15:00
    const ps = many({ busy, people: [person('a'), person('b')], value: () => 80 });
    for (const p of ps.filter(x => x.who.includes('a'))) assert.ok((p.to - Math.floor(p.from / 1440) * 1440) / 60 <= 15, `a plan with a at ${(p.from % 1440) / 60}`);
    assert.ok(ps.some(x => x.who.includes('a')), 'a still makes plans before 15:00');
});
test('a time taken by their own plan, and who outranks it', () => {
    const p = { id: 'x', who: ['a', 'b'], act: 'movie', place: 'living', from: 1000, to: 1120, state: 'set' };
    assert.equal(C.takenBy([p], 'a', 1100, 1200), p); assert.equal(C.takenBy([p], 'a', 1120, 1200), null); assert.equal(C.takenBy([{ ...p, you: 'yes' }], 'a', 1100, 1200), null);
    assert.ok(C.outranks(10, true, 90)); assert.ok(!C.outranks(60, false, 50)); assert.ok(C.outranks(90, false, 70)); assert.ok(!C.outranks(80, false, 70));
});
test('sometimes just no: upset, a homebody asked out, rarely the closer you are, never a partner unless upset', () => {
    const rate = (o) => { let k = 0; for (let i = 0; i < 1000; i++) if (C.softNo({ grudge: false, homebody: false, out: false, planToday: false, partner: false, bond: 40, ...o }, i / 1000)) k++; return k / 1000; };
    assert.ok(rate({}) < 0.06); assert.ok(rate({ grudge: true }) >= 0.3); assert.ok(rate({ homebody: true, out: true }) > rate({ homebody: true }));
    assert.ok(rate({ bond: 95 }) < rate({ bond: 10 })); assert.equal(rate({ partner: true }), 0); assert.ok(rate({ partner: true, grudge: true }) > 0);
    assert.match(C.softNo({ grudge: true, homebody: false, out: false, planToday: false, partner: false, bond: 0 }, 0), /upset/);
});
console.log(`cplans: ${n} tests passed`);
