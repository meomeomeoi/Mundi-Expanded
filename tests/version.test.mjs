// [expanded] The version is written in two places and they must agree; the newest changelog entry is that version.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { VERSION, BASE, EXPANDED, CHANGELOG, newer } from '../dist/core/version.js';
const manifest = JSON.parse(fs.readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));
assert.equal(manifest.version, VERSION, 'manifest.json and src/core/version.ts must have the same version');
assert.equal(CHANGELOG[0].v, VERSION, 'the newest changelog entry (src/core/version.ts) must be this version');
assert.match(VERSION, /^\d+\.\d+\.\d+-\d+(\.\d+)*$/, 'fork versions: the upstream version, a dash, Expanded\'s own number (0.2.1-11.1)');
assert.equal(`${BASE}-${EXPANDED}`, VERSION);
assert.ok(newer('0.2.0', '0.1.9') && newer('0.10.0', '0.9.0') && !newer('0.2.0', '0.2.0') && !newer('0.1.0', '0.2.0') && newer('1.0', '0.9.9'), 'versions compare as numbers');
assert.ok(newer('0.2.1-11.1', '0.2.0.11') && newer('0.2.1-12', '0.2.1-11.1') && newer('0.2.1-11.1', '0.2.1-11') && newer('0.2.1-11', '0.2.1') && newer('0.3.0', '0.2.1-14') && !newer('0.2.1-11.1', '0.2.1-11.1'), 'fork versions compare right (old four-part ones too)');
console.log(`version ${VERSION} ok`);
