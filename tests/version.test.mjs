// [expanded] The version is written in two places and they must agree; the newest changelog entry is that version.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { VERSION, BASE, CHANGELOG, newer } from '../dist/core/version.js';
const manifest = JSON.parse(fs.readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));
assert.equal(manifest.version, VERSION, 'manifest.json and src/core/version.ts must have the same version');
assert.equal(CHANGELOG[0].v, VERSION, 'the newest changelog entry (src/core/version.ts) must be this version');
assert.match(VERSION, /^\d+\.\d+\.\d+\.\d+$/, 'fork versions have four parts: upstream version + release number');
assert.equal(BASE, VERSION.split('.').slice(0, 3).join('.'));
assert.ok(newer('0.2.0.1', '0.2.0') && newer('0.2.0.2', '0.2.0.1') && newer('0.3.0', '0.2.0.9') && !newer('0.2.0', '0.2.0.1'));
console.log(`version ${VERSION} ok`);
