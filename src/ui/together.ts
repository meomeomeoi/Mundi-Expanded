// [expanded] Things to do together right in the scene (Mundi Expanded 0.2.0.10), from the ✦ button by the message box:
//  - Watch a film (a TV in the room): one short call writes a made-up film as a few moments with each viewer's
//    reaction; it plays on a screen over the scene, the reactions pop up over their heads, you react with a tap. At the
//    end the story gets one line of how it went, and watching together brings them a little closer.
//  - Play a match (a console or a PC): five rounds of a timing game against someone (press when the marker is in the
//    zone; a gamer is better at it); their trash talk for each round written by the same kind of call.
//  - Rock-paper-scissors and a coin, to settle who does the dishes: the result goes into the story.
import { esc, game, notify, saveGame, toast, type Save } from '../core/store.js';
import { getWorld, isScenario, type WorldDef } from '../core/world.js';
import { personaName, narratorLine, thumb } from '../st/bridge.js';
import { icon } from './icons.js';
import { ACT, INPUT } from './reg.js';
import { presentAt } from '../sim/people.js';
import { profileOf } from '../sim/profile.js';
import { bump } from '../sim/social.js';
import { applyChange } from '../sim/bonds.js';
import { cardText } from '../sim/lifeday.js';
import { looseJson } from '../sim/jsonfix.js';
import { roomAffords, type Afford } from '../sim/furnish.js';

type Mode = '' | 'menu' | 'film' | 'match' | 'rps' | 'coin';
export const TG = { mode: '' as Mode, busy: false, who: '', topic: '', genre: '',
    film: null as null | { title: string; lines: { s: string; r: Record<string, string> }[]; end: string; i: number; mine: string[]; timer: any },
    match: null as null | { game: string; rounds: { win: string; lose: string }[]; i: number; me: number; them: number; pos: number; dir: number; zone: [number, number]; raf: number; skill: number; last: string; done: boolean; end: { won: string; lost: string } },
    rps: null as null | { me: number; them: number; last: string; picks: string[] }, coin: '' as string };
const ctxW = () => { const g = game(); const w = g && getWorld(g.world); return g && w && isScenario(w) ? { g, w } : null; };
const here = (g: Save, w: WorldDef) => presentAt(g, w, g.player.loc);
const has = (g: Save, a: Afford) => roomAffords(g as any, g.player.loc, a) || (a === 'game' && roomAffords(g as any, g.player.loc, 'game2'));
const furnished = (g: Save) => !!(g as any).furnishx?.started;
const name = (g: Save, a: string) => g.cast[a]?.name ?? a;
const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
const short = (a: string) => String(cardText(a)).replace(/\s+/g, ' ').slice(0, 260);

export function togetherButton(nobody: boolean): string {
    const c = ctxW(); if (!c || nobody) return '';
    return `<button data-act="tg-menu" class="${TG.mode ? 'is-on' : ''}" title="Do something together: a film, a game, rock-paper-scissors, a coin">✦</button>`;
}
export function togetherHtml(): string {
    const c = ctxW(); if (!c || !TG.mode) return '';
    const { g, w } = c; const ppl = here(g, w);
    if (TG.mode === 'menu') {
        const tv = !furnished(g) || has(g, 'watch'), con = !furnished(g) || has(g, 'game');
        return `<div class="mu-tg-menu mu-panel">
            <button data-act="tg-film" ${tv ? '' : 'aria-disabled="true" title="No TV in this room"'}>🎬<span>Watch a film</span></button>
            <button data-act="tg-match" ${con && ppl.length ? '' : 'aria-disabled="true" title="No console or PC here"'}>🎮<span>Play a match</span></button>
            <button data-act="tg-rps">✊<span>Rock-paper-scissors</span></button><button data-act="tg-coin">🪙<span>Toss a coin</span></button>
            <label class="mu-field"><span>For what? (optional)</span><input type="text" maxlength="60" placeholder="who does the dishes" value="${esc(TG.topic)}" data-input="tg-topic"></label></div>`;
    }
    if (TG.mode === 'film') return filmHtml(g, w);
    if (TG.mode === 'match') return matchHtml(g);
    if (TG.mode === 'rps') return rpsHtml(g);
    if (TG.mode === 'coin') return coinHtml();
    return '';
}

