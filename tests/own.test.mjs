import assert from 'node:assert/strict';
import * as O from '../dist/sim/own.js';
import * as B from '../dist/sim/battery.js';
import { wholeSentences } from '../dist/sim/jsonfix.js';
let n = 0; const t = (name, f) => { f(); n++; };
t('levels and experience', () => {
    assert.equal(O.levelOf(0), 1); assert.equal(O.levelOf(100), 3); assert.equal(O.levelOf(99999), 10);
    assert.ok(O.xpFor(1) > O.xpFor(null) && O.xpFor(null) > O.xpFor(0));
    assert.equal(O.xpFor(0.5, 'slow') * 2, O.xpFor(0.5, 'normal'));
    const sessions = Math.ceil(O.xpAt(10) / O.xpFor(1)); assert.ok(sessions >= 30, `a master takes many perfect sessions (${sessions})`);
});
t('traits seed skills', () => {
    const s = O.seedFromTraits({ proficiency: ['Good cook', 'Musical'], interests: ['Technology', 'Cooking'] });
    assert.equal(s.cooking, 4); assert.equal(s.music, 4); assert.equal(s.coding, undefined, 'interests do not set levels');
    assert.equal(O.seedFromTraits({ proficiency: ['Strong', 'Athletic'] }).fitness, 5, 'two on one skill: the higher +1');
    assert.equal(O.seedFromTraits({ proficiency: ['Tech-savvy', 'Smart', 'Good with numbers'] }).coding, 5, 'up to 5');
    assert.equal(O.seedFromTraits({ proficiency: ['Strong'] }).fitness, 3);
    assert.equal(O.xpBoost({ interests: ['Cooking'] }, 'cooking'), 1.2); assert.equal(O.xpBoost({ interests: ['Books', 'Art'] }, 'writing'), 1.4); assert.equal(O.xpBoost({ interests: ['Nature'] }, 'cooking'), 1);
    assert.match(O.traitEffects('Strong').lines[0], /\+1 with Athletic/); assert.ok(O.traitEffects('Cooking').lines[0].includes('+20% experience')); assert.ok(!O.traitEffects('Games').game);
    assert.match(O.traitsLine({ proficiency: ['Strong'], personality: ['Shy'], interests: ['Games'] }), /strong; shy; into games/);
});
t('ideas get better with skill, brilliant ones stay rare', () => {
    const roll = (L) => { const c = [0, 0, 0, 0, 0]; for (let i = 0; i < 4000; i++) c[O.rollTier(L, (i + 0.5) / 4000)]++; return c; };
    const lo = roll(1), hi = roll(9), top = roll(10);
    assert.equal(lo[4], 0); assert.ok(hi[4] > 0 && hi[4] < 300); assert.ok(top[3] + top[4] > lo[3] + lo[4]); assert.ok(lo[0] > hi[0]);
    assert.equal(O.verdict(4 * 9, 9, 10, 0.9).word, 'a masterpiece'); assert.equal(O.verdict(0, 9, 1, 0.5).word, 'weak');
});
t('chores', () => {
    const r1 = O.rota(['you', 'a', 'b'], 0), r2 = O.rota(['you', 'a', 'b'], 1);
    assert.notEqual(r1.dishes, r2.dishes);
    assert.ok(O.willDo(100, false, 0.85) && !O.willDo(0, false, 0.5) && O.willDo(0, true, 0.4));
    assert.equal(O.messWord(10), ''); assert.equal(O.messWord(80), 'a real mess');
});
t('calendar', () => {
    assert.ok(O.isGolden(15, 14) && !O.isGolden(14, 14) && O.isGolden(31, 30));
    assert.ok(O.isNewYear(1 + O.newYearDay(14), 14));
    const b = O.birthdayFromText('Born on March 3rd.', 14); assert.equal(b, 0);
    const b2 = O.birthdayFromText('Her birthday is September 15', 30); assert.ok(b2 > 60 && b2 < 120);
    assert.equal(O.birthdayFromText('no date here', 14), -1);
    assert.equal(O.nextOn(10, O.dayOfYear(12, 14), 14), 12);
    const ev = O.weekEvents('a university student', [0.9, 0.0, 0.99], false); assert.equal(ev.length, 2);
    assert.ok(!O.weekEvents('married office worker', [0.9, 0.3, 0.4], true).includes('date'));
});
t('while you were away', () => {
    assert.ok(!O.digestDue(1000, 1030, 0, false), 'not after half an hour');
    assert.ok(O.digestDue(1000, 1200, 0, false));
    assert.ok(!O.digestDue(1000, 1200, 1100, false), 'not again so soon');
    assert.ok(O.digestDue(1000, 1100, 900, true), 'a morning one');
});
t('crossword themes do not repeat', () => {
    assert.equal(O.CROSS_THEMES.length, 50); assert.equal(new Set(O.CROSS_THEMES).size, 50);
    let recent = [];
    for (let i = 0; i < 15; i++) { const th = O.pickTheme(recent, (i * 0.37) % 1); assert.ok(!recent.includes(th), th); recent = O.rememberTheme(recent, th); }
    assert.equal(recent.length, 15);
});
t('the battery runs down by day, fills by night, never below 5%', () => {
    let b = 100; for (let h = 7; h < 23; h++) b = B.nextLevel(b, false);
    assert.ok(b >= 15 && b <= 25, `at 23:00: ${b}`);
    for (let h = 0; h < 30; h++) b = B.nextLevel(b, false); assert.equal(b, B.FLOOR);
    for (let h = 0; h < 4; h++) b = B.nextLevel(b, true); assert.equal(b, 100);
});
t('a cut-off reply ends at a whole sentence', () => {
    assert.equal(wholeSentences('You hear a laugh. Then a voice says "no way". Then some'), 'You hear a laugh. Then a voice says "no way".');
    assert.equal(wholeSentences('All fine.'), 'All fine.');
    assert.equal(wholeSentences('Short then a very long tail without any end at all here'), 'Short then a very long tail without any end at all here');
});
console.log(`own: ${n} tests passed`);
