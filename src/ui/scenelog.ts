// [expanded] 0.2.1-13: the dialogue log in scenes. A Home's day is one long chat (upstream keeps it, walking from
// room to room); here it is shown as scenes: the earlier ones of the day folded into one line each (where, when, who,
// how many lines), a click opens one; inside a scene, a small mark when someone comes in or leaves. "Previously"
// (a button in the log's corner) shows the past days the same way: still in the chat, hidden from the AI.
import { esc, game, notify, type Save } from '../core/store.js';
import { getWorld, type WorldDef } from '../core/world.js';
import { placeOf, isOuting, outingName } from '../sim/places.js';
import { dayStart } from '../sim/diary.js';
import { scenesIn } from '../sim/scenectx.js';
import type { Scene } from '../sim/scenes.js';
import { icon } from './icons.js';
import { ACT } from './reg.js';

export const SL = { open: new Set<number>(), prev: false, day: -1, popen: new Set<number>() };

const hm = (m: number) => `${String(Math.floor((m % 1440) / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
const nm = (g: Save, a: string) => { const r = g.cast[a]; return r ? (r.met ? r.name : 'someone') : a; };
export function placeName(g: Save, w: WorldDef, loc: string): string {
    if (!loc) return '';
    if (loc === 'home:player') return 'Your room';
    if (isOuting(loc)) return outingName(loc);
    if (loc.startsWith('home:')) { const r = g.cast[loc.slice(5)]; return r ? `${r.name}'s room` : 'A bedroom'; }
    return placeOf(g, w, loc)?.name ?? loc;
}
function title(g: Save, w: WorldDef, s: Scene, withDay = false): string {
    if (!s.stamped) return 'Earlier (before scenes were marked)';
    const when = `${withDay ? '' : ''}${hm(s.from)}${s.to - s.from >= 5 ? `–${hm(s.to)}` : ''}`;
    const who = s.all.length ? s.all.map(a => nm(g, a)).join(', ') : 'alone';
    return `${when} · ${placeName(g, w, s.loc)} · ${who}`;
}
const countOf = (s: Scene) => `${s.lines.length} ${s.lines.length === 1 ? 'line' : 'lines'}`;

function linesHtml(g: Save, w: WorldDef, s: Scene, render: (i: number) => string, last = Infinity): string {
    const marks = new Map(s.marks.map(m => [m.i, m]));
    const shown = s.lines.slice(-last);
    let out = ''; let aside = '';
    for (const i of shown) {
        const m = marks.get(i);
        if (m) out += `<p class="mu-sc-mark">${[m.came.length ? `${list(m.came.map(a => nm(g, a)))} ${m.came.length > 1 ? 'come' : 'comes'} in` : '', m.left.length ? `${list(m.left.map(a => nm(g, a)))} ${m.left.length > 1 ? 'leave' : 'leaves'}` : ''].filter(Boolean).join(' · ')}</p>`;
        const a = s.aside[i] ?? '';
        if (a !== aside) { out += `<p class="mu-sc-mark is-aside">${a ? `a moment in ${esc(placeName(g, w, a).toLowerCase())}` : 'back'}</p>`; aside = a; }
        out += render(i);
    }
    return out;
}

/** Today's log in scenes ('' when there is nothing to fold: then the plain log is shown). */
export function foldedLog(from: number, render: (i: number) => string, last: number): string {
    const g = game(); const w = g && getWorld(g.world); if (!g || !w) return '';
    const sc = scenesIn(from);
    if (sc.length < 2 || !sc.some(s => s.stamped)) return '';
    const cur = sc.at(-1)!;
    const past = sc.slice(0, -1).map(s => {
        const open = SL.open.has(s.start);
        return `<section class="mu-sc ${open ? 'is-open' : ''}"><button class="mu-sc-head" data-act="sc-fold" data-s="${s.start}" aria-expanded="${open}"><i class=\"mu-sc-arr\">${open ? '▾' : '▸'}</i><span>${esc(title(g, w, s))}</span><small>${countOf(s)}</small></button>${open ? linesHtml(g, w, s, render) : ''}</section>`;
    }).join('');
    return `${past}<p class="mu-sc-now">${esc(title(g, w, cur))}</p>${linesHtml(g, w, cur, render, last)}`;
}

