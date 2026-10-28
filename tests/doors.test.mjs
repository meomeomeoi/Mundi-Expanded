// [expanded] Tests for bedroom doors (src/sim/doors.ts, pure logic). Run: node tests/doors.test.mjs
import assert from 'node:assert/strict';
import * as D from '../dist/sim/doors.js';

let n = 0;
const test = (name, fn) => { try { fn(); n++; } catch (e) { console.error(`FAIL ${name}\n`, e); process.exit(1); } };
const who = (o = {}) => ({ bond: 30, partner: false, key: false, social: 50, grudge: false, ...o });
const share = (o, hour, a = 'in') => { let k = 0; for (let i = 0; i < 100; i++) if (D.knock(who(o), hour, i / 100) === a) k++; return k; };

test('closer means more often let in; strangers mostly not', () => {
    assert.ok(share({ bond: 80 }, 15) === 100);
    assert.ok(share({ bond: 30 }, 15) < share({ bond: 50 }, 15));
    assert.ok(share({ bond: 5 }, 15, 'no') > 60);
});
test('late at night, a grudge or a shy owner make it harder', () => {
    assert.ok(share({ bond: 45 }, 2) < share({ bond: 45 }, 15));
    assert.ok(share({ bond: 45, grudge: true }, 15) < share({ bond: 45 }, 15));
    assert.ok(share({ bond: 45, social: 0 }, 15) < share({ bond: 45, social: 100 }, 15));
});
test('a partner comes in, unless upset with you', () => {
    assert.equal(D.knock(who({ partner: true, bond: 0 }), 3, 0), 'in');
    assert.notEqual(D.knock(who({ partner: true, bond: 20, grudge: true }), 3, 0), 'in');
});
test('asleep: a knock wakes them now and then, and they answer groggy', () => {
    assert.equal(D.knockAsleep(who({ bond: 90 }), 3, 0.9, 0.5), 'asleep');
    assert.notEqual(D.knockAsleep(who({ bond: 90 }), 3, 0.1, 0.5), 'asleep');
    let groggy = 0, fresh = 0; for (let i = 0; i < 100; i++) { if (D.knock(who({ bond: 45 }), 15, i / 100, true) === 'in') groggy++; if (D.knock(who({ bond: 45 }), 15, i / 100) === 'in') fresh++; }
    assert.ok(groggy < fresh);
});
test('waking on purpose and letting yourself in', () => {
    assert.ok(!D.canWake(who({ bond: 59 }))); assert.ok(D.canWake(who({ bond: 60 }))); assert.ok(D.canWake(who({ partner: true, bond: 0 })));
    assert.ok(!D.letsSelfIn(who({ bond: 99 })), 'friendship alone is no key'); assert.ok(D.letsSelfIn(who({ key: true })));
});
test('a door that answered lets upstream\'s check through once', () => {
    D.passDoor('home:k'); assert.ok(D.passPending('home:k')); assert.ok(D.passing('home:k')); assert.ok(!D.passing('home:k'));
});
console.log(`doors: ${n} tests passed`);
