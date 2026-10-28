// [expanded] Tests for the relationships between characters (src/sim/bonds.ts, pure logic). Run: node tests/bonds.test.mjs
import assert from 'node:assert/strict';
import * as B from '../dist/sim/bonds.js';

let n = 0;
const test = (name, fn) => { try { fn(); n++; } catch (e) { console.error(`FAIL ${name}\n`, e); process.exit(1); } };
const cast = (...names) => Object.fromEntries(names.map(x => [`${x}.png`, { avatar: `${x}.png`, name: x }]));
const game = (ties = [], day = 1) => ({ day, cast: cast('Mia', 'Rin', 'Sora', 'Kai'), living: { ties } });
const tie = (a, b, tone, type = 'friend') => ({ a: `${a}.png`, b: `${b}.png`, type, tone });

test('tone thresholds keep anchors in their own tone', () => {
    for (const t of B.TONES) assert.equal(B.toneOf(B.ANCHOR[t]), t);
    assert.equal(B.toneOf(14), 'neutral'); assert.equal(B.toneOf(15), 'good'); assert.equal(B.toneOf(-15), 'tense'); assert.equal(B.toneOf(-45), 'hostile');
});

test('pairs start from the tie set at creation, or 0', () => {
    const g = game([tie('Mia', 'Rin', 'good'), tie('Sora', 'Kai', 'hostile', 'rival')]);
    B.syncTies(g);
    assert.equal(B.valueOf(g, 'Mia.png', 'Rin.png'), 30);
    assert.equal(B.valueOf(g, 'Rin.png', 'Mia.png'), 30, 'symmetric');
    assert.equal(B.valueOf(g, 'Sora.png', 'Kai.png'), -60);
    assert.equal(B.valueOf(g, 'Mia.png', 'Kai.png'), 0);
});

test('ties with the player and unknown people are ignored', () => {
    const g = game([{ a: '__you', b: 'Mia.png', type: 'friend', tone: 'close' }, tie('Mia', 'Ghost', 'close')]);
    B.syncTies(g);
    assert.deepEqual(Object.keys(B.bondsOf(g).pairs), []);
});

test('a change moves the value, writes an episode, and the tone back to the tie', () => {
    const g = game([tie('Mia', 'Rin', 'good')]);
    const c = B.applyChange(g, ['Mia.png', 'Rin.png'], -3, 'They fought over the TV.', 'scene');
    assert.equal(c.delta, -3);
    assert.equal(B.valueOf(g, 'Mia.png', 'Rin.png'), 21);
    assert.equal(g.living.ties[0].tone, 'good', 'still good at 21');
    B.applyChange(g, ['Rin.png', 'Mia.png'], -3, 'Again.', 'scene');
    assert.equal(B.valueOf(g, 'Mia.png', 'Rin.png'), 12);
    assert.equal(g.living.ties[0].tone, 'neutral', 'crossed into neutral: the tie follows');
    B.syncTies(g);
    assert.equal(B.valueOf(g, 'Mia.png', 'Rin.png'), 12, 'our own write-back is not mistaken for an outside change');
    const eps = B.factsOfPair(g, 'Mia.png', 'Rin.png');
    assert.equal(eps.length, 2); assert.equal(eps[0].kind, 'episode'); assert.equal(eps[0].delta, -3); assert.equal(eps[0].src, 'scene');
});

test('a pair without a tie is never added to upstream ties', () => {
    const g = game([]);
    B.applyChange(g, ['Mia.png', 'Kai.png'], 3, 'Cooked together.', 'offscreen');
    assert.equal(g.living.ties.length, 0);
    assert.equal(B.valueOf(g, 'Mia.png', 'Kai.png'), 9);
});

test('a tone changed outside (upstream feud, the world settings) re-anchors the value', () => {
    const g = game([tie('Mia', 'Rin', 'good')]);
    B.applyChange(g, ['Mia.png', 'Rin.png'], 3, 'Nice day.', 'scene');
    assert.equal(B.valueOf(g, 'Mia.png', 'Rin.png'), 39);
    g.living.ties[0].tone = 'tense';
    B.syncTies(g);
    assert.equal(B.valueOf(g, 'Mia.png', 'Rin.png'), -30);
    assert.equal(B.pairOf(g, 'Mia.png', 'Rin.png').base, -30);
});

test('a tie added later to a known pair anchors it', () => {
    const g = game([]);
    B.applyChange(g, ['Mia.png', 'Rin.png'], 2, 'x', 'scene');
    g.living.ties.push(tie('Mia', 'Rin', 'close'));
    B.syncTies(g);
    assert.equal(B.valueOf(g, 'Mia.png', 'Rin.png'), 60);
});

