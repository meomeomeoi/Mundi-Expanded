// [expanded] The mini-games of your own life (Mundi Expanded 0.2.1-12): cooking, the guitar, cleaning, a crossword,
// work and studying, programming, writing. Clicking one of their actions in a room first asks: play it, or just do it
// (and with whom). The code runs the game (what is on screen, the timer, the score); the mechanics model writes only
// the content, in one call for a session (a dish and its choices; the crossword's words; code with a bug, ideas for
// the project; ideas for the story), and each game has a built-in set when that call fails. The result goes into the
// story (a line), your skill grows, and the action itself goes on as before (its time and effects).
import { esc, game, notify, saveGame, toast, nowAbs, type Save } from '../core/store.js';
import { getWorld, isScenario, type WorldDef } from '../core/world.js';
import { thumb, personaName } from '../st/bridge.js';
import { icon } from './icons.js';
import { ACT, INPUT } from './reg.js';
import { presentAt, whereNow, OUT } from '../sim/people.js';
import { slotAt } from '../sim/lifeday.js';
import { bump } from '../sim/social.js';
import { looseJson } from '../sim/jsonfix.js';
import * as R from '../sim/ownrun.js';
import * as O from '../sim/own.js';

type Phase = 'load' | 'play' | 'done';
export const GV: { game: R.Game | ''; phase: Phase; d: any; score: number; partner: string; bubble: string; bubbleAt: number; raf: number; timers: any[]; text: string; setup: any } =
    { game: '', phase: 'load', d: null, score: 0, partner: '', bubble: '', bubbleAt: 0, raf: 0, timers: [], text: '', setup: null };
const ctxW = () => { const g = game(); const w = g && getWorld(g.world); return g && w && isScenario(w) ? { g, w } : null; };
const nm = (g: Save, a: string) => g.cast[a]?.name ?? a;
const lvl = (g: Save, s: O.Skill | null) => (s ? R.levelOf(g, s) : 1);
const era = (g: Save) => String((g as any).erax?.era ?? 'now');
const clear = () => { cancelAnimationFrame(GV.raf); GV.timers.forEach(t => clearTimeout(t)); GV.timers = []; };
const later = (f: () => void, ms: number) => { GV.timers.push(setTimeout(f, ms)); };
const say = (t: string) => { if (!t) return; GV.bubble = t; GV.bubbleAt = Date.now(); notify(); later(() => { if (Date.now() - GV.bubbleAt >= 3900) { GV.bubble = ''; notify(); } }, 4000); };
async function ask(prompt: string, n: number): Promise<any> {
    // at most 40 seconds: then the game goes on with its own content (or says it could not start)
    try { const { bgAsk } = await import('../sim/regulator.js'); const raw = await Promise.race([bgAsk(prompt, n, 'You write the content of small games for a cozy slice-of-life story. Fiction; answer with JSON only.'), new Promise<string>(r => setTimeout(() => r(''), 40000))]); return raw ? looseJson(raw) : null; } catch { return null; }
}

/* ---------- the choice: play it, or just do it ---------- */

const PLAYABLE: Record<R.Game, string> = { cook: 'Cook it step by step', guitar: 'Play it', clean: 'Clean it yourself', crossword: 'Solve it', work: 'Focus on it', study: 'Focus on it', code: 'Write the code', write: 'Write it' };
const WITH: R.Game[] = ['cook', 'guitar', 'clean', 'crossword', 'study'];
export function ownHtml(): string {
    const c = ctxW(); if (!c) return '';
    const { g, w } = c; const p = R.OWN.pending;
    if (!p) { if (GV.game) closeGame(); return ''; }
    if (GV.game) return gameHtml(g, w);
    const ppl = presentAt(g, w, g.player.loc).filter(r => r.met);
    const s = p.skill; const L = lvl(g, s);
    const games = R.ocfg(g).games;
    return `<div class="mu-dlg-veil" data-act="og-veil"></div><div class="mu-panel mu-dlg mu-glassdlg mu-own-pick" role="dialog">
        <h3>${esc(p.a.icon ?? '')} ${esc(p.a.label)}</h3>
        <small class="mu-muted">${p.a.minutes} min${s ? ` · ${O.SKILLS[s].name} ${L}/10 (${O.LEVEL_WORDS[L]})` : ''}</small>
        ${WITH.includes(p.game) && ppl.length ? `<div class="mu-chips"><span class="mu-muted">With:</span><button class="mu-chip ${!p.with ? 'is-on' : ''}" data-act="og-with" data-who="">Alone</button>${ppl.map(r => `<button class="mu-chip ${p.with === r.avatar ? 'is-on' : ''}" data-act="og-with" data-who="${esc(r.avatar)}"><img src="${esc(thumb(r.avatar))}" alt="">${esc(r.name)}</button>`).join('')}</div>` : ''}
        <div class="mu-row mu-dlg-btns"><button class="mu-ghost" data-act="og-cancel">Never mind</button><button data-act="og-auto">Just do it</button>${games ? `<button class="mu-primary" data-act="og-play">${icon('star')}<span>${PLAYABLE[p.game]}</span></button>` : ''}</div></div>`;
}
function closeGame() { clear(); GV.game = ''; GV.d = null; GV.bubble = ''; GV.setup = null; }

/* ---------- the frame ---------- */

function gameHtml(g: Save, w: WorldDef): string {
    const p = R.OWN.pending!; const partner = GV.partner && g.cast[GV.partner];
    const head = `<header class="mu-og-head"><b>${esc(p.a.icon ?? '')} ${esc(p.a.label)}</b>${partner ? `<span class="mu-og-partner"><img src="${esc(thumb(GV.partner))}" alt="">${GV.bubble ? `<q data-notr>${esc(GV.bubble)}</q>` : ''}</span>` : ''}<button class="mu-ibtn mu-ghost" data-act="og-quit" title="Stop">${icon('x')}</button></header>`;
    let body = '';
    if (GV.phase === 'load') body = `<p class="mu-muted mu-og-load">${GV.setup ? '' : 'Getting ready…'}</p>${GV.setup ? setupHtml(g) : ''}`;
    else if (GV.phase === 'done') body = `<div class="mu-og-done"><p data-notr>${esc(GV.text.replace(/\{\{user\}\}/g, personaName()))}</p><button class="mu-primary" data-act="og-finish">${icon('check')}<span>Done</span></button></div>`;
    else body = ({ cook: cookHtml, guitar: guitarHtml, clean: cleanHtml, crossword: crossHtml, work: focusHtml, study: focusHtml, code: codeHtml, write: writeHtml } as Record<R.Game, (g: Save) => string>)[GV.game as R.Game](g);
    void w;
    return `<div class="mu-dlg-veil"></div><div class="mu-panel mu-dlg mu-glassdlg mu-og mu-og-${GV.game}" role="dialog">${head}${body}</div>`;
}
async function start(g: Save, w: WorldDef) {
    const p = R.OWN.pending!; GV.game = p.game; GV.phase = 'load'; GV.partner = p.with; GV.score = 0; GV.bubble = ''; clear(); notify();
    if (p.game === 'write' || p.game === 'code') { const b = openBook(g, p.game === 'write' ? 'writing' : 'coding'); if (!b) { GV.setup = { kind: p.game === 'write' ? 'writing' : 'coding', size: 'short', genre: 'mystery', title: '', idea: '' }; notify(); return; } }
    await ({ cook: startCook, guitar: startGuitar, clean: startClean, crossword: startCross, work: startFocus, study: startFocus, code: startCode, write: startWrite } as Record<R.Game, (g: Save, w: WorldDef) => Promise<void>>)[p.game](g, w);
}
/** The game is over: what it means, in words, then Done (the story gets the line, the action goes on). */
function over(score: number, text: string, extra?: () => void) {
    clear(); GV.score = Math.max(0, Math.min(1, score)); GV.text = text; GV.phase = 'done'; (GV as any).extra = extra; notify();
}
const word4 = (s: number, w: [string, string, string, string]) => (s >= 0.85 ? w[3] : s >= 0.6 ? w[2] : s >= 0.35 ? w[1] : w[0]);
const withText = (g: Save) => (GV.partner && g.cast[GV.partner] ? ` with ${nm(g, GV.partner)}` : '');

