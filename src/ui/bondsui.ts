// [expanded] The Relationships app (Home): the house as a graph (the player in the middle, the characters around,
// their relationships as lines), and what is known about a pair or a person. By default it only shows; editing is
// unlocked in the phone's Settings (per save), where the life-without-you setting lives too. Rules in sim/bonds.ts.
import { houseRulesHtml } from './profileui.js';
import { saveGame, notify, esc, game, type Save } from '../core/store.js';
import { getWorld, isScenario, type WorldDef } from '../core/world.js';
import { thumb, personaThumb, personaName } from '../st/bridge.js';
import { icon } from './icons.js';
import { ACT, INPUT } from './reg.js';
import { bondOf } from '../sim/social.js';
import { friendTier, romanceTier, sysOn } from '../sim/romance.js';
import { refreshPrompt } from '../sim/prompt.js';
import { enableMoney } from '../sim/moneynight.js';
import { TIE_TYPES } from '../sim/living.js';
import {
    bondsOf, syncTies, pairOf, pairKey, pairsIn, setValue, toneOf, wordOf, addFact, editFact, removeFact, pinFact,
    factsOfPair, factsOfPerson, statusOf, setStatus, LIVES, YOU, type BondFact, type GLike, type Life, type Tone,
} from '../sim/bonds.js';

// sel: '' (the whole house), 'p:<id>' (a person; '__you' is the player) or 'e:<a>|<b>' (a pair)
const BV = { sel: '', edit: '', draft: '', adding: false, addText: '', addWho: [] as string[] };
const G = (g: Save) => g as unknown as GLike;
const COLOR: Record<Tone, string> = { close: '#2ecc71', good: '#8bc34a', neutral: '#9aa0a6', tense: '#f39c12', hostile: '#e74c3c' };
const people = (g: Save) => Object.values(g.cast);
const nm = (g: Save, a: string) => (a === YOU ? personaName() : g.cast[a]?.name ?? a);
const pic = (a: string) => (a === YOU ? personaThumb() : thumb(a));
const canEdit = (g: Save) => bondsOf(G(g)).edit === true;
const known = (g: Save, a: string) => a === YOU || !!g.cast[a];
const statusText = (g: Save, a: string, b: string) => {
    const t = statusOf(G(g), a, b); if (!t) return '';
    const label = TIE_TYPES.find(x => x[0] === t.type)?.[1] ?? t.type;
    return `${nm(g, t.a)} is ${label} ${nm(g, t.b)}`;
};
const shortStatus = (g: Save, a: string, b: string) => { const t = statusOf(G(g), a, b); return t ? (TIE_TYPES.find(x => x[0] === t.type)?.[1] ?? t.type).replace(/ (of|to)$/, '') : ''; };
// the player's closeness is upstream's (friendship 0…100 and romance): its own words and colors
const youTier = (g: Save, a: string) => friendTier(bondOf(g, a));
const youLine = (g: Save, a: string) => {
    const r = sysOn(g, 'romance') ? romanceTier(g, a) : null;
    return `${youTier(g, a).name.toLowerCase()}${r && r.id !== 'none' ? ` · ${r.name.toLowerCase()}` : ''}`;
};

/* ---------- the graph ---------- */

