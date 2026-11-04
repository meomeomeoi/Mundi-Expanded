// [expanded] Tests for the weather kinds and the together/alone mark (src/sim/weather.ts, src/sim/shared.ts). Run: node tests/weather.test.mjs
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stage, browser } from './env.mjs';

const root = process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ext = stage(root, 'weather'); browser({});
const W = await import(`${ext}/dist/sim/weather.js`);
const S = await import(`${ext}/dist/sim/shared.js`);   // pulls in ownrun, so it needs the stubbed SillyTavern

let n = 0;
const test = (name, fn) => { try { fn(); n++; } catch (e) { console.error(`FAIL ${name}\n`, e); process.exit(1); } };
const names = (season, climate, world = 'modern') => { const s = new Set(); for (let d = 1; d <= 3000; d++) s.add(W.weatherOn(world, d, { season, climate }).name); return s; };

test('without a season: the old five kinds', () => assert.deepEqual([...names(undefined)].sort(), ['Cloudy', 'Fair', 'Partly cloudy', 'Rain', 'Sunny']));
test('deterministic', () => assert.deepEqual(W.weatherOn('w', 17, { season: 'winter' }), W.weatherOn('w', 17, { season: 'winter' })));
test('rain has three strengths', () => { const all = new Set([...names('spring'), ...names('summer'), ...names('autumn'), ...names('winter')]); for (const k of ['Light rain', 'Rain', 'Downpour']) assert.ok(all.has(k), k); });
test('summer: heat and thunderstorms, no snow', () => { const s = names('summer'); assert.ok(s.has('Heatwave') && s.has('Thunderstorm')); assert.ok(!s.has('Snow') && !s.has('Blizzard') && !s.has('Frost')); });
test('winter: frost, snow, blizzards, no heat', () => { const s = names('winter'); assert.ok(s.has('Frost') && s.has('Snow') && s.has('Blizzard')); assert.ok(!s.has('Heatwave')); });
test('autumn: fog and wind', () => { const s = names('autumn'); assert.ok(s.has('Fog') && s.has('Windy')); });
test('a hot climate has no snow, a cold one no heat', () => {
    const hot = names('winter', 'hot'), cold = names('summer', 'cold');
    assert.ok(!hot.has('Snow') && !hot.has('Blizzard') && !hot.has('Frost'));
    assert.ok(!cold.has('Heatwave'));
});
test('flags: a drizzle is rain but keeps nobody in; a downpour, a blizzard and heat do', () => {
    const wx = n => ({ name: n, ...W.weatherOn('x', 1) , ...(({ 'Light rain': { rain: true, light: true }, Downpour: { rain: true, harsh: true }, Blizzard: { rain: false, snow: true, harsh: true }, Heatwave: { rain: false, harsh: true }, Cloudy: { rain: false } })[n]) });
    assert.ok(!W.keepsIndoors(wx('Light rain')));
    for (const k of ['Downpour', 'Blizzard', 'Heatwave']) assert.ok(W.keepsIndoors(wx(k)), k);
    assert.ok(!W.keepsIndoors(wx('Cloudy')));
    // and the real thing
    for (let d = 1; d <= 400; d++) { const w = W.weatherOn('modern', d, { season: 'summer' }); if (w.name === 'Light rain') assert.ok(w.rain && !W.keepsIndoors(w)); if (w.name === 'Downpour' || w.name === 'Heatwave') assert.ok(W.keepsIndoors(w)); }
});
test('"Rain" matches any rain, "Snow" any snow, others by name', () => {
    const m = (season) => { for (let d = 1; d <= 3000; d++) { const w = W.weatherOn('modern', d, { season }); if (w.name === 'Downpour') return w; } };
    const dp = m('autumn'); assert.ok(W.weatherMatches(dp, 'Rain') && W.weatherMatches(dp, 'downpour') && !W.weatherMatches(dp, 'Sunny'));
    let bl; for (let d = 1; d <= 3000 && !bl; d++) { const w = W.weatherOn('modern', d, { season: 'winter' }); if (w.name === 'Blizzard') bl = w; }
    assert.ok(W.weatherMatches(bl, 'snow') && W.weatherMatches(bl, 'Blizzard') && !W.weatherMatches(bl, 'rain'));
    assert.ok(W.weatherMatches(dp, ''));
});
test('the season of a day follows the season length', () => {
    const g = { cfg: { seasonDays: 10 } };
    assert.deepEqual([1, 10, 11, 21, 31, 40, 41].map(d => W.seasonIdOn(g, d)), ['spring', 'spring', 'summer', 'autumn', 'winter', 'winter', 'spring']);
    assert.equal(W.seasonIdOn({}, 15), 'summer');
});
test('together or alone', () => {
    for (const id of ['cook', 'x-fx-music', 'x-own-guitar', 'x-tidy', 'x-own-crossword', 'x-own-study', 'x-own-chore-dishes', 'x-fx-game2']) assert.equal(S.sharingOf(id), 'with', id);
    for (const id of ['x-own-code', 'x-own-write', 'x-freelance', 'x-fx-work', 'x-tv', 'x-run', 'coffee', 'x-fx-watch']) assert.equal(S.sharingOf(id), 'alone', id);
    assert.match(S.sharingBadge('cook'), /👥/); assert.match(S.sharingBadge('x-run'), /👤/);
});
console.log(`weather: ${n} tests passed`);