/* ---------- cooking ---------- */

const COOK_FALLBACK = { dish: 'pasta with whatever is in the fridge', steps: [
    { q: 'The water for the pasta:', options: ['Salt it well once it boils', 'No salt, it is healthier', 'Add oil so it does not stick'], right: 0 },
    { q: 'The garlic goes in:', options: ['First, on high heat, until dark', 'Gently, until it just smells good', 'At the very end, raw'], right: 1 },
    { q: 'Before mixing the sauce with the pasta:', options: ['Rinse the pasta under cold water', 'Keep a cup of the pasta water', 'Let the pasta cool down'], right: 1 }],
    partner: { good: 'Okay, that is actually really good.', bad: 'It is… edible. Mostly.', tip: 'Do not burn the garlic.' } };
async function startCook(g: Save) {
    const items = (((g as any).stock?.items ?? []) as any[]).filter(i => i.qty > 0 && ['ingredient', 'food'].includes(i.kind) && (i.store === 'fridge' || i.store === 'pantry')).map(i => i.name).slice(0, 14);
    const partner = GV.partner ? nm(g, GV.partner) : '';
    const j = await ask(`${personaName()} is cooking${partner ? ` with ${partner}` : ''} in the house's kitchen${era(g) !== 'now' ? ` (the ${era(g)})` : ''}. In the fridge and pantry: ${items.join(', ') || 'basic staples'}. Cooking skill ${lvl(g, 'cooking')}/10.
Invent a home dish that can be made from a few of these and basics. Three moments of the cooking, each a small choice with one right answer (a real cooking tip; the wrong ones plausible).${partner ? ` And ${partner}'s lines, in character: one if it goes well, one if it goes badly, one short tip during the cooking.` : ''}
JSON only: {"dish": "...", "steps": [{"q": "...", "options": ["...", "...", "..."], "right": 0}], "partner": {"good": "...", "bad": "...", "tip": "..."}}`, 900);
    const ok = j && typeof j.dish === 'string' && Array.isArray(j.steps) && j.steps.length >= 2 && j.steps.every((s: any) => Array.isArray(s?.options) && s.options.length >= 2);
    const d = ok ? j : COOK_FALLBACK;
    GV.d = { dish: String(d.dish).slice(0, 60), steps: d.steps.slice(0, 3).map((s: any) => ({ q: String(s.q).slice(0, 120), options: s.options.slice(0, 3).map((o: any) => String(o).slice(0, 90)), right: Math.max(0, Math.min(2, Number(s.right) || 0)) })),
        partner: d.partner ?? {}, i: 0, right: 0, timing: 0, mode: 'choice' as 'choice' | 'heat', pos: 0, dir: 1, zone: [40, 62], picked: -1 };
    GV.phase = 'play'; notify();
    if (GV.partner && GV.d.partner.tip) later(() => say(GV.d.partner.tip), 2500);
}
function cookHtml(): string {
    const d = GV.d; const n = d.steps.length;
    if (d.mode === 'heat') return `<p><b data-notr>${esc(d.dish)}</b> · on the heat: stop when it is just right</p>
        <div class="mu-tg-track mu-og-heat" data-morph-skip><i class="mu-tg-zone" style="left:${d.zone[0]}%;width:${d.zone[1] - d.zone[0]}%"></i><i class="mu-tg-mark"></i></div>
        <div class="mu-row"><button class="mu-primary" data-act="og-heat">Now! <small>(space)</small></button></div>`;
    const s = d.steps[d.i];
    return `<p><b data-notr>${esc(d.dish)}</b> · step ${d.i + 1} of ${n}</p><p data-notr>${esc(s.q)}</p>
        <div class="mu-og-opts">${s.options.map((o: string, k: number) => `<button class="${d.picked >= 0 ? (k === s.right ? 'is-right' : k === d.picked ? 'is-wrong' : '') : ''}" data-act="og-cook" data-i="${k}"><span data-notr>${esc(o)}</span></button>`).join('')}</div>`;
}
function cookPick(k: number) {
    const d = GV.d; if (!d || d.picked >= 0) return; d.picked = k; if (k === d.steps[d.i].right) d.right++; notify();
    later(() => { d.picked = -1; if (d.i === 0 || d.i === 1) { d.mode = 'heat'; heat(); } else cookNext(); notify(); }, 900);
}
function heat() {
    const d = GV.d; d.pos = 0; d.dir = 1; const L = lvl(game()!, 'cooking'); const wdt = 16 + L * 1.5; const s0 = 25 + Math.random() * (60 - wdt); d.zone = [s0, s0 + wdt];
    let last = performance.now();
    const step = (t: number) => {
        if (GV.game !== 'cook' || d.mode !== 'heat') return; const dt = (t - last) / 1000; last = t;
        d.pos += d.dir * dt * (60 + d.i * 15); if (d.pos > 100) { d.pos = 100; d.dir = -1; } if (d.pos < 0) { d.pos = 0; d.dir = 1; }
        const el = document.querySelector<HTMLElement>('#mundi-root .mu-og-heat .mu-tg-mark'); if (el) el.style.left = `${d.pos}%`;
        GV.raf = requestAnimationFrame(step);
    };
    GV.raf = requestAnimationFrame(step);
}
function heatHit() {
    const d = GV.d; if (!d || d.mode !== 'heat') return; cancelAnimationFrame(GV.raf);
    const hit = d.pos >= d.zone[0] && d.pos <= d.zone[1]; if (hit) d.timing++;
    toast(hit ? 'Just right.' : d.pos > d.zone[1] ? 'A bit too much…' : 'Not quite done…', hit ? 'success' : 'info', { ms: 900 });
    d.mode = 'choice'; cookNext();
}
function cookNext() {
    const d = GV.d; d.i++;
    if (d.i < d.steps.length) { notify(); return; }
    const g = game()!; const score = (d.right / d.steps.length) * 0.65 + (d.timing / 2) * 0.35;
    const q = word4(score, ['burnt and sad', 'edible', 'tasty', 'delicious']);
    if (GV.partner) say(score >= 0.5 ? d.partner.good ?? '' : d.partner.bad ?? '');
    const dish = d.dish; const partner = GV.partner;
    over(score, `{{user}} cooked ${dish}${withText(g)}: it came out ${q}.`, () => {
        if (partner) bump(g, partner, score >= 0.5 ? 2 : 1);
        setTimeout(() => { const it = (((g as any).stock?.items ?? []) as any[]).filter(i => i.name === 'Leftovers' && i.qty > 0).at(-1); if (it) { it.name = `${dish.charAt(0).toUpperCase()}${dish.slice(1)} (leftovers)`; saveGame(); } }, 50);
    });
}

/* ---------- the guitar ---------- */

const SONGS = ['a slow blues', 'a campfire song', 'a song of your own', 'an old ballad', 'a cover of a pop hit', 'a fingerpicking piece', 'a punk riff', 'a lullaby'];
let AC: AudioContext | null = null;
function pluck(freq: number, ok = true) {
    const g = game(); if (!g || !R.ocfg(g).sound) return;
    try {
        AC ??= new AudioContext(); const ac = AC; const n = Math.round(ac.sampleRate / freq); const len = ac.sampleRate * (ok ? 1.2 : 0.15);
        const buf = ac.createBuffer(1, len, ac.sampleRate); const data = buf.getChannelData(0);
        const ring = new Float32Array(n).map(() => Math.random() * 2 - 1);   // Karplus-Strong: a burst of noise in a short delay line, averaged as it loops
        for (let i = 0, k = 0; i < len; i++, k = (k + 1) % n) { const nx = (k + 1) % n; ring[k] = ok ? 0.497 * (ring[k] + ring[nx]) : ring[k] * 0.6; data[i] = ring[k]; }
        const src = ac.createBufferSource(); src.buffer = buf; const vol = ac.createGain(); vol.gain.value = ok ? 0.35 : 0.12; src.connect(vol).connect(ac.destination); src.start();
    } catch { /* no sound */ }
}
async function startGuitar(g: Save) {
    const L = lvl(g, 'music'); const n = 18 + L * 2; const dur = 22000; const notes: { t: number; lane: number; hit: number }[] = [];
    let t = 1500; for (let i = 0; i < n; i++) { t += (dur - 2000) / n * (0.6 + Math.random() * 0.8); notes.push({ t, lane: Math.floor(Math.random() * 3), hit: 0 }); }
    const key = [196, 220, 247, 262, 294, 330, 349, 392]; const base = Math.floor(Math.random() * 3);
    GV.d = { song: SONGS[Math.floor(Math.random() * SONGS.length)], notes, t0: performance.now() + 600, dur, pitch: [key[base], key[base + 2], key[base + 4]], perfect: 0, good: 0, miss: 0, win: 150 + L * 8 };
    GV.phase = 'play'; notify();
    const step = () => {
        const d = GV.d; if (GV.game !== 'guitar' || !d) return; const now = performance.now() - d.t0;
        const field = document.querySelector<HTMLElement>('#mundi-root .mu-og-lanes'); if (field) {
            const h = field.clientHeight;
            for (const [i, nt] of d.notes.entries()) {
                const el = field.querySelector<HTMLElement>(`[data-n="${i}"]`); if (!el) continue;
                const y = (1 - (nt.t - now) / 1800) * (h - 30); el.style.transform = `translateY(${y}px)`; el.style.opacity = nt.hit ? '0' : y < -20 ? '0' : '1';
                if (!nt.hit && now - nt.t > d.win) { nt.hit = -1; d.miss++; el.classList.add('is-miss'); }
            }
        }
        if (now > d.dur + 800) { endGuitar(); return; }
        GV.raf = requestAnimationFrame(step);
    };
    GV.raf = requestAnimationFrame(step);
}
function guitarHtml(): string {
    const d = GV.d;
    return `<p>Playing <b data-notr>${esc(d.song)}</b> · <small class="mu-muted">A S D or tap the strings</small></p>
        <div class="mu-og-lanes" data-morph-skip>${[0, 1, 2].map(l => `<button class="mu-og-lane" data-act="og-strum" data-l="${l}"><i></i></button>`).join('')}${d.notes.map((n: any, i: number) => `<span class="mu-og-note l${n.lane}" data-n="${i}"></span>`).join('')}<i class="mu-og-line"></i></div>`;
}
function strum(lane: number) {
    const d = GV.d; if (GV.game !== 'guitar' || !d) return; const now = performance.now() - d.t0;
    const nt = d.notes.filter((n: any) => !n.hit && n.lane === lane).sort((a: any, b: any) => Math.abs(a.t - now) - Math.abs(b.t - now))[0];
    const el = document.querySelector(`#mundi-root .mu-og-lane:nth-child(${lane + 1})`); el?.classList.remove('is-hit'); void (el as HTMLElement)?.offsetWidth; el?.classList.add('is-hit');
    if (nt && Math.abs(nt.t - now) <= d.win) { const perfect = Math.abs(nt.t - now) <= d.win / 2.5; nt.hit = 1; perfect ? d.perfect++ : d.good++; pluck(d.pitch[lane], true); }
    else pluck(d.pitch[lane] / 2, false);
}
function endGuitar() {
    const g = game()!; const d = GV.d; const total = d.notes.length;
    const score = Math.max(0, (d.perfect + d.good * 0.6) / total - d.miss * 0.01);
    const q = word4(score, ['rough', 'all right', 'good', 'beautiful']);
    const ppl = presentAt(g, getWorld(g.world)!, g.player.loc).filter(r => r.met).map(r => r.name);
    const music = { at: nowAbs(g), word: q, loc: g.player.loc };
    over(score, `{{user}} played ${d.song} on the guitar${ppl.length ? ` for ${ppl.join(' and ')}` : ''}: it sounded ${q}.`, () => { (R.ownOf(g) as any).music = music; });
}

/* ---------- cleaning ---------- */

const MESS: Record<string, string[]> = { dishes: ['🍽️', '🥣', '🍴', '🥄', '☕'], trash: ['🥤', '📦', '🍌', '🧃', '📰'], clean: ['👕', '📚', '🧦', '🎮', '🥤'], bath: ['🧴', '🪥', '🧻', '🧽', '🩴'], room: ['👕', '📚', '🧦', '🎧', '📦'] };
async function startClean(g: Save) {
    const p = R.OWN.pending!; const kind = /chore-(\w+)/.exec(p.a.id)?.[1] ?? 'room';
    const spots = Array.from({ length: 9 }, () => ({ x: 8 + Math.random() * 80, y: 10 + Math.random() * 70, v: 1, r: 26 + Math.random() * 26 }));
    const things = (MESS[kind] ?? MESS.room).map(e => ({ e, x: 6 + Math.random() * 84, y: 8 + Math.random() * 74, done: false }));
    const handy = ((g.player as any).traits?.proficiency ?? []).includes('Handy');   // a Handy persona has more time
    GV.d = { kind, spots: kind === 'trash' ? [] : spots, things, ends: Date.now() + (25 + (GV.partner ? 8 : 0) + (handy ? O.HANDY_SECONDS : 0)) * 1000 };
    GV.phase = 'play'; notify();
    const tick = () => { if (GV.game !== 'clean') return; const left = GV.d.ends - Date.now(); const el = document.querySelector<HTMLElement>('#mundi-root .mu-og-clock'); if (el) el.textContent = `${Math.max(0, Math.ceil(left / 1000))}s`;
        if (GV.partner && Math.random() < 0.03) { const s = GV.d.spots.find((x: any) => x.v > 0); if (s) { s.v = Math.max(0, s.v - 0.5); paintSpots(); } }
        if (left <= 0 || allClean()) { endClean(); return; } GV.raf = requestAnimationFrame(tick); };
    GV.raf = requestAnimationFrame(tick);
}
const allClean = () => GV.d.spots.every((s: any) => s.v <= 0.05) && GV.d.things.every((t: any) => t.done);
function paintSpots() { const d = GV.d; document.querySelectorAll<HTMLElement>('#mundi-root .mu-og-spot').forEach((el, i) => { el.style.opacity = String(Math.max(0, d.spots[i]?.v ?? 0)); }); }
function cleanHtml(): string {
    const d = GV.d;
    return `<p>${d.spots.length ? 'Scrub the dirt (hold and rub), and ' : ''}put the things away (click them) · <b class="mu-og-clock" data-morph-skip>…</b></p>
        <div class="mu-og-surface is-${esc(d.kind)}" data-morph-skip>${d.spots.map((s: any, i: number) => `<i class="mu-og-spot" data-i="${i}" style="left:${s.x}%;top:${s.y}%;width:${s.r}px;height:${s.r}px;opacity:${s.v}"></i>`).join('')}
        ${d.things.map((t: any, i: number) => `<button class="mu-og-thing" data-act="og-put" data-i="${i}" style="left:${t.x}%;top:${t.y}%">${t.e}</button>`).join('')}<span class="mu-og-box">🧺</span></div>`;
}
function scrubAt(x: number, y: number) {
    const d = GV.d; if (GV.game !== 'clean' || !d) return;
    const box = document.querySelector<HTMLElement>('#mundi-root .mu-og-surface'); if (!box) return; const r = box.getBoundingClientRect();
    for (const s of d.spots) { const sx = r.left + s.x / 100 * r.width + s.r / 2, sy = r.top + s.y / 100 * r.height + s.r / 2; if (Math.hypot(sx - x, sy - y) < s.r * 0.75) s.v = Math.max(0, s.v - 0.06); }
    paintSpots();
}
function endClean() {
    const g = game()!; const d = GV.d;
    const dirt = d.spots.length ? 1 - d.spots.reduce((a: number, s: any) => a + s.v, 0) / d.spots.length : 1;
    const put = d.things.filter((t: any) => t.done).length / d.things.length;
    const score = d.spots.length ? dirt * 0.6 + put * 0.4 : put;
    const what = R.OWN.pending?.a.label.replace(/ \(.+\)$/, '').toLowerCase() ?? 'cleaned up';
    over(score, `{{user}} ${what.replace(/^(wash|take|clean|tidy)/, m => ({ wash: 'washed', take: 'took', clean: 'cleaned', tidy: 'tidied' } as any)[m])}${withText(g)}: ${word4(score, ['a half-hearted job', 'good enough', 'properly done', 'spotless'])}.`, () => { if (GV.partner) bump(g, GV.partner, 1); });
}

/* ---------- the crossword ---------- */

const CROSS_FALLBACK = { theme: 'around the house', words: [['KETTLE', 'It whistles when the water is ready'], ['PILLOW', 'Soft, under your head at night'], ['FRIDGE', 'Cold box full of leftovers'], ['LADDER', 'Climb it to change a bulb'], ['CANDLE', 'Wax light for a power cut'], ['SOFA', 'Where the movie night happens']] };
async function startCross(g: Save) {
    const partner = GV.partner ? nm(g, GV.partner) : '';
    // the theme comes from a fixed list (models love to pick the same one), never one of the last few
    const ox = R.ownOf(g) as any; const theme = O.pickTheme(ox.crossRecent ?? [], Math.random());
    ox.crossRecent = O.rememberTheme(ox.crossRecent ?? [], theme); saveGame();
    const j = await ask(`A small crossword for ${personaName()}${partner ? ` and ${partner}` : ''}, in English${era(g) !== 'now' ? `, set in the ${era(g)}` : ''}. The theme: ${theme}. Six answers on that theme, single common words, 4 to 9 letters, A–Z only; a short clever clue for each.${partner ? ` Also, for ${partner} (who is: ${String((await import('../sim/lifeday.js')).cardText(GV.partner)).replace(/\s+/g, ' ').slice(0, 200)}): how willing they are to help (0-100) and which answers they would know (indexes 0-5).` : ''}
JSON only: {"words": [{"answer": "...", "clue": "..."}]${partner ? ', "partner": {"willing": 70, "knows": [0, 3]}' : ''}}`, 700);
    const list = (Array.isArray(j?.words) ? j.words : []).map((x: any) => [String(x?.answer ?? '').toUpperCase().replace(/[^A-Z]/g, ''), String(x?.clue ?? '').slice(0, 100)]).filter(([a, c]: string[]) => a.length >= 3 && a.length <= 10 && c);
    const words = list.length >= 4 ? list.slice(0, 6) : CROSS_FALLBACK.words;
    GV.d = { theme: list.length >= 4 ? theme : CROSS_FALLBACK.theme, words: words.map(([a, c]: string[]) => ({ a, c, got: false, shown: 1, typed: '' })), hints: 0, ends: Date.now() + 180000,
        willing: Math.max(0, Math.min(100, Number(j?.partner?.willing ?? 50))), knows: (Array.isArray(j?.partner?.knows) ? j.partner.knows : []).map(Number), lastMove: Date.now() };
    GV.phase = 'play'; notify();
    const idle = () => { if (GV.game !== 'crossword') return;
        const d = GV.d; if (Date.now() > d.ends) { endCross(); return; }
        if (GV.partner && d.willing >= 40 && Date.now() - d.lastMove > 25000) { const k = d.knows.find((i: number) => d.words[i] && !d.words[i].got); if (k !== undefined) { say(`Oh, I know this one! ${d.words[k].a.toLowerCase()}`); d.words[k].got = true; d.lastMove = Date.now(); notify(); if (d.words.every((x: any) => x.got)) { endCross(); return; } } }
        later(idle, 2000); };
    later(idle, 2000);
}
function crossHtml(): string {
    const d = GV.d;
    return `<p>Theme: <b data-notr>${esc(d.theme)}</b> · <small class="mu-muted">${d.words.filter((w: any) => w.got).length}/${d.words.length}</small></p>
        <div class="mu-og-cross">${d.words.map((w: any, i: number) => `<div class="mu-og-cw ${w.got ? 'is-got' : ''}"><small data-notr>${esc(w.c)} <i>(${w.a.length})</i></small>
            <span class="mu-og-boxes">${w.a.split('').map((ch: string, k: number) => `<b>${w.got || k < w.shown ? ch : (w.typed[k] ?? '').toUpperCase()}</b>`).join('')}</span>
            ${w.got ? '' : `<input type="text" maxlength="${w.a.length}" data-input="og-cw" data-i="${i}" value="${esc(w.typed)}" autocomplete="off" spellcheck="false"><button class="mu-ghost" data-act="og-letter" data-i="${i}" title="One more letter">+1</button>${GV.partner ? `<button class="mu-ghost" data-act="og-help" data-i="${i}" title="Ask">?</button>` : ''}`}</div>`).join('')}</div>
        <div class="mu-row"><button data-act="og-crossdone">${d.words.every((w: any) => w.got) ? 'Done' : 'Give up'}</button></div>`;
}
function endCross() {
    const g = game()!; const d = GV.d; const got = d.words.filter((w: any) => w.got).length;
    const score = Math.max(0, got / d.words.length - d.hints * 0.04);
    over(score, `{{user}} did a crossword${withText(g)} (${d.theme}): ${got} of ${d.words.length} answers.`, () => { if (GV.partner) bump(g, GV.partner, 1); });
}

/* ---------- work, studying ---------- */

const NOISY = /stream|gaming|video games|music|guitar|party|drums|singing|loud/i;
function noiseOf(g: Save, w: WorldDef): number {
    const here = presentAt(g, w, g.player.loc).length;
    const loud = (Object.values(g.cast) as any[]).filter(r => { const loc = whereNow(g, w, r); if (loc === OUT) return false; const s = slotAt(g, w, r, nowAbs(g)); return !!s && !s.asleep && NOISY.test(s.act); }).length;
    return Math.min(4, here + loud);
}
const DISTRACT = ['Bass thumping through the wall', 'Someone laughing loudly in the hall', 'Your phone buzzes', 'A door slams', 'Someone is singing in the shower', 'The washing machine starts spinning', 'Footsteps, then shouting from downstairs'];
async function startFocus(g: Save, w: WorldDef) {
    GV.d = { task: null, right: 0, wrong: 0, ends: Date.now() + 35000, noise: noiseOf(g, w), pops: [] as string[], memo: '' };
    nextTask(); GV.phase = 'play'; notify();
    const tick = () => { if (GV.game !== 'work' && GV.game !== 'study') return; const d = GV.d; const left = d.ends - Date.now();
        const el = document.querySelector<HTMLElement>('#mundi-root .mu-og-clock'); if (el) el.textContent = `${Math.max(0, Math.ceil(left / 1000))}s`;
        if (left <= 0) { endFocus(); return; }
        if (Math.random() < 0.004 * (1 + d.noise * 1.5) && d.pops.length < 3) { d.pops.push(DISTRACT[Math.floor(Math.random() * DISTRACT.length)]); notify(); }
        GV.raf = requestAnimationFrame(tick); };
    GV.raf = requestAnimationFrame(tick);
}
function nextTask() {
    const d = GV.d; const k = Math.floor(Math.random() * 3);
    if (k === 0) { const a = 3 + Math.floor(Math.random() * 30), b = 2 + Math.floor(Math.random() * 15); const op = Math.random() < 0.5 ? '+' : '×'; d.task = { k, q: `${a} ${op} ${b} = ?`, ans: String(op === '+' ? a + b : a * b) }; }
    else if (k === 1) { const set = [['◆', '◇'], ['●', '○'], ['▲', '△'], ['■', '□']][Math.floor(Math.random() * 4)]; const odd = Math.floor(Math.random() * 6); d.task = { k, items: Array.from({ length: 6 }, (_, i) => (i === odd ? set[1] : set[0])), ans: String(odd) }; }
    else { const seq = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join(''); d.task = { k, q: seq, ans: seq, hide: Date.now() + 1500 }; later(() => notify(), 1600); }
    d.memo = '';
}
function focusHtml(): string {
    const d = GV.d; const t = d.task; const hidden = t.k === 2 && Date.now() > t.hide;
    return `<p>${GV.game === 'work' ? 'Get through as much as you can' : 'Focus'} · <b class="mu-og-clock" data-morph-skip>…</b> · <small class="mu-muted">${d.right} done</small></p>
        <div class="mu-og-task">${t.k === 1 ? `<p>Which one is different?</p><div class="mu-og-odd">${t.items.map((x: string, i: number) => `<button data-act="og-ans" data-v="${i}">${x}</button>`).join('')}</div>`
            : `<p class="mu-og-q">${t.k === 2 ? (hidden ? 'What was the number?' : `Remember: <b>${t.q}</b>`) : esc(t.q)}</p>${t.k === 2 && !hidden ? '' : `<div class="mu-og-ansrow"><input type="text" inputmode="numeric" data-input="og-memo" value="${esc(d.memo)}" data-focus="og-in" autocomplete="off"><button class="mu-primary" data-act="og-ans">OK</button></div>`}`}</div>
        ${d.pops.map((p: string, i: number) => `<button class="mu-og-pop" style="--i:${i}" data-act="og-pop" data-i="${i}">${icon('x')} ${esc(p)}</button>`).join('')}`;
}
function answer(v: string) {
    const d = GV.d; if (!d) return; if (d.pops.length) { toast('Too distracting: deal with it first.', 'info', { ms: 900 }); return; }
    if (String(v).trim() === d.task.ans) d.right++; else d.wrong++;
    nextTask(); notify(); setTimeout(() => document.querySelector<HTMLInputElement>('#mundi-root [data-focus="og-in"]')?.focus(), 30);
}
function endFocus() {
    const g = game()!; const d = GV.d; const L = lvl(g, GV.game === 'work' ? 'work' : 'study'); const need = 8 + L;
    const score = Math.max(0, Math.min(1, (d.right - d.wrong * 0.5) / need));
    over(score, GV.game === 'work' ? `{{user}} got some work done: ${word4(score, ['barely anything, too distracted', 'a so-so session', 'a good, focused session', 'a great, productive session'])}${d.noise >= 2 ? ' (the house was noisy)' : ''}.`
        : `{{user}} studied${withText(g)}: ${word4(score, ['nothing went in', 'a so-so session', 'a good session', 'an excellent session'])}${d.noise >= 2 ? ' (despite the noise)' : ''}.`, () => { if (GV.partner) bump(g, GV.partner, 1); });
}

/* ---------- writing and programming: a work that grows session by session ---------- */

const GENRES = ['mystery', 'romance', 'fantasy', 'sci-fi', 'horror', 'comedy', 'literary', 'slice of life'];
export const openBook = (g: Save, kind: 'writing' | 'coding') => R.ownOf(g).books.find(b => b.kind === kind && b.done < b.size) ?? null;
function setupHtml(g: Save): string {
    const s = GV.setup; const w = s.kind === 'writing';
    void g;
    return `<div class="mu-og-setup"><b>${w ? 'A new story' : 'A new project'}</b>
        <label class="mu-field"><span>${w ? 'Title' : 'Name'} (optional)</span><input type="text" maxlength="60" data-input="og-set" data-k="title" value="${esc(s.title)}"></label>
        <label class="mu-field"><span>${w ? 'What it is about' : 'What it does'} (optional: or leave it to chance)</span><input type="text" maxlength="160" data-input="og-set" data-k="idea" value="${esc(s.idea)}" placeholder="${w ? 'a lighthouse keeper finds a letter from herself' : 'an app that splits the house bills'}"></label>
        ${w ? `<div class="mu-chips">${GENRES.map(x => `<button class="mu-chip ${s.genre === x ? 'is-on' : ''}" data-act="og-genre" data-v="${x}">${x}</button>`).join('')}</div>` : ''}
        <div class="mu-chips">${O.SIZES.map(([id, label, n]) => `<button class="mu-chip ${s.size === id ? 'is-on' : ''}" data-act="og-size" data-v="${id}">${w ? label : ['A small tool', 'An app', 'A big project'][O.SIZES.findIndex(x => x[0] === id)]} · ${n} sessions</button>`).join('')}</div>
        <button class="mu-primary" data-act="og-begin">${icon('check')}<span>Begin</span></button></div>`;
}
function newBook(g: Save) {
    const s = GV.setup; const size = O.SIZES.find(x => x[0] === s.size)?.[2] ?? 3;
    const b: R.Book = { id: `b${nowAbs(g)}`, kind: s.kind, title: s.title.trim(), idea: s.idea.trim(), ...(s.kind === 'writing' ? { genre: s.genre } : {}), size, done: 0, points: 0, axes: {}, parts: [], day: g.day };
    R.ownOf(g).books.push(b); GV.setup = null; saveGame();
}
/** The ideas you are offered: how good each is is rolled from your level; the model writes them to match. */
function rollSteps(g: Save, kind: 'writing' | 'coding', n: number) {
    const L = lvl(g, kind); const axes = [...O.AXES[kind]];
    return Array.from({ length: n }, () => { const ax = [...axes].sort(() => Math.random() - 0.5); return ax.map(a => ({ axis: a, tier: O.rollTier(L, Math.random()) })); });
}
async function startWrite(g: Save) {
    const b = openBook(g, 'writing')!; const plan = rollSteps(g, 'writing', 3);
    const j = await ask(`${personaName()} is writing ${b.size >= 10 ? 'a novel' : b.size >= 6 ? 'a novella' : 'a short story'}${b.title ? ` titled "${b.title}"` : ''}, ${b.genre ?? 'fiction'}${b.idea ? `, about: ${b.idea}` : ''}. Session ${b.done + 1} of ${b.size}${b.parts.length ? `. So far (the last part): ${b.parts.at(-1)!.slice(-500)}` : ' (the opening)'}.
${!b.title || !b.idea ? 'First give it a title and a one-line premise (keep what is given). ' : ''}Then where the story is now, in one sentence, and three moments to write next; for each, three candidate lines (one or two sentences each), written at exactly the quality asked and strong in the quality named:
${plan.map((st, i) => `${i + 1}. ${st.map((o, k) => `option ${k + 1}: a ${O.TIERS[o.tier]} line, strong in ${o.axis}`).join('; ')}`).join('\n')}
(weak = clumsy or clichéd; ordinary = fine but forgettable; good; great; brilliant = rare, striking, unforgettable.)
JSON only: {"title": "...", "premise": "...", "recap": "...", "steps": [{"options": ["...", "...", "..."]}]}`, 1400);
    const steps = (Array.isArray(j?.steps) ? j.steps : []).slice(0, 3).map((s: any, i: number) => (Array.isArray(s?.options) ? s.options : []).slice(0, 3).map((t: any, k: number) => ({ t: String(t).slice(0, 300), ...plan[i][k] }))).filter((s: any[]) => s.length === 3);
    if (!b.title && j?.title) b.title = String(j.title).slice(0, 60); if (!b.idea && j?.premise) b.idea = String(j.premise).slice(0, 160);
    if (steps.length < 2) { toast('No ideas came (the mechanics model gave nothing usable). Try again in a moment.', 'warn'); R.OWN.pending = null; closeGame(); notify(); return; }
    GV.d = { book: b.id, recap: String(j?.recap ?? '').slice(0, 300), steps, i: 0, chosen: [] as string[], pts: 0, ax: {} as Record<string, number>, own: '' };
    GV.phase = 'play'; notify();
}
function writeHtml(g: Save): string {
    const d = GV.d; const b = R.ownOf(g).books.find(x => x.id === d.book)!; const st = d.steps[d.i];
    return `<p><b data-notr>${esc(b.title || 'Untitled')}</b> · session ${b.done + 1}/${b.size} · moment ${d.i + 1}/${d.steps.length}</p>
        ${d.recap ? `<small class="mu-muted" data-notr>${esc(d.recap)}</small>` : ''}${d.chosen.length ? `<blockquote class="mu-og-page" data-notr>${esc(d.chosen.join(' '))}</blockquote>` : ''}
        <div class="mu-og-opts is-text">${st.map((o: any, k: number) => `<button data-act="og-line" data-i="${k}"><span data-notr>${esc(o.t)}</span></button>`).join('')}</div>
        <div class="mu-og-own"><input type="text" maxlength="300" placeholder="…or write your own line" data-input="og-own" value="${esc(d.own)}"><button data-act="og-line" data-i="-1">${icon('pen')}</button></div>`;
}
function pickLine(g: Save, k: number) {
    const d = GV.d; const st = d.steps[d.i];
    if (k < 0) { const t = d.own.trim(); if (!t) return; const tier = O.rollTier(lvl(g, 'writing'), Math.random()); const axis = O.AXES.writing[Math.floor(Math.random() * 3)]; d.chosen.push(t); d.pts += tier; d.ax[axis] = (d.ax[axis] ?? 0) + tier; d.own = ''; }
    else { const o = st[k]; d.chosen.push(o.t); d.pts += o.tier; d.ax[o.axis] = (d.ax[o.axis] ?? 0) + o.tier; }
    d.i++; if (d.i < d.steps.length) { notify(); return; }
    endWork(g, 'writing');
}
async function startCode(g: Save) {
    const b = openBook(g, 'coding')!; const plan = rollSteps(g, 'coding', 2); const L = lvl(g, 'coding');
    const j = await ask(`${personaName()} is programming${b.title ? ` "${b.title}"` : ''}${b.idea ? `: ${b.idea}` : ''} (session ${b.done + 1} of ${b.size}; skill ${L}/10).
${!b.title || !b.idea ? 'First give the project a short name and a one-line description (keep what is given). ' : ''}Then two short snippets (6 to 9 lines of plausible code, any common language) each with exactly ONE line that has a real bug (give its index from 0), and two design decisions for the next part, each with three options written at exactly the quality asked:
${plan.map((st, i) => `${i + 1}. ${st.map((o, k) => `option ${k + 1}: a ${O.TIERS[o.tier]} approach, strong in ${o.axis}`).join('; ')}`).join('\n')}
JSON only: {"name": "...", "idea": "...", "bugs": [{"lines": ["...", "..."], "bug": 3, "why": "..."}], "steps": [{"q": "...", "options": ["...", "...", "..."]}]}`, 1400);
    if (!b.title && j?.name) b.title = String(j.name).slice(0, 60); if (!b.idea && j?.idea) b.idea = String(j.idea).slice(0, 160);
    const bugs = (Array.isArray(j?.bugs) ? j.bugs : []).map((x: any) => ({ lines: (Array.isArray(x?.lines) ? x.lines : []).map((l: any) => String(l).slice(0, 90)).slice(0, 10), bug: Number(x?.bug), why: String(x?.why ?? '').slice(0, 140) })).filter((x: any) => x.lines.length >= 4 && x.bug >= 0 && x.bug < x.lines.length).slice(0, 2);
    const steps = (Array.isArray(j?.steps) ? j.steps : []).slice(0, 2).map((s: any, i: number) => ({ q: String(s?.q ?? 'Next:').slice(0, 120), options: (Array.isArray(s?.options) ? s.options : []).slice(0, 3).map((t: any, k: number) => ({ t: String(t).slice(0, 200), ...plan[i][k] })) })).filter((s: any) => s.options.length === 3);
    if (!bugs.length && !steps.length) { toast('Nothing came (the mechanics model gave nothing usable). Try again in a moment.', 'warn'); R.OWN.pending = null; closeGame(); notify(); return; }
    GV.d = { book: b.id, bugs, steps, phase: bugs.length ? 'bug' : 'step', i: 0, found: 0, picked: -1, ends: Date.now() + 25000, chosen: [] as string[], pts: 0, ax: {} as Record<string, number> };
    GV.phase = 'play'; notify();
    const tick = () => { if (GV.game !== 'code' || GV.d.phase !== 'bug') return; const left = GV.d.ends - Date.now(); const el = document.querySelector<HTMLElement>('#mundi-root .mu-og-clock'); if (el) el.textContent = `${Math.max(0, Math.ceil(left / 1000))}s`; if (left <= 0) { bugPick(-1); } GV.raf = requestAnimationFrame(tick); };
    GV.raf = requestAnimationFrame(tick);
}
function codeHtml(g: Save): string {
    const d = GV.d; const b = R.ownOf(g).books.find(x => x.id === d.book)!;
    const top = `<p><b data-notr>${esc(b.title || 'Untitled')}</b> · session ${b.done + 1}/${b.size}</p>`;
    if (d.phase === 'bug') { const x = d.bugs[d.i]; return `${top}<p>Find the line with the bug · <b class="mu-og-clock" data-morph-skip>…</b></p>
        <ol class="mu-og-src" start="0">${x.lines.map((l: string, k: number) => `<li><button class="${d.picked >= 0 ? (k === x.bug ? 'is-right' : k === d.picked ? 'is-wrong' : '') : ''}" data-act="og-bug" data-i="${k}"><code data-notr>${esc(l)}</code></button></li>`).join('')}</ol>${d.picked >= 0 && x.why ? `<small class="mu-muted" data-notr>${esc(x.why)}</small>` : ''}`; }
    const st = d.steps[d.i];
    return `${top}<p data-notr>${esc(st.q)}</p><div class="mu-og-opts is-text">${st.options.map((o: any, k: number) => `<button data-act="og-design" data-i="${k}"><span data-notr>${esc(o.t)}</span></button>`).join('')}</div>`;
}
function bugPick(k: number) {
    const d = GV.d; if (d.picked >= 0) return; d.picked = Math.max(0, k); const x = d.bugs[d.i]; if (k === x.bug) d.found++; notify();
    later(() => { d.picked = -1; d.i++; if (d.i >= d.bugs.length) { d.phase = 'step'; d.i = 0; if (!d.steps.length) endWork(game()!, 'coding'); } else d.ends = Date.now() + 25000; notify(); }, k === x.bug ? 900 : 2200);
}
function designPick(g: Save, k: number) {
    const d = GV.d; const o = d.steps[d.i].options[k]; d.chosen.push(o.t); d.pts += o.tier; d.ax[o.axis] = (d.ax[o.axis] ?? 0) + o.tier;
    d.i++; if (d.i < d.steps.length) { notify(); return; }
    endWork(g, 'coding');
}
function endWork(g: Save, kind: 'writing' | 'coding') {
    const d = GV.d; const b = R.ownOf(g).books.find(x => x.id === d.book)!;
    const steps = kind === 'writing' ? d.steps.length : d.steps.length;
    const quality = steps ? d.pts / (steps * 4) : 0.5;   // 0–1 from the choices
    const score = kind === 'coding' ? (d.bugs.length ? (d.found / d.bugs.length) * 0.5 : 0.25) + quality * 0.5 : quality;
    const apply = () => {
        b.points += d.pts; for (const [a, v] of Object.entries(d.ax) as [string, number][]) b.axes[a] = (b.axes[a] ?? 0) + v;
        b.parts.push(kind === 'writing' ? d.chosen.join(' ') : d.chosen.join(' / ')); b.done++;
        if (b.done >= b.size) b.verdict = O.verdict(b.points, b.size * (kind === 'writing' ? 3 : 2), lvl(g, kind), Math.random()).word;
        saveGame();
    };
    const finished = b.done + 1 >= b.size;
    const text = kind === 'writing'
        ? `{{user}} wrote ${finished ? 'the last part of' : 'a new part of'} "${b.title || 'an untitled story'}"${finished ? '' : ` (${b.done + 1}/${b.size})`}: the writing went ${word4(quality, ['badly', 'all right', 'well', 'brilliantly'])}.`
        : `{{user}} worked on "${b.title || 'a coding project'}"${finished ? ' and finished it' : ` (${b.done + 1}/${b.size})`}: ${d.found}/${d.bugs.length} bugs found, the design ${word4(quality, ['messy', 'workable', 'solid', 'elegant'])}.`;
    over(score, text, () => { apply(); if (b.verdict) toast(`"${b.title}" is finished: ${b.verdict}.`, 'success', { ms: 6000 }); });
}

/* ---------- actions ---------- */

Object.assign(ACT, {
    'og-with': (el) => { if (R.OWN.pending) { R.OWN.pending.with = el.dataset.who ?? ''; notify(); } },
    'og-cancel': () => { R.OWN.pending = null; closeGame(); notify(); },
    'og-veil': (el, e) => { if (e?.target !== el) return; R.OWN.pending = null; closeGame(); notify(); },   // a click beside the choice: never mind
    'og-auto': () => { closeGame(); void R.finish(null); },
    'og-play': () => { const c = ctxW(); if (c) void start(c.g, c.w); },
    'og-quit': () => { R.OWN.pending = null; closeGame(); notify(); },
    'og-finish': () => { const extra = (GV as any).extra; const s = GV.score, t = GV.text; closeGame(); void R.finish(s, t, extra); },
    'og-cook': (el) => cookPick(Number(el.dataset.i)), 'og-heat': () => heatHit(),
    'og-strum': (el) => strum(Number(el.dataset.l)),
    'og-put': (el) => { const t = GV.d?.things?.[Number(el.dataset.i)]; if (!t || t.done) return; t.done = true; el.classList.add('is-away'); if (allClean()) endClean(); },
    'og-letter': (el) => { const w = GV.d.words[Number(el.dataset.i)]; if (!w || w.got) return; w.shown = Math.min(w.a.length, w.shown + 1); GV.d.hints++; if (w.shown >= w.a.length) w.got = true; notify(); },
    'og-help': (el) => { const d = GV.d; const i = Number(el.dataset.i); const w = d.words[i]; if (!w || w.got) return; d.lastMove = Date.now();
        if (d.willing < 25) say(['Do it yourself.', 'Figure it out!', 'Nope, your crossword.'][Math.floor(Math.random() * 3)]);
        else if (d.knows.includes(i)) { say(`It's ${w.a.toLowerCase()}!`); w.got = true; d.hints++; if (d.words.every((x: any) => x.got)) endCross(); }
        else say(['No idea, sorry.', 'Hmm… no clue.', 'Do not look at me.'][Math.floor(Math.random() * 3)]); notify(); },
    'og-crossdone': () => endCross(),
    'og-ans': (el) => answer(el.dataset.v ?? GV.d?.memo ?? ''),
    'og-pop': (el) => { GV.d.pops.splice(Number(el.dataset.i), 1); notify(); },
    'og-genre': (el) => { GV.setup.genre = el.dataset.v; notify(); }, 'og-size': (el) => { GV.setup.size = el.dataset.v; notify(); },
    'og-begin': () => { const c = ctxW(); if (!c) return; newBook(c.g); void (GV.game === 'write' ? startWrite(c.g) : startCode(c.g)); },
    'og-line': (el) => { const g = game(); if (g) pickLine(g, Number(el.dataset.i)); },
    'og-bug': (el) => bugPick(Number(el.dataset.i)), 'og-design': (el) => { const g = game(); if (g) designPick(g, Number(el.dataset.i)); },
    'own-nudge': (el) => { const g = game(); if (!g) return; toast(R.nudge(g, el.dataset.who!), 'info'); notify(); },
});
Object.assign(INPUT, {
    'og-cw': (el) => { const d = GV.d; const w = d?.words?.[Number(el.dataset.i)]; if (!w) return; w.typed = String(el.value).toUpperCase().replace(/[^A-Z]/g, ''); d.lastMove = Date.now();
        if (w.typed === w.a) { w.got = true; notify(); if (d.words.every((x: any) => x.got)) endCross(); } else { const box = el.parentElement?.querySelectorAll('.mu-og-boxes b'); box?.forEach((b, k) => { if (k >= w.shown) b.textContent = w.typed[k] ?? ''; }); } },
    'og-memo': (el) => { if (GV.d) GV.d.memo = String(el.value); },
    'og-own': (el) => { if (GV.d) GV.d.own = String(el.value); },
    'og-set': (el) => { if (GV.setup) GV.setup[el.dataset.k!] = String(el.value); },
});
// keys: the guitar (A S D), the heat (space), Enter for answers
document.addEventListener?.('keydown', (e) => {
    if (e.key === 'Escape' && R.OWN.pending && (!GV.game || GV.phase !== 'play')) { R.OWN.pending = null; closeGame(); notify(); return; }   // Esc: never mind (not in the middle of a game)
    if (!GV.game || GV.phase !== 'play') return;
    const tag = (e.target as HTMLElement)?.tagName;
    if (GV.game === 'guitar' && tag !== 'INPUT') { const l = { KeyA: 0, KeyS: 1, KeyD: 2, KeyJ: 0, KeyK: 1, KeyL: 2 }[e.code]; if (l !== undefined) { e.preventDefault(); strum(l); } }
    if (GV.game === 'cook' && GV.d?.mode === 'heat' && e.code === 'Space') { e.preventDefault(); heatHit(); }
    if ((GV.game === 'work' || GV.game === 'study') && e.key === 'Enter' && tag === 'INPUT') { e.preventDefault(); answer(GV.d?.memo ?? ''); }
});
// scrubbing: hold and rub
let scrubbing = false;
document.addEventListener?.('pointerdown', (e) => { if (GV.game === 'clean' && (e.target as HTMLElement)?.closest?.('.mu-og-surface')) { scrubbing = true; scrubAt(e.clientX, e.clientY); } });
document.addEventListener?.('pointermove', (e) => { if (scrubbing) scrubAt(e.clientX, e.clientY); });
document.addEventListener?.('pointerup', () => { scrubbing = false; });