function graph(g: Save): string {
    const list = people(g); const n = list.length;
    if (!n) return '<p class="mu-muted mu-pad">Nobody lives in the house yet.</p>';
    // sizes shrink as the house fills up; the player sits in the middle
    const r = n <= 6 ? 21 : n <= 9 ? 17 : n <= 12 ? 14 : 12;
    const W = 300, H = 290, cx = W / 2, cy = H / 2 - 4, rx = 120, ry = 104;
    const pos: Record<string, { x: number; y: number }> = { [YOU]: { x: cx, y: cy } };
    list.forEach((p, i) => { const t = -Math.PI / 2 + (2 * Math.PI * i) / n; pos[p.avatar] = { x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) }; });
    const sel = BV.sel; const selP = sel.startsWith('p:') ? sel.slice(2) : ''; const selE = sel.startsWith('e:') ? sel.slice(2) : '';
    const near = (a: string, b: string) => !!selP && (a === selP || b === selP);
    const lit = (a: string, b: string) => !sel || near(a, b) || selE === pairKey(a, b);
    const line = (a: string, b: string, color: string, w: number, style: string, cls: string) => {
        const A = pos[a], B = pos[b], k = pairKey(a, b);
        const xy = `x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${B.x.toFixed(1)}" y2="${B.y.toFixed(1)}"`;
        return `<g class="mu-bd-edge ${cls}${lit(a, b) ? '' : ' is-dim'}${selE === k ? ' is-on' : ''}" data-act="bd-sel" data-k="e:${esc(k)}">
            <line ${xy} stroke="${color}" stroke-width="${w.toFixed(1)}" ${style} /><line class="mu-bd-hit" ${xy} /></g>`;
    };
    // between characters: shown when there is something to show (a status, a value, facts); the rest only around
    // the person you picked, so a full house does not turn into a ball of lines
    const edges = pairsIn(list.map(p => p.avatar)).map(([a, b]) => {
        const p = pairOf(G(g), a, b);
        const tied = !!statusOf(G(g), a, b); const has = factsOfPair(G(g), a, b).length > 0;
        if (p.v === 0 && !tied && !has && !near(a, b) && selE !== pairKey(a, b)) return '';
        const quiet = p.v === 0 && !tied && !has;
        return line(a, b, COLOR[toneOf(p.v)], 1.4 + Math.abs(p.v) / 22, quiet ? 'stroke-dasharray="3 5" opacity="0.5"' : tied ? '' : 'stroke-dasharray="7 4"', '');
    }).join('');
    const spokes = list.map(p => line(YOU, p.avatar, youTier(g, p.avatar).color, 1.2 + bondOf(g, p.avatar) / 45, statusOf(G(g), YOU, p.avatar) ? 'opacity="0.75"' : 'stroke-dasharray="7 4" opacity="0.6"', 'is-you')).join('');
    const node = (a: string, i: number, size: number, label: string) => {
        const { x, y } = pos[a]; const on = selP === a;
        const dim = sel && !on && !(selE && selE.split('|').includes(a)) && !(selP && lit(selP, a));
        return `<g class="mu-bd-node${on ? ' is-on' : ''}${dim ? ' is-dim' : ''}${a === YOU ? ' is-you' : ''}" data-act="bd-sel" data-k="p:${esc(a)}">
            <clipPath id="mu-bdc${i}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${size}" /></clipPath>
            <circle class="mu-bd-ring" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${size + 2.5}" />
            <image href="${esc(pic(a))}" x="${(x - size).toFixed(1)}" y="${(y - size).toFixed(1)}" width="${size * 2}" height="${size * 2}" preserveAspectRatio="xMidYMid slice" clip-path="url(#mu-bdc${i})" />
            <text x="${x.toFixed(1)}" y="${(y + size + 14).toFixed(1)}" text-anchor="middle" style="font-size:${n > 9 ? 9 : 10.5}px" data-notr>${esc(label)}</text></g>`;
    };
    const max = n > 9 ? 8 : 11;
    const cut = (s: string) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
    const nodes = node(YOU, 0, Math.max(r - 2, 12), 'You') + list.map((p, i) => node(p.avatar, i + 1, r, cut(p.name))).join('');
    return `<svg class="mu-bd-graph" viewBox="0 0 ${W} ${H}" role="img" aria-label="Relationships in the house">${spokes}${edges}${nodes}</svg>
        <div class="mu-bd-legend">${(['close', 'good', 'neutral', 'tense', 'hostile'] as Tone[]).map(t => `<span><i style="background:${COLOR[t]}"></i>${t}</span>`).join('')}<span class="mu-muted">solid: a status (sister, friend…)</span></div>`;
}

/* ---------- fact blocks ---------- */

