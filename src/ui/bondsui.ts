// [expanded] The Relationships app (Home): the house as a graph (characters as nodes, their relationships as lines),
// and the facts of a pair or a person as blocks that can be edited, pinned or deleted. Rules in sim/bonds.ts.
import { saveGame, notify, esc, type Save } from '../core/store.js';
import type { WorldDef } from '../core/world.js';
import { game } from '../core/store.js';
import { thumb } from '../st/bridge.js';
import { icon } from './icons.js';
import { ACT, INPUT } from './reg.js';
import { bondLabel } from '../sim/social.js';
import { refreshPrompt } from '../sim/prompt.js';
import { TIE_TYPES } from '../sim/living.js';
import {
    bondsOf, syncTies, pairOf, pairKey, pairsIn, setValue, toneOf, wordOf, addFact, editFact, removeFact, pinFact,
    factsOfPair, factsOfPerson, LIVES, type BondFact, type GLike, type Life, type Tone,
} from '../sim/bonds.js';

// sel: '' (the whole house), 'p:<avatar>' (a person) or 'e:<a>|<b>' (a pair)
const BV = { sel: '', edit: '', draft: '', adding: false, addText: '', addWho: [] as string[] };
const G = (g: Save) => g as unknown as GLike;
const COLOR: Record<Tone, string> = { close: '#2ecc71', good: '#8bc34a', neutral: '#9aa0a6', tense: '#f39c12', hostile: '#e74c3c' };
const people = (g: Save) => Object.values(g.cast);
const nm = (g: Save, a: string) => g.cast[a]?.name ?? a;
const tieLabel = (g: Save, a: string, b: string) => {
    const t = ((g as any).living?.ties ?? []).find((x: any) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
    if (!t) return '';
    const label = TIE_TYPES.find(x => x[0] === t.type)?.[1] ?? t.type;
    return `${nm(g, t.a)} is ${label} ${nm(g, t.b)}`;
};

/* ---------- the graph ---------- */

function graph(g: Save): string {
    const list = people(g); const n = list.length;
    if (n < 2) return '<p class="mu-muted mu-pad">Relationships need at least two people living in the house.</p>';
    const W = 300, H = 270, cx = W / 2, cy = H / 2 - 6, rx = n > 2 ? 112 : 90, ry = n > 2 ? 98 : 0;
    const pos: Record<string, { x: number; y: number }> = {};
    list.forEach((r, i) => { const t = -Math.PI / 2 + (2 * Math.PI * i) / n; pos[r.avatar] = { x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) }; });
    const sel = BV.sel; const selP = sel.startsWith('p:') ? sel.slice(2) : ''; const selE = sel.startsWith('e:') ? sel.slice(2) : '';
    const lit = (a: string, b: string) => !sel || (selP && (a === selP || b === selP)) || selE === pairKey(a, b);
    const edges = pairsIn(list.map(r => r.avatar)).map(([a, b]) => {
        const p = pairOf(G(g), a, b); const k = pairKey(a, b);
        const has = factsOfPair(G(g), a, b).length > 0; const tied = !!tieLabel(g, a, b);
        const quiet = p.v === 0 && !has && !tied;
        const w = 1.4 + Math.abs(p.v) / 22;
        const A = pos[a], B = pos[b];
        return `<g class="mu-bd-edge${lit(a, b) ? '' : ' is-dim'}${selE === k ? ' is-on' : ''}" data-act="bd-sel" data-k="e:${esc(k)}">
            <line x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${B.x.toFixed(1)}" y2="${B.y.toFixed(1)}" stroke="${COLOR[toneOf(p.v)]}" stroke-width="${w.toFixed(1)}" ${quiet ? 'stroke-dasharray="3 5" opacity="0.45"' : has ? '' : 'stroke-dasharray="7 4"'} />
            <line class="mu-bd-hit" x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${B.x.toFixed(1)}" y2="${B.y.toFixed(1)}" /></g>`;
    }).join('');
    const nodes = list.map((r, i) => {
        const { x, y } = pos[r.avatar]; const on = selP === r.avatar; const dim = sel && !on && !(selE && selE.split('|').includes(r.avatar)) && !(selP && lit(selP, r.avatar));
        const name = r.name.length > 11 ? `${r.name.slice(0, 10)}…` : r.name;
        return `<g class="mu-bd-node${on ? ' is-on' : ''}${dim ? ' is-dim' : ''}" data-act="bd-sel" data-k="p:${esc(r.avatar)}">
            <clipPath id="mu-bdc${i}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="21" /></clipPath>
            <circle class="mu-bd-ring" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="23.5" />
            <image href="${esc(thumb(r.avatar))}" x="${(x - 21).toFixed(1)}" y="${(y - 21).toFixed(1)}" width="42" height="42" preserveAspectRatio="xMidYMid slice" clip-path="url(#mu-bdc${i})" />
            <text x="${x.toFixed(1)}" y="${(y + 36).toFixed(1)}" text-anchor="middle" data-notr>${esc(name)}</text></g>`;
    }).join('');
    return `<svg class="mu-bd-graph" viewBox="0 0 ${W} ${H}" role="img" aria-label="Relationships in the house">${edges}${nodes}</svg>
        <div class="mu-bd-legend">${(['close', 'good', 'neutral', 'tense', 'hostile'] as Tone[]).map(t => `<span><i style="background:${COLOR[t]}"></i>${t}</span>`).join('')}<span class="mu-muted">dashed: no facts yet</span></div>`;
}

