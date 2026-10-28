// [expanded] Tests for rooms and their things (src/sim/furnish.ts, pure logic). Run: node tests/furnish.test.mjs
import assert from 'node:assert/strict';
import * as F from '../dist/sim/furnish.js';

let n = 0;
const test = (name, fn) => { try { fn(); n++; } catch (e) { console.error(`FAIL ${name}\n`, e); process.exit(1); } };
const G = () => ({ day: 3 });

test('the catalog: names per era, things of an era only, every afford known', () => {
    const tv = F.catOf('tv');
    assert.equal(F.catName(tv, '2000s'), 'CRT TV'); assert.equal(F.catName(tv, 'now'), 'Smart TV');
    assert.equal(F.catName(F.catOf('dvd'), 'now'), 'Blu-ray player');   // closest era's name
    assert.ok(!F.catalogFor('2000s').some(c => c.id === 'vr')); assert.ok(F.catalogFor('now').some(c => c.id === 'vr'));
    assert.ok(!F.catalogFor('now').some(c => c.id === 'dvd'));
    for (const c of F.CATALOG) { assert.ok(c.affords.every(a => a in F.AFFORDS), c.id); assert.ok(c.rooms.length, c.id); }
    assert.equal(new Set(F.CATALOG.map(c => c.id)).size, F.CATALOG.length);
});
test('fixtures: add (catalog or decor), who may use, where a thing can be done', () => {
    const g = G();
    const tv = F.addFixture(g, { cat: 'tv', room: 'living', era: '2000s', via: 'start' });
    const pc = F.addFixture(g, { cat: 'pc', room: 'home:m.png', owner: 'm.png' });
    const deco = F.addFixture(g, { name: '  posters of   old games ', room: 'home:m.png', owner: 'm.png' });
    assert.equal(tv.name, 'CRT TV'); assert.equal(deco.decor, true); assert.equal(deco.name, 'posters of old games'); assert.deepEqual(F.affordsOf(deco), []);
    assert.equal(F.addFixture(g, { cat: 'nonsense', room: 'living' }), null); assert.equal(F.addFixture(g, { name: ' ', room: 'living' }), null);
    assert.ok(F.roomAffords(g, 'living', 'watch', 'k.png')); assert.ok(F.roomAffords(g, 'home:m.png', 'game', 'm.png'));
    assert.ok(!F.roomAffords(g, 'home:m.png', 'game', 'k.png'));   // Masha's PC is not Kathie's
    assert.deepEqual(F.roomsFor(g, 'work', 'm.png', 'home:m.png'), ['home:m.png']); assert.deepEqual(F.roomsFor(g, 'work', 'k.png'), []);
    F.addFixture(g, { cat: 'console', room: 'living' }); F.addFixture(g, { cat: 'console', room: 'home:m.png', owner: 'm.png' });
    assert.deepEqual(F.roomsFor(g, 'game', 'm.png', 'home:m.png'), ['home:m.png', 'living']);   // her own room first
    F.moveFixture(g, pc.id, 'living', 'house'); assert.ok(F.roomAffords(g, 'living', 'work', 'k.png'));
    F.removeFixture(g, tv.id); assert.ok(!F.roomAffords(g, 'living', 'watch'));
});
test('kinds of room and their templates', () => {
    assert.equal(F.roomKind('kitchen', 'Kitchen'), 'kitchen'); assert.equal(F.roomKind('bathroom3', 'Washroom (Floor 2)'), 'bath');
    assert.equal(F.roomKind('laundry', 'Laundry room'), 'laundry'); assert.equal(F.roomKind('home:k.png'), 'bedroom');
    assert.equal(F.roomKind('entrance', 'Entrance hall', ['leisure']), 'hall'); assert.equal(F.roomKind('frontyard', 'Entrance', ['outdoor']), 'outdoor');
    assert.equal(F.roomKind('den', 'Den', ['leisure']), 'living'); assert.equal(F.roomKind('x', 'Mystery', ['service']), null);
    assert.deepEqual(F.template('kitchen', '2000s'), ['stove', 'microwave', 'coffee']); assert.deepEqual(F.template('bath', 'now', false), []);
    assert.deepEqual(F.template('living', '2000s'), ['couch', 'tv', 'stereo', 'bookshelf', 'boardgames']);
});
test('the scene line: things, someone\'s things outside their room', () => {
    const g = G();
    assert.equal(F.roomLine(g, 'living', 'the living room', () => ''), '');
    F.addFixture(g, { cat: 'couch', room: 'living' }); F.addFixture(g, { cat: 'console', room: 'living', owner: 'f.png' });
    const l = F.roomLine(g, 'living', 'the living room', (o) => (o === 'f.png' ? 'Finn' : o));
    assert.match(l, /In the living room there is: Couch, Game console \(Finn's\)\./);
});
test('the starting furnishing: prompt and answer (bedroom things of the era only, decor kept short)', () => {
    const people = [{ key: 'm.png', name: 'Masha', about: 'a gamer' }, { key: 'k.png', name: 'Kathie Lee', about: 'sporty' }];
    const p = F.furnishPrompt({ people, era: '2000s', eraLine: 'It is the 2000s.' });
    assert.match(p, /pc \(Desktop computer\)/); assert.doesNotMatch(p, /vr \(/); assert.match(p, /"Masha": \{"things"/);
    const r = F.parseFurnish({ Masha: { things: ['pc', 'vr', 'stove', 'pc', 'headset', 'console'], decor: ['posters of retro games', ''] }, Kathie: { things: ['yogamat'], decor: ['x'.repeat(90)] }, Nobody: { things: ['pc'] } }, people, '2000s');
    assert.deepEqual(r['m.png'], { things: ['pc', 'console'], decor: ['posters of retro games'] });
    assert.deepEqual(r['k.png'].things, ['yogamat']); assert.equal(r['k.png'].decor[0].length, 60);
    assert.deepEqual(F.parseFurnish(null, people, 'now'), {});
});
test('a bedroom guessed without the model: from the card, only things of the era', () => {
    assert.deepEqual(F.guessBedroom('A gamer who streams ranked matches; reads manga', 'now'), ['pc', 'console', 'bookshelf']);
    assert.deepEqual(F.guessBedroom('morning yoga, emails on the laptop', '2000s'), ['yogamat', 'desk', 'laptop']);
    assert.deepEqual(F.guessBedroom('', 'now'), []);
});
test('what an activity needs, from its words (careful)', () => {
    const t = { 'gaming on the PC': 'game', 'playing board games with the others': 'game2', 'catching up on emails on the laptop': 'work', 'morning mobility and stretching routine': 'exercise',
        'watching a movie': 'watch', 'reading a paperback novel': 'read', 'practicing guitar': 'music', 'brewing coffee': 'coffee', 'a long bubble bath': 'bath', 'sketching': 'craft',
        'watching videos': null, 'listening to music with headphones': null, 'brewing fresh herbal tea': null, 'scrolling on the phone': null, 'giving thoughtful advice over coffee': 'coffee' };
    for (const [k, v] of Object.entries(t)) assert.equal(F.guessAfford(k), v, k);
});

console.log(`furnish: ${n} tests passed`);
