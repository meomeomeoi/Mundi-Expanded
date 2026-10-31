// [expanded] Mundi Expanded 15: a reply for the room, cut into people's lines on an emulated SillyTavern chat
// (sim/turnrun.ts): the first part takes the director's line, the rest are added through /sendas and /sys, versions of a
// beat swap whole, an interrupted beat is picked up from the chat. Run: node tests/beatrun.test.mjs [repo root]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stage, browser, seed, world } from './env.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = process.argv[2] ?? path.join(here, '..');
const ext = stage(root, 'beatrun');
// SillyTavern's deleteMessage, for real (the stub does nothing)
const scriptJs = path.join(ext, '..', '..', '..', '..', 'script.js');
fs.writeFileSync(scriptJs, fs.readFileSync(scriptJs, 'utf8').replace('export const deleteMessage = (...a) => undefined;', 'export const deleteMessage = async (i) => { globalThis.__ctx.chat.splice(i, 1); };'));
const meta = {}; browser(meta);
const D = (p) => import(`${ext}/dist/${p}`);
const store = await D('core/store.js'); const W = await D('core/world.js'); await D('core/saves.js');
const gm = await D('sim/game.js'); const homes = await D('sim/homes.js');
const T = await D('sim/turnrun.js'); const B = await D('st/bridge.js'); const E = await D('sim/ensemble.js');
let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.log('  FAIL', m); } };
seed(3);
const w = world(ext, 'house'); W.registerWorld(w);
const chars = [['hana', 'Hana'], ['boruto', 'Boruto'], ['mundi_scene', E.SCENE_NAME]].map(([n, name]) => ({ avatar: `${n}.png`, name, data: {} }));
const ctx = globalThis.__ctx; ctx.characters = chars; ctx.chat = []; ctx.name1 = 'Gleb';
ctx.getThumbnailUrl = (t, a) => `/thumb/${a}`;
ctx.persona = {};
const zone = w.homes.zones[0];
meta.mundi = { v: 1, world: 'house', lang: 'en', day: 3, minutes: 9 * 60, speed: 0, player: { loc: 'home:player', home: { zone: zone.id, kind: zone.kind, x: zone.spots[0][0], y: zone.spots[0][1] }, stats: {}, money: 100, traits: {}, origin: '', job: null, rentPaidDay: 3 }, cast: {}, cfg: { rooms: w.places.map(p => p.id) } };
const g = store.game();
for (const a of ['hana.png', 'boruto.png']) { const r = gm.resident(w, a, homes.takenHomes(g), g.player.home); r.met = true; g.cast[a] = r; }
homes.normalizeHomes(g);
g.social = { ...(g.social ?? {}), went: { 'hana.png': { loc: 'home:player', until: 99999999 }, 'boruto.png': { loc: 'home:player', until: 99999999 } } };

// /sendas, /sys and /send as SillyTavern does them: a message at the end of the chat
const events = [];
ctx.executeSlashCommandsWithOptions = async (cmd) => {
    let m;
    if ((m = /^\/sendas name="([^"]*)" ([\s\S]*)$/.exec(cmd))) { const c = chars.find(x => x.name === m[1]); ctx.chat.push({ name: m[1], is_user: false, is_system: false, mes: m[2], original_avatar: c?.avatar, force_avatar: '', extra: { gen_id: 1 } }); events.push(['received', ctx.chat.length - 1]); }
    else if ((m = /^\/sys ([\s\S]*)$/.exec(cmd))) { ctx.chat.push({ name: 'System', is_user: false, is_system: false, mes: m[1], extra: { type: 'narrator' } }); events.push(['narrator', ctx.chat.length - 1]); }
    else if ((m = /^\/send ([\s\S]*)$/.exec(cmd))) ctx.chat.push({ name: 'Gleb', is_user: true, is_system: false, mes: m[1], extra: {} });
    return { pipe: '' };
};
const director = (mes) => { ctx.chat.push({ name: E.SCENE_NAME, is_user: false, is_system: false, mes, original_avatar: 'mundi_scene.png', swipes: [mes], swipe_id: 0, extra: { gen_id: 7 } }); return ctx.chat.length - 1; };
const lines = () => ctx.chat.map(m => `${m.is_user ? 'U' : m.extra?.mundi_narrator ? 'N' : m.original_avatar?.[0] ?? '?'}:${m.mes}`);
const RAW = '[Hana]\n*puts the plate down.* "Not my turn."\n\n[Boruto]\n"It is so your turn."\n\n[Narration]\nThe tap drips.\n\n[Hana]\n"Prove it."';

ok(T.eligible(g, w) === false, 'not a Home group here (no group selected): no reply for the room');
ok(B.sceneChar()?.avatar === 'mundi_scene.png' && !B.characters().some(c => c.avatar === 'mundi_scene.png'), 'the director card exists in SillyTavern but no list of Mundi shows it');
ok(B.speakerOf(ctx.chat[director('x')]) === null, 'the director is nobody (speakerOf)');
ctx.chat.length = 0;
ok(T.liveCast().length === 2, `the people here: ${T.liveCast().map(c => c.name)}`);

