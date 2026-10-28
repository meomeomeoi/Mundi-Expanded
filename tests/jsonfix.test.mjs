// [expanded] Tests for reading cut-off JSON (src/sim/jsonfix.ts). Run: node tests/jsonfix.test.mjs
import assert from 'node:assert/strict';
import { looseJson } from '../dist/sim/jsonfix.js';
import * as P from '../dist/sim/profile.js';

let n = 0;
const test = (name, fn) => { try { fn(); n++; } catch (e) { console.error(`FAIL ${name}\n`, e); process.exit(1); } };
// the real answer from Gemini 3.8 Flash, cut off after 889 tokens of thinking
const CUT = '{\n  "bed": 23,\n  "wake": 6,\n  "weekend": 1,\n  "social": 80,\n  "rooms": ["gym", "living", "pool"],\n  "acts": [\n    {"text": "high-energy morning workout", "where": "gym"},\n    {"text": "doing quick swimming laps", "where": "pool"},\n    {"text": "blending a fruit smoothie", "where": "kitchen';

test('whole JSON, with text around it', () => {
    assert.deepEqual(looseJson('Sure! {"a": 1, "b": [1, 2]} hope it helps'), { a: 1, b: [1, 2] });
});
test('cut off inside an object in an array: everything complete is kept, the last one without its cut field', () => {
    const x = looseJson(CUT);
    assert.equal(x.bed, 23); assert.deepEqual(x.rooms, ['gym', 'living', 'pool']);
    assert.equal(x.acts.length, 3); assert.equal(x.acts[1].text, 'doing quick swimming laps'); assert.deepEqual(x.acts[2], { text: 'blending a fruit smoothie' });
});
test('the cut-off profile is usable', () => {
    const p = P.parseProfile(CUT, ['living', 'kitchen', 'gym', 'pool']);
    assert.ok(p); assert.equal(p.wake, 6); assert.equal(p.social, 80); assert.equal(p.acts.length, 3); assert.equal(p.acts[2].where, 'common'); assert.equal(p.src, 'gen');
});
test('other cut points', () => {
    assert.deepEqual(looseJson('{"a": 1, "b": "hel'), { a: 1 });
    assert.deepEqual(looseJson('{"a": [1, 2, 3'), { a: [1, 2] });
    assert.deepEqual(looseJson('{"a": {"b": 1, "c": 2}, "d": [{"e": "x"}, {"e": "y", "f'), { a: { b: 1, c: 2 }, d: [{ e: 'x' }, { e: 'y' }] });
    assert.equal(looseJson('no json'), null); assert.equal(looseJson('{"a'), null);
    assert.deepEqual(looseJson('{"t": "a } inside", "u": "b'), { t: 'a } inside' });
});
console.log(`jsonfix: ${n} tests passed`);
