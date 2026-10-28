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
console.log(`profile: ${n} tests passed`);
