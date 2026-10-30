// [expanded] Mundi Expanded 15: an overheard conversation in beats, on an emulated SillyTavern chat (sim/talkrun.ts):
// each beat when you stay, being noticed (silent / pulled in / voices lowered), how it ends (a storm: one goes to
// their room), joining by writing, and a conversation from before beats (a single snatch). Run: node tests/overheard.test.mjs [repo root]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stage, browser, seed, world } from './env.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = process.argv[2] ?? path.join(here, '..');
const ext = stage(root, 'overheard');
const meta = {}; browser(meta);
const D = (p) => import(`${ext}/dist/${p}`);
const store = await D('core/store.js'); const W = await D('core/world.js'); await D('core/saves.js');
const gm = await D('sim/game.js'); const homes = await D('sim/homes.js'); const R = await D('sim/talkrun.js'); const T = await D('sim/talk.js');
let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.log('  FAIL', m); } };
seed(5);
const w = world(ext, 'house'); W.registerWorld(w);
const chars = [['hana', 'Hana'], ['boruto', 'Boruto']].map(([n, name]) => ({ avatar: `${n}.png`, name, data: {} }));
const ctx = globalThis.__ctx; ctx.characters = chars; ctx.chat = []; ctx.name1 = 'Gleb';
const zone = w.homes.zones[0];
meta.mundi = { v: 1, world: 'house', lang: 'en', day: 3, minutes: 9 * 60, speed: 0, player: { loc: 'home:player', home: { zone: zone.id, kind: zone.kind, x: zone.spots[0][0], y: zone.spots[0][1] }, stats: {}, money: 100, traits: {}, origin: '', job: null, rentPaidDay: 3 }, cast: {}, cfg: { rooms: w.places.map(p => p.id) } };
const g = store.game();
for (const a of ['hana.png', 'boruto.png']) { const r = gm.resident(w, a, homes.takenHomes(g), g.player.home); r.met = true; g.cast[a] = r; }
homes.normalizeHomes(g);
g.social = { ...(g.social ?? {}), went: { 'hana.png': { loc: 'home:player', until: 99999999 }, 'boruto.png': { loc: 'home:player', until: 99999999 } } };
const state = store.state; state.view = 'scene';

ctx.executeSlashCommandsWithOptions = async (cmd) => {
    let m;
    if ((m = /^\/sendas name="([^"]*)" ([\s\S]*)$/.exec(cmd))) ctx.chat.push({ name: m[1], is_user: false, mes: m[2], original_avatar: chars.find(x => x.name === m[1])?.avatar, extra: {} });
    else if ((m = /^\/sys ([\s\S]*)$/.exec(cmd))) ctx.chat.push({ name: 'System', is_user: false, mes: m[1], extra: { type: 'narrator' } });
    return { pipe: '' };
};
let answer = ''; const asked = []; const generated = []; const asks = {};
ctx.generateRawData = async ({ prompt }) => { asked.push(prompt); return answer; };
ctx.generate = async (type, opts) => { generated.push(opts?.force_chid); };
ctx.setExtensionPrompt = (key, text) => { asks[key] = text; };
const H = (s) => T.seeded(s)();
const beat = (...l) => JSON.stringify({ lines: l.map(([who, say]) => ({ who, say })) });
const wait = (ms = 80) => new Promise(r => setTimeout(r, ms));
const texts = () => ctx.chat.map(m => m.mes);
const together = () => { for (const a of ['hana.png', 'boruto.png']) g.social.went[a] = { loc: 'home:player', until: 99999999 }; };
const card = (o = {}) => {
    together();
    const cur = { who: ['hana.png', 'boruto.png'], topic: 'the dishes', tone: 'argue', stage: 'start', src: 'list', about: 'the dishes', room: 'home:player', at: 1, how: 'pending',
        arc: { beats: 3, at: 0, outline: ['bicker', 'the bill', 'Hana leaves'], end: 'storm', lines: [] }, ...o };
    const c = { kind: 'talk', who: cur.who, cur, lines: [{ who: 'Hana', say: 'It is your turn.' }, { who: 'Boruto', say: 'Is not.' }] };
    R.TK.card = c; return c;
};
// a "turn" of the deterministic dice: one that does not notice you at the given beat, one that does and lowers voices, one that pulls you in
const find = (pred) => { for (let at = 1; at < 5000; at++) if (pred(at)) return at; throw new Error('no such roll'); };
const P = T.noticeChance(50);
const quiet = find(at => H(`${at}|2|notice`) >= P);
const hush = find(at => H(`${at}|2|notice`) < P && H(`${at}|2|hush`) < 0.5);
const pull = find(at => H(`${at}|2|notice`) < P && H(`${at}|2|hush`) >= 0.5);

