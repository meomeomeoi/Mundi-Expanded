// [expanded] Tests for secrets and how they come out (src/sim/secrets.ts, src/sim/knows.ts). Run: node tests/secrets.test.mjs
import assert from 'node:assert/strict';
import * as S from '../dist/sim/secrets.js';
import * as K from '../dist/sim/knows.js';
import * as B from '../dist/sim/bonds.js';
import * as Go from '../dist/sim/gossip.js';

let n = 0;
const test = (name, fn) => { try { fn(); n++; } catch (e) { console.error(`FAIL ${name}\n`, e); process.exit(1); } };
const day = (bed) => Array.from({ length: 24 }, (_, h) => ({ kind: h >= bed || h < 7 ? 'sleep' : 'room', loc: 'home:x', act: '', asleep: h >= bed || h < 7 }));

test('secret meetings: every other day, at the quietest late hour, in the plans', () => {
    const plan = { m: day(24), l: day(24), k: day(22) };   // Kathie sleeps at 22
    const roll = (k) => (k.endsWith('meet') ? 0.1 : 0.9);
    const meets = S.meetsFor([{ a: 'm', b: 'l' }], plan, 5, roll, (a) => `home:${a}`);
    assert.deepEqual(meets, [{ host: 'l', guest: 'm', hour: 23, room: 'home:l' }]);   // 22 and 23: Kathie asleep; the later
    assert.equal(S.meetsFor([{ a: 'm', b: 'l' }], plan, 5, () => 0.7, (a) => a).length, 0);   // not tonight
    const p2 = S.withMeets(plan, meets, (a) => a.toUpperCase());
    assert.equal(p2.m[23].loc, 'home:l'); assert.match(p2.m[23].act, S.MEET_MARK); assert.equal(plan.m[23].loc, 'home:x', 'the shared plan is not changed');
});

test('noticing: asleep next door is rare, the same room is quick, a clue then knowing', () => {
    const care = S.careOf(60, 60);
    const asleep = S.noticeChance(S.accessTo({ kind: 'sleep', loc: 'home:k', asleep: true }, 'home:l', false), 50, care);
    const awake = S.noticeChance(S.accessTo({ kind: 'room', loc: 'home:k', asleep: false }, 'home:l', false), 50, care);
    const roomie = S.noticeChance(S.accessTo({ kind: 'room', loc: 'home:l', asleep: false }, 'home:l', true), 50, care);
    assert.ok(asleep < 0.003 && awake < 0.02 && roomie > 0.3, `${asleep} ${awake} ${roomie}`);
    // a month of meetings every other night, three others asleep: rarely more than a suspicion
    const month = 1 - (1 - (1 - (1 - asleep) ** 3)) ** 15; assert.ok(month < 0.1, String(month));
    assert.equal(S.accessTo({ kind: 'out', loc: 'out', asleep: false }, 'home:l', false), 0);
    const t = { a: 'm', b: 'l', type: 'dating', tone: 'good', secret: true };
    assert.equal(K.clue(K.tieK(t), 'k', 3, t), 'suspects'); assert.equal(K.clue(K.tieK(t), 'k', 9, t), 'knows'); assert.equal(K.clue(K.tieK(t), 'k', 9, t), null);
    assert.equal(S.hearFight(-1, 50), 0); assert.ok(S.hearFight(-3, 90) > S.hearFight(-2, 10));
});

test('the night reader: who found out a secret', () => {
    const find = (q) => ({ kathie: 'k', gleb: '__you' })[q.toLowerCase()] ?? null;
    assert.deepEqual(B.parseFound('SCENE\nFOUND | Kathie | 1\nFOUND | Gleb | #2\nFOUND | Nobody | 1\nFOUND | Kathie | 7', find, 2), [{ who: 'k', i: 0 }, { who: '__you', i: 1 }]);
});

test('gossip: who tells whom, loyalty, promises, limits, small things once', () => {
    const base = { people: ['m', 'l', 'k', 's', '__you'], day: 10, mood: 'usual', max: 6, quiet: ['__you'],
        discreet: (a) => (a === 'k' ? 10 : 90), liking: () => 0, trust: () => 60, together: () => 1, roll: () => 0.2 };
    const love = { id: 't:m|l', parts: ['m', 'l'], pub: 'private', day: 9, juicy: 0.9, know: { k: { lvl: 'knows', how: 'saw', day: 9 } } };
    const out = Go.spread({ ...base, news: [love] });
    assert.equal(out.length, 1); assert.equal(out[0].from, 'k'); assert.ok(!['m', 'l'].includes(out[0].to), 'never told to the ones it is about');
    assert.equal(out[0].know.how, 'told'); assert.equal(out[0].know.from, 'k');   // she saw it: first-hand
    // a promise nearly stops it; a loyal friend of the couple rarely tells; a discreet one (90) neither
    assert.equal(Go.spread({ ...base, news: [{ ...love, know: { k: { ...love.know.k, promised: true } } }] }).length, 0);
    assert.equal(Go.spread({ ...base, liking: () => 60, news: [love] }).length, 0);
    assert.equal(Go.spread({ ...base, mood: 'discreet', roll: () => 0.5, news: [love] }).length, 0);
    // retold: second-hand, one more mouth
    const heard = { ...love, know: { k: { lvl: 'knows', how: 'told', from: 'x', hops: 1, day: 9 } } };
    assert.equal(Go.spread({ ...base, news: [heard] })[0].know.how, 'heard'); assert.equal(Go.spread({ ...base, news: [heard] })[0].know.hops, 2);
    // cold news is not told; only the juiciest few go around
    assert.equal(Go.spread({ ...base, day: 30, news: [love] }).length, 0);
    const small = { id: 'f1', parts: ['s', 'l'], pub: 'witnessed', day: 10, juicy: 0.25, small: true, know: { k: { lvl: 'knows', how: 'told', day: 10 } } };
    assert.deepEqual(Go.alive([small, love], 10, 1).map(n => n.id), ['t:m|l']);
    assert.equal(Go.spread({ ...base, news: [small] }).length, 0, 'a small thing heard from someone stops there');
    assert.ok(Go.spread({ ...base, perNight: 1, news: [love, { ...love, id: 'x2' }] }).length <= 1);
    assert.equal(Go.garble('Masha & Leah: kissed', ['Masha'], ['Kathie'], 0.1), 'Kathie & Leah: kissed'); assert.equal(Go.garble('x', ['Masha'], ['Kathie'], 0.5), null);
});

console.log(`secrets: ${n} tests passed`);