test('three people: every pair among them moves, one fact', () => {
    const g = game([]);
    B.applyChange(g, ['Mia.png', 'Rin.png', 'Sora.png'], 2, 'Game night.', 'offscreen');
    for (const [a, b] of [['Mia', 'Rin'], ['Mia', 'Sora'], ['Rin', 'Sora']]) assert.equal(B.valueOf(g, `${a}.png`, `${b}.png`), 6);
    assert.equal(B.bondsOf(g).facts.length, 1);
    assert.equal(B.factsOfPair(g, 'Rin.png', 'Sora.png').length, 1);
});

test('changes are clamped and bad ones refused', () => {
    const g = game([]);
    B.applyChange(g, ['Mia.png', 'Rin.png'], 9, 'big', 'scene');
    assert.equal(B.valueOf(g, 'Mia.png', 'Rin.png'), 9, 'steps clamp to 3');
    assert.equal(B.applyChange(g, ['Mia.png'], 1, 'alone', 'scene'), null);
    assert.equal(B.applyChange(g, ['Mia.png', 'Nobody.png'], 1, 'x', 'scene'), null);
    assert.equal(B.applyChange(g, ['Mia.png', 'Rin.png', 'Sora.png', 'Kai.png'], 1, 'four', 'scene'), null);
    assert.equal(B.applyChange(g, ['Mia.png', 'Rin.png'], 1, '   ', 'scene'), null);
    for (let i = 0; i < 50; i++) B.applyChange(g, ['Mia.png', 'Rin.png'], 3, 'up', 'scene');
    assert.equal(B.valueOf(g, 'Mia.png', 'Rin.png'), 100);
});

test('drift: only after a quiet week, one point a day, once a day', () => {
    const g = game([tie('Mia', 'Rin', 'good')]);
    B.applyChange(g, ['Mia.png', 'Rin.png'], 3, 'x', 'scene');   // day 1 → 39
    for (let d = 2; d <= 7; d++) { g.day = d; B.drift(g); }
    assert.equal(B.valueOf(g, 'Mia.png', 'Rin.png'), 39, 'not yet a week');
    g.day = 8; B.drift(g); B.drift(g);
    assert.equal(B.valueOf(g, 'Mia.png', 'Rin.png'), 38, 'one point, once');
    for (let d = 9; d < 40; d++) { g.day = d; B.drift(g); }
    assert.equal(B.valueOf(g, 'Mia.png', 'Rin.png'), 30, 'stops at the base');
});

test('setValue moves the base too and writes the tone back', () => {
    const g = game([tie('Mia', 'Rin', 'good')]);
    B.setValue(g, 'Mia.png', 'Rin.png', -70);
    assert.equal(B.valueOf(g, 'Mia.png', 'Rin.png'), -70);
    assert.equal(B.pairOf(g, 'Mia.png', 'Rin.png').base, -70);
    assert.equal(g.living.ties[0].tone, 'hostile');
    B.syncTies(g);
    assert.equal(B.valueOf(g, 'Mia.png', 'Rin.png'), -70);
});

test('facts: add, edit, pin, remove; standing facts are never trimmed', () => {
    const g = game([]);
    const f = B.addFact(g, ['Mia.png', 'Rin.png'], 'Mia always beats Rin at fighting games.');
    assert.equal(f.kind, 'standing'); assert.equal(f.src, 'user');
    assert.equal(B.addFact(g, ['Mia.png'], 'x'), null);
    assert.ok(B.editFact(g, f.id, 'Changed.')); assert.equal(B.factById(g, f.id).text, 'Changed.');
    assert.equal(B.editFact(g, f.id, '  '), false);
    for (let i = 0; i < 320; i++) B.applyChange(g, ['Sora.png', 'Kai.png'], 0, `ep ${i}`, 'offscreen');
    const facts = B.bondsOf(g).facts;
    assert.equal(facts.filter(x => x.kind === 'episode').length, 300);
    assert.ok(B.factById(g, f.id), 'the standing fact survives');
    assert.equal(facts.filter(x => x.kind === 'episode')[0].text, 'ep 20', 'oldest episodes went first');
    const ep = facts.find(x => x.kind === 'episode');
    B.pinFact(g, ep.id); assert.equal(B.factById(g, ep.id).kind, 'standing');
    assert.ok(B.removeFact(g, f.id)); assert.equal(B.factById(g, f.id), null);
    const ids = new Set(B.bondsOf(g).facts.map(x => x.id)); assert.equal(ids.size, B.bondsOf(g).facts.length, 'ids unique');
});