function block(g: Save, f: BondFact, showWho: boolean, edit: boolean): string {
    const who = f.who.map(a => esc(nm(g, a))).join(' & ');
    if (edit && BV.edit === f.id) return `<div class="mu-bd-fact is-edit">
        ${showWho ? `<small data-notr>${who}</small>` : ''}
        <textarea data-input="bd-draft" data-focus="bd-draft" rows="3">${esc(BV.draft)}</textarea>
        <div class="mu-bd-row"><button data-act="bd-save" data-id="${esc(f.id)}">${icon('check')}<span>Save</span></button><button class="mu-ghost" data-act="bd-cancel">Cancel</button></div></div>`;
    const meta = f.kind === 'standing' ? '<em class="mu-bd-tag">standing</em>'
        : `<em class="mu-bd-tag is-ep">day ${f.day}${f.src === 'offscreen' ? ' · off-screen' : f.src === 'scene' ? ' · in a scene' : ''}</em>${f.delta ? `<em class="mu-bd-delta ${f.delta > 0 ? 'is-up' : 'is-down'}">${f.delta > 0 ? '+' : '−'}${Math.abs(f.delta)}</em>` : ''}`;
    return `<div class="mu-bd-fact${f.kind === 'standing' ? ' is-standing' : ''}">
        <div class="mu-bd-meta${edit ? ' has-tools' : ''}">${showWho || f.who.length > 2 ? `<small data-notr>${who}</small>` : ''}${meta}</div>
        <p data-notr>${esc(f.text)}</p>
        ${edit ? `<div class="mu-bd-tools">
            <button class="mu-ibtn mu-ghost" data-act="bd-edit" data-id="${esc(f.id)}" aria-label="Edit" title="Edit">${icon('pen')}</button>
            ${f.kind === 'episode' ? `<button class="mu-ibtn mu-ghost" data-act="bd-pin" data-id="${esc(f.id)}" aria-label="Make it standing" title="Make it standing (a lasting part of their relationship)">${icon('pin')}</button>` : ''}
            <button class="mu-ibtn mu-ghost" data-act="bd-del" data-id="${esc(f.id)}" aria-label="Delete" title="Delete">${icon('trash')}</button>
        </div>` : ''}</div>`;
}
// standing facts first, then the episodes, newest first
const ordered = (list: BondFact[]) => [...list.filter(f => f.kind === 'standing'), ...list.filter(f => f.kind === 'episode').reverse()];
const facts = (g: Save, list: BondFact[], showWho: boolean, empty: string) =>
    `<div class="mu-bd-facts">${ordered(list).map(f => block(g, f, showWho, canEdit(g))).join('') || `<p class="mu-muted">${empty}</p>`}</div>`;

function addForm(g: Save, base: string[]): string {
    if (!canEdit(g)) return '';
    if (!BV.adding) return `<button class="mu-bd-add" data-act="bd-add">${icon('plus')}<span>Add a fact</span></button>`;
    const others = [YOU, ...people(g).map(p => p.avatar)].filter(a => !base.includes(a));
    const need = base.length === 1 ? 'Who else is it about (one or two)?' : 'Also about someone else? (optional)';
    return `<div class="mu-bd-fact is-edit">
        <textarea data-input="bd-addtext" data-focus="bd-addtext" rows="3" placeholder="e.g. ${base.length >= 2 ? `${esc(nm(g, base[0]))} always beats ${esc(nm(g, base[1]))} at fighting games, and it drives them mad.` : 'what their relationship is like'}">${esc(BV.addText)}</textarea>
        <small>${need}</small><div class="mu-chips">${others.map(a => `<button class="mu-chip ${BV.addWho.includes(a) ? 'is-on' : ''}" data-act="bd-addwho" data-who="${esc(a)}" data-notr>${esc(a === YOU ? `${nm(g, a)} (you)` : nm(g, a))}</button>`).join('')}</div>
        <div class="mu-bd-row"><button data-act="bd-addsave">${icon('check')}<span>Add as standing</span></button><button class="mu-ghost" data-act="bd-cancel">Cancel</button></div></div>`;
}

