// [expanded] Mundi Expanded 15.2: a group reply that came with a "[Group Chat: …]" header and its speaker's own bold name
// is cleaned on arrival (sim/turnrun.ts, the rules in sim/cleanreply.ts). Run: node tests/cleanat.test.mjs [repo root]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stage, browser } from './env.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = process.argv[2] ?? path.join(here, '..');
const ext = stage(root, 'cleanat');
const gcx = path.join(ext, '..', '..', '..', 'group-chats.js');
let src = fs.readFileSync(gcx, 'utf8'); fs.writeFileSync(gcx, src.replace("export let selected_group = '';", "export let selected_group = 'g1';"));
const scriptJs = path.join(ext, '..', '..', '..', '..', 'script.js');
fs.writeFileSync(scriptJs, fs.readFileSync(scriptJs, 'utf8').replace('export const saveChatDebounced = (...a) => undefined;', 'export const saveChatDebounced = () => { globalThis.__saved = (globalThis.__saved ?? 0) + 1; };'));
browser({});
const D = (p) => import(`${ext}/dist/${p}`);
const T = await D('sim/turnrun.js'); const B = await D('st/bridge.js');
let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.log('  FAIL', m); } };
const ctx = globalThis.__ctx; ctx.chat = [{ name: 'Gleb', is_user: true, mes: 'hi', extra: {} }];
ok(B.selectedGroup() === 'g1', 'a group is open (the stub)');
ctx.chat.push({ name: 'Leah', is_user: false, original_avatar: 'leah.png', mes: '**[Group Chat: Evelyn, Finn, Kathie, Leah, Masha, Ruby]**\n\n**Leah:** Six across was \'stacks\'. Puzzle\'s done.', swipes: ['old'], swipe_id: 0, extra: {} });
ok(T.cleanAt(1) === true && ctx.chat[1].mes === 'Six across was \'stacks\'. Puzzle\'s done.', `cleaned (${ctx.chat[1].mes})`);
ok(ctx.chat[1].swipes[0] === ctx.chat[1].mes, 'the shown version too');
ok(T.cleanAt(1) === false, 'cleaned once: nothing more to do');
ctx.chat.push({ name: 'Finn', is_user: false, original_avatar: 'finn.png', mes: 'Plain reply.', extra: {} }); ok(T.cleanAt(2) === false && ctx.chat[2].mes === 'Plain reply.', 'a plain reply is left alone');
ctx.chat.push({ name: 'Finn', is_user: false, mes: 'Leah: no way.', extra: {} }); ok(T.cleanAt(3) === false, 'another person\'s name is not taken off');
ctx.chat.push({ name: 'Leah', is_user: false, mes: '**Leah:**', extra: {} }); ok(T.cleanAt(4) === false && ctx.chat[4].mes === '**Leah:**', 'only a label and nothing else: never leave an empty reply');
ctx.chat.push({ name: 'Gleb', is_user: true, mes: '**Gleb:** hi', extra: {} }); ok(T.cleanAt(5) === false, 'your own lines are not touched');
console.log(`cleanat: ${passes} checks passed${fails ? `, ${fails} FAILED` : ''}`);
if (fails) process.exit(1);
process.exit(0);