await B.addUserLine('"Whose turn is it?"');
const id = director(RAW);
ok(T.convertAt(id) === true, 'the director\'s line is cut');
let first = ctx.chat[id];
ok(first.name === 'Hana' && first.original_avatar === 'hana.png' && first.mes.startsWith('*puts the plate down.*') && first.extra.mundi_beat.k === 0 && first.extra.mundi_beat.n === 4, 'the first part takes the director\'s place, as Hana');
ok(first.extra.mundi_beat_pending.length === 3 && first.extra.mundi_beat_raw.length === 1 && first.extra.mundi_beat_sw === 0, 'the rest waits, with the raw version kept');
ok(T.convertAt(id) === false, 'cut once only');
await T.flush();
ok(ctx.chat.length === 5, `three more lines added (${ctx.chat.length})`);
ok(lines().slice(1).join('|') === 'h:*puts the plate down.* "Not my turn."|b:"It is so your turn."|N:The tap drips.|h:"Prove it."', `in order, with authors: ${lines().slice(1)}`);
ok(ctx.chat.slice(1).map(m => m.extra?.mundi_beat?.k).join() === '0,1,2,3' && new Set(ctx.chat.slice(1).map(m => m.extra?.mundi_beat?.id)).size === 1, 'each knows its place in the beat');
ok(!ctx.chat[1].extra.mundi_beat_pending, 'nothing waits any more');
const b = T.lastBeat();
ok(b && b.idx.join() === '1,2,3,4' && b.first === 1, 'the last beat is found');
ok(JSON.stringify(T.beatSwipeState(ctx.chat[4])) === '{"sw":0,"total":1}', 'one version');
ok(ctx.chat[3].extra.mundi_narrator === true, 'the narration is the narrator\'s line');

// swiping through versions: build a beat with two versions by hand, then swipe
ctx.chat.length = 1;   // the player's line only
const id2 = director('[Boruto]\n"Because I cooked."');
T.convertAt(id2); await T.flush();
const f2 = ctx.chat[id2]; f2.extra.mundi_beat_raw.push('[Hana]\n"Fine."\n[Boruto]\n"Thank you."');   // a second version (a new generation adds one like this)
// the chat shows version 1 (one line); now go to version 2 (two lines) and back
await T.beatSwipe(1);
ok(ctx.chat.length === 3 && ctx.chat[1].name === 'Hana' && ctx.chat[2].name === 'Boruto' && ctx.chat[1].extra.mundi_beat_sw === 1, `version 2 laid out whole (${lines().slice(1)})`);
ok(JSON.stringify(T.beatSwipeState(ctx.chat[2])) === '{"sw":1,"total":2}', 'on 2 of 2');
await T.beatSwipe(-1);
ok(ctx.chat.length === 2 && ctx.chat[1].name === 'Boruto' && ctx.chat[1].mes === '"Because I cooked."' && ctx.chat[1].extra.mundi_beat_sw === 0, 'back to version 1');
ok(ctx.chat[1].extra.mundi_beat_raw.length === 2, 'both versions are still kept');

// a beat that came out as rubbish stays one narrator line; an empty reply is left for the usual warning
ctx.chat.length = 1;
const id3 = director('Hana: "Not my turn."\nBoruto: "It is."');
T.convertAt(id3); await T.flush();
ok(ctx.chat.length === 2 && ctx.chat[1].extra.mundi_narrator && /Boruto: "It is\."/.test(ctx.chat[1].mes), 'rubbish: one narrator line with everything');
ctx.chat.length = 1;
const id4 = director('[Gleb]\n"I did it."'); const before = ctx.chat[id4].mes;
ok(T.convertAt(id4) === false && ctx.chat[id4].mes !== before && ctx.chat[id4].mes === '', 'only what was written for the player: nothing is kept (empty reply)');

// a page closed before the rest was added: picked up from the chat
ctx.chat.length = 1;
const id5 = director('[Hana]\n"One."\n[Boruto]\n"Two."\n[Hana]\n"Three."');
T.convertAt(id5);   // the rest is in the line's extra, and in RUN.pending too…
ok(ctx.chat.length === 2, 'only the first part is there');
const saved = JSON.parse(JSON.stringify(ctx.chat));
await T.flush();   // (empties the pending of this run)
ctx.chat.length = 0; for (const m of saved) ctx.chat.push(m);   // …but the page reloads with the chat as saved
ok(ctx.chat.length === 2 && ctx.chat[1].extra.mundi_beat_pending.length === 2, 'saved with the rest still waiting');
T.sweep(); await new Promise(r => setTimeout(r, 50));
ok(ctx.chat.length === 4 && ctx.chat[3].mes === '"Three."' && !ctx.chat[1].extra.mundi_beat_pending, `picked up: ${lines().slice(1)}`);

// at most the most parts: more are cut
store.settings(); const reg = await D('sim/regulator.js'); reg.regCfg().beatMax = 2;
ctx.chat.length = 1;
const id6 = director('[Hana]\n"a"\n[Boruto]\n"b"\n[Hana]\n"c"');
T.convertAt(id6); await T.flush();
ok(ctx.chat.length === 3, `two parts at most (${ctx.chat.length - 1})`);

// the wrapper of a streaming reply must not borrow the class of the quick reactions' buttons (.mu-beat): "display: contents"
// on it took their background, border and padding away (0.2.1-15)
{
    const fs = await import('node:fs'); const css = fs.readdirSync(path.join(root, 'css')).map(f => fs.readFileSync(path.join(root, 'css', f), 'utf8')).join('\n');
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(m => m[1].split(',').some(sel => /(^|\s)#mundi-root\s+\.mu-beat\s*$/.test(sel.trim())));
    ok(rules.length >= 1 && !rules.some(m => /display\s*:\s*contents/.test(m[2])), '.mu-beat (the quick reactions) is never "display: contents"');
    ok(/\.mu-roombeat\s*\{[^}]*display\s*:\s*contents/.test(css), 'the reply\'s wrapper has its own class');
    const scene = fs.readFileSync(path.join(root, 'src/ui/scene.ts'), 'utf8');
    ok(!/class="mu-beat"/.test(scene) && /class="mu-roombeat"/.test(scene), 'the scene uses it');
}
console.log(`beatrun: ${passes} checks passed${fails ? `, ${fails} FAILED` : ''}`);
if (fails) process.exit(1);