/* ---------- fact blocks ---------- */

function block(g: Save, f: BondFact, showWho: boolean): string {
    const who = f.who.map(a => esc(nm(g, a))).join(' & ');
    if (BV.edit === f.id) return `<div class="mu-bd-fact is-edit">
        ${showWho ? `<small data-notr>${who}</small>` : ''}
        <textarea data-input="bd-draft" data-focus="bd-draft" rows="3">${esc(BV.draft)}</textarea>
        <div class="mu-bd-row"><button data-act="bd-save" data-id="${esc(f.id)}">${icon('check')}<span>Save</span></button><button class="mu-ghost" data-act="bd-cancel">Cancel</button></div></div>`;
    const meta = f.kind === 'standing' ? '<em class="mu-bd-tag">standing</em>'
        : `<em class="mu-bd-tag is-ep">day ${f.day}${f.src === 'offscreen' ? ' · off-screen' : f.src === 'scene' ? ' · in a scene' : ''}</em>${f.delta ? `<em class="mu-bd-delta ${f.delta > 0 ? 'is-up' : 'is-down'}">${f.delta > 0 ? '+' : '−'}${Math.abs(f.delta)}</em>` : ''}`;
    return `<div class="mu-bd-fact${f.kind === 'standing' ? ' is-standing' : ''}">
        <div class="mu-bd-meta">${showWho || f.who.length > 2 ? `<small data-notr>${who}</small>` : ''}${meta}</div>
        <p data-notr>${esc(f.text)}</p>
        <div class="mu-bd-tools">
            <button class="mu-ibtn mu-ghost" data-act="bd-edit" data-id="${esc(f.id)}" aria-label="Edit" title="Edit">${icon('pen')}</button>
            ${f.kind === 'episode' ? `<button class="mu-ibtn mu-ghost" data-act="bd-pin" data-id="${esc(f.id)}" aria-label="Make it standing" title="Make it standing (a lasting part of their relationship)">${icon('pin')}</button>` : ''}
            <button class="mu-ibtn mu-ghost" data-act="bd-del" data-id="${esc(f.id)}" aria-label="Delete" title="Delete">${icon('trash')}</button>
        </div></div>`;
}
// standing facts first, then the episodes, newest first
const ordered = (list: BondFact[]) => [...list.filter(f => f.kind === 'standing'), ...list.filter(f => f.kind === 'episode').reverse()];