// The status of a pair: shown always; changed (or removed) when editing is on. "A is <type> of B", either way round.
function statusRow(g: Save, a: string, b: string): string {
    const cur = statusOf(G(g), a, b); const txt = statusText(g, a, b);
    if (!canEdit(g)) return txt ? `<span class="mu-bd-status" data-notr>${esc(txt)}</span>` : '<small class="mu-muted">No status</small>';
    const val = cur ? `${cur.a === a ? 'ab' : 'ba'}:${cur.type}` : '';
    const opt = (v: string, label: string) => `<option value="${esc(v)}" ${v === val ? 'selected' : ''}>${esc(label)}</option>`;
    const sym = new Set(['sibling', 'spouse', 'partner', 'cousin', 'roommate', 'friend', 'bestfriend', 'ally', 'colleague', 'dating', 'rival', 'enemy', 'ex']);
    const opts = TIE_TYPES.flatMap(([id, label]) => sym.has(id) ? [opt(`ab:${id}`, `${nm(g, a)} is ${label} ${nm(g, b)}`)]
        : [opt(`ab:${id}`, `${nm(g, a)} is ${label} ${nm(g, b)}`), opt(`ba:${id}`, `${nm(g, b)} is ${label} ${nm(g, a)}`)]);
    return `<label class="mu-field mu-bd-statusedit"><span>Status</span><select data-input="bd-status" data-k="${esc(pairKey(a, b))}" data-a="${esc(a)}" data-b="${esc(b)}">${opt('', 'No status')}${opts.join('')}</select></label>`;
}

/* ---------- panels ---------- */

const title = (text: string) => `<div class="mu-bd-title"><b data-notr>${text}</b><button class="mu-ibtn mu-ghost" data-act="bd-sel" data-k="" aria-label="Close">${icon('x')}</button></div>`;

function pairPanel(g: Save, a: string, b: string): string {
    if (a === YOU || b === YOU) {   // the player and a character: closeness is upstream's, shown as it is
        const c = a === YOU ? b : a;
        return `<section class="mu-bd-panel">${title(`${esc(nm(g, YOU))} (you) & ${esc(nm(g, c))}`)}
            ${statusRow(g, YOU, c)}
            <small class="mu-muted">${esc(youLine(g, c))}: it grows with what you do together (see People).</small>
            ${facts(g, factsOfPair(G(g), YOU, c), false, 'Nothing written yet.')}
            ${addForm(g, [YOU, c])}</section>`;
    }
    const p = pairOf(G(g), a, b);
    return `<section class="mu-bd-panel">${title(`${esc(nm(g, a))} & ${esc(nm(g, b))}`)}
        ${statusRow(g, a, b)}
        <div class="mu-bd-val"><span><i class="mu-bd-dot" style="background:${COLOR[toneOf(p.v)]}"></i><b data-bd-word>${wordOf(p.v)}</b> <small data-bd-num>${p.v > 0 ? '+' : ''}${p.v}</small></span>
            ${canEdit(g) ? `<input type="range" min="-100" max="100" step="1" value="${p.v}" data-input="bd-val" data-k="${esc(pairKey(a, b))}" style="--c:${COLOR[toneOf(p.v)]}">` : `<span class="mu-bd-meter"><i style="left:${(p.v + 100) / 2}%;background:${COLOR[toneOf(p.v)]}"></i></span>`}</div>
        ${facts(g, factsOfPair(G(g), a, b), false, 'No facts yet. What happens between them is written here at night.')}
        ${addForm(g, [a, b])}</section>`;
}

