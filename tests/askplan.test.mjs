// [expanded] Tests for a plan proposed in your own words (src/sim/askplan.ts, pure text). Run: node tests/askplan.test.mjs
import assert from 'node:assert/strict';
import { parseProposal, parseWhen, actOf, findAlt, isTimeIssue, titleOf } from '../dist/sim/askplan.js';

let n = 0;
const test = (name, fn) => { try { fn(); n++; } catch (e) { console.error(`FAIL ${name}\n`, e); process.exit(1); } };
const NOW = { day: 5, minutes: 10 * 60 };   // day 5, 10:00
const at = (d, h, m = 0) => d * 1440 + h * 60 + m;
const people = [{ avatar: 'm.png', name: 'Mira Voss', talk: 0.5 }, { avatar: 'f.png', name: 'Finn', talk: 0.5 }, { avatar: 'a.png', name: 'Мира', talk: 0.5 }];

test('your example: "давай повышиваем сегодня в 14?" is a plan for 14:00 today, in your words', () => {
    const p = parseProposal('Ой, слушай, давай повышиваем сегодня в 14?', NOW, []);
    assert.equal(p.from, at(5, 14)); assert.equal(p.act, 'hang'); assert.equal(p.title, 'повышиваем'); assert.equal(p.kind, 'hangout'); assert.equal(p.all, false);
    const e = parseProposal("Oh, listen, let's do some embroidery today at 2?", NOW, []);
    assert.equal(e.from, at(5, 14)); assert.equal(e.title, 'do some embroidery');
});
test('a thing the house knows: the act, no title of its own', () => {
    assert.deepEqual([parseProposal('давай посмотрим фильм завтра вечером', NOW).act, parseProposal('давай посмотрим фильм завтра вечером', NOW).from], ['movie', at(6, 19)]);
    for (const [t, a] of [["let's play games tonight at 8", 'games'], ['давай приготовим ужин в 18:30', 'cook'], ['want to go to the cinema tomorrow at 7pm?', 'cinema'], ['сходим на кофе в 15?', 'cafe'], ['how about a walk at 5?', 'walk'], ['давай в бассейн завтра в 11', 'swim'], ["let's hit the gym at 16", 'workout']]) assert.equal(parseProposal(t, NOW).act, a, t);
});
test('the time: 24-hour, 12-hour, parts of the day, relative; the next time that hour comes', () => {
    assert.equal(parseWhen('at 14:30', NOW), at(5, 14, 30)); assert.equal(parseWhen('в 14:30', NOW), at(5, 14, 30));
    assert.equal(parseWhen('at 2pm', NOW), at(5, 14)); assert.equal(parseWhen('в 8 вечера', NOW), at(5, 20)); assert.equal(parseWhen('в 3 дня', NOW), at(5, 15)); assert.equal(parseWhen('tomorrow at 9am', NOW), at(6, 9)); assert.equal(parseWhen('завтра в 9 утра', NOW), at(6, 9));
    assert.equal(parseWhen('at 2', NOW), at(5, 14), 'no marker: the next time 2 comes (it is ten in the morning)');
    assert.equal(parseWhen('at 11', NOW), at(5, 11), '11 is still ahead'); assert.equal(parseWhen('at 8', NOW), at(5, 20), '8 has gone, so 20:00');
    assert.equal(parseWhen('tonight', NOW), at(5, 19)); assert.equal(parseWhen('завтра днём', NOW), at(6, 15)); assert.equal(parseWhen('послезавтра в 12', NOW), at(7, 12));
    assert.equal(parseWhen('in an hour', NOW), at(5, 11)); assert.equal(parseWhen('через 2 часа', NOW), at(5, 12)); assert.equal(parseWhen('через 10 минут', NOW), at(5, 10, 30), 'not sooner than half an hour');
    assert.equal(parseWhen('at 9 tonight', { day: 5, minutes: 22 * 60 }), null, 'already past, said as today: nothing');
    assert.equal(parseWhen('at 9', { day: 5, minutes: 22 * 60 }), at(6, 9), 'no day said: tomorrow'); assert.equal(parseWhen('at 25', NOW), null); assert.equal(parseWhen('вечером', { day: 5, minutes: 21 * 60 }), null);
    assert.equal(parseWhen('nothing about time', NOW), null);
});
test('not a proposal: no time, no way of proposing, or just talk', () => {
    for (const t of ['давай посмотрим фильм', "let's watch a movie", 'в 14 я был на кухне', 'I woke up at 7', 'The meeting is at 3', 'What time is it? I need to be there at 5', '', 'давай в 14:99']) assert.equal(parseProposal(t, NOW), null, t);
    assert.ok(parseProposal('are you free tomorrow at 5?', NOW), 'are you free…');
});
test('who: the people named, in order; "everyone"; a date', () => {
    const p = parseProposal('Мира, Финн, давай вместе в 18 поужинаем', NOW, people);
    assert.deepEqual(p.names, ['a.png'], 'only whom the list names (Finn is "Finn" there, not "Финн")');
    const q = parseProposal("Finn and Mira, let's cook tonight at 7", NOW, people);
    assert.deepEqual(q.names, ['f.png', 'm.png'], 'in the order of the line');
    assert.equal(parseProposal("everyone, let's watch a movie tonight at 8", NOW, people).all, true); assert.equal(parseProposal('ребят, давай в кино завтра в 6', NOW, people).all, true);
    assert.equal(parseProposal("Mira, would you like to go on a date tomorrow at 7?", NOW, people).kind, 'date'); assert.equal(parseProposal('давай на свидание завтра в 19', NOW).kind, 'date');
});
test('a title from your words: without the asking, the time, the names', () => {
    assert.equal(titleOf('Finn, давай пошьём шторы в 3', people), 'пошьём шторы'); assert.equal(titleOf("Oh, let's repaint the shelf at 4", []), 'repaint the shelf');
    assert.equal(actOf('просто привет'), null);
});
test('another time near the one asked for: later first, then earlier, then the next day', () => {
    const from = at(5, 14); const free = (hours) => (x) => hours.includes(x);
    assert.equal(findAlt(from, free([at(5, 15), at(5, 16)]), at(5, 10, 30)), at(5, 15), 'an hour later');
    assert.equal(findAlt(from, free([at(5, 12)]), at(5, 10, 30)), at(5, 12), 'later has nothing: an earlier time');
    assert.equal(findAlt(from, free([at(5, 11)]), at(5, 12)), null, 'earlier than the earliest is no use');
    assert.equal(findAlt(from, free([at(6, 14)]), at(5, 10, 30)), at(6, 14), 'tomorrow at the same time'); assert.equal(findAlt(from, () => false, at(5, 10, 30)), null);
    assert.equal(findAlt(at(5, 22), free([at(5, 23, 30)]), 0), null, 'not past the end of the day');
});
test('a refusal a different time can fix, and one it cannot', () => {
    for (const w of ['They work at that time.', 'It is too late (or too early) for them.', 'They already have plans with Finn then (movie night). Maybe later that day, at 16:00?', 'They are tired.']) assert.ok(isTimeIssue(w), w);
    for (const w of ['They do not know you well enough yet.', 'They are not ready for a date with you yet.', 'They are not comfortable going to your home yet.']) assert.ok(!isTimeIssue(w), w);
});
console.log(`askplan: ${n} tests passed`);