function addForm(g: Save, base: string[]): string {
    if (!BV.adding) return `<button class="mu-bd-add" data-act="bd-add">${icon('plus')}<span>Add a fact</span></button>`;
    const others = people(g).filter(r => !base.includes(r.avatar));
    const need = base.length === 1 ? 'Who else is it about (one or two)?' : 'Also about someone else? (optional)';
    return `<div class="mu-bd-fact is-edit">
        <textarea data-input="bd-addtext" data-focus="bd-addtext" rows="3" placeholder="e.g. ${base.length >= 2 ? `${esc(nm(g, base[0]))} always beats ${esc(nm(g, base[1]))} at fighting games, and it drives them mad.` : 'what their relationship is like'}">${esc(BV.addText)}</textarea>
        ${others.length ? `<small>${need}</small><div class="mu-chips">${others.map(r => `<button class="mu-chip ${BV.addWho.includes(r.avatar) ? 'is-on' : ''}" data-act="bd-addwho" data-who="${esc(r.avatar)}" data-notr>${esc(r.name)}</button>`).join('')}</div>` : ''}
        <div class="mu-bd-row"><button data-act="bd-addsave">${icon('check')}<span>Add as standing</span></button><button class="mu-ghost" data-act="bd-cancel">Cancel</button></div></div>`;
}

/* ---------- panels ---------- */

function pairPanel(g: Save, a: string, b: string): string {
    const p = pairOf(G(g), a, b); const tie = tieLabel(g, a, b);
    return `<section class="mu-bd-panel">
        <div class="mu-bd-title"><b data-notr>${esc(nm(g, a))} & ${esc(nm(g, b))}</b><button class="mu-ibtn mu-ghost" data-act="bd-sel" data-k="" aria-label="Close">${icon('x')}</button></div>
        ${tie ? `<small class="mu-muted" data-notr>${esc(tie)}</small>` : ''}
        <label class="mu-bd-val"><span><b data-bd-word>${wordOf(p.v)}</b> <small data-bd-num>${p.v > 0 ? '+' : ''}${p.v}</small></span>
            <input type="range" min="-100" max="100" step="1" value="${p.v}" data-input="bd-val" data-k="${esc(pairKey(a, b))}" style="--c:${COLOR[toneOf(p.v)]}"></label>
        <div class="mu-bd-facts">${ordered(factsOfPair(G(g), a, b)).map(f => block(g, f, false)).join('') || '<p class="mu-muted">No facts yet. Add what their relationship is like: the AI reads it whenever they are in a scene together.</p>'}</div>
        ${addForm(g, [a, b])}</section>`;
}

function personPanel(g: Save, a: string): string {
    const rows = people(g).filter(r => r.avatar !== a).map(r => ({ r, p: pairOf(G(g), a, r.avatar) })).sort((x, y) => y.p.v - x.p.v);
    return `<section class="mu-bd-panel">
        <div class="mu-bd-title"><b data-notr>${esc(nm(g, a))}</b><button class="mu-ibtn mu-ghost" data-act="bd-sel" data-k="" aria-label="Close">${icon('x')}</button></div>
        <small class="mu-muted">With you: ${esc(bondLabel(g, a).toLowerCase())} (your own relationships are in People).</small>
        <div class="mu-ph-list">${rows.map(({ r, p }) => `<button class="mu-ph-row" data-act="bd-sel" data-k="e:${esc(pairKey(a, r.avatar))}"><img src="${esc(thumb(r.avatar))}" alt="">
            <span><b data-notr>${esc(r.name)}</b><small><i class="mu-bd-dot" style="background:${COLOR[toneOf(p.v)]}"></i>${wordOf(p.v)} · ${factsOfPair(G(g), a, r.avatar).length} facts</small></span></button>`).join('')}</div>
        <div class="mu-bd-facts">${ordered(factsOfPerson(G(g), a)).map(f => block(g, f, true)).join('')}</div>
        ${addForm(g, [a])}</section>`;
}

function lifePanel(g: Save): string {
    const life = bondsOf(G(g)).life;
    const cur = LIVES.find(l => l[0] === life)!;
    return `<section class="mu-bd-panel"><b>Life without you</b>
        <div class="mu-bd-seg">${LIVES.map(([id, label]) => `<button class="${id === life ? 'is-on' : ''}" data-act="bd-life" data-v="${id}">${label}</button>`).join('')}</div>
        <small class="mu-muted">${cur[2]} Each night the day's scenes are also read for what changed between the people in them.</small>
        <p class="mu-muted mu-bd-hint">Tap a person or a line between two people to see and edit what is known about them.</p></section>`;
}