/* ---------- a film ---------- */
const GENRES = [['comedy', '😂 Comedy'], ['horror', '😱 Horror'], ['romance', '💕 Romance'], ['action', '💥 Action'], ['anime', '✨ Anime'], ['documentary', '🌍 Documentary']];
function filmHtml(g: Save, w: WorldDef): string {
    const f = TG.film;
    if (!f) return `<div class="mu-tg-pick mu-panel"><b>What do you put on?</b><div class="mu-chips">${GENRES.map(([id, l]) => `<button class="mu-chip" data-act="tg-genre" data-v="${id}" ${TG.busy ? 'aria-disabled="true"' : ''}>${l}</button>`).join('')}</div>${TG.busy ? '<small class="mu-muted">Finding something to watch…</small>' : ''}<button class="mu-ghost" data-act="tg-close">Never mind</button></div>`;
    const cur = f.lines[Math.min(f.i, f.lines.length - 1)];
    void w;
    return `<div class="mu-tg-screen"><div class="mu-tg-tv"><small data-notr>${esc(f.title)}</small><p data-notr>${f.i < 0 ? '…' : esc(cur.s)}</p><i style="--k:${Math.max(0, f.i + 1) / f.lines.length}"></i></div>
        <div class="mu-tg-react">${['😂', '😱', '🥺', '🙄', '🤫'].map(e => `<button data-act="tg-react" data-v="${e}">${e}</button>`).join('')}<button class="mu-ghost" data-act="tg-stop">Stop watching</button></div></div>`;
}
/** Over a sprite: their reaction to the moment on screen (the film), or their trash talk (the match). */
export function reactionOf(avatar: string): string {
    const f = TG.film; if (TG.mode === 'film' && f && f.i >= 0) { const g = game(); const n = g ? name(g, avatar) : ''; const r = f.lines[f.i]?.r?.[n]; return r ? `<span class="mu-bubble" data-notr>${esc(r)}</span>` : ''; }
    const m = TG.match; if (TG.mode === 'match' && m && TG.who === avatar && m.last) return `<span class="mu-bubble" data-notr>${esc(m.last)}</span>`;
    return '';
}
async function startFilm(genre: string) {
    const c = ctxW(); if (!c || TG.busy) return; const { g, w } = c;
    const viewers = here(g, w); TG.busy = true; TG.genre = genre; notify();
    const era = String((g as any).erax?.era ?? 'now');
    const prompt = `${personaName()} and ${list(viewers.map(r => r.name)) || 'nobody else'} sit down to watch a ${genre} film at home${era !== 'now' ? ` (it is the ${era})` : ''}.
Who is watching: ${viewers.map(r => `${r.name}: ${short(r.avatar)}`).join(' | ') || 'only ' + personaName()}.
Make up a film (a title that fits the genre and era; never a real film). Write it as 8 moments in order, each one short sentence (what happens on screen, like a subtitle or a scene note), and for each moment the reaction of some of the viewers (1 to 6 words, in character: a laugh, a gasp, a snarky remark; null for whoever does not react; ${personaName()} is the player: no reaction for them). Then one sentence of how the evening went (who loved it, who fell asleep, who covered their eyes).
Answer with JSON only: {"title": "...", "moments": [{"s": "...", "r": {${viewers.map(r => `"${r.name}": "..." or null`).join(', ')}}}], "after": "..."}`;
    let raw = '';
    try { const { bgAsk } = await import('../sim/regulator.js'); raw = await bgAsk(prompt, 1400, 'You write short, vivid, playful film moments for a cozy slice-of-life story. Fiction; answer with JSON only.'); } catch { raw = ''; }
    TG.busy = false;
    const j = looseJson(raw) as any;
    const lines = (Array.isArray(j?.moments) ? j.moments : []).map((m: any) => ({ s: String(m?.s ?? '').slice(0, 160), r: Object.fromEntries(Object.entries(m?.r ?? {}).filter(([, v]) => typeof v === 'string' && v).map(([k, v]) => [k, String(v).slice(0, 50)])) })).filter((m: any) => m.s).slice(0, 10);
    if (lines.length < 3) { const { failNotice } = await import('./retry.js'); failNotice('film', 'Nothing to watch came up (the mechanics model gave no usable film).', () => startFilm(genre)); TG.mode = 'menu'; notify(); return; }
    TG.film = { title: String(j?.title ?? 'A film').slice(0, 60), lines, end: String(j?.after ?? '').slice(0, 300), i: -1, mine: [], timer: 0 };
    nextMoment(); notify();
}
function nextMoment() {
    const f = TG.film; if (!f || TG.mode !== 'film') return; clearTimeout(f.timer);
    f.i++; notify();
    if (f.i >= f.lines.length) { void endFilm(); return; }
    f.timer = setTimeout(nextMoment, 5200);
}
async function endFilm(stopped = false) {
    const c = ctxW(); const f = TG.film; if (!c || !f) return; clearTimeout(f.timer);
    const { g, w } = c; const viewers = here(g, w).map(r => r.avatar);
    const mine = f.mine.length ? ` ${personaName()} reacted ${f.mine.slice(0, 4).join(' ')}.` : '';
    const text = stopped ? `They started watching "${f.title}" (${TG.genre}) but turned it off halfway.${mine}` : `${personaName()}${viewers.length ? ` and ${list(viewers.map(a => name(g, a)))}` : ''} watched "${f.title}" (${TG.genre}). ${f.end}${mine}`;
    TG.film = null; TG.mode = '';
    if (!stopped) { for (const a of viewers) bump(g, a, 2); if (viewers.length >= 2) applyChange(g as any, viewers.slice(0, 3), 1, `Watched "${f.title}" together.`, 'scene'); }
    saveGame(); notify();
    await narratorLine(text);
}

