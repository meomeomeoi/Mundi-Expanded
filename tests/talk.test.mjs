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

/* ---------- a conversation in beats (Mundi Expanded 15) ---------- */
t('the length of a conversation: by tone, drama and where you walk in; the same every time', () => {
    const tones = Object.keys(T.TONES);
    for (const tone of tones) for (const drama of ['calm', 'normal', 'spicy']) for (let i = 0; i < 60; i++) {
        const full = T.arcLength(tone, drama, 'start', T.seeded(`${tone}${drama}${i}`));
        assert.ok(full >= 2 && full <= 5, `${tone}/${drama}: ${full}`);
        const [lo, hi] = T.ARC[tone]; const shift = drama === 'calm' ? -1 : drama === 'spicy' ? 1 : 0;
        assert.ok(full >= Math.max(2, lo + shift) && full <= Math.min(5, hi + shift), `${tone}/${drama} within its range: ${full}`);
        assert.equal(T.arcLength(tone, drama, 'start', T.seeded(`${tone}${drama}${i}`)), full, 'deterministic');
        assert.equal(T.arcLength(tone, drama, 'end', T.seeded('e')), 1, 'wrapping up: one beat left');
        const mid = T.arcLength(tone, drama, 'middle', T.seeded(`${tone}${drama}${i}`));
        assert.ok(mid >= 2 && mid <= full, `in full swing: the first third is gone (${mid} of ${full})`);
    }
    const avg = (tone, drama) => { let s = 0; for (let i = 0; i < 300; i++) s += T.arcLength(tone, drama, 'start', T.seeded(`a${i}`)); return s / 300; };
    assert.ok(avg('argue', 'normal') > avg('lazy', 'normal') + 0.8, 'an argument runs longer than lazy chatter');
    assert.ok(avg('lazy', 'spicy') > avg('lazy', 'calm') + 0.8, 'a spicy house talks longer than a calm one');
});
t('a conversation may turn after its second beat: rarely, into something that fits', () => {
    const hits = (drama) => { let k = 0; for (let i = 0; i < 4000; i++) if (T.moodTurn('joking', drama, T.seeded(`m${i}`))) k++; return k / 4000; };
    assert.ok(Math.abs(hits('calm') - 0.05) < 0.02 && Math.abs(hits('normal') - 0.1) < 0.025 && Math.abs(hits('spicy') - 0.2) < 0.03, `${hits('calm')} ${hits('normal')} ${hits('spicy')}`);
    assert.equal(T.moodTurn('argue', 'spicy', () => 0), 'heart', 'a quarrel can end in a heart-to-heart');
    assert.equal(T.moodTurn('joking', 'spicy', () => 0), 'argue');
    assert.equal(T.moodTurn('joking', 'spicy', () => 0.99), null);
    for (const tone of Object.keys(T.TONES)) assert.ok(T.TONES[T.TURNS[tone]] && T.TURNS[tone] !== tone, `${tone} turns into something else`);
});
t('being noticed: a chance each beat after the first, cumulative', () => {
    assert.ok(Math.abs(T.noticeChance(50) - 0.2) < 1e-9 && Math.abs(T.noticeChance(0) - 0.1) < 1e-9 && Math.abs(T.noticeChance(100) - 0.3) < 1e-9);
    assert.ok(Math.abs(T.noticedBy(1, 50) - 0.2) < 1e-9 && Math.abs(T.noticedBy(3, 50) - (1 - 0.8 ** 3)) < 1e-9 && T.noticedBy(0, 50) === 0);
    assert.ok(T.noticedBy(4, 50) > 0.58 && T.noticedBy(4, 50) < 0.6, `about 59% by the fourth: ${T.noticedBy(4, 50)}`);
    assert.ok(T.noticedBy(2, 100) > T.noticedBy(2, 0));
});
t('the plan: where each beat goes (at most as many as beats), how it ends; rubbish → calm', () => {
    assert.deepEqual(T.parseArc({ outline: ['they bicker', ' over the bill ', '', 'Mira leaves', 'extra'], end: 'Storm' }, 3), { outline: ['they bicker', 'over the bill', 'Mira leaves'], end: 'storm' });
    assert.deepEqual(T.parseArc({ end: 'explode' }, 3), { outline: [], end: 'settle' }); assert.deepEqual(T.parseArc(null, 2), { outline: [], end: 'settle' });
});
t('the prompts: the first asks for a plan and a beat; the next goes on from the last lines', () => {
    const base = { people: [{ name: 'Masha', about: 'sharp' }, { name: 'Leah', about: 'calm' }], topic: 'the dishes', tone: 'argue', stage: 'start', room: 'kitchen', user: 'the player' };
    const p = T.talkPrompt({ ...base, arc: { beats: 4, at: 0 } });
    assert.match(p, /run 4 short beats; the player hears beat 1 of them/); assert.match(p, /"outline"/); assert.match(p, /"end": "settle"/); assert.match(p, /storm: one of them storms off/);
    assert.doesNotMatch(T.talkPrompt({ ...base }), /outline/, 'without beats: as before');
    assert.match(T.talkPrompt({ ...base, arc: { beats: 1, at: 0 } }), /the last line ends the conversation/);
    const arc = { beats: 4, at: 2, outline: ['bicker', 'the bill', 'Masha leaves', 'quiet'], end: 'storm', lines: [{ who: 'Masha', say: 'Fine.' }] };
    const n = T.beatPrompt({ people: base.people, topic: 'the dishes', tone: 'argue', room: 'kitchen', user: 'the player', arc });
    assert.match(n, /Write beat 3 of 4: Masha leaves/); assert.match(n, /Masha: Fine\./); assert.match(n, /They do not notice the player/); assert.doesNotMatch(n, /ends the conversation as planned/);
    assert.match(T.beatPrompt({ people: base.people, topic: 'x', tone: 'argue', room: 'kitchen', user: 'the player', arc: { ...arc, at: 3 } }), /the last line ends the conversation as planned \(one of them storms off\)/);
    assert.match(T.beatPrompt({ people: base.people, topic: 'x', tone: 'argue', room: 'kitchen', user: 'the player', arc: { ...arc, hushed: true } }), /keep their voices down/);
    assert.match(T.beatPrompt({ people: base.people, topic: 'x', tone: 'argue', room: 'kitchen', user: 'the player', arc, turn: 'heart' }), /The mood turns: now it is a quiet heart-to-heart/);
    assert.equal(T.endLine('makeup', 'A and B'), 'A and B patch it up.'); assert.match(T.endLine('settle', 'A and B'), /wrap it up/);
});
console.log(`talk: ${n} tests passed`);
