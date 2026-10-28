// [expanded] Tests for character profiles and their days (src/sim/profile.ts, pure logic). Run: node tests/profile.test.mjs
import assert from 'node:assert/strict';
import * as P from '../dist/sim/profile.js';

let n = 0;
const test = (name, fn) => { try { fn(); n++; } catch (e) { console.error(`FAIL ${name}\n`, e); process.exit(1); } };
const ROOMS = ['living', 'kitchen', 'dining', 'pool', 'gym'];
const ctx = (day, extra = {}) => ({ avatar: 'k.png', day, weekend: false, own: 'home:k.png', common: ROOMS, kitchen: 'kitchen', dining: 'dining', dinner: true, dinnerAt: 20, ...extra });
const gamer = () => P.cleanProfile({ bed: 3, wake: 11, weekend: 1, social: 30, rooms: ['living'], acts: [{ text: 'playing video games', where: 'room' }, { text: 'reading manga', where: 'room' }, { text: 'watching anime', where: 'living' }] }, ROOMS);

test('a profile from anything: hours wrap, unknown rooms dropped, at most 8 things', () => {
    const p = P.cleanProfile({ bed: 25, wake: -1, social: 300, rooms: ['pool', 'moon'], acts: Array(12).fill({ text: '  a  b ', where: 'moon' }) }, ROOMS);
    assert.equal(p.bed, 1); assert.equal(p.wake, 23); assert.equal(p.social, 100);
    assert.deepEqual(p.rooms, ['pool']); assert.equal(p.acts.length, 8); assert.equal(p.acts[0].text, 'a b'); assert.equal(p.acts[0].where, 'common');
});
test('a model\'s answer is read; junk is not', () => {
    const p = P.parseProfile('Sure! {"bed":2,"wake":10,"weekend":2,"social":20,"rooms":["gym"],"acts":[{"text":"gaming","where":"room"}]} hope it helps', ROOMS);
    assert.equal(p.bed, 2); assert.equal(p.src, 'gen'); assert.deepEqual(p.rooms, ['gym']);
    assert.equal(P.parseProfile('no json here', ROOMS), null);
    assert.equal(P.parseProfile('{"bed":2,"acts":[]}', ROOMS), null, 'nothing to do: not usable');
});
test('a guess from the card: a shy night-owl gamer', () => {
    const p = P.guessProfile('She is a shy gamer who stays up all night streaming.', ROOMS);
    assert.equal(p.bed, 3); assert.ok(p.social <= 30); assert.ok(p.acts.some(a => /games/.test(a.text))); assert.equal(p.src, 'rules');
    const q = P.guessProfile('An energetic, outgoing athlete. Loves the gym and cooking.', ROOMS);
    assert.ok(q.social >= 70); assert.ok(q.rooms.includes('gym') && q.rooms.includes('kitchen')); assert.equal(q.bed, 22);
});
test('asleep across midnight, later at the weekend', () => {
    const p = gamer();
    assert.ok(P.asleepAt(p, 5, false)); assert.ok(!P.asleepAt(p, 11, false)); assert.ok(!P.asleepAt(p, 2, false));
    assert.ok(P.asleepAt(p, 11, true), 'an hour later at the weekend');
    const early = P.cleanProfile({ bed: 22, wake: 6, acts: ['x'] });
    assert.ok(P.asleepAt(early, 23, false) && P.asleepAt(early, 0, false) && !P.asleepAt(early, 6, false));
});
test('a day: asleep in their room, dinner with the house, out at work', () => {
    const p = gamer();
    const d = P.dayPlan(p, ctx(3, { out: h => h >= 14 && h < 18 }));
    assert.equal(d.length, 24);
    assert.ok(d[6].asleep && d[6].loc === 'home:k.png');
    assert.equal(d[20].kind, 'meal'); assert.equal(d[20].loc, 'dining');
    assert.equal(d[15].kind, 'out');
    const off = P.dayPlan(p, ctx(3, { dinner: false }));
    assert.notEqual(off[20].act, 'having dinner with the house');
});
test('hours set by hand win', () => {
    const p = gamer(); P.setHour(p, false, 15, 'sleep'); P.setHour(p, false, 20, 'room');
    const d = P.dayPlan(p, ctx(3));
    assert.ok(d[15].asleep); assert.equal(d[20].kind, 'room');
    P.setHour(p, false, 15, null); assert.ok(!P.dayPlan(p, ctx(3))[15].asleep);
    assert.equal(p.src, 'hand');
});
test('varied: favourites often but not always, never three hours running', () => {
    const p = gamer(); let fav = 0, free = 0;
    for (let day = 1; day <= 60; day++) {
        const d = P.dayPlan(p, ctx(day));
        for (let h = 2; h < 24; h++) if (!d[h].asleep && d[h].kind !== 'out' && d[h].kind !== 'meal') assert.ok(!(d[h].act === d[h - 1].act && d[h].act === d[h - 2].act), `day ${day} hour ${h}: ${d[h].act}`);
        for (const s of d) if (s.kind === 'room' || s.kind === 'common') { free++; if (p.acts.some(a => a.text === s.act)) fav++; }
    }
    const share = fav / free;
    assert.ok(share > 0.3 && share < 0.75, `favourites ${Math.round(share * 100)}%`);
});
test('how social they are decides where free time goes', () => {
    const count = (social) => { const p = P.cleanProfile({ ...gamer(), social }, ROOMS); let room = 0, all = 0; for (let day = 1; day <= 40; day++) for (const s of P.dayPlan(p, ctx(day))) if (s.kind === 'room' || s.kind === 'common') { all++; if (s.kind === 'room') room++; } return room / all; };
    const loner = count(0), butterfly = count(100);
    assert.ok(loner > 0.7, `loner in room ${loner}`); assert.ok(butterfly < 0.3, `butterfly in room ${butterfly}`);
});
test('favourite rooms are chosen more', () => {
    const p = P.cleanProfile({ ...gamer(), social: 100, rooms: ['pool'] }, ROOMS); const c = {};
    for (let day = 1; day <= 40; day++) for (const s of P.dayPlan(p, ctx(day))) if (s.kind === 'common') c[s.loc] = (c[s.loc] ?? 0) + 1;
    assert.ok(c.pool > (c.gym ?? 0) * 1.8, JSON.stringify(c));
});
const slot = (kind, loc, act = 'x') => ({ kind, loc, act, asleep: kind === 'sleep' });
const hc = (extra = {}) => ({ day: 5, weekend: false, own: { a: 'home:a', b: 'home:b', c: 'home:c' }, common: ['living', 'pool', 'kitchen'], names: { a: 'Ann', b: 'Bea', c: 'Cy' }, ...extra });
const fill = (s) => Array.from({ length: 24 }, () => ({ ...s }));
test('the house: someone you cannot stand makes one of you leave the room', () => {
    const plans = { a: fill(slot('common', 'living')), b: fill(slot('common', 'living')) };
    plans.a[9] = slot('room', 'home:a'); // a arrives at 10, b was already there
    const v = () => -50;
    const out = P.adjustHouse(plans, { a: P.cleanProfile({ acts: ['x'] }), b: P.cleanProfile({ acts: ['x'] }) }, v, hc());
    for (let h = 0; h < 24; h++) assert.ok(!(out.a[h].loc === 'living' && out.b[h].loc === 'living'), `hour ${h} both in the living room`);
    assert.notEqual(out.a[10].loc, 'living', 'the one who came later leaves');
    assert.equal(plans.a[10].loc, 'living', 'the input is not changed');
});
test('the house: close friends draw each other out of their rooms, more for the social', () => {
    const run = (social) => { let n = 0; for (let day = 1; day <= 30; day++) { const plans = { a: fill(slot('room', 'home:a')), b: fill(slot('common', 'pool')) }; const out = P.adjustHouse(plans, { a: P.cleanProfile({ social, acts: ['x'] }), b: P.cleanProfile({ acts: ['x'] }) }, () => 60, hc({ day })); n += out.a.filter(s => s.loc === 'pool').length; } return n / (30 * 24); };
    const shy = run(0), warm = run(100);
    assert.ok(shy > 0.1 && shy < 0.35, `shy ${shy}`); assert.ok(warm > shy + 0.2, `warm ${warm}`);
    const plans = { a: fill(slot('room', 'home:a')), b: fill(slot('common', 'pool')) };
    assert.ok(P.adjustHouse(plans, {}, () => 60, hc()).a.some(s => /keeping Bea company/.test(s.act)));
    assert.ok(P.adjustHouse(plans, {}, () => 10, hc()).a.every(s => s.loc === 'home:a'), 'not for someone merely on good terms');
});
test('the house: not drawn where an enemy is; hours set by hand stay', () => {
    const plans = { a: fill(slot('room', 'home:a')), b: fill(slot('common', 'pool')), c: fill(slot('common', 'pool')) };
    const v = (x, y) => { const k = [x, y].sort().join(''); return k === 'ab' ? 60 : k === 'ac' ? -60 : 0; };
    const out = P.adjustHouse(plans, {}, v, hc());
    assert.ok(out.a.every(s => s.loc === 'home:a'), 'Cy is at the pool too');
    const p = P.cleanProfile({ acts: ['x'] }); P.setHour(p, false, 12, 'common');
    const q = { a: fill(slot('common', 'living')), b: fill(slot('common', 'living')) };
    const o2 = P.adjustHouse(q, { a: p, b: P.cleanProfile({ social: 100, acts: ['x'] }) }, () => -60, hc());
    assert.equal(o2.a[12].loc, 'living', 'set by hand: stays (the other one leaves)');
    assert.notEqual(o2.b[12].loc, 'living');
});