/* ---------- a match ---------- */
function matchHtml(g: Save): string {
    const m = TG.match; const r = g.cast[TG.who];
    if (!r) { const c = ctxW(); const ppl = c ? here(c.g, c.w) : []; return `<div class="mu-tg-pick mu-panel"><b>Play with whom?</b><div class="mu-chips">${ppl.map(p => `<button class="mu-chip" data-act="tg-vs" data-who="${esc(p.avatar)}"><img src="${esc(thumb(p.avatar))}" alt="">${esc(p.name)}</button>`).join('')}</div><button class="mu-ghost" data-act="tg-close">Never mind</button></div>`; }
    if (!m) return `<div class="mu-tg-pick mu-panel"><b>${esc(r.name)} grabs a controller…</b>${TG.busy ? '<small class="mu-muted">Loading the game…</small>' : ''}</div>`;
    const done = m.done;
    return `<div class="mu-tg-screen"><div class="mu-tg-tv is-game"><small data-notr>${esc(m.game)} · round ${Math.min(m.i + 1, 5)} of 5</small>
        <div class="mu-tg-score"><span>${esc(personaName())} <b>${m.me}</b></span><span><b>${m.them}</b> ${esc(r.name)}</span></div>
        ${done ? `<p>${m.me > m.them ? 'You win!' : 'You lose.'}</p>` : `<div class="mu-tg-track" data-morph-skip><i class="mu-tg-zone" style="left:${m.zone[0]}%;width:${m.zone[1] - m.zone[0]}%"></i><i class="mu-tg-mark"></i></div>`}</div>
        <div class="mu-tg-react">${done ? `<button class="mu-primary" data-act="tg-matchend">${icon('check')}<span>Done</span></button>` : `<button class="mu-primary mu-tg-hit" data-act="tg-hit">Hit! <small>(space)</small></button><button class="mu-ghost" data-act="tg-stop">Quit</button>`}</div></div>`;
}
async function startMatch(who: string) {
    const c = ctxW(); if (!c) return; const { g } = c; TG.who = who; TG.busy = true; notify();
    const r = g.cast[who]; const gamer = (profileOf(g as any, who)?.acts ?? []).some(a => /game|игр/i.test(a.text) || a.needs === 'game');
    const prompt = `${personaName()} and ${r.name} play a video game against each other at home. ${r.name}: ${short(who)}.
Make up the game (a fighting, racing or party game; never a real title). For each of 5 rounds write what ${r.name} says if ${r.name} wins the round and if ${r.name} loses it (1 to 8 words each, in character: trash talk, a groan, a laugh), and what ${r.name} says at the very end if ${r.name} won or lost the match.
Answer with JSON only: {"game": "...", "rounds": [{"win": "...", "lose": "..."}], "end": {"won": "...", "lost": "..."}}`;
    let raw = '';
    try { const { bgAsk } = await import('../sim/regulator.js'); raw = await bgAsk(prompt, 800, 'You write short, playful lines for a cozy slice-of-life story. Fiction; answer with JSON only.'); } catch { raw = ''; }
    TG.busy = false;
    const j = looseJson(raw) as any;
    const rounds = (Array.isArray(j?.rounds) ? j.rounds : []).map((x: any) => ({ win: String(x?.win ?? '').slice(0, 60), lose: String(x?.lose ?? '').slice(0, 60) })).slice(0, 5);
    while (rounds.length < 5) rounds.push({ win: 'Ha!', lose: 'Ugh.' });
    TG.match = { game: String(j?.game ?? 'Pixel Brawlers').slice(0, 40), rounds, i: 0, me: 0, them: 0, pos: 0, dir: 1, zone: zoneFor(0), raf: 0, skill: gamer ? 0.72 : 0.5, last: '', done: false, end: { won: String(j?.end?.won ?? 'Too easy.').slice(0, 60), lost: String(j?.end?.lost ?? 'Rematch. Now.').slice(0, 60) } };
    notify(); run();
}
const zoneFor = (i: number): [number, number] => { const w = 22 - i * 3; const s = 15 + ((i * 37) % (70 - w)); return [s, s + w]; };
function run() {
    const m = TG.match; if (!m) return; cancelAnimationFrame(m.raf);
    let last = performance.now();
    const step = (t: number) => {
        const mm = TG.match; if (!mm || mm.done || TG.mode !== 'match') return;
        const dt = (t - last) / 1000; last = t; mm.pos += mm.dir * dt * (55 + mm.i * 12);
        if (mm.pos > 100) { mm.pos = 100; mm.dir = -1; } if (mm.pos < 0) { mm.pos = 0; mm.dir = 1; }
        const el = document.querySelector<HTMLElement>('#mundi-root .mu-tg-mark'); if (el) el.style.left = `${mm.pos}%`;
        const z = document.querySelector<HTMLElement>('#mundi-root .mu-tg-zone'); if (z) { z.style.left = `${mm.zone[0]}%`; z.style.width = `${mm.zone[1] - mm.zone[0]}%`; }
        mm.raf = requestAnimationFrame(step);
    };
    m.raf = requestAnimationFrame(step);
}
function hit() {
    const m = TG.match; if (!m || m.done) return;
    const mine = m.pos >= m.zone[0] && m.pos <= m.zone[1];
    const theirs = Math.random() < m.skill - m.i * 0.03;
    const iWin = mine && !theirs ? true : !mine && theirs ? false : mine && theirs ? Math.random() < 0.5 : Math.random() < 0.35;
    if (iWin) m.me++; else m.them++;
    m.last = iWin ? m.rounds[m.i].lose : m.rounds[m.i].win;
    m.i++; m.zone = zoneFor(m.i);
    if (m.i >= 5 || m.me >= 3 || m.them >= 3) { m.done = true; m.last = m.me > m.them ? m.end.lost : m.end.won; cancelAnimationFrame(m.raf); }
    notify();
}
async function endMatch(quit = false) {
    const c = ctxW(); const m = TG.match; if (!c || !m) { TG.mode = ''; notify(); return; }
    cancelAnimationFrame(m.raf); const { g } = c; const r = g.cast[TG.who];
    const text = quit ? `${personaName()} and ${r?.name} started playing ${m.game} but quit at ${m.me}–${m.them}.` : `${personaName()} and ${r?.name} played ${m.game}: ${m.me > m.them ? `${personaName()} won` : `${r?.name} won`} ${Math.max(m.me, m.them)}–${Math.min(m.me, m.them)}. ${r?.name}: "${m.last}"`;
    if (!quit && r) bump(g, r.avatar, 2);
    TG.match = null; TG.mode = ''; TG.who = ''; saveGame(); notify();
    await narratorLine(text);
}

