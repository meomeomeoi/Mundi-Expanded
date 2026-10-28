// [expanded] Tests for slow burn (src/sim/slow.ts). Run: node tests/slow.test.mjs
import assert from 'node:assert/strict';
import * as L from '../dist/sim/slow.js';

let n = 0;
const test = (name, fn) => { try { fn(); n++; } catch (e) { console.error(`FAIL ${name}\n`, e); process.exit(1); } };

test('gains are halved and the fractions carry over', () => {
    const s = L.slowOf({});
    const got = [3, 3, 1, 1, 1, 1].map(d => L.scaleGain(s, 'b|k', d, 0.5));
    assert.deepEqual(got, [1, 2, 0, 1, 0, 1], 'over time exactly half: 10 → 5');
    assert.equal(L.scaleGain(s, 'b|k', -4, 0.5), -4, 'losses are not halved');
});

test('romance: halved, at most 2 a day, never above friendship − 25', () => {
    const s = L.slowOf({});
    assert.equal(L.romanceGain(s, 'k', 1, 9, 0, 80), 2, '9 → 4.5, capped at 2 a day');
    assert.equal(L.romanceGain(s, 'k', 1, 9, 2, 80), 0, 'the day\'s 2 are used');
    assert.equal(L.romanceGain(s, 'k', 2, 4, 2, 80), 2, 'a new day');
    assert.equal(L.romanceGain(s, 'm', 2, 9, 19, 45), 1, 'friendship 45: romance stops at 20');
    assert.equal(L.romanceGain(s, 'm', 3, 9, 20, 45), 0);
    assert.equal(L.romanceGain(s, 'm', 3, -6, 20, 45), -6, 'losses as they are');
});

test('who you know: everyone known the first time counts from the start; anyone later from that day', () => {
    const s = L.slowOf({});
    L.trackMet(s, ['a', 'b'], 10);
    L.trackMet(s, ['a', 'b', 'c'], 12);
    assert.equal(L.knownFor(s, 'a', 30), 'start');
    assert.equal(L.knownFor(s, 'c', 20), 8);
    assert.equal(L.knownFor(s, 'z', 20), null);
});

test('stranger to couple takes weeks: a simulation of nightly max gains', () => {
    const s = L.slowOf({}); let bond = 0, rom = 0, day = 0;
    // every day: the most upstream gives (15 talking, already halved by upstream's difficulty, +9 verdict, +8 a date)
    while (day < 200) {
        day++;
        bond = Math.min(100, bond + Math.round(15 * 0.5) + L.scaleGain(s, 'b', 9, 0.5) + L.scaleGain(s, 'b', 8, 0.5));
        rom += L.romanceGain(s, 'k', day, 9, rom, bond);
        if (rom * 0.6 + bond * 0.4 >= 45 + 15) break;   // upstream: "would very likely say yes" to being a couple
    }
    assert.ok(day >= 17, `at the very most every single day it still takes ${day} days`);
});

console.log(`slow: ${n} tests passed`);