test('[0.2.0.7] things they like doing go where the thing is; homebodies still stay in sometimes', () => {
    const base = { bed: 23, wake: 8, weekend: 1, rooms: [], ooc: '', acts: [{ text: 'gaming on the console', where: 'room' }, { text: 'reading a novel', where: 'room' }] };
    // the console is in the living room; her own room has books
    const has = (room, a) => (a === 'game' ? room === 'living' : a === 'read' ? room === 'home:k.png' : false);
    const can = (a) => (a === 'game' ? ['living'] : a === 'read' ? ['home:k.png'] : []);
    const count = (social) => { let away = 0, home = 0, nowhere = 0;
        for (let d = 0; d < 40; d++) for (const s of P.dayPlan({ ...base, social }, ctx(d, { can, has, dinner: false }))) {
            if (s.act === 'gaming on the console') { if (s.loc === 'living') away++; else nowhere++; }
            if (s.act === 'reading a novel' && s.loc === 'home:k.png') home++;
        } return { away, home, nowhere }; };
    const hb = count(5), so = count(95);
    assert.equal(hb.nowhere + so.nowhere, 0, 'never plays without the console');
    assert.ok(hb.away > 0 && hb.home > 0, 'a homebody goes to the console now and then, and reads at home');
    assert.ok(so.away > hb.away, 'the social one goes more often');
    // no TV in the living room: nobody "watches TV" there
    for (let d = 0; d < 20; d++) for (const s of P.dayPlan({ ...base, social: 90, acts: [] }, ctx(d, { can: () => [], has: () => false, dinner: false })))
        assert.ok(!(s.loc === 'living' && /TV/.test(s.act)), s.act);
    assert.equal(P.cleanProfile({ acts: [{ text: 'x', where: 'room', needs: 'watch' }, { text: 'y', where: 'room', needs: 'fly' }] }).acts.map(a => a.needs ?? '').join(','), 'watch,');
});

console.log(`profile: ${n} tests passed`);
