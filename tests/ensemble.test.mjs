// [expanded] Tests for one reply for the whole room (src/sim/ensemble.ts, pure logic). Run: node tests/ensemble.test.mjs
import assert from 'node:assert/strict';
import * as E from '../dist/sim/ensemble.js';

let n = 0;
const test = (name, fn) => { try { fn(); n++; } catch (e) { console.error(`FAIL ${name}\n`, e); process.exit(1); } };
const cast = [{ avatar: 'm.png', name: 'Mira Voss' }, { avatar: 'f.png', name: 'Finn' }, { avatar: 'e.png', name: 'Evelyn' }];
const P = (raw, max = 3, user = 'Gleb', partial = false) => E.parseEnsemble(raw, cast, user, max, partial);

test('a normal beat: people in order, actions kept', () => {
    const r = P('[Mira]\n*puts the plate down.* "Not my turn."\n\n[Finn]\n"It is so your turn."\n\n[Mira]\n"Prove it."');
    assert.deepEqual(r.blocks.map(b => b.who), ['m.png', 'f.png', 'm.png']);
    assert.equal(r.blocks[0].text, '*puts the plate down.* "Not my turn."');
    assert.deepEqual(r.dropped, []);
});
test('text before the first header is narration', () => {
    const r = P('The kitchen goes quiet.\n\n[Evelyn]\n"Sit down, kid."');
    assert.deepEqual(r.blocks.map(b => b.who), [E.NARRATION, 'e.png']);
    assert.equal(r.blocks[0].text, 'The kitchen goes quiet.');
});
test('the player\'s name or {{user}} as a header: dropped, and reported', () => {
    const r = P('[Mira]\n"Well?"\n[Gleb]\n"I think you are both wrong."\n[Finn]\n"Hey!"\n[{{user}}]\nmore');
    assert.deepEqual(r.blocks.map(b => b.who), ['m.png', 'f.png']);
    assert.ok(!r.blocks.some(b => /wrong|more/.test(b.text)));
    assert.deepEqual(r.dropped, ['Gleb', '{{user}}']);
});
test('names: full, first name, any case; an unknown name is not a header', () => {
    assert.equal(E.whoIs('mira voss', cast).avatar, 'm.png'); assert.equal(E.whoIs('MIRA', cast).avatar, 'm.png'); assert.equal(E.whoIs('Mira V.', cast).avatar, 'm.png');
    assert.equal(E.whoIs('Nobody', cast), null);
    const r = P('[Finn]\n"Look."\n[Sam]\nhe waves\n"Hi."');
    assert.deepEqual(r.blocks.map(b => b.who), ['f.png']); assert.match(r.blocks[0].text, /He waves|he waves/); assert.match(r.blocks[0].text, /"Hi\."/);
});
test('the same person in a row is one part', () => {
    const r = P('[Finn]\n"One."\n[Finn]\n"Two."\n[Mira]\n"Three."');
    assert.equal(r.blocks.length, 2); assert.equal(r.blocks[0].text, '"One."\n\n"Two."');
});
test('more people\'s parts than the most: cut; one narration part at most', () => {
    const raw = '[Mira]\na\n[Finn]\nb\n[Narration]\nA pause.\n[Evelyn]\nc\n[Mira]\nd\n[Narration]\nAnother.';
    const r = P(raw, 3);
    assert.deepEqual(r.blocks.map(b => b.who), ['m.png', 'f.png', E.NARRATION, 'e.png']);
    assert.deepEqual(P(raw, 2).blocks.map(b => b.who), ['m.png', 'f.png', E.NARRATION]);
});
test('rubbish: "Name:" instead of "[Name]" is one narration part; nothing is ever lost', () => {
    const r = P('Mira: "Not my turn."\nFinn: "It is."');
    assert.equal(r.blocks.length, 1); assert.equal(r.blocks[0].who, E.NARRATION); assert.match(r.blocks[0].text, /Finn: "It is\."/);
    assert.deepEqual(P('   \n  ').blocks, []);
});
test('headers in other shapes: bold, colon, text on the same line', () => {
    const r = P('**[Mira]**\n"a"\n[Finn]: "b"\n[evelyn] "c"');
    assert.deepEqual(r.blocks.map(b => [b.who, b.text]), [['m.png', '"a"'], ['f.png', '"b"'], ['e.png', '"c"']]);
});
test('streaming: a header cut off in the middle is not shown yet', () => {
    assert.deepEqual(P('[Mira]\n"Not my turn."\n[Fi', 3, 'Gleb', true).blocks.map(b => b.who), ['m.png']);
    assert.deepEqual(P('[Mira]\n"Not my turn."\n[Fi', 3, 'Gleb', false).blocks.map(b => b.who), ['m.png']);   // (not a known header either way)
    assert.match(P('[Mira]\n"Not my turn."\n[Fi', 3, 'Gleb', false).blocks[0].text, /\[Fi$/);
    assert.doesNotMatch(P('[Mira]\n"Not my turn."\n[Fi', 3, 'Gleb', true).blocks[0].text, /\[Fi/);
});
test('the instruction: names, who speaks, the format, no cards when they are in the prompt', () => {
    const p = E.beatPrompt({ names: ['Mira', 'Finn'], speakers: ['Finn'], to: 'room', max: 3 });
    assert.match(p, /as the people in this scene: Mira and Finn/); assert.match(p, /spoke to everyone here/); assert.match(p, /Likely to speak: Finn/);
    assert.match(p, /for example \[Mira\]/); assert.match(p, /at most 3 parts/); assert.match(p, /Never write \{\{user\}\}/); assert.doesNotMatch(p, /Who is here/);
    const q = E.beatPrompt({ names: ['Mira', 'Finn'], to: 'some', toNames: ['Mira'], max: 2, cast: [{ name: 'Mira', about: 'sharp-tongued', doing: 'cooking' }] });
    assert.match(q, /spoke to Mira\./); assert.match(q, /- Mira: sharp-tongued \(right now: cooking\)/); assert.doesNotMatch(q, /Likely to speak/);
    assert.match(E.toLine({ to: 'none' }), /lets them go on/); assert.match(E.toLine({ to: 'story' }), /direction for the story/);
});
console.log(`ensemble: ${n} tests passed`);
