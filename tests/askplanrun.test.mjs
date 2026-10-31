// [expanded] Mundi Expanded 15.3: a plan said in your own words, decided by the engine (sim/askplanrun.ts): one person,
// another time offered with two buttons, several people, a text on the phone. Run: node tests/askplanrun.test.mjs [repo root]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stage, browser, seed, world } from './env.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = process.argv[2] ?? path.join(here, '..');
const ext = stage(root, 'askplan');
const meta = {}; browser(meta);
const D = (p) => import(`${ext}/dist/${p}`);
const store = await D('core/store.js'); const W = await D('core/world.js'); await D('core/saves.js');
const gm = await D('sim/game.js'); const homes = await D('sim/homes.js'); const R = await D('sim/askplanrun.js'); const SO = await D('sim/social.js'); const CR = await D('sim/cplanrun.js');
let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.log('  FAIL', m); } };
seed(8);
const w = world(ext, 'house'); W.registerWorld(w);
const names = ['hana', 'boruto', 'mira'];
globalThis.__ctx.characters = names.map(n => ({ avatar: `${n}.png`, name: n[0].toUpperCase() + n.slice(1), data: {} }));
const zone = w.homes.zones[0];
meta.mundi = { v: 1, world: 'house', lang: 'en', day: 3, minutes: 10 * 60, speed: 0, player: { loc: 'living', home: { zone: zone.id, kind: zone.kind, x: zone.spots[0][0], y: zone.spots[0][1] }, stats: {}, money: 100, traits: {}, origin: '', job: null, rentPaidDay: 3 }, cast: {}, cfg: { rooms: w.places.map(p => p.id) } };
const g = store.game(); store.state.view = 'scene';
for (const n of names) { const r = gm.resident(w, `${n}.png`, homes.takenHomes(g), g.player.home); r.met = true; g.cast[`${n}.png`] = r; }
homes.normalizeHomes(g);
const ctx = globalThis.__ctx; ctx.chat = []; const asks = {}; const sys = [];
ctx.setExtensionPrompt = (k, t) => { asks[k] = t; };
ctx.executeSlashCommandsWithOptions = async (cmd) => { const m = /^\/sys ([\s\S]*)$/.exec(cmd); if (m) sys.push(m[1]); return { pipe: '' }; };
const s = SO.social(g); s.bond = { 'hana.png': 60, 'boruto.png': 70, 'mira.png': 65 }; s.went = {};
const only = (...who) => { s.went = {}; for (const n of names) s.went[`${n}.png`] = { loc: who.includes(n) ? 'living' : `home:${n}.png`, until: 99999999, line: -1 }; s.appts = []; };
const appts = (a) => s.appts.filter(x => x.avatar === a && x.state === 'set');
const reset = () => { for (const k of Object.keys(asks)) delete asks[k]; R.OFFER.card = null; };

// 1. one person says yes: in the calendar before they answer, and the AI is told
only('hana'); reset();
let hit = null;
for (let h = 12; h <= 20 && !hit; h++) { const prop = (await D('sim/askplan.js')).parseProposal(`Hana, let's do some embroidery today at ${h}?`, { day: g.day, minutes: g.minutes }, [{ avatar: 'hana.png', name: 'Hana', talk: 0.5 }]); const d = R.decide(g, w, prop, [g.cast['hana.png']]); if (d.people[0].ok) hit = h; }
ok(hit !== null, `somewhere in the afternoon Hana is free and willing (${hit})`);
ok(R.fromScene(`Oh, listen, Hana, let's do some embroidery today at ${hit}?`) === true, 'a proposal');
ok(appts('hana.png').length === 1 && appts('hana.png')[0].title === 'do some embroidery' && appts('hana.png')[0].from === g.day * 1440 + hit * 60, `in the calendar, in your words (${JSON.stringify(appts('hana.png')[0])})`);
ok(/Hana said yes: it is settled and in the calendar/.test(asks.mundi_ask ?? '') && /"do some embroidery"/.test(asks.mundi_ask), `the AI is told before it answers (${asks.mundi_ask})`);
ok(R.OFFER.card === null, 'no counter-offer');
// not a proposal: nothing changes
reset(); const before = appts('hana.png').length;
ok(R.fromScene("Hana, let's watch a movie") === false && R.fromScene('I woke up at 7') === false && appts('hana.png').length === before && !asks.mundi_ask, 'talk is just talk');