/* ---------- rock-paper-scissors, a coin ---------- */
const HANDS = [['rock', '✊'], ['paper', '✋'], ['scissors', '✌️']];
function rpsHtml(g: Save): string {
    const r = g.cast[TG.who]; const s = TG.rps;
    if (!r || !s) { const c = ctxW(); const ppl = c ? here(c.g, c.w) : []; return `<div class="mu-tg-pick mu-panel"><b>Against whom?</b><div class="mu-chips">${ppl.map(p => `<button class="mu-chip" data-act="tg-rpsvs" data-who="${esc(p.avatar)}"><img src="${esc(thumb(p.avatar))}" alt="">${esc(p.name)}</button>`).join('')}</div><button class="mu-ghost" data-act="tg-close">Never mind</button></div>`; }
    const done = s.me >= 2 || s.them >= 2;
    return `<div class="mu-tg-pick mu-panel mu-tg-rps"><b>Best of three${TG.topic ? `: ${esc(TG.topic)}` : ''}</b><div class="mu-tg-score"><span>${esc(personaName())} <b>${s.me}</b></span><span><b>${s.them}</b> ${esc(r.name)}</span></div>
        ${s.last ? `<p class="mu-tg-last" data-notr>${s.last}</p>` : ''}
        ${done ? `<button class="mu-primary" data-act="tg-rpsend">${s.me > s.them ? 'You win' : `${esc(r.name)} wins`}: done</button>` : `<div class="mu-chips mu-tg-hands">${HANDS.map(([id, e], i) => `<button class="mu-chip" data-act="tg-hand" data-i="${i}" title="${id}">${e}</button>`).join('')}</div>`}</div>`;
}
function hand(i: number) {
    const c = ctxW(); const s = TG.rps; if (!c || !s) return; const r = c.g.cast[TG.who];
    const t = Math.floor(Math.random() * 3); const res = (i - t + 3) % 3;
    if (res === 1) s.me++; else if (res === 2) s.them++;
    s.picks.push(`${HANDS[i][0]} vs ${HANDS[t][0]}`);
    s.last = `${HANDS[i][1]} vs ${HANDS[t][1]} · ${res === 0 ? 'a draw' : res === 1 ? 'yours' : `${esc(r?.name ?? '')}'s`}`;
    notify();
}
async function endRps() {
    const c = ctxW(); const s = TG.rps; if (!c || !s) return; const r = c.g.cast[TG.who];
    const text = `Rock-paper-scissors${TG.topic ? ` (for: ${TG.topic})` : ''}: ${s.me > s.them ? `${personaName()} beat ${r?.name}` : `${r?.name} beat ${personaName()}`} ${Math.max(s.me, s.them)}–${Math.min(s.me, s.them)} (${s.picks.join(', ')}).`;
    TG.rps = null; TG.mode = ''; TG.who = ''; TG.topic = ''; notify();
    await narratorLine(text);
}
function coinHtml(): string {
    return `<div class="mu-tg-pick mu-panel"><b>Heads or tails${TG.topic ? `: ${esc(TG.topic)}` : ''}?</b>${TG.coin ? `<p class="mu-tg-coin is-${TG.coin === 'heads' ? 'h' : 't'}">🪙</p>` : ''}
        <div class="mu-chips"><button class="mu-chip" data-act="tg-flip" data-v="heads">Heads</button><button class="mu-chip" data-act="tg-flip" data-v="tails">Tails</button></div><button class="mu-ghost" data-act="tg-close">Never mind</button></div>`;
}
async function flip(call: string) {
    const side = Math.random() < 0.5 ? 'heads' : 'tails'; TG.coin = side; notify();
    await new Promise(r => setTimeout(r, 1100));
    const text = `${personaName()} called ${call} and tossed a coin${TG.topic ? ` (for: ${TG.topic})` : ''}: ${side}. ${side === call ? `${personaName()} wins the toss.` : `${personaName()} loses the toss.`}`;
    TG.coin = ''; TG.mode = ''; TG.topic = ''; notify();
    await narratorLine(text);
}