export const prevButton = () => (game() && dayStart(game()!) > 0 ? `<button class="mu-ibtn mu-ghost mu-dlg-prev" data-act="sc-prev" title="Previously: the days before" aria-label="Previously">${icon('book')}</button>` : '');

/** "Previously": the days before today, each a list of its scenes. */
export function prevHtml(render: (i: number) => string): string {
    const g = game(); const w = g && getWorld(g.world); if (!SL.prev || !g || !w) return '';
    const sc = scenesIn(0, dayStart(g), true);
    // each scene on its day (old lines with no marks: on the day of the next marked scene, or "earlier")
    const days = new Map<number, Scene[]>();
    let carry = -1;
    for (let k = sc.length - 1; k >= 0; k--) { const s = sc[k]; const d = s.stamped ? Math.floor(s.from / 1440) : carry; if (s.stamped) carry = d; (days.get(d) ?? days.set(d, []).get(d)!).unshift(s); }
    const order = [...days.keys()].sort((a, b) => b - a);
    if (SL.day === -1 && order.length) SL.day = order[0];
    const body = order.length ? order.map(d => {
        const open = SL.day === d; const ss = days.get(d)!;
        return `<section class="mu-prev-day ${open ? 'is-open' : ''}"><button class="mu-sc-head" data-act="sc-pday" data-d="${d}"><i class=\"mu-sc-arr\">${open ? '▾' : '▸'}</i><span>${d >= 0 ? `Day ${d}` : 'Earlier'}</span><small>${ss.length} ${ss.length === 1 ? 'scene' : 'scenes'}</small></button>
            ${open ? ss.map(s => { const o = SL.popen.has(s.start); return `<section class="mu-sc ${o ? 'is-open' : ''}"><button class="mu-sc-head" data-act="sc-pfold" data-s="${s.start}"><i class=\"mu-sc-arr\">${o ? '▾' : '▸'}</i><span>${esc(title(g, w, s))}</span><small>${countOf(s)}</small></button>${o ? linesHtml(g, w, s, render) : ''}</section>`; }).join('') : ''}</section>`;
    }).join('') : '<p class="mu-muted">Nothing yet: the days before today show here once you have slept.</p>';
    return `<div class="mu-dlg-veil" data-act="sc-prev-close"></div><div class="mu-panel mu-dlg mu-glassdlg mu-prev" role="dialog" aria-label="Previously">
        <header><h3>${icon('book')} Previously</h3><button class="mu-ibtn mu-ghost" data-act="sc-prev-close" aria-label="Close">${icon('x')}</button></header>
        <small class="mu-muted">Every line of the days before, in their scenes. The AI does not read these any more: the story remembers them through the diary, the relationships and what everyone knows.</small>
        <div class="mu-prev-body" data-keep="prevlog">${body}</div></div>`;
}

const scrollTo = (sel: string) => setTimeout(() => document.querySelector(sel)?.scrollIntoView({ block: 'nearest' }), 30);
Object.assign(ACT, {
    'sc-fold': (el) => { const s = Number(el.dataset.s); if (SL.open.has(s)) SL.open.delete(s); else SL.open.add(s); notify(); scrollTo(`[data-act="sc-fold"][data-s="${s}"]`); },
    'sc-prev': () => { SL.prev = true; SL.day = -1; SL.popen.clear(); notify(); },
    'sc-prev-close': (el, e) => { if (e && el.classList.contains('mu-dlg-veil') && e.target !== el) return; SL.prev = false; notify(); },
    'sc-pday': (el) => { const d = Number(el.dataset.d); SL.day = SL.day === d ? -2 : d; notify(); },
    'sc-pfold': (el) => { const s = Number(el.dataset.s); if (SL.popen.has(s)) SL.popen.delete(s); else SL.popen.add(s); notify(); },
});
document.addEventListener?.('keydown', (e) => { if (e.key === 'Escape' && SL.prev) { SL.prev = false; notify(); } });
