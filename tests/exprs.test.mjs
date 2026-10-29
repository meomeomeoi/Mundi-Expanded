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

test('moves: rooms by name, own room, out of the house, follows; nonsense left out', () => {
    const places = [{ id: 'patio', name: 'Patio' }, { id: 'pool', name: 'Pool' }, { id: 'kitchen', name: 'Kitchen' }, { id: 'living', name: 'Living room' }];
    assert.equal(E.placeIn('the patio', places), 'patio'); assert.equal(E.placeIn('Own room', places), 'own'); assert.equal(E.placeIn('out of the house', places), 'out');
    assert.equal(E.placeIn('living', places), 'living'); assert.equal(E.placeIn('the moon', places), null);
    const r = E.parseMoves('{"faces": {"Kathie": "joy"}, "moves": {"Kathie": "Patio", "Masha": "her room", "Nobody": "Pool", "Finn": "Narnia"}, "follows": ["Finn", "Kathie"]}', people, places);
    assert.deepEqual(r.moves, { 'k.png': 'patio', 'm.png': 'own' }); assert.deepEqual(r.follows, ['f.png']);   // Kathie went: she does not follow
    assert.deepEqual(E.parseMoves('{"faces": {}, "moves": {}, "follows": []}', people, places), { moves: {}, follows: [] });
    assert.deepEqual(E.parseExprs('{"faces": {"Kathie": "joy"}, "moves": {"Kathie": "Patio"}}', people), { 'k.png': 'joy' });
});
test('the prompt asks for moves only with places', () => {
    assert.doesNotMatch(E.exprPrompt({ people, you: 'Maya', lines: [] }), /moves/);
    const p = E.exprPrompt({ people, you: 'Maya', lines: [], places: [{ id: 'patio', name: 'Patio' }] });
    assert.match(p, /"Patio", "own room" or "out of the house"/); assert.match(p, /"faces": \{/); assert.match(p, /not Maya/);
});

test('quick reactions (0.2.0.10): parsed, spaced out, written for the persona', () => {
    const b = E.parseBeat('{"faces":{"Masha":"joy"},"beat":{"kind":"tease","options":["Ha-ha, very funny","*rolls eyes*","Says the one who burned the rice"],"timer":true}}');
    assert.equal(b.kind, 'tease'); assert.equal(b.options.length, 3); assert.equal(b.timer, false, 'no timer for a tease');
    assert.equal(E.parseBeat('{"faces":{},"beat":null}'), null); assert.equal(E.parseBeat('{"beat":{"kind":"hug","options":["a","b"]}}'), null);
    assert.equal(E.parseBeat('{"beat":{"kind":"physical","options":["*catches it*","*ducks*"],"timer":true}}').timer, true);
    assert.ok(!E.beatAllowed('rare', 3)); assert.ok(E.beatAllowed('rare', 5)); assert.ok(!E.beatAllowed('off', 99)); assert.ok(E.beatAllowed('normal', 3));
    const p = E.exprPrompt({ people: [{ avatar: 'm', name: 'Masha', labels: [] }], you: 'Gleb', lines: [{ name: 'Masha', text: 'hi' }], beat: { persona: 'A shy student who rarely swears.' } });
    assert.match(p, /A shy student who rarely swears/); assert.match(p, /"beat": null or/); assert.match(p, /Never for serious or emotional moments/);
});

console.log(`exprs: ${n} tests passed`);