Object.assign(ACT, {
    'tg-menu': () => { if (TG.mode === 'film' && TG.film) { void endFilm(true); return; } if (TG.mode === 'match' && TG.match) { void endMatch(true); return; } TG.mode = TG.mode ? '' : 'menu'; notify(); },
    'tg-close': () => { if (TG.film) clearTimeout(TG.film.timer); if (TG.match) cancelAnimationFrame(TG.match.raf); TG.mode = ''; TG.who = ''; TG.rps = null; TG.film = null; TG.match = null; notify(); },
    'tg-film': (el) => { if (el.getAttribute('aria-disabled')) return; TG.mode = 'film'; TG.film = null; notify(); },
    'tg-genre': (el) => { if (el.getAttribute('aria-disabled')) return; void startFilm(el.dataset.v ?? 'comedy'); },
    'tg-react': (el) => { const f = TG.film; if (!f) return; f.mine.push(el.dataset.v ?? ''); toast(el.dataset.v ?? '', 'info', { ms: 900 }); },
    'tg-stop': () => { if (TG.mode === 'film') void endFilm(true); else void endMatch(true); },
    'tg-match': (el) => { if (el.getAttribute('aria-disabled')) return; TG.mode = 'match'; TG.match = null; TG.who = ''; notify(); },
    'tg-vs': (el) => { void startMatch(el.dataset.who!); },
    'tg-hit': () => hit(),
    'tg-matchend': () => { void endMatch(); },
    'tg-rps': () => { TG.mode = 'rps'; TG.rps = null; TG.who = ''; notify(); },
    'tg-rpsvs': (el) => { TG.who = el.dataset.who!; TG.rps = { me: 0, them: 0, last: '', picks: [] }; notify(); },
    'tg-hand': (el) => hand(Number(el.dataset.i)),
    'tg-rpsend': () => { void endRps(); },
    'tg-coin': () => { TG.mode = 'coin'; TG.coin = ''; notify(); },
    'tg-flip': (el) => { void flip(el.dataset.v ?? 'heads'); },
});
Object.assign(INPUT, { 'tg-topic': (el) => { TG.topic = String(el.value).slice(0, 60); } });
document.addEventListener?.('keydown', (e) => { if (TG.mode === 'match' && TG.match && !TG.match.done && e.code === 'Space' && !(e.target as HTMLElement)?.matches?.('input, textarea')) { e.preventDefault(); hit(); } });
