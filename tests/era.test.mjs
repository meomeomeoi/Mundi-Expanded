// [expanded] Tests for the era (src/sim/era.ts, pure logic). Run: node tests/era.test.mjs
import assert from 'node:assert/strict';
import * as E from '../dist/sim/era.js';

let n = 0;
const test = (name, fn) => { try { fn(); n++; } catch (e) { console.error(`FAIL ${name}\n`, e); process.exit(1); } };
let uid = 10; const make = (data) => () => { const e = { uid: uid++, key: [], content: '' }; data.entries[e.uid] = e; return e; };

test('today by default: a smartphone, nothing for the texts', () => {
    const g = {}; assert.equal(E.eraxOf(g).era, 'now'); assert.equal(E.skinOf(g), 'phone'); assert.equal(E.eraTextLine(g), '');
    assert.equal(E.skinOf(null), 'phone');
});
test('the 2000s: a keypad phone suggested, short SMS without emoji', () => {
    const g = { erax: { era: '2000s', skin: 'keypad' } };
    assert.equal(E.eraDef(g).skin, 'keypad'); assert.match(E.eraTextLine(g), /SMS/); assert.match(E.eraTextLine(g), /no emoji/);
});
test('the lorebook entry: added once, updated in place, removed for today; other entries untouched', () => {
    const data = { entries: { 1: { uid: 1, comment: 'The house', content: 'A big house.' } } };
    assert.ok(E.eraEntry(data, E.ERAS[2], make(data)));
    const mine = () => Object.values(data.entries).filter(e => e.comment === E.LORE_COMMENT);
    assert.equal(mine().length, 1); assert.ok(mine()[0].constant); assert.match(mine()[0].content, /2000s/);
    E.eraEntry(data, E.ERAS[1], make(data));
    assert.equal(mine().length, 1, 'updated, not added'); assert.match(mine()[0].content, /2010s/);
    assert.ok(E.eraEntry(data, E.ERAS[0], make(data))); assert.equal(mine().length, 0);
    assert.equal(data.entries[1].content, 'A big house.');
    assert.ok(!E.eraEntry(data, E.ERAS[0], make(data)), 'nothing to remove: no save needed');
});
test('the scene gets the line only without a lorebook', () => {
    const g = { erax: { era: '2010s', skin: 'phone' } };
    assert.equal(E.eraPromptLine(g, true), ''); assert.match(E.eraPromptLine(g, false), /2010s/);
});
console.log(`era: ${n} tests passed`);
