// [expanded] Tests for Go out places (src/sim/outplaces.ts, pure logic). Run: node tests/outplaces.test.mjs
import assert from 'node:assert/strict';
import * as O from '../dist/sim/outplaces.js';
import * as A from '../dist/sim/activities.js';

let n = 0;
const test = (name, fn) => { try { fn(); n++; } catch (e) { console.error(`FAIL ${name}\n`, e); process.exit(1); } };
const pic = f => `/w/modern/${f}`;

test('a new save shows the starters with pictures', () => {
    const g = { day: 1 };
    const s = O.shownPlaces(g, pic);
    assert.equal(s.length, O.STARTERS.length);
    assert.ok(s.every(x => x.starter && !x.saved && x.bg.startsWith('/w/modern/bg/')));
});
test('going out remembers the place, most used first; the same name only once', () => {
    const g = { day: 2 };
    O.rememberPlace(g, '  Kathie\'s  favourite bakery ', 'mine.jpg');
    g.day = 3; O.rememberPlace(g, 'the beach', '');
    O.rememberPlace(g, 'THE BEACH', '');
    const s = O.shownPlaces(g, pic);
    assert.equal(s[0].name, 'the beach'); assert.equal(s[0].bg, pic('bg/beach.jpg'), 'no picture picked: the starter\'s');
    assert.equal(s[1].name, 'Kathie\'s favourite bakery'); assert.equal(s[1].bg, 'mine.jpg');
    assert.equal(s.filter(x => /beach/i.test(x.name)).length, 1, 'the starter is not shown twice');
});
test('a picture changed while out is kept without counting a visit', () => {
    const g = { day: 1 };
    O.rememberPlace(g, 'the park', '');
    O.rememberPlace(g, 'the park', 'sunset.png', false);
    assert.equal(g.outx.places[0].n, 1); assert.equal(O.bgFor(g, 'The Park', pic), 'sunset.png');
});
test('forgetting: a saved place goes, a starter is hidden until you go there again', () => {
    const g = { day: 1 };
    O.rememberPlace(g, 'the bowling alley', 'b.jpg'); O.forgetPlace(g, 'the bowling alley');
    assert.ok(!O.shownPlaces(g, pic).some(x => x.name === 'the bowling alley'));
    O.forgetPlace(g, 'the gym');
    assert.ok(!O.shownPlaces(g, pic).some(x => x.name === 'the gym'));
    O.rememberPlace(g, 'the gym', '');
    assert.ok(O.shownPlaces(g, pic).some(x => x.name === 'the gym' && x.saved));
});
test('at most a few dozen saved', () => {
    const g = { day: 1 };
    for (let i = 0; i < 40; i++) O.rememberPlace(g, `place ${i}`, '');
    assert.equal(g.outx.places.length, O.MAX_SAVED);
});
test('the activities that go out have a starter picture', () => {
    for (const a of A.ACTIVITIES.filter(x => x.out)) assert.ok(O.bgFor({ day: 1 }, a.out, pic), a.id);
});
console.log(`outplaces: ${n} tests passed`);