test('personality: the "# Personality" part of a headed card', () => {
    const card = `{{// image here}}\n\n# Overview {\nA girl.\n}\n\n# Origin {\nBorn in a town.\n}\n\n# Personality {\nCalm and detached.\n\n## Worldview {\nNothing matters much.\n}\n\n## Likes/Dislikes {\nLikes rain.\n}\n\n## Intimacy {\n}}\n\n# Skills {\nCooking.\n}`;
    const p = B.personalityOf(card);
    assert.match(p, /Calm and detached/); assert.match(p, /Nothing matters much/); assert.match(p, /Likes rain/);
    assert.doesNotMatch(p, /Cooking|Born in a town|A girl/);
    assert.doesNotMatch(p, /[{}]/);
    assert.equal(B.personalityOf('Just a plain description.', 'shy'), 'shy\nJust a plain description.');
    assert.ok(B.personalityOf('x'.repeat(2000)).length <= 701);
    const last = B.personalityOf('# Personality {\nLast section.\n}');
    assert.equal(last, 'Last section.');
});

const people = Object.values(cast('Mia', 'Rin', 'Sora', 'Kai'));
test('night reply: both parts, names, steps, junk', () => {
    const raw = `<think>hmm</think>\n**SCENE**\n- Mia & Rin | -2 | Mia mocked Rin's cooking.\nRin & Ghost | +1 | nope\nMia & Mia | +1 | nope\nnot a line\n## OFF-SCREEN\nSora и Kai | +1 | They played cards.\nKai & Rin | +1 | second, dropped (calm)`;
    const out = B.parseNight(raw, people, 'calm');
    assert.equal(out.length, 2);
    assert.deepEqual(out[0], { who: ['Mia.png', 'Rin.png'], delta: -2, text: "Mia mocked Rin's cooking.", src: 'scene' });
    assert.deepEqual(out[1].who, ['Sora.png', 'Kai.png']); assert.equal(out[1].src, 'offscreen');
});

test('night reply: calm clamps to ±1 and two people; off drops off-screen; lively allows one big moment', () => {
    const raw = 'SCENE\nNONE\nOFF-SCREEN\nMia & Rin & Sora | +2 | trio\nMia & Kai | -3 | big\nRin & Kai | +3 | big2\nSora & Kai | +1 | small\nMia & Sora | +1 | fourth';
    const calm = B.parseNight(raw, people, 'calm');
    assert.equal(calm.length, 1); assert.equal(calm[0].delta, -1); assert.deepEqual(calm[0].who, ['Mia.png', 'Kai.png']);
    assert.equal(B.parseNight(raw, people, 'off').length, 0);
    const lively = B.parseNight(raw, people, 'lively');
    assert.equal(lively.length, 3);
    assert.equal(lively[1].delta, -3); assert.equal(lively[2].delta, 2, 'the second ±3 becomes ±2');
    assert.equal(lively[0].who.length, 3);
});

test('night reply: no headers means nothing; loose first names match when unique', () => {
    assert.equal(B.parseNight('Mia & Rin | +1 | x', people, 'calm').length, 0);
    const ppl = [{ avatar: 'a', name: 'Kanna Kirahoshi' }, { avatar: 'b', name: 'Rin' }];
    const out = B.parseNight('SCENE\nKanna & rin | +1 | ok\nOFF-SCREEN\nNONE', ppl, 'calm');
    assert.deepEqual(out[0].who, ['a', 'b']);
});

test('scene prompt: pairs here first, then standing facts about people not here, within budget', () => {
    const g = game([tie('Mia', 'Rin', 'close', 'sibling')]);
    B.addFact(g, ['Mia.png', 'Rin.png'], 'Mia always beats Rin at fighting games.');
    B.applyChange(g, ['Mia.png', 'Rin.png'], -1, 'Rin slammed the door after losing.', 'scene');
    B.addFact(g, ['Mia.png', 'Kai.png'], 'Mia secretly admires Kai.');
    B.applyChange(g, ['Mia.png', 'Kai.png'], 1, 'An episode about someone not here.', 'scene');
    const lines = B.bondsLines(g, ['Mia.png', 'Rin.png']);
    assert.match(lines[0], /get along with each other/);
    assert.match(lines[1], /^Mia & Rin: very close\. Mia always beats Rin.*\(day 1\) Rin slammed/);
    assert.match(lines[2], /^Mia about Kai \(not here\): neutral\. Mia secretly admires Kai\.$/);
    assert.ok(!lines.join('\n').includes('An episode about someone not here'), 'episodes of absent pairs stay out');
    assert.deepEqual(B.bondsLines(g, []), []);
    assert.deepEqual(B.bondsLines(game([]), ['Mia.png', 'Rin.png']), [], 'nothing to say: nothing sent');
    const tiny = B.bondsLines(g, ['Mia.png', 'Rin.png'], 60);
    assert.ok(tiny.length <= 1, 'over budget: lines are dropped');
});