function personPanel(g: Save, a: string): string {
    const isYou = a === YOU;
    const rows = [...(isYou ? [] : [YOU]), ...people(g).map(p => p.avatar).filter(x => x !== a)].map(x => {
        if (x === YOU || isYou) { const c = x === YOU ? a : x; return { x, v: bondOf(g, c) - 50, color: youTier(g, c).color, word: youLine(g, c) }; }
        const p = pairOf(G(g), a, x); return { x, v: p.v, color: COLOR[toneOf(p.v)], word: wordOf(p.v) };
    });
    if (!isYou) rows.sort((m, k) => (m.x === YOU ? -1 : k.x === YOU ? 1 : k.v - m.v));
    return `<section class="mu-bd-panel">${title(isYou ? `${esc(nm(g, YOU))} (you)` : esc(nm(g, a)))}
        <div class="mu-ph-list">${rows.map(({ x, color, word }) => { const st = shortStatus(g, a, x); return `<button class="mu-ph-row" data-act="bd-sel" data-k="e:${esc(pairKey(a, x))}"><img src="${esc(pic(x))}" alt="">
            <span><b data-notr>${esc(x === YOU ? `${nm(g, x)} (you)` : nm(g, x))}</b><small><i class="mu-bd-dot" style="background:${color}"></i>${esc(word)}${st ? ` · <span data-notr>${esc(st)}</span>` : ''} · ${factsOfPair(G(g), a, x).length} facts</small></span></button>`; }).join('')}</div>
        ${facts(g, factsOfPerson(G(g), a), true, 'Nothing written yet.')}
        ${addForm(g, [a])}</section>`;
}

function housePanel(g: Save): string {
    const life = LIVES.find(l => l[0] === bondsOf(G(g)).life)!;
    return `<section class="mu-bd-panel"><p class="mu-muted mu-bd-hint">Tap a person or a line between two people to see what is known about them.</p>
        <small class="mu-muted">Life without you: <b>${life[1]}</b>${canEdit(g) ? ' · editing on' : ' · view only'} (phone Settings).</small></section>`;
}

export function bondsApp(g: Save, w: WorldDef, header: string): string {
    void w;
    syncTies(G(g));
    if (BV.sel.startsWith('p:') && !known(g, BV.sel.slice(2))) BV.sel = '';
    if (BV.sel.startsWith('e:') && BV.sel.slice(2).split('|').some(a => !known(g, a))) BV.sel = '';
    if (!canEdit(g)) { BV.edit = ''; BV.adding = false; }
    const panel = BV.sel.startsWith('e:') ? pairPanel(g, ...(BV.sel.slice(2).split('|') as [string, string]))
        : BV.sel.startsWith('p:') ? personPanel(g, BV.sel.slice(2)) : housePanel(g);
    return `${header}<div class="mu-ph-body mu-bd">${graph(g)}${panel}</div>`;
}

// In the phone's Settings (Home only): unlock editing, and how lively life without you is.
export function bondsSettingsHtml(): string {
    const g = game(); const w = g && getWorld(g.world);
    if (!g || !w || !isScenario(w)) return '';
    const b = bondsOf(G(g)); const life = LIVES.find(l => l[0] === b.life)!;
    return `<section class="mu-bd-set"><h4>Relationships and the house</h4>
        <label class="mu-check"><input type="checkbox" data-input="bd-unlock" ${b.edit ? 'checked' : ''}><span>Let me edit relationships and the house's things</span></label>
        <small class="mu-muted">${b.edit ? 'In Relationships you can edit facts, statuses and values; in Storage you can add, count, label, move and remove things.' : 'Off: Relationships and Storage only show; they change by themselves, with the story and night by night.'}</small>
        <b>Life without you</b>
        <div class="mu-bd-seg">${LIVES.map(([id, label]) => `<button class="${id === b.life ? 'is-on' : ''}" data-act="bd-life" data-v="${id}">${label}</button>`).join('')}</div>
        <small class="mu-muted">${life[2]} Each night the day's scenes are also read for what changed between the people in them.</small>
        <label class="mu-check"><input type="checkbox" data-input="bd-money" ${(g as any).house?.on ? 'checked' : ''}><span>Money in this house</span></label>
        <small class="mu-muted">${(g as any).house?.on ? 'Your wallet and the house fund are in the Money app; groceries cost money, and you can take a job.' : 'Off: things are free, nobody works for money (as in Mundi\'s Home).'}</small>
        ${houseRulesHtml(g)}</section>`;
}

