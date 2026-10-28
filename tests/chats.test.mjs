// [expanded] Tests for group chats (src/sim/chats.ts, pure logic). Run: node tests/chats.test.mjs
import assert from 'node:assert/strict';
import * as C from '../dist/sim/chats.js';

let n = 0;
const test = (name, fn) => { try { fn(); n++; } catch (e) { console.error(`FAIL ${name}\n`, e); process.exit(1); } };
const cast = (...names) => Object.fromEntries(names.map(x => [`${x}.png`, { avatar: `${x}.png`, name: x }]));
const who = (name, o = {}) => ({ avatar: `${name}.png`, name, social: 50, awake: true, room: `home:${name}.png`, ...o });
const H = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; return (h >>> 0) / 4294967296; };

test('the house chat: everyone who lives here and you, kept in step with the house', () => {
    const g = { cast: cast('Kathie', 'Finn') };
    const h = C.chatById(g, C.HOUSE); assert.deepEqual(h.members.sort(), ['Finn.png', 'Kathie.png']); assert.ok(h.you);
    g.cast['Masha.png'] = { avatar: 'Masha.png', name: 'Masha' }; assert.equal(C.chatById(g, C.HOUSE).members.length, 3);
    const c = C.newChat(g, '  Gym bros  ', ['Finn.png', 'Kathie.png', 'Ghost.png'], true, 5);
    assert.equal(c.name, 'Gym bros'); assert.deepEqual(c.members, ['Finn.png', 'Kathie.png']);
    assert.equal(C.post(c, 'me', '   ', 1), null); C.post(c, 'me', 'hi   all', 1); assert.equal(c.msgs[0].text, 'hi all');
});
test('asked by name always answers (unless asleep or right next to the author)', () => {
    const people = [who('Kathie'), who('Finn'), who('Masha', { awake: false })];
    const a = C.answerers({ author: 'me', authorRoom: 'kitchen', text: 'Kathie, did you take my charger?', people, closeness: () => 0, roll: () => 0.99 });
    assert.deepEqual(a, ['Kathie.png']);
    assert.ok(!C.answerers({ author: 'me', authorRoom: 'kitchen', text: '@masha you up?', people, closeness: () => 0, roll: () => 0.99 }).includes('Masha.png'), 'Masha is asleep (someone else may say so)');
    assert.deepEqual(C.answerers({ author: 'me', authorRoom: 'home:Kathie.png', text: 'Kathie?', people, closeness: () => 0, roll: () => 0.99 }).includes('Kathie.png'), false, 'side by side: no texting');
});
test('others answer by how social and close they are; at most four; a question gets someone', () => {
    const people = ['A', 'B', 'C', 'D', 'E', 'F'].map(x => who(x, { social: 100 }));
    for (let i = 0; i < 50; i++) assert.ok(C.answerers({ author: 'me', authorRoom: '', text: 'hey', people, closeness: () => 100, roll: (k) => H(`${i}${k}`) }).length <= 4);
    const avg = (social, close) => { let s = 0; for (let i = 0; i < 400; i++) s += C.answerers({ author: 'me', authorRoom: '', text: 'nice weather', people: [who('X', { social })], closeness: () => close, roll: (k) => H(`${i}${k}`) }).length; return s / 400; };
    assert.ok(avg(100, 90) > avg(0, 0) * 2);
    assert.equal(C.answerers({ author: 'me', authorRoom: '', text: 'anyone home?', people: [who('X', { social: 0 })], closeness: () => 0, roll: () => 0.99 }).length, 1);
    assert.equal(C.answerers({ author: 'me', authorRoom: '', text: 'ok', people: [who('X', { social: 0 })], closeness: () => 0, roll: () => 0.99 }).length, 0);
});
test('reading the AI: only the people asked, in their lines, at most two each', () => {
    const ws = [{ avatar: 'k', name: 'Kathie' }, { avatar: 'f', name: 'Finn' }];
    const out = C.parseChat('Kathie: not me lol\n**Finn**: it was Masha\nMasha: hey!\nKathie: "told u"\nKathie: third\nnarration line\n- Finn: *shrugs* whatever', ws);
    assert.deepEqual(out.map(m => m.by), ['k', 'f', 'k', 'f']);
    assert.equal(out[2].text, 'told u'); assert.equal(out[3].text, 'whatever');
});
test('the prompt names who writes, the era and what was said in person', () => {
    const p = C.chatPrompt({ chatName: 'House', when: 'Monday, 10:00', lang: 'English', voice: 'casual', era: 'It is the 2000s.', members: [{ name: 'Kathie', about: 'shy' }], you: 'Gleb', youIn: true, known: '[In person: …]', news: [], history: [{ name: 'Gleb', text: 'hi' }], writers: ['Kathie'] });
    assert.match(p, /by Kathie/); assert.match(p, /2000s/); assert.match(p, /In person/); assert.match(p, /Members: Kathie, Gleb/);
});
console.log(`chats: ${n} tests passed`);
