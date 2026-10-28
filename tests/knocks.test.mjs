// [expanded] Tests for night visits (src/sim/knocks.ts, pure logic). Run: node tests/knocks.test.mjs
import assert from 'node:assert/strict';
import * as K from '../dist/sim/knocks.js';

let n = 0;
const test = (name, fn) => { try { fn(); n++; } catch (e) { console.error(`FAIL ${name}\n`, e); process.exit(1); } };
const c = (o = {}) => ({ avatar: 'a', bond: 50, romance: 0, partner: false, grudge: false, owl: false, ...o });
const rate = (cands, often) => { let k = 0; for (let i = 0; i < 1000; i++) if (K.pickVisitor(cands, often, 10, i / 1000, 0.5, 0.5)) k++; return k / 1000; };

test('not for people you are not close to; off is off', () => {
    assert.equal(K.weightOf(c({ bond: 20 }), 10), 0);
    assert.equal(rate([c({ bond: 90, romance: 80 })], 'off'), 0);
});
test('rare by default; romance and closeness make it likelier', () => {
    const friend = rate([c({ bond: 50 })], 'rare'), lover = rate([c({ bond: 70, romance: 70, partner: true })], 'rare');
    assert.ok(friend > 0 && friend < 0.02, `friend ${friend}`); assert.ok(lover > friend, `lover ${lover}`);
    assert.ok(rate([c({ bond: 50 })], 'often') > friend * 2);
});
test('not the same person two nights running (unless a partner)', () => {
    assert.ok(K.weightOf(c({ lastVisit: 9 }), 10) < K.weightOf(c(), 10) / 3);
    assert.equal(K.weightOf(c({ partner: true, lastVisit: 9 }), 10), K.weightOf(c({ partner: true }), 10));
});
test('the reason follows from what happened', () => {
    assert.match(K.pickVisitor([c({ grudge: true })], 'often', 1, 0, 0, 0).reason, /what happened/);
    assert.match(K.pickVisitor([c({ vent: 'Masha' })], 'often', 1, 0, 0, 0).reason, /vent about Masha/);
    assert.ok(/close|tea|misses/.test(K.pickVisitor([c({ romance: 60 })], 'often', 1, 0, 0, 0).reason));
});
test('after midnight is still the night before', () => {
    assert.equal(K.nightOf(5, 2), 4); assert.equal(K.nightOf(5, 23), 5);
});
console.log(`knocks: ${n} tests passed`);