test('night prompt: life setting and scenes', () => {
    const g = game([tie('Mia', 'Rin', 'good')]);
    const base = { day: 3, user: 'Gleb', people: people.map(p => ({ ...p, personality: 'calm' })), convo: 'Mia: hi\nRin: hey', spoke: ['Mia.png', 'Rin.png'] };
    const calm = B.nightPrompt(g, { ...base, life: 'calm' });
    assert.match(calm, /At most ONE small everyday moment/); assert.match(calm, /What was said today:\nMia: hi/); assert.match(calm, /Mia & Rin: on good terms/);
    assert.match(B.nightPrompt(g, { ...base, life: 'lively' }), /Up to THREE moments/);
    assert.match(B.nightPrompt(g, { ...base, life: 'off' }), /Turned off: write NONE/);
    assert.match(B.nightPrompt(g, { ...base, spoke: ['Mia.png'], life: 'calm' }), /no scenes with two of them today/);
});


test('status: set, flip, remove; between characters the tone follows the value and is not re-anchored', () => {
    const g = game([]);
    B.applyChange(g, ['Mia.png', 'Rin.png'], -3, 'x', 'scene'); B.applyChange(g, ['Mia.png', 'Rin.png'], -3, 'y', 'scene');   // -18: tense
    B.setStatus(g, 'Mia.png', 'Rin.png', 'rival');
    assert.deepEqual(g.living.ties, [{ a: 'Mia.png', b: 'Rin.png', type: 'rival', tone: 'tense' }]);
    B.syncTies(g); assert.equal(B.valueOf(g, 'Mia.png', 'Rin.png'), -18, 'setting a status does not reset the value');
    B.setStatus(g, 'Rin.png', 'Mia.png', 'mentor');
    assert.equal(g.living.ties.length, 1); assert.equal(g.living.ties[0].a, 'Rin.png'); assert.equal(g.living.ties[0].type, 'mentor');
    B.setStatus(g, 'Mia.png', 'Rin.png', '');
    assert.equal(g.living.ties.length, 0); assert.equal(B.valueOf(g, 'Mia.png', 'Rin.png'), -18);
    B.setStatus(g, 'Mia.png', 'Ghost.png', 'friend'); assert.equal(g.living.ties.length, 0, 'unknown people refused');
});

test('status with the player: kept as upstream writes it, tone kept or neutral, no value of ours', () => {
    const g = game([{ a: '__you', b: 'Mia.png', type: 'friend', tone: 'close' }]);
    B.setStatus(g, B.YOU, 'Mia.png', 'bestfriend');
    assert.deepEqual(g.living.ties[0], { a: '__you', b: 'Mia.png', type: 'bestfriend', tone: 'close' });
    B.setStatus(g, 'Rin.png', B.YOU, 'sibling');
    assert.equal(g.living.ties[1].tone, 'neutral');
    assert.deepEqual(Object.keys(B.bondsOf(g).pairs), []);
});

test('facts about the player: written by the player, sent with the scene; the night cannot touch the player', () => {
    const g = game([]);
    const f = B.addFact(g, [B.YOU, 'Mia.png'], 'They play co-op every Friday.');
    assert.ok(f); assert.deepEqual(f.who, ['__you', 'Mia.png']);
    assert.equal(B.applyChange(g, [B.YOU, 'Mia.png'], 1, 'x', 'scene'), null);
    const lines = B.bondsLines(g, ['Mia.png']);
    assert.match(lines.join('\n'), /\{\{user\}\} & Mia: They play co-op every Friday\./);
    B.addFact(g, [B.YOU, 'Mia.png', 'Kai.png'], 'A trio fact with someone not here.');
    const l2 = B.bondsLines(g, ['Mia.png']);
    assert.ok(!l2.find(l => l.startsWith('{{user}}')).includes('trio fact'), 'not in the player line (Kai is not here)');
    assert.ok(l2.some(l => l.startsWith('Mia about Kai') && l.includes('trio fact')), 'but it is what Mia knows about Kai');
    assert.equal(B.parseNight('SCENE\nGleb & Mia | +1 | x\nOFF-SCREEN\nNONE', people, 'calm').length, 0, 'the player is not one of the people');
});

console.log(`bonds: ${n} tests passed`);
