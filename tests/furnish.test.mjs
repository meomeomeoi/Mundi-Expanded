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
test('orders: when they come, boxes in the hallway, unpacked into their room', () => {
    assert.equal(F.deliveryAt(2 * 1440 + 600, 'small', 0), 3 * 1440 + 600); assert.equal(F.deliveryAt(2 * 1440 + 600, 'big', 0.999), 4 * 1440 + 17 * 60);
    const g = G();
    const o = F.newOrder(g, { cat: 'tv', name: 'Smart TV', room: 'living', owner: 'house', price: 400, paid: 'fund', by: 'player', day: 3, due: 5000, via: 'order' });
    assert.deepEqual(F.arrived(g, 4999), []); assert.equal(F.arrived(g, 5000)[0], o); assert.equal(o.state, 'here'); assert.deepEqual(F.arrived(g, 6000), []);
    const x = F.unpack(g, o.id, '2000s'); assert.equal(x.name, 'CRT TV'); assert.equal(x.room, 'living'); assert.equal(x.via, 'order');
    assert.equal(F.ordersOf(g).length, 0); assert.equal(F.unpack(g, o.id, 'now'), null);
});
test('shops: kinds from the place\'s name, what each has, the flea market\'s few cheap things of the day', () => {
    assert.equal(F.shopKindOf('the shopping mall'), 'mall'); assert.equal(F.shopKindOf('the flea market'), 'flea'); assert.equal(F.shopKindOf('a furniture store'), 'furniture');
    assert.equal(F.shopKindOf('the electronics store downtown'), 'electronics'); assert.equal(F.shopKindOf('the park'), null); assert.equal(F.shopKindOf('the supermarket'), 'super');
    const roll = (k) => { let h = 7; for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return (h % 1000) / 1000; };
    const el = F.assortment('electronics', '2000s', 3, 'x', roll).map(x => x.cat.id);
    assert.ok(el.includes('tv') && el.includes('dvd') && !el.includes('vr')); assert.ok(F.assortment('furniture', 'now', 3, 'x', roll).every(x => x.share === 1));
    const f1 = F.assortment('flea', 'now', 3, 'the flea market', roll), f2 = F.assortment('flea', 'now', 4, 'the flea market', roll);
    assert.ok(f1.length > 0 && f1.length <= 6); assert.ok(f1.every(x => x.share >= 0.4 && x.share <= 0.7 && x.cat.price < 2000));
    assert.notDeepEqual(f1.map(x => x.cat.id), f2.map(x => x.cat.id));
    assert.ok(F.CURB.every(F.catOf) && F.RUMMAGE_THINGS.every(F.catOf));
});
test('house purchases: votes, the verdict, what someone would ask for', () => {
    const v = (o, roll = 0.5) => F.voteOn({ forSelf: false, price: 100, fund: 1000, withProposer: 20, wants: false, social: 50, ...o }, roll);
    assert.deepEqual(v({ price: 2000 }), { yes: false, why: 'not enough in the fund' }); assert.equal(v({ withProposer: -40 }).yes, false);
    assert.equal(v({}, 0.3).yes, true); assert.equal(v({ forSelf: true }, 0.3).yes, false);   // their own room: much harder
    assert.equal(v({ wants: true }, 0.6).yes, true); assert.equal(v({ price: 900 }, 0.3).yes, false);   // too expensive right now
    assert.equal(v({ fund: Infinity, price: 99999 }, 0.3).yes, true);   // money off: price does not matter
    const p = (answers, you, by = 'k.png') => ({ by, answers, you });
    assert.equal(F.verdict(p({ a: 'yes', b: 'no' })), 'yes'); assert.equal(F.verdict(p({ a: 'no', b: 'no' })), 'no');
    assert.equal(F.verdict(p({ a: 'no' }, 'no')), 'no'); assert.equal(F.verdict(p({ a: 'no', b: 'no' }, 'yes')), 'no');   // 2 yes of 4: not more
    assert.equal(F.verdict(p({ a: 'no' }, undefined, 'player')), 'no');
    const roll = () => 0;
    const people = [{ who: 'm', social: 20, needs: ['game'], canDo: () => false }, { who: 'k', social: 90, needs: ['watch'], canDo: () => true }];
    assert.deepEqual(F.pickWant(people, (a) => a !== 'watch', 'now', roll), { by: 'k', cat: 'tv', forSelf: false });   // the house lacks a TV
    assert.deepEqual(F.pickWant(people, () => true, 'now', roll), { by: 'm', cat: 'console', forSelf: true });           // Masha has no console
    assert.equal(F.pickWant([{ who: 'k', social: 50, needs: [], canDo: () => true }], () => true, 'now', roll), null);
});
test('the story: things set up, carried, thrown out', () => {
    assert.equal(F.catByName('a new PlayStation 5'), 'console'); assert.equal(F.catByName('Nintendo Switch'), 'handheld');
    assert.equal(F.catByName('old acoustic guitar'), 'guitar'); assert.equal(F.catByName('pool table'), 'pooltable'); assert.equal(F.catByName('a mug'), null);
    assert.equal(F.catByName('ноутбук'), 'laptop'); assert.equal(F.catByName('flat-screen TV'), 'tv');
    const g = { cast: { 'm.png': { name: 'Masha' } }, day: 3 };
    const rooms = { 'living room': 'living', "masha's room": 'home:m.png' };
    const room = (s) => rooms[s.toLowerCase()] ?? null, person = (s) => (/masha/i.test(s) ? 'm.png' : null);
    const raw = `PLACE | Living room | a pool table\nPLACE | Masha's room | guitar | Masha\nPLACE | Attic | piano\nPLACE | Living room | framed movie poster\nNONE`;
    const ops = F.parsePlace(raw, room, person);
    assert.equal(ops.length, 3); assert.deepEqual(ops[1], { op: 'place', room: 'home:m.png', thing: 'guitar', who: 'm.png' });
    const own = (r) => (r.startsWith('home:') ? r.slice(5) : 'house');
    const notes = F.applyPlace(g, ops, 'now', own, (r) => r);
    assert.equal(notes.length, 3);
    assert.equal(F.fixturesIn(g, 'home:m.png')[0].owner, 'm.png'); assert.equal(F.fixturesIn(g, 'living').find(x => x.cat === 'pooltable').owner, 'house');
    assert.equal(F.fixturesIn(g, 'living').find(x => !x.cat).name, 'Framed movie poster');
    assert.equal(F.applyPlace(g, F.parsePlace('PLACE | living room | Pool table', room, person), 'now', own, (r) => r).length, 0);   // already there
    F.applyPlace(g, F.parsePlace("RELOCATE | Masha's room | living room | the guitar\nDISCARD | living room | poster", room, person), 'now', own, (r) => r);
    assert.equal(F.fixturesIn(g, 'home:m.png').length, 0); assert.ok(F.fixturesIn(g, 'living').some(x => x.cat === 'guitar' && x.owner === 'm.png'));
    assert.ok(!F.fixturesIn(g, 'living').some(x => /poster/i.test(x.name)));
});

console.log(`furnish: ${n} tests passed`);
