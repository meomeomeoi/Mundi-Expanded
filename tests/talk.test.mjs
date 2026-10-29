import assert from 'node:assert/strict';
import * as T from '../dist/sim/talk.js';
let n = 0; const t = (name, f) => { f(); n++; };
t('the list is big and parsed', () => {
    assert.ok(T.HOOKS.length >= 170, `only ${T.HOOKS.length}`);
    assert.ok(T.HOOKS.every(h => h.t && !/[#@]/.test(h.t)));
    const h = T.parseHook('dial-up modems @00s #joking'); assert.deepEqual(h.eras, ['2000s']); assert.deepEqual(h.tones, ['joking']);
});
t('era and the player\'s own', () => {
    const now = T.hooksFor('now', [0, 1], ['my own topic #argue']);
    assert.ok(!now.some(x => x.h.eras?.includes('2000s') && !x.h.eras.includes('now')));
    assert.ok(!now.some(x => x.id === 'b0' || x.id === 'b1'));
    assert.ok(now.some(x => x.id === 'm0' && x.h.tones[0] === 'argue'));
    const old = T.hooksFor('2000s'); assert.ok(!old.some(x => /meme/.test(x.h.t)));
});
t('fresh hooks first', () => {
    const l = T.hooksFor('now').slice(0, 3); const used = [l[0].id, l[1].id];
    for (let i = 0; i < 20; i++) assert.equal(T.pickHook(l, used, T.seeded(String(i))).id, l[2].id);
});
t('chances', () => {
    assert.equal(T.talkChance(1, 20, 'normal'), 0);
    assert.ok(Math.abs(T.talkChance(2, 20, 'normal') - 0.4) < 1e-9);
    assert.ok(T.talkChance(2, 9, 'normal') < T.talkChance(2, 20, 'normal'));
    assert.ok(T.talkChance(4, 20, 'normal') > T.talkChance(2, 20, 'normal'));
    assert.equal(T.talkChance(3, 20, 'off'), 0);
});
t('groups and tones', () => {
    const v = (a, b) => (a + b === 'ab' || a + b === 'ba' ? 80 : -50);
    let ab = 0; for (let i = 0; i < 200; i++) { const g = T.groupOf(['a', 'b', 'c', 'd'], v, T.seeded('g' + i)); assert.ok(g.length >= 2); if (g.length === 2 && g.includes('a') && g.includes('b')) ab++; }
    assert.ok(ab > 30, `friends talk more (${ab})`);
    let argue = 0, argue2 = 0; for (let i = 0; i < 400; i++) { if (T.pickTone({ v: -60 }, T.seeded('x' + i)) === 'argue') argue++; if (T.pickTone({ v: 60 }, T.seeded('x' + i)) === 'argue') argue2++; }
    assert.ok(argue > argue2 * 2);
    for (let i = 0; i < 300; i++) assert.notEqual(T.pickTone({ v: 0, flirt: false }, T.seeded('f' + i)), 'flirt');
});
t('parse the words', () => {
    const p = T.parseTalk({ about: 'ducks', lines: [{ who: 'masha', say: 'Ten ducks. Easy.' }, { who: 'Nobody', say: 'x' }, { who: 'Leah', say: '  Fight me.  ' }] }, ['Masha', 'Leah']);
    assert.equal(p.lines.length, 2); assert.equal(p.lines[0].who, 'Masha'); assert.equal(p.lines[1].say, 'Fight me.');
    assert.equal(T.parseTalk({ lines: [] }, ['A']), null);
});
t('threads', () => {
    const find = (s) => ({ masha: 'm', leah: 'l', gleb: '__you' })[s.trim().toLowerCase()] ?? null;
    const l = T.parseThreads('THREAD | Masha & Leah | a bet on who cooks better\nTHREAD | Gleb & Masha | promised to show her One Piece\nTHREAD | Masha | alone', find, 5);
    assert.equal(l.length, 2); assert.deepEqual([...l[1].who].sort(), ['__you', 'm']);
    const kept = T.keepThreads([{ id: 'o', who: ['m', 'l'], text: 'old', day: 0 }], l, 6); assert.ok(!kept.some(t => t.id === 'o'));
    const many = T.keepThreads([], [1, 2, 3, 4, 5].map(i => ({ id: 't' + i, who: ['m', 'l'], text: 'x', day: 5 })), 5); assert.equal(many.length, 3);
    assert.equal(T.threadsFor(l, ['m', 'l']).length, 1);
});
t('the battery', () => {
    const intro = T.drainPerHour({ social: 0, bond: 0 }), extro = T.drainPerHour({ social: 100, bond: 0 });
    assert.ok(Math.abs(intro - 50) < 1e-9 && extro < 15);
    assert.ok(T.drainPerHour({ social: 50, bond: 90 }) < T.drainPerHour({ social: 50, bond: 0 }));
    assert.ok(T.drainPerHour({ social: 50, bond: 50, upset: true }) > T.drainPerHour({ social: 50, bond: 50 }));
    assert.equal(T.tierOf(50), 'ok'); assert.equal(T.tierOf(30), 'tired'); assert.equal(T.tierOf(10), 'done');
    assert.ok(T.busyAct('listening to music with headphones') && !T.busyAct('making tea'));
    assert.deepEqual(T.interestsOf([{ text: 'playing video games' }, { text: 'scrolling on the phone' }]), ['playing video games']);
});
console.log(`talk: ${n} tests passed`);
