// [expanded] Tests for expressions by a model (src/sim/exprs.ts, pure logic). Run: node tests/exprs.test.mjs
import assert from 'node:assert/strict';
import * as E from '../dist/sim/exprs.js';

let n = 0;
const test = (name, fn) => { try { fn(); n++; } catch (e) { console.error(`FAIL ${name}\n`, e); process.exit(1); } };
const ALL = E.EXPR_LABELS;
const people = [{ avatar: 'k.png', name: 'Kathie', labels: ALL }, { avatar: 'm.png', name: 'Masha', labels: ['neutral', 'annoyance', 'joy'] }, { avatar: 'f.png', name: 'Finn Walker', labels: [] }];

test('the prompt: everyone here, the lines, the labels, who has fewer', () => {
    const p = E.exprPrompt({ people, you: 'Maya', lines: [{ name: 'Finn Walker', text: 'Masha is basically a cat.' }] });
    assert.match(p, /people here: Kathie, Masha, Finn Walker/); assert.match(p, /Maya is the player/);
    assert.match(p, /Finn Walker: Masha is basically a cat\./); assert.match(p, /Masha has only: neutral, annoyance, joy/);
    assert.match(p, /did not speak too/); assert.doesNotMatch(p, /Kathie has only/);
});
test('the answer: labels by person, first names, case, cut off, unknown → neutral', () => {
    assert.deepEqual(E.parseExprs('```json\n{"Kathie": "Amusement", "Masha": "annoyance", "Finn": "joy"}\n```', people), { 'k.png': 'amusement', 'm.png': 'annoyance', 'f.png': 'joy' });
    assert.deepEqual(E.parseExprs('{"Masha": "smug", "Kathie": "amusem', people), { 'm.png': 'neutral' });   // no smug sprite; Kathie cut off
    assert.deepEqual(E.parseExprs('{"Nobody": "joy", "Kathie": 3}', people), {});
    assert.deepEqual(E.parseExprs('no json at all', people), {});
});

console.log(`exprs: ${n} tests passed`);
