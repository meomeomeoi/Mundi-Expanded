// [expanded] Mundi Expanded 15.2: someone who leaves the room by their own day is told in a line, and a reply being
// written at that moment is told to be a short parting one (sim/talkrun.ts). Run: node tests/leaving.test.mjs [repo root]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stage, browser, seed, world } from './env.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = process.argv[2] ?? path.join(here, '..');
const ext = stage(root, 'leaving');
const gcx = path.join(ext, '..', '..', '..', 'group-chats.js');   // SillyTavern's group turn is going on
fs.writeFileSync(gcx, fs.readFileSync(gcx, 'utf8') + '\nexport let is_group_generating = true;\n');
const meta = {}; browser(meta);
const D = (p) => import(`${ext}/dist/${p}`);
const store = await D('core/store.js'); const W = await D('core/world.js'); await D('core/saves.js');
const gm = await D('sim/game.js'); const homes = await D('sim/homes.js'); const R = await D('sim/talkrun.js'); const LH = await D('sim/lifehooks.js'); const P = await D('sim/people.js');
let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.log('  FAIL', m); } };
seed(6);
const w = world(ext, 'house'); W.registerWorld(w);
globalThis.__ctx.characters = ['hana', 'boruto', 'mira'].map(n => ({ avatar: `${n}.png`, name: n[0].toUpperCase() + n.slice(1), data: {} }));
const zone = w.homes.zones[0];
meta.mundi = { v: 1, world: 'house', lang: 'en', day: 3, minutes: 14 * 60, speed: 0, player: { loc: 'living', home: { zone: zone.id, kind: zone.kind, x: zone.spots[0][0], y: zone.spots[0][1] }, stats: {}, money: 100, traits: {}, origin: '', job: null, rentPaidDay: 3 }, cast: {}, cfg: { rooms: w.places.map(p => p.id) } };
const g = store.game(); store.state.view = 'scene';
for (const a of ['hana.png', 'boruto.png', 'mira.png']) { const r = gm.resident(w, a, homes.takenHomes(g), g.player.home); r.met = true; g.cast[a] = r; }
homes.normalizeHomes(g);
const sys = []; const asks = {};
const ctx = globalThis.__ctx; ctx.chat = [];
ctx.executeSlashCommandsWithOptions = async (cmd) => { const m = /^\/sys ([\s\S]*)$/.exec(cmd); if (m) { sys.push(m[1]); ctx.chat.push({ name: 'System', is_user: false, mes: m[1], extra: { type: 'narrator' } }); } return { pipe: '' }; };
ctx.setExtensionPrompt = (key, text) => { asks[key] = text; };
const social = (g.social = g.social ?? {}); social.went = {};
const gather = () => { for (const a of ['hana.png', 'boruto.png', 'mira.png']) social.went[a] = { loc: 'living', until: 99999999, line: -1 }; };
const sync = () => LH.afterSync.forEach(f => f(g, w, P.presentAt(g, w, g.player.loc)));
const wait = () => new Promise(r => setTimeout(r, 30));
gather(); sync(); await wait();   // a game just loaded: nothing happens on its own
ok(sys.length === 0, 'nothing at the first sync');

social.went['hana.png'] = { loc: 'home:hana.png', until: 99999999, line: -1 };
sync(); await wait();
ok(sys.length === 1 && sys[0] === 'Hana goes to their room.', `to their room (${sys})`);
ok(/Hana is leaving the room right now\. If Hana answers, it is one short parting line/.test(asks.mundi_ask ?? ''), `a reply being written is told to be a parting one (${asks.mundi_ask})`);
sync(); await wait(); ok(sys.length === 1, 'said once only');

social.went['boruto.png'] = { loc: P.OUT, until: 99999999, line: -1 }; delete asks.mundi_ask;
sync(); await wait();
ok(sys.at(-1) === 'Boruto heads out.', `out of the house (${sys.at(-1)})`);
social.went['mira.png'] = { loc: 'kitchen', until: 99999999, line: -1 };
sync(); await wait(); ok(/^Mira goes to the? ?kitchen\.$|^Mira goes to .*kitchen/.test(sys.at(-1)), `to another room (${sys.at(-1)})`);

// not when you are the one who moved, not on a long wait, not asleep
gather(); sync(); await wait(); const n0 = sys.length;
g.player.loc = 'kitchen'; social.went['hana.png'] = { loc: 'kitchen', until: 99999999, line: -1 }; sync(); await wait();
ok(sys.length === n0, 'you moved: they are not "leaving"');
g.player.loc = 'living'; gather(); sync(); await wait();
R.talkOf(g).prevAt = (g.day * 1440 + g.minutes) - 120; social.went['hana.png'] = { loc: 'home:hana.png', until: 99999999, line: -1 }; R.talkOf(g).said = {};
sync(); await wait(); ok(sys.length === n0, 'a long wait (hours passed in one jump): no spam of "goes to their room"');
gather(); sync(); await wait(); g.asleep = true; social.went['hana.png'] = { loc: 'home:hana.png', until: 99999999, line: -1 }; sync(); await wait();
ok(sys.length === n0, 'asleep: nothing'); g.asleep = false;

// someone who had enough company says so in their own line (leave): no second line for the same thing
gather(); sync(); await wait(); const n1 = sys.length;
R.talkOf(g).said = { 'hana.png': g.day * 1440 + g.minutes - 5 }; social.went['hana.png'] = { loc: 'home:hana.png', until: 99999999, line: -1 };
sync(); await wait(); ok(sys.length === n1, 'one who just had a line of their own (had enough): no second one');
console.log(`leaving: ${passes} checks passed${fails ? `, ${fails} FAILED` : ''}`);
if (fails) process.exit(1);
process.exit(0);