// 2. she is busy then: another time is offered, two buttons; yes puts it in the calendar
only('hana'); reset();
const t0 = g.day * 1440 + 14 * 60; s.appts.push({ id: 'x1', avatar: 'hana.png', place: 'living', from: t0, to: t0 + 120, kind: 'hangout', state: 'set' });
const prop2 = (await D('sim/askplan.js')).parseProposal("Hana, let's cook at 14:30?", { day: g.day, minutes: g.minutes }, [{ avatar: 'hana.png', name: 'Hana', talk: 0.5 }]);
const d2 = R.decide(g, w, prop2, [g.cast['hana.png']]);
ok(!d2.people[0].ok && d2.people[0].alt !== undefined && d2.people[0].alt >= t0 + 120, `busy: not now, but ${d2.people[0].alt && d2.people[0].alt % 1440 / 60}:00 would do (${d2.people[0].why})`);
R.fromScene("Hana, let's cook at 14:30?");
ok(R.OFFER.card && R.OFFER.card.avatar === 'hana.png' && R.OFFER.card.from === d2.people[0].alt, 'the card');
ok(/cannot then \(.*\) but could at .* the same day: Hana says so and suggests that time instead/.test(asks.mundi_ask ?? '') && /has not answered yet/.test(asks.mundi_ask), `the AI is told to suggest it (${asks.mundi_ask})`);
const ui = await D('ui/expanded.js'); const html = ui.expandedOverlays();
ok(/class="mu-talkcard mu-offer"/.test(html) && /data-act="ap-yes"/.test(html) && /data-act="ap-no"/.test(html) && /Hana<\/b> cannot/.test(html), 'two buttons on screen');
const n0 = appts('hana.png').length;
await R.acceptOffer();
ok(R.OFFER.card === null && appts('hana.png').length === n0 + 1 && appts('hana.png').some(a => a.from === d2.people[0].alt), 'yes: in the calendar at the other time');
ok(sys.some(t => /settle on/.test(t)) && /said yes to Hana's other time/.test(asks.mundi_ask ?? ''), 'and the story and the AI know');
R.OFFER.card = { avatar: 'hana.png', name: 'Hana', from: g.day * 1440 + 18 * 60, place: 'living', title: '', kind: 'hangout', where: 'scene', whenText: 'today at 18:00', first: 'today at 14:30' }; R.declineOffer();
ok(R.OFFER.card === null, 'no: nothing');
R.OFFER.card = { avatar: 'hana.png', name: 'Hana', from: g.day * 1440 + 10 * 60 + 5, place: 'living', title: '', kind: 'hangout', where: 'scene', whenText: 'x', first: 'y' };
ok(R.offerHtml(String, String) === '' && R.OFFER.card === null, 'a time that has gone: the card goes too');

// 3. several: those free and willing are in; the AI is told each answer; a known activity is the house's plan with you in it
only('hana', 'boruto', 'mira'); reset();
let group = null;
for (let m = 0; m < 40 && !group; m++) {
    only('hana', 'boruto', 'mira'); reset(); R.OFFER.card = null; CR.cplansOf(g).length = 0;
    const text = `everyone, let's watch a movie tonight at 20:${String(m).padStart(2, '0')}`;
    const prop = (await D('sim/askplan.js')).parseProposal(text, { day: g.day, minutes: g.minutes }, names.map(n => ({ avatar: `${n}.png`, name: n[0].toUpperCase() + n.slice(1), talk: 0.5 })));
    const d = R.decide(g, w, prop, names.map(n => g.cast[`${n}.png`])); if (d.people.filter(p => p.ok).length >= 2 && d.people.some(p => !p.ok)) group = text;
}
ok(group !== null, 'some evening: two say yes and one cannot');
if (group) {
    ok(R.fromScene(group), 'the call for everyone');
    const line = asks.mundi_ask; const yes = names.filter(n => new RegExp(`${n[0].toUpperCase() + n.slice(1)} — yes`).test(line)); const no = names.filter(n => new RegExp(`${n[0].toUpperCase() + n.slice(1)} — no \\(`).test(line));
    ok(yes.length >= 2 && no.length >= 1 && yes.length + no.length === 3, `each answer is in what the AI is told (${line})`);
    const cp = CR.cplansOf(g).find(p => p.act === 'movie');
    ok(cp && cp.you === 'yes' && yes.every(n => cp.who.includes(`${n}.png`)) && no.every(n => !cp.who.includes(`${n}.png`)), `the house's movie night, with the ones who said yes and you in it (${JSON.stringify(cp)})`);
    ok(R.OFFER.card === null, 'no counter-offers for a group');
}
// 3b. several, a thing the house has no word for: each one who said yes has your plan with a title of your own
only('hana', 'boruto'); reset(); CR.cplansOf(g).length = 0;
let any = null; for (let m = 0; m < 40 && !any; m++) { const text = `guys, let's repaint the shelf tomorrow at 15:${String(m).padStart(2, '0')}`; const p = (await D('sim/askplan.js')).parseProposal(text, { day: g.day, minutes: g.minutes }, names.slice(0, 2).map(n => ({ avatar: `${n}.png`, name: n[0].toUpperCase() + n.slice(1), talk: 0.5 }))); const d = R.decide(g, w, p, [g.cast['hana.png'], g.cast['boruto.png']]); if (d.people.every(x => x.ok)) any = text; }
if (any) { s.appts = []; ok(R.fromScene(any) && appts('hana.png').length === 1 && appts('boruto.png').length === 1 && appts('hana.png')[0].title === 'repaint the shelf', 'each one who said yes has the plan, with your title'); }
// 4. off, or alone: nothing
only(); reset(); ok(R.fromScene("let's cook at 20") === false, 'nobody here: nothing');
only('hana'); (store.game().talkx ??= { cfg: {} }); g.talkx.cfg.plans = false; ok(R.fromScene("Hana, let's cook at 20") === false && !asks.mundi_ask, 'turned off: just talk'); g.talkx.cfg.plans = true;

// 5. by text on the phone: she decides and answers by text, your words stay in the thread
only(); reset(); s.threads = {}; s.appts = [];
let h5 = null; for (let h = 13; h <= 21 && !h5; h++) { const p = (await D('sim/askplan.js')).parseProposal(`let's play games tomorrow at ${h}?`, { day: g.day, minutes: g.minutes }, [{ avatar: 'boruto.png', name: 'Boruto', talk: 0.5 }]); if (R.decide(g, w, p, [g.cast['boruto.png']]).people[0].ok) h5 = h; }
const reply = await R.fromPhone(g, w, 'boruto.png', `let's play games tomorrow at ${h5}?`);
ok(typeof reply === 'string' && reply.length > 0, `she answers by text (${reply})`);
ok(appts('boruto.png').length === 1 && appts('boruto.png')[0].from === (g.day + 1) * 1440 + h5 * 60, 'in the calendar');
ok(s.threads['boruto.png'].length === 2 && s.threads['boruto.png'][0].me === true && s.threads['boruto.png'][0].text === `let's play games tomorrow at ${h5}?`, 'the thread has your words and her reply');
ok(await R.fromPhone(g, w, 'boruto.png', 'how are you?') === null, 'not a proposal: the usual text goes');
console.log(`askplanrun: ${passes} checks passed${fails ? `, ${fails} FAILED` : ''}`);
if (fails) process.exit(1);
process.exit(0);
