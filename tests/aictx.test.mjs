// [expanded] The "Narrate what you do right away" buttons (Settings → AI context) are clicks: their handler must be in
// ACT (data-act), not INPUT (data-input), or pressing them does nothing (0.2.1-14.5 shipped it in the wrong one).
// Run: node tests/aictx.test.mjs [repo root]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stage, browser } from './env.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = process.argv[2] ?? path.join(here, '..');
const ext = stage(root, 'aictx');
browser({});
const D = (p) => import(`${ext}/dist/${p}`);
const store = await D('core/store.js'); const reg = await D('ui/reg.js'); await D('ui/aictx.js'); const map = await D('ui/map.js');
let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.log('  FAIL', m); } };
ok(typeof reg.ACT['aic-narrate'] === 'function', 'the narrate buttons have a click handler (ACT)');
ok(!reg.INPUT['aic-narrate'], 'and none in INPUT, where a button never looks');
for (const v of ['all', 'matter', 'none']) {
    reg.ACT['aic-narrate']({ dataset: { v } });
    ok(map.narrateMode() === v, `pressing "${v}" sets the narrate mode (${map.narrateMode()})`);
}
console.log(`aictx: ${passes} checks passed${fails ? `, ${fails} FAILED` : ''}`);
if (fails) process.exit(1);