export function bondsApp(g: Save, w: WorldDef, header: string): string {
    void w;
    syncTies(G(g));
    const sel = BV.sel;
    if (sel.startsWith('p:') && !g.cast[sel.slice(2)]) BV.sel = '';
    if (sel.startsWith('e:') && sel.slice(2).split('|').some(a => !g.cast[a])) BV.sel = '';
    const panel = BV.sel.startsWith('e:') ? pairPanel(g, ...(BV.sel.slice(2).split('|') as [string, string]))
        : BV.sel.startsWith('p:') ? personPanel(g, BV.sel.slice(2)) : lifePanel(g);
    return `${header}<div class="mu-ph-body mu-bd">${graph(g)}${panel}</div>`;
}

/* ---------- actions ---------- */

const done = () => { saveGame(); refreshPrompt(); notify(); };
const closeForms = () => { BV.edit = ''; BV.draft = ''; BV.adding = false; BV.addText = ''; BV.addWho = []; };
let redraw: ReturnType<typeof setTimeout> | null = null;

Object.assign(ACT, {
    'bd-sel': (el) => { const k = el.dataset.k ?? ''; BV.sel = BV.sel === k && k.startsWith('p:') ? '' : k; closeForms(); notify(); },
    'bd-life': (el) => { const g = game(); if (!g) return; bondsOf(G(g)).life = (el.dataset.v as Life) || 'calm'; saveGame(); notify(); },
    'bd-edit': (el) => { const g = game(); if (!g) return; const f = bondsOf(G(g)).facts.find(x => x.id === el.dataset.id); if (!f) return; closeForms(); BV.edit = f.id; BV.draft = f.text; notify();
        setTimeout(() => document.querySelector<HTMLTextAreaElement>('#mundi-root [data-focus="bd-draft"]')?.focus(), 0); },
    'bd-save': (el) => { const g = game(); if (!g) return; if (editFact(G(g), el.dataset.id!, BV.draft)) { closeForms(); done(); } },
    'bd-cancel': () => { closeForms(); notify(); },
    'bd-pin': (el) => { const g = game(); if (!g) return; pinFact(G(g), el.dataset.id!); done(); },
    'bd-del': (el) => { const g = game(); if (!g) return; removeFact(G(g), el.dataset.id!); if (BV.edit === el.dataset.id) closeForms(); done(); },
    'bd-add': () => { closeForms(); BV.adding = true; notify(); setTimeout(() => document.querySelector<HTMLTextAreaElement>('#mundi-root [data-focus="bd-addtext"]')?.focus(), 0); },
    'bd-addwho': (el) => {
        const a = el.dataset.who!; const base = BV.sel.startsWith('e:') ? 2 : 1;
        if (BV.addWho.includes(a)) BV.addWho = BV.addWho.filter(x => x !== a);
        else if (base + BV.addWho.length < 3) BV.addWho = [...BV.addWho, a];
        notify();
    },
    'bd-addsave': () => {
        const g = game(); if (!g) return;
        const base = BV.sel.startsWith('e:') ? BV.sel.slice(2).split('|') : BV.sel.startsWith('p:') ? [BV.sel.slice(2)] : [];
        if (addFact(G(g), [...base, ...BV.addWho], BV.addText, 'standing', 'user')) { closeForms(); done(); }
    },
});
Object.assign(INPUT, {
    'bd-draft': (el) => { BV.draft = el.value; },
    'bd-addtext': (el) => { BV.addText = el.value; },
    // the slider: the number and word change as it moves; the graph is redrawn once it stops
    'bd-val': (el) => {
        const g = game(); if (!g) return;
        const [a, b] = (el.dataset.k ?? '').split('|'); if (!g.cast[a] || !g.cast[b]) return;
        setValue(G(g), a, b, Number(el.value));
        const v = pairOf(G(g), a, b).v; const box = el.closest('.mu-bd-val');
        const word = box?.querySelector('[data-bd-word]'); if (word) word.textContent = wordOf(v);
        const num = box?.querySelector('[data-bd-num]'); if (num) num.textContent = `${v > 0 ? '+' : ''}${v}`;
        el.style.setProperty('--c', COLOR[toneOf(v)]);
        saveGame();
        if (redraw) clearTimeout(redraw);
        redraw = setTimeout(() => { redraw = null; refreshPrompt(); notify(); }, 700);
    },
});