// beat 1 (the first lines, already written with the plan): into the story, no chance to be noticed yet
{
    let c = card({ at: quiet }); await R.listen();
    ok(texts().join('|') === 'It is your turn.|Is not.' && c.heard && c.cur.how === 'listened' && c.cur.arc.at === 1 && R.TK.card === c, 'beat 1 is heard; the card waits for you');
    ok(c.cur.arc.lines.length === 2 && !c.cur.arc.hushed, 'what was said last is kept for the next beat');
    // beat 2
    const t0 = g.day * 1440 + g.minutes; answer = beat(['Hana', 'You never pay your share.'], ['Boruto', 'I paid last week!']);
    await R.keepListening();
    ok(texts().slice(2).join('|') === 'You never pay your share.|I paid last week!' && c.cur.arc.at === 2 && R.TK.card === c && !c.busy, 'beat 2 comes when you ask');
    ok(g.day * 1440 + g.minutes - t0 === 2, 'two minutes pass between beats');
    ok(/Write beat 2 of 3: the bill/.test(asked.at(-1)) && /Hana: It is your turn\./.test(asked.at(-1)) && /They do not notice the player/.test(asked.at(-1)), 'the next beat is written from the plan and the last lines');
    // beat 3: the last, as planned: a storm, Hana goes to her room
    answer = beat(['Hana', 'Forget it. I am done.'], ['Boruto', 'Fine.']);
    await R.keepListening(); await wait();
    ok(R.TK.card === null && texts().includes('Fine.'), 'the last beat ends the conversation');
    ok(texts().some(t => /Hana storms off to their room\./.test(t)), `a storm: someone leaves (${texts().slice(-2)})`);
    ok(g.social.went['hana.png'].loc !== 'home:player' || g.social.went['hana.png'].until < 99999999, 'and goes to their room');
}
// noticed after beat 2: voices lowered (then the card stays)
{
    ctx.chat.length = 0; g.social.went['hana.png'] = { loc: 'home:player', until: 99999999 };
    const c = card({ at: hush }); await R.listen(); answer = beat(['Hana', 'Keep it down.'], ['Boruto', 'You started it.']);
    await R.keepListening();
    ok(c.cur.arc.hushed === true && R.TK.card === c && texts().some(t => /glance at Gleb and lower their voices/.test(t)), 'noticed: they lower their voices, and the card stays');
    answer = beat(['Boruto', '...']); await R.keepListening();
    ok(/keep their voices down/.test(asked.at(-1)), 'the next beat is written guarded');
}
// noticed after beat 2: pulled in
{
    ctx.chat.length = 0; generated.length = 0;
    const c = card({ at: pull }); await R.listen(); answer = beat(['Hana', 'Tell him.'], ['Boruto', 'Tell me what?']);
    await R.keepListening();
    ok(c.cur.how === 'pulled' && R.TK.card === null && generated.length === 1 && /pulls \{\{user\}\} into the conversation/.test(asks.mundi_ask), 'noticed: one of them pulls you in (a reply to you)');
}
// about you, or private: they fall silent when they notice you
{
    ctx.chat.length = 0; generated.length = 0;
    const c = card({ at: hush, about: 'what {{user}} did last night' }); await R.listen(); answer = beat(['Hana', 'Shh.'], ['Boruto', 'What?']);
    await R.keepListening();
    ok(c.cur.how === 'silent' && R.TK.card === null && texts().some(t => /notice Gleb and fall silent/.test(t)) && !generated.length, 'about you: they fall silent');
}
// someone has gone: it is over; and writing while you stand by = joining in
{
    ctx.chat.length = 0; const c = card({ at: quiet }); await R.listen();
    g.social.went['boruto.png'] = { loc: 'home:hana.png', until: 99999999 }; answer = beat(['Hana', 'x']);
    await R.keepListening();
    ok(R.TK.card === null, 'someone left the room: no more beats');
    g.social.went['boruto.png'] = { loc: 'home:player', until: 99999999 };
    const c2 = card({ at: quiet, about: 'the bill' }); delete asks.mundi_ask;
    await R.joinTyping();
    ok(R.TK.card === null && c2.cur.how === 'joined' && /joins Hana and Boruto's conversation \(the bill\)/.test(asks.mundi_ask), 'writing something joins them');
    const c3 = card({ at: quiet, private: true }); await R.joinTyping();
    ok(/cuts into a conversation Hana and Boruto were having between themselves.*some do not mind, some do/.test(asks.mundi_ask), 'a private one: the scene decides how they take it (no fixed penalty)');
    ok(c3.cur.how === 'joined', 'joined');
    R.TK.card = { kind: 'come', who: ['hana.png'], cur: c3.cur, lines: null }; delete asks.mundi_ask; await R.joinTyping();
    ok(R.TK.card !== null && !asks.mundi_ask, 'someone coming up to you: writing does not change that card');
}
// a conversation from before beats: a single snatch, as it was
{
    ctx.chat.length = 0; const cur = { who: ['hana.png', 'boruto.png'], topic: 'x', tone: 'lazy', stage: 'middle', src: 'list', about: 'x', room: 'home:player', at: quiet, how: 'pending' };
    const c = { kind: 'talk', who: cur.who, cur, lines: [{ who: 'Hana', say: 'Hm.' }] }; R.TK.card = c;
    await R.listen(); ok(texts().join() === 'Hm.' && c.heard, 'an older conversation plays its lines');
    await R.keepListening(); ok(texts().length === 1, 'and has no more beats to ask for');
    R.TK.card = null;
}
// the card
{
    const ui = await D('ui/talkui.js'); store.state.view = 'scene';
    const c = card({ at: quiet }); c.heard = false; let html = ui.talkCardHtml();
    ok(/data-act="tk-listen"/.test(html) && !/tk-more/.test(html), 'before listening: Listen');
    c.heard = true; c.cur.arc.at = 1; html = ui.talkCardHtml();
    ok(/data-act="tk-more"/.test(html) && /Keep listening/.test(html) && /go on talking/.test(html) && !/data-act="tk-listen"/.test(html) && /data-act="tk-join"/.test(html), 'with beats left: Keep listening, Join in');
    c.cur.arc.hushed = true; ok(/lowered their voices/.test(ui.talkCardHtml()), 'voices lowered: said on the card');
    c.busy = true; ok(/aria-busy="true"/.test(ui.talkCardHtml()) && /Listening…/.test(ui.talkCardHtml()), 'waiting while the next beat is written');
    c.busy = false; c.cur.arc.at = 3; ok(!/tk-more/.test(ui.talkCardHtml()), 'no beats left: no button');
    const set = ui.talkSettingsHtml(g); ok(/Overheard conversations go on by themselves/.test(set) && /data-k="auto"/.test(set) && /data-k="writer"/.test(set), 'the settings');
}
console.log(`overheard: ${passes} checks passed${fails ? `, ${fails} FAILED` : ''}`);
if (fails) process.exit(1);
process.exit(0);