/* ---------- actions ---------- */

const done = () => { saveGame(); refreshPrompt(); notify(); };
const closeForms = () => { BV.edit = ''; BV.draft = ''; BV.adding = false; BV.addText = ''; BV.addWho = []; };
const editing = () => { const g = game(); return g && canEdit(g) ? g : null; };
let redraw: ReturnType<typeof setTimeout> | null = null;

Object.assign(ACT, {
    'bd-sel': (el) => { const k = el.dataset.k ?? ''; BV.sel = BV.sel === k && k.startsWith('p:') ? '' : k; closeForms(); notify(); },
    'bd-life': (el) => { const g = game(); if (!g) return; bondsOf(G(g)).life = (el.dataset.v as Life) || 'calm'; saveGame(); notify(); },
    'bd-edit': (el) => { const g = editing(); if (!g) return; const f = bondsOf(G(g)).facts.find(x => x.id === el.dataset.id); if (!f) return; closeForms(); BV.edit = f.id; BV.draft = f.text; notify();
        setTimeout(() => document.querySelector<HTMLTextAreaElement>('#mundi-root [data-focus="bd-draft"]')?.focus(), 0); },
    'bd-save': (el) => { const g = editing(); if (!g) return; if (editFact(G(g), el.dataset.id!, BV.draft)) { closeForms(); done(); } },
    'bd-cancel': () => { closeForms(); notify(); },
    'bd-pin': (el) => { const g = editing(); if (!g) return; pinFact(G(g), el.dataset.id!); done(); },
    'bd-del': (el) => { const g = editing(); if (!g) return; removeFact(G(g), el.dataset.id!); if (BV.edit === el.dataset.id) closeForms(); done(); },
    'bd-add': () => { if (!editing()) return; closeForms(); BV.adding = true; notify(); setTimeout(() => document.querySelector<HTMLTextAreaElement>('#mundi-root [data-focus="bd-addtext"]')?.focus(), 0); },
    'bd-addwho': (el) => {
        const a = el.dataset.who!; const base = BV.sel.startsWith('e:') ? 2 : 1;
        if (BV.addWho.includes(a)) BV.addWho = BV.addWho.filter(x => x !== a);
        else if (base + BV.addWho.length < 3) BV.addWho = [...BV.addWho, a];
        notify();
    },
    'bd-addsave': () => {
        const g = editing(); if (!g) return;
        const base = BV.sel.startsWith('e:') ? BV.sel.slice(2).split('|') : BV.sel.startsWith('p:') ? [BV.sel.slice(2)] : [];
        if (addFact(G(g), [...base, ...BV.addWho], BV.addText, 'standing', 'user')) { closeForms(); done(); }
    },
});
Object.assign(INPUT, {
    'bd-draft': (el) => { BV.draft = el.value; },
    'bd-addtext': (el) => { BV.addText = el.value; },
    'bd-money': (el) => { const g = game(); if (!g) return; enableMoney(g, !!el.checked); refreshPrompt(); notify(); },
    'bd-unlock': (el) => { const g = game(); if (!g) return; bondsOf(G(g)).edit = !!el.checked; if (!el.checked) closeForms(); saveGame(); notify(); },
    'bd-status': (el) => {
        const g = editing(); if (!g) return;
        const a = el.dataset.a!, b = el.dataset.b!; const v = String(el.value);
        if (!v) setStatus(G(g), a, b, '');
        else { const [dir, type] = v.split(':'); dir === 'ab' ? setStatus(G(g), a, b, type) : setStatus(G(g), b, a, type); }
        done();
    },
    // the slider: the number and word change as it moves; the graph is redrawn once it stops
    'bd-val': (el) => {
        const g = editing(); if (!g) return;
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
