// [expanded] Tests for who answers (src/sim/turnplan.ts, pure logic). Run: node tests/turnplan.test.mjs
import assert from 'node:assert/strict';
import * as P from '../dist/sim/turnplan.js';

let n = 0;
const test = (name, fn) => { try { fn(); n++; } catch (e) { console.error(`FAIL ${name}\n`, e); process.exit(1); } };
const people = [
    { avatar: 'm.png', name: 'Mira Voss', talk: 0.5 }, { avatar: 'f.png', name: 'Finn', talk: 0.5 }, { avatar: 'e.png', name: 'Evelyn', talk: 0.5 },
];
const ru = [{ avatar: 'a.png', name: 'Мира', talk: 0.5 }, { avatar: 'b.png', name: 'Финн', talk: 0.5 }];
const plan = (text, extra = {}, ppl = people) => ({ text, people: ppl, max: 3, ...extra });

test('names: whole, first name, any case, not inside another word', () => {
    assert.deepEqual(P.mentions('Hey Mira Voss, come here', people).map(m => m.avatar), ['m.png']);
    assert.deepEqual(P.mentions('finn and EVELYN', people).map(m => m.avatar), ['f.png', 'e.png']);
    assert.deepEqual(P.mentions('Finnish food is great, Evelynne', people), []);
});
test('Russian cases of a name', () => {
    assert.deepEqual(P.mentions('Мире, привет', ru).map(m => m.avatar), ['a.png']);
    assert.deepEqual(P.mentions('Я расскажу Финну и Мире', ru).map(m => m.avatar).sort(), ['a.png', 'b.png']);
    assert.deepEqual(P.mentions('Мираж на горизонте', ru), []);
});
test('a call by name is a vocative; a name inside a sentence is only a mention', () => {
    assert.equal(P.mentions('Mira, can you pass the salt?', people)[0].vocative, true);
    assert.equal(P.mentions('hey Finn! look', people)[0].vocative, true);
    assert.equal(P.mentions('I think Mira should decide', people)[0].vocative, false);
    assert.equal(P.mentions('Evelyn you did well', people)[0].vocative, true);
});
test('quick plans: one called = single; two named = ensemble in order; the story = ensemble', () => {
    const one = P.quickPlan(plan('Finn, did you eat my yogurt?'));
    assert.deepEqual([one.mode, one.speakers, one.by, one.to], ['single', ['f.png'], 'name', 'some']);
    const two = P.quickPlan(plan('Evelyn and Mira, settle this'));
    assert.deepEqual([two.mode, two.speakers, two.by, two.toNames], ['ensemble', ['e.png', 'm.png'], 'names', ['Evelyn', 'Mira Voss']]);
    assert.equal(P.quickPlan(plan('I think Mira should decide')), null, 'a mention is not a call');
    assert.equal(P.quickPlan(plan('what a day')), null);
    const st = P.quickPlan(plan('it starts to rain', { story: true }));
    assert.deepEqual([st.mode, st.to, st.by], ['ensemble', 'story', 'story']);
    assert.equal(P.quickPlan(plan('A, B, C and D all named: Mira Finn Evelyn', { max: 2 })).speakers.length, 2, 'cut to the most');
});
test('the score: the called first, the thread, the talkative; the worn out later, the done never', () => {
    const ppl = [{ ...people[0], talk: 0.9 }, { ...people[1], inThread: true }, { ...people[2], tired: true, talk: 0.1 }];
    const s = P.scores(plan('what a day', {}, ppl));
    assert.deepEqual(s.map(x => x.avatar), ['f.png', 'm.png', 'e.png']);
    const called = P.scores(plan('Evelyn, what do you think?', {}, ppl));
    assert.equal(called[0].avatar, 'e.png');
    const done = P.scores(plan('hi', {}, [people[0], { ...people[1], done: true }]));
    assert.deepEqual(done.map(x => x.avatar), ['m.png']);
});
test('the score plan: at least one, at most the most, deterministic by seed; one alone only when called', () => {
    const ppl = people.map(p => ({ ...p, talk: 1 }));
    for (let i = 0; i < 20; i++) {
        const p = P.scorePlan(plan(`line ${i}`, { max: 2, seed: `s${i}` }, ppl));
        assert.ok(p.speakers.length >= 1 && p.speakers.length <= 2); assert.equal(p.by, 'score');
        assert.deepEqual(P.scorePlan(plan(`line ${i}`, { max: 2, seed: `s${i}` }, ppl)), p);
    }
    const quiet = people.map(p => ({ ...p, talk: 0, tired: true }));
    assert.equal(P.scorePlan(plan('anyone?', { seed: 'q' }, quiet)).speakers.length >= 1, true, 'never nobody');
    assert.equal(P.scorePlan(plan('I think Mira should decide', { seed: 'z' }, ppl)).to, 'some');
});
test('"Scene reply" mode: always the room', () => {
    assert.equal(P.asEnsemble(P.quickPlan(plan('Finn, hey'))).mode, 'ensemble');
});
test('the model\'s answer: names to people, unknown dropped, private/single, nobody = null', () => {
    const ok = P.parsePlan({ to: 'room', private: false, mode: 'ensemble', speakers: ['finn', 'Mira', 'Nobody', 'Finn'] }, people, 3);
    assert.deepEqual([ok.mode, ok.speakers, ok.to, ok.by], ['ensemble', ['f.png', 'm.png'], 'room', 'model']);
    const priv = P.parsePlan({ to: 'Evelyn', private: true, mode: 'ensemble', speakers: ['Evelyn', 'Finn'] }, people, 3);
    assert.deepEqual([priv.mode, priv.speakers, priv.private, priv.toNames], ['single', ['e.png'], true, ['Evelyn']]);
    assert.equal(P.parsePlan({ mode: 'single', speakers: ['Mira', 'Finn'] }, people, 3).speakers.length, 1);
    assert.equal(P.parsePlan({ speakers: ['Nobody'] }, people, 3), null); assert.equal(P.parsePlan(null, people, 3), null); assert.equal(P.parsePlan({ speakers: [] }, people, 3), null);
    assert.equal(P.parsePlan({ mode: 'ensemble', speakers: ['Mira', 'Finn', 'Evelyn'] }, people, 2).speakers.length, 2);
    assert.deepEqual(P.parsePlan({ to: 'Mira and Finn', speakers: ['Mira'] }, people, 3).toNames, ['Mira Voss', 'Finn']);
});
test('the prompt: people, lines, the player\'s words, the choices', () => {
    const p = P.planPrompt({ text: 'Can we talk?', people: [{ ...people[0], about: 'sharp-tongued cook', tired: true }, { ...people[1], inThread: true }], max: 3, user: 'Gleb', lines: [{ name: 'Finn', text: 'Fine.' }] });
    assert.match(p, /- Mira Voss: sharp-tongued cook \(worn out by company\)/); assert.match(p, /- Finn \(was in the talk just now\)/);
    assert.match(p, /Finn: Fine\./); assert.match(p, /Gleb just said: "Can we talk\?"/); assert.match(p, /1 to 3/); assert.match(p, /"private"/);
});
console.log(`turnplan: ${n} tests passed`);
