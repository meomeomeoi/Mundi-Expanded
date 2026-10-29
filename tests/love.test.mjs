// [expanded] Tests for feelings between characters (src/sim/love.ts). Run: node tests/love.test.mjs
import assert from 'node:assert/strict';
import * as L from '../dist/sim/love.js';
import * as P from '../dist/sim/profile.js';
import * as LI from '../dist/sim/secrets.js';

let n = 0;
const test = (name, fn) => { try { fn(); n++; } catch (e) { console.error(`FAIL ${name}\n`, e); process.exit(1); } };

test('who can fall for whom', () => {
    assert.ok(L.canFall('straight', 'f', 'm')); assert.ok(!L.canFall('straight', 'f', 'f'));
    assert.ok(L.canFall('lesbian', 'f', 'f')); assert.ok(!L.canFall('lesbian', 'f', 'm'));
    assert.ok(L.canFall('gay', 'm', 'm')); assert.ok(!L.canFall('gay', 'm', 'f'));
    assert.ok(L.canFall('bi', 'm', 'f') && L.canFall('', 'f', 'f')); assert.ok(!L.canFall('ace', 'f', 'm'));
    assert.ok(L.canFall('straight', '', 'f'), 'unknown gender: allowed');
    assert.equal(P.genderOf('She is a nurse. Her sister lives abroad.'), 'f'); assert.equal(P.genderOf('He works nights; his car is old.'), 'm'); assert.equal(P.genderOf('A quiet person.'), '');
});

test('feelings grow one way, fade, and make a couple only both ways', () => {
    const g = { bonds: {} };
    assert.equal(L.grow(g, 'k', 'l', 3, 1, { can: true, taken: false }), 15);
    assert.equal(L.feelings(g, 'k', 'l'), 15); assert.equal(L.feelings(g, 'l', 'k'), 0, 'one way');
    assert.equal(L.grow(g, 'k', 'l', 3, 1, { can: false, taken: false }), 0, 'not their orientation');
    assert.equal(L.grow(g, 'k', 'l', 2, 1, { can: true, taken: true }), 4, 'slower with a partner outside');
    for (let i = 0; i < 5; i++) L.grow(g, 'k', 'l', 3, 2, { can: true, taken: false });
    assert.equal(L.loveWord(L.feelings(g, 'k', 'l')), 'in love'); assert.ok(!L.mutual(g, 'k', 'l'));
    for (let i = 0; i < 3; i++) L.grow(g, 'l', 'k', 3, 2, { can: true, taken: false });
    assert.ok(L.mutual(g, 'k', 'l'));
    L.fade(g, 30, () => false); assert.equal(L.feelings(g, 'l', 'k'), 44);
    L.fade(g, 31, () => true); assert.equal(L.feelings(g, 'l', 'k'), 44, 'a couple does not fade');
    L.loveOf(g).on = false; assert.equal(L.grow(g, 'k', 'l', 3, 40, { can: true, taken: false }), 0, 'switched off');
});

test('sparks and how flirting lands', () => {
    const find = (q) => ({ kathie: 'k', leah: 'l', gleb: '__you' })[q.trim().toLowerCase()] ?? null;
    assert.deepEqual(L.parseSparks('SPARK | Kathie > Leah | +2 | held her gaze\nSPARK | Gleb <> Leah | +1 | flirted\nSPARK | Kathie > Kathie | +1 | x', find),
        [{ a: 'k', b: 'l', d: 2, text: 'held her gaze' }, { a: '__you', b: 'l', d: 1, text: 'flirted' }, { a: 'l', b: '__you', d: 1, text: 'flirted' }]);
    assert.equal(L.flirtMood({ romance: 50, partnerHere: false, taken: false, grudge: false }), 'welcome');
    assert.equal(L.flirtMood({ romance: 20, partnerHere: false, taken: false, grudge: false }), 'flustered');
    assert.equal(L.flirtMood({ romance: 60, partnerHere: true, taken: false, grudge: false }), 'uncomfortable');
});

test('listening at a door: caught more often the nosier, and each time again', () => {
    assert.equal(LI.caughtChance([], 0), 0, 'asleep inside: nobody to catch you');
    assert.ok(LI.caughtChance([20], 0) < LI.caughtChance([90], 0));
    assert.ok(LI.caughtChance([50], 2) > LI.caughtChance([50], 0)); assert.ok(LI.caughtChance([100], 9) <= 0.6);
});

test('nights from the reader', () => {
    const find = (q) => ({ kathie: 'k', leah: 'l', gleb: '__you' })[q.trim().toLowerCase()] ?? null;
    assert.deepEqual(L.parseNights('NIGHT | Kathie & Leah | Leah\'s room | secret\nNIGHT | Gleb & Kathie | your room\nNIGHT | Kathie', find),
        [{ who: ['k', 'l'], where: "Leah's room", secret: true }, { who: ['__you', 'k'], where: 'your room', secret: false }]);
});

console.log(`love: ${n} tests passed`);
