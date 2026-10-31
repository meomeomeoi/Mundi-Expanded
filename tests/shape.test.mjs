// [expanded] Tests for how a line is shaped (src/sim/shape.ts) and for a reply that came with its own wrapping
// (src/sim/cleanreply.ts), pure text. Run: node tests/shape.test.mjs
import assert from 'node:assert/strict';
import { shape, freeLine, marked } from '../dist/sim/shape.js';
import { cleanReply } from '../dist/sim/cleanreply.js';

let n = 0;
const test = (name, fn) => { try { fn(); n++; } catch (e) { console.error(`FAIL ${name}\n`, e); process.exit(1); } };

test('Say and Do as before for plain lines', () => {
    assert.equal(shape('say', 'Anyone home?'), '"Anyone home?"');
    assert.equal(shape('say', '"Already quoted"'), '"Already quoted"'); assert.equal(shape('say', '*waves*'), '*waves*');
    assert.equal(shape('do', 'opens the fridge'), '*opens the fridge*'); assert.equal(shape('do', '*already*'), '*already*');
    assert.equal(shape('story', 'it rains'), '[Story direction: it rains]');
    assert.match(shape('see', 'the shelf'), /^\*looks at the shelf\* \[Describe what \{\{user\}\} sees\.\]$/);
});
test('a line with its own markup goes as written, in Say and in Do', () => {
    for (const l of ['*looks down at my shirt* "At least my zippers work."', '"Hey, they\'re comfortable!" *looks down* "Right?"', 'He said "stop" and I stopped', '*sits* then *smiles*']) {
        assert.equal(shape('say', l), l, `say: ${l}`); assert.equal(shape('do', l), l, `do: ${l}`);
    }
    assert.ok(marked('a "b" c') && marked('a *b* c') && !marked('plain') && !marked("don't") && !marked('one " only'));
    assert.equal(shape('do', 'it\'s fine'), '*it\'s fine*', 'an apostrophe is not a quote');
    assert.equal(shape('say', 'five o\'clock'), '"five o\'clock"');
});
test('Free: quotes are speech, the rest is what you do', () => {
    assert.equal(freeLine('I walk into the kitchen and say "Hi"'), '*I walk into the kitchen and say* "Hi"');
    assert.equal(freeLine('"Hello." I put the bag down. "Anyone hungry?" I open the fridge'), '"Hello." *I put the bag down.* "Anyone hungry?" *I open the fridge*');
    assert.equal(freeLine('“Привет” я захожу на кухню'), '“Привет” *я захожу на кухню*');
    assert.equal(freeLine('«Есть кто?» — спрашиваю я'), '«Есть кто?» *— спрашиваю я*');
    assert.equal(freeLine('I sit down'), '*I sit down*', 'no quotes, no asterisks: all action');
    assert.equal(freeLine('*already* "Fine" more'), '*already* "Fine" *more*', 'what has asterisks keeps them');
    assert.equal(freeLine('"Just speech"'), '"Just speech"');
    assert.equal(shape('free', '  "Hi" I wave  '), '"Hi" *I wave*'); assert.equal(shape('free', ''), '');
});
test('a reply with a leaked header and its own name: taken off the start', () => {
    const r = '**[Group Chat: Evelyn, Finn, Kathie, Leah, Masha, Ruby]**\n\n**Leah:** Six across was \'stacks\'. Puzzle\'s done.';
    assert.equal(cleanReply(r, 'Leah'), 'Six across was \'stacks\'. Puzzle\'s done.');
    assert.equal(cleanReply('[Group Chat: A, B]\nLeah: hi', 'Leah'), 'hi');
    assert.equal(cleanReply('**Leah**: hi', 'Leah'), 'hi'); assert.equal(cleanReply('*Leah:* hi', 'Leah'), 'hi'); assert.equal(cleanReply('Leah: hi', 'Leah'), 'hi'); assert.equal(cleanReply('[Leah] hi', 'Leah'), 'hi');
    assert.equal(cleanReply('**Mira Voss:** hi', 'Mira Voss'), 'hi'); assert.equal(cleanReply('Mira: hi', 'Mira Voss'), 'hi', 'the first name too');
});
test('and nothing else: names inside the text, other speakers, empty results', () => {
    for (const t of ['Leah is right, you know.', 'She said Leah: no way.', '*Leah smiles* hi', '"Leah:" he read aloud', 'Finn: hi', '**Finn:** hi', 'Hello [Group Chat] there']) assert.equal(cleanReply(t, 'Leah'), t, t);
    assert.equal(cleanReply('Leah:', 'Leah'), 'Leah:', 'a label and nothing else is left alone');
    assert.equal(cleanReply('', 'Leah'), ''); assert.equal(cleanReply('hi', 'L'), 'hi');
    assert.equal(cleanReply('**[Group Chat: A]**\n**[Group Chat: B]**\ntext', 'Leah'), 'text', 'a header or two');
});
console.log(`shape: ${n} tests passed`);
