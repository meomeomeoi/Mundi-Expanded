// [expanded] The Relationships app (Home): the house as a graph (the player in the middle, the characters around,
// their relationships as lines), and what is known about a pair or a person. By default it only shows; editing is
// unlocked in the phone's Settings (per save), where the life-without-you setting lives too. Rules in sim/bonds.ts.
import { talkSettingsHtml, truthRow } from './talkui.js'; // [expanded] 0.2.0.11
import { houseRulesHtml } from './profileui.js';
import { eraSettingsHtml } from './phoneskin.js';
import { chatSettingsHtml } from './chatui.js';
import { saveGame, notify, esc, game, toast, nowAbs, cfg } from '../core/store.js';
import { getWorld, isScenario } from '../core/world.js';
import { thumb, personaThumb, personaName } from '../st/bridge.js';
import { icon } from './icons.js';
import { ACT, INPUT } from './reg.js';
import { bondOf } from '../sim/social.js';
import { friendTier, romanceTier, sysOn } from '../sim/romance.js';
import { refreshPrompt } from '../sim/prompt.js';
import { enableMoney } from '../sim/moneynight.js';
import { TIE_TYPES } from '../sim/living.js';
import { bondsOf, syncTies, pairOf, pairKey, pairsIn, setValue, toneOf, wordOf, addFact, editFact, removeFact, pinFact, factsOfPair, factsOfPerson, statusOf, setStatus, LIVES, YOU, factK, } from '../sim/bonds.js';
import { knowOf, tieK, howText } from '../sim/knows.js'; // [expanded] 0.2.0.8
import { partnersOf, foundOut } from '../sim/romance.js';
import { MOODS } from '../sim/gossip.js';
import * as L from '../sim/love.js';
import { WALLS, wallsOf } from '../sim/listen.js';
import { CTX_MODES, ctxMode, setCtxMode } from '../sim/scenectx.js';
import * as NI from '../sim/nights.js';
import { gossipOf } from '../sim/gossiprun.js';
const roomLimit = (g) => Number(g.furnishx?.limit ?? 15);
// sel: '' (the whole house), 'p:<id>' (a person; '__you' is the player) or 'e:<a>|<b>' (a pair)
const BV = { sel: '', edit: '', draft: '', adding: false, addText: '', addWho: [] };
const G = (g) => g;
const COLOR = { close: '#2ecc71', good: '#8bc34a', neutral: '#9aa0a6', tense: '#f39c12', hostile: '#e74c3c' };
const people = (g) => Object.values(g.cast);
const nm = (g, a) => (a === YOU ? personaName() : g.cast[a]?.name ?? a);
const pic = (a) => (a === YOU ? personaThumb() : thumb(a));
const canEdit = (g) => bondsOf(G(g)).edit === true;
// [expanded] 0.2.0.8: the app shows what you know (seen, told, suspected); everything with "Show the truth" or editing on
const seesAll = (g) => bondsOf(G(g)).truth === true || canEdit(g);
const youKnow = (f) => knowOf(factK(f), YOU);
const visible = (g, list) => (seesAll(g) ? list : list.filter(f => youKnow(f)));
const tieShown = (g, a, b) => { const t = statusOf(G(g), a, b); return !!t && (!t.secret || seesAll(g) || !!knowOf(tieK(t), YOU)); };
const known = (g, a) => a === YOU || !!g.cast[a];
const statusText = (g, a, b) => {
    const t = statusOf(G(g), a, b);
    if (!t || !tieShown(g, a, b))
        return '';
    const label = TIE_TYPES.find(x => x[0] === t.type)?.[1] ?? t.type;
    return `${nm(g, t.a)} is ${label} ${nm(g, t.b)}`;
};
const shortStatus = (g, a, b) => { const t = statusOf(G(g), a, b); return t && tieShown(g, a, b) ? (TIE_TYPES.find(x => x[0] === t.type)?.[1] ?? t.type).replace(/ (of|to)$/, '') : ''; };
// the player's closeness is upstream's (friendship 0…100 and romance): its own words and colors
const youTier = (g, a) => friendTier(bondOf(g, a));
const youLine = (g, a) => {
    const r = sysOn(g, 'romance') ? romanceTier(g, a) : null;
    return `${youTier(g, a).name.toLowerCase()}${r && r.id !== 'none' ? ` · ${r.name.toLowerCase()}` : ''}`;
};
/* ---------- the graph ---------- */
function graph(g) {
    const list = people(g);
    const n = list.length;
    if (!n)
        return '<p class="mu-muted mu-pad">Nobody lives in the house yet.</p>';
    // sizes shrink as the house fills up; the player sits in the middle
    const r = n <= 6 ? 21 : n <= 9 ? 17 : n <= 12 ? 14 : 12;
    const W = 300, H = 290, cx = W / 2, cy = H / 2 - 4, rx = 120, ry = 104;
    const pos = { [YOU]: { x: cx, y: cy } };
    list.forEach((p, i) => { const t = -Math.PI / 2 + (2 * Math.PI * i) / n; pos[p.avatar] = { x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) }; });
    const sel = BV.sel;
    const selP = sel.startsWith('p:') ? sel.slice(2) : '';
    const selE = sel.startsWith('e:') ? sel.slice(2) : '';
    const near = (a, b) => !!selP && (a === selP || b === selP);
    const lit = (a, b) => !sel || near(a, b) || selE === pairKey(a, b);
    const line = (a, b, color, w, style, cls) => {
        const A = pos[a], B = pos[b], k = pairKey(a, b);
        const xy = `x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${B.x.toFixed(1)}" y2="${B.y.toFixed(1)}"`;
        return `<g class="mu-bd-edge ${cls}${lit(a, b) ? '' : ' is-dim'}${selE === k ? ' is-on' : ''}" data-act="bd-sel" data-k="e:${esc(k)}">
            <line ${xy} stroke="${color}" stroke-width="${w.toFixed(1)}" ${style} /><line class="mu-bd-hit" ${xy} /></g>`;
    };
    // between characters: shown when there is something to show (a status, a value, facts); the rest only around
    // the person you picked, so a full house does not turn into a ball of lines
    const edges = pairsIn(list.map(p => p.avatar)).map(([a, b]) => {
        const p = pairOf(G(g), a, b);
        const tied = tieShown(g, a, b);
        const has = visible(g, factsOfPair(G(g), a, b)).length > 0;
        if (p.v === 0 && !tied && !has && !near(a, b) && selE !== pairKey(a, b))
            return '';
        const quiet = p.v === 0 && !tied && !has;
        return line(a, b, COLOR[toneOf(p.v)], 1.4 + Math.abs(p.v) / 22, quiet ? 'stroke-dasharray="3 5" opacity="0.5"' : tied ? '' : 'stroke-dasharray="7 4"', '');
    }).join('');
    const spokes = list.map(p => line(YOU, p.avatar, youTier(g, p.avatar).color, 1.2 + bondOf(g, p.avatar) / 45, statusOf(G(g), YOU, p.avatar) ? 'opacity="0.75"' : 'stroke-dasharray="7 4" opacity="0.6"', 'is-you')).join('');
    const node = (a, i, size, label) => {
        const { x, y } = pos[a];
        const on = selP === a;
        const dim = sel && !on && !(selE && selE.split('|').includes(a)) && !(selP && lit(selP, a));
        return `<g class="mu-bd-node${on ? ' is-on' : ''}${dim ? ' is-dim' : ''}${a === YOU ? ' is-you' : ''}" data-act="bd-sel" data-k="p:${esc(a)}">
            <clipPath id="mu-bdc${i}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${size}" /></clipPath>
            <circle class="mu-bd-ring" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${size + 2.5}" />
            <image href="${esc(pic(a))}" x="${(x - size).toFixed(1)}" y="${(y - size).toFixed(1)}" width="${size * 2}" height="${size * 2}" preserveAspectRatio="xMidYMid slice" clip-path="url(#mu-bdc${i})" />
            <text x="${x.toFixed(1)}" y="${(y + size + 14).toFixed(1)}" text-anchor="middle" style="font-size:${n > 9 ? 9 : 10.5}px" data-notr>${esc(label)}</text></g>`;
    };
    const max = n > 9 ? 8 : 11;
    const cut = (s) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
    const nodes = node(YOU, 0, Math.max(r - 2, 12), 'You') + list.map((p, i) => node(p.avatar, i + 1, r, cut(p.name))).join('');
    return `<svg class="mu-bd-graph" viewBox="0 0 ${W} ${H}" role="img" aria-label="Relationships in the house">${spokes}${edges}${nodes}</svg>
        <div class="mu-bd-legend">${['close', 'good', 'neutral', 'tense', 'hostile'].map(t => `<span><i style="background:${COLOR[t]}"></i>${t}</span>`).join('')}<span class="mu-muted">solid: a status (sister, friend…)</span></div>`;
}
/* ---------- fact blocks ---------- */
function block(g, f, showWho, edit) {
    const who = f.who.map(a => esc(nm(g, a))).join(' & ');
    if (edit && BV.edit === f.id)
        return `<div class="mu-bd-fact is-edit">
        ${showWho ? `<small data-notr>${who}</small>` : ''}
        <textarea data-input="bd-draft" data-focus="bd-draft" rows="3">${esc(BV.draft)}</textarea>
        <div class="mu-bd-row"><button data-act="bd-save" data-id="${esc(f.id)}">${icon('check')}<span>Save</span></button><button class="mu-ghost" data-act="bd-cancel">Cancel</button></div></div>`;
    const k = youKnow(f); // [expanded] 0.2.0.8: how you know it
    const src = !k ? '<em class="mu-bd-tag is-unknown">you do not know this</em>' : k.lvl === 'suspects' ? '<em class="mu-bd-tag is-sus">you suspect it</em>'
        : k.how === 'told' || k.how === 'heard' ? `<em class="mu-bd-tag">${esc(howText(k, (a) => nm(g, a)).replace('told them', 'told you').replace(/^heard/, 'you heard'))}</em>` : '';
    const secret = factK(f).pub === 'private' ? '<em class="mu-bd-tag is-secret">secret</em>' : '';
    const meta = f.kind === 'standing' ? `<em class="mu-bd-tag">standing</em>${secret}${src}`
        : `<em class="mu-bd-tag is-ep">day ${f.day}${f.src === 'offscreen' ? ' · off-screen' : f.src === 'scene' ? ' · in a scene' : ''}</em>${secret}${src}${f.delta ? `<em class="mu-bd-delta ${f.delta > 0 ? 'is-up' : 'is-down'}">${f.delta > 0 ? '+' : '−'}${Math.abs(f.delta)}</em>` : ''}`;
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
const ordered = (list) => [...list.filter(f => f.kind === 'standing'), ...list.filter(f => f.kind === 'episode').reverse()];
const facts = (g, list, showWho, empty) => `<div class="mu-bd-facts">${ordered(visible(g, list)).map(f => block(g, f, showWho, canEdit(g))).join('') || `<p class="mu-muted">${empty}</p>`}</div>`;
function addForm(g, base) {
    if (!canEdit(g))
        return '';
    if (!BV.adding)
        return `<button class="mu-bd-add" data-act="bd-add">${icon('plus')}<span>Add a fact</span></button>`;
    const others = [YOU, ...people(g).map(p => p.avatar)].filter(a => !base.includes(a));
    const need = base.length === 1 ? 'Who else is it about (one or two)?' : 'Also about someone else? (optional)';
    return `<div class="mu-bd-fact is-edit">
        <textarea data-input="bd-addtext" data-focus="bd-addtext" rows="3" placeholder="e.g. ${base.length >= 2 ? `${esc(nm(g, base[0]))} always beats ${esc(nm(g, base[1]))} at fighting games, and it drives them mad.` : 'what their relationship is like'}">${esc(BV.addText)}</textarea>
        <small>${need}</small><div class="mu-chips">${others.map(a => `<button class="mu-chip ${BV.addWho.includes(a) ? 'is-on' : ''}" data-act="bd-addwho" data-who="${esc(a)}" data-notr>${esc(a === YOU ? `${nm(g, a)} (you)` : nm(g, a))}</button>`).join('')}</div>
        <div class="mu-bd-row"><button data-act="bd-addsave">${icon('check')}<span>Add as standing</span></button><button class="mu-ghost" data-act="bd-cancel">Cancel</button></div></div>`;
}
// The status of a pair: shown always; changed (or removed) when editing is on. "A is <type> of B", either way round.
function statusRow(g, a, b) {
    const cur = statusOf(G(g), a, b);
    const txt = statusText(g, a, b);
    if (!canEdit(g))
        return txt ? `<span class="mu-bd-status" data-notr>${esc(txt)}</span>` : '<small class="mu-muted">No status</small>';
    const val = cur ? `${cur.a === a ? 'ab' : 'ba'}:${cur.type}` : '';
    const opt = (v, label) => `<option value="${esc(v)}" ${v === val ? 'selected' : ''}>${esc(label)}</option>`;
    const sym = new Set(['sibling', 'spouse', 'partner', 'cousin', 'roommate', 'friend', 'bestfriend', 'ally', 'colleague', 'dating', 'rival', 'enemy', 'ex']);
    const opts = TIE_TYPES.flatMap(([id, label]) => sym.has(id) ? [opt(`ab:${id}`, `${nm(g, a)} is ${label} ${nm(g, b)}`)]
        : [opt(`ab:${id}`, `${nm(g, a)} is ${label} ${nm(g, b)}`), opt(`ba:${id}`, `${nm(g, b)} is ${label} ${nm(g, a)}`)]);
    return `<label class="mu-field mu-bd-statusedit"><span>Status</span><select data-input="bd-status" data-k="${esc(pairKey(a, b))}" data-a="${esc(a)}" data-b="${esc(b)}">${opt('', 'No status')}${opts.join('')}</select></label>`;
}
// [expanded] 0.2.0.8: a secret. Your own (a romance or a status with you): yours to keep, any time. Between two
// characters: when editing (it is theirs). Who else knows it, when you know that.
function secretRow(g, a, b) {
    const c = a === YOU ? b : b === YOU ? a : '';
    const t = statusOf(G(g), a, b);
    const love = !!c && partnersOf(g).includes(c);
    const mine = !!c && (love || !!t);
    if (!mine && !(t && canEdit(g)))
        return t?.secret && tieShown(g, a, b) ? '<small class="mu-muted">A secret.</small>' : '';
    const on = love ? !!bondsOf(G(g)).hide?.[c] : !!t?.secret;
    const know = love ? bondsOf(G(g)).hide?.[c]?.know : t?.know;
    const who = Object.entries(know ?? {}).filter(([x]) => x !== YOU && g.cast[x]).map(([x, k]) => `${nm(g, x)}${k.lvl === 'suspects' ? ' (suspects)' : ''}`);
    return `<label class="mu-check"><input type="checkbox" data-input="bd-secret" data-a="${esc(a)}" data-b="${esc(b)}" ${on ? 'checked' : ''}><span>${mine ? 'Keep it a secret' : 'A secret between them'}<small>${on ? (who.length && (seesAll(g) || mine) ? `Knows: ${esc(who.join(', '))}.` : 'Nobody else knows (that you know of).') : 'Off: the whole house knows.'}</small></span></label>`;
}
// [expanded] 0.2.0.9: feelings, one way each (shown when you know them, or with the truth on)
function feelRows(g, a, b) {
    if (!L.flirtOn(G(g)))
        return '';
    const row = (x, y) => {
        const v = L.feelings(G(g), x, y);
        if (v < 15)
            return '';
        const said = L.loveOf(G(g)).said?.[L.lk(x, y)];
        const known = seesAll(g) || !!said || !!L.loveKnow(G(g), x, y).know?.[YOU];
        return known ? `<small class="mu-bd-feel">${icon('heart')} <span data-notr>${esc(nm(g, x))}</span> → <span data-notr>${esc(nm(g, y))}</span>: <b>${L.loveWord(v)}</b>${said ? '' : ' · unspoken'}${seesAll(g) && !said && !L.loveKnow(G(g), x, y).know?.[YOU] ? ' · <em>you do not know this</em>' : ''}</small>` : '';
    };
    return row(a, b) + row(b, a);
}
// [expanded] 0.2.0.9: with your partner: moving in, a date at home tonight
const DV = { room: '' };
function partnerRow(g, c) {
    const w = getWorld(g.world);
    if (!w || !L.flirtOn(G(g)) || !partnersOf(g).includes(c))
        return '';
    const lives = g.cast[c]?.homeWith === '__you';
    const rooms = NI.dateRooms(g, w);
    if (!rooms.some(r => r.id === DV.room))
        DV.room = rooms.find(r => /living|lounge|гостин/i.test(`${r.id} ${r.name}`))?.id ?? rooms[0]?.id ?? '';
    const d = NI.nightsOf(g).date;
    const today = d && d.day === g.day && d.with === c;
    return `<div class="mu-bd-row mu-bd-partner">${lives ? `<button class="mu-ghost" data-act="bd-moveout" data-who="${esc(c)}">${icon('home')}<span>Back to their own room</span></button>` : `<button class="mu-ghost" data-act="bd-movein" data-who="${esc(c)}">${icon('home')}<span>Ask them to move into your room</span></button>`}</div>
        ${today ? `<small class="mu-muted">${icon('heart')} A date tonight, ${String(Math.floor(d.from / 60)).padStart(2, '0')}:00–${String(Math.floor(d.to / 60)).padStart(2, '0')}:00, the ${esc((rooms.find(r => r.id === d.room)?.name ?? '').toLowerCase())}.${d.stay.length ? ` Not leaving: ${esc(d.stay.map(a => nm(g, a)).join(', '))}.` : ' The house leaves it to you.'}</small>`
        : `<div class="mu-bd-row"><select data-input="bd-dateroom">${rooms.map(r => `<option value="${esc(r.id)}" ${r.id === DV.room ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select><button class="mu-ghost" data-act="bd-date" data-who="${esc(c)}">${icon('heart')}<span>A date here tonight</span></button></div>`}`;
}
function mineRow(g, c) {
    if (!L.flirtOn(G(g)))
        return '';
    const m = L.loveOf(G(g)).mine?.[c];
    const who = Object.entries(m?.know ?? {}).filter(([x, k]) => g.cast[x] && k.lvl === 'knows').map(([x]) => nm(g, x));
    return `<label class="mu-field"><span>Your feelings for ${esc(nm(g, c))}</span><select data-input="bd-mine" data-who="${esc(c)}">
        <option value="" ${!m ? 'selected' : ''}>Nothing to tell (the game does not need to know)</option><option value="like" ${m?.lvl === 'like' ? 'selected' : ''}>I like them</option><option value="love" ${m?.lvl === 'love' ? 'selected' : ''}>I am in love with them</option></select></label>
        ${m ? `<label class="mu-check"><input type="checkbox" data-input="bd-minesecret" data-who="${esc(c)}" ${m.secret ? 'checked' : ''}><span>Keep it to myself<small>${m.secret ? `The house may notice, and talk.${who.length ? ` Noticed: ${esc(who.join(', '))}.` : ''}` : 'Everyone can see it.'}</small></span></label>` : ''}`;
}
/* ---------- panels ---------- */
const title = (text) => `<div class="mu-bd-title"><b data-notr>${text}</b><button class="mu-ibtn mu-ghost" data-act="bd-sel" data-k="" aria-label="Close">${icon('x')}</button></div>`;
function pairPanel(g, a, b) {
    if (a === YOU || b === YOU) { // the player and a character: closeness is upstream's, shown as it is
        const c = a === YOU ? b : a;
        return `<section class="mu-bd-panel">${title(`${esc(nm(g, YOU))} (you) & ${esc(nm(g, c))}`)}
            ${statusRow(g, YOU, c)}${secretRow(g, YOU, c)}${mineRow(g, c)}${partnerRow(g, c)}${seesAll(g) ? truthRow(g, c) : '' /* 0.2.0.11 */}
            <small class="mu-muted">${esc(youLine(g, c))}: it grows with what you do together (see People).</small>
            ${facts(g, factsOfPair(G(g), YOU, c), false, 'Nothing written yet.')}
            ${addForm(g, [YOU, c])}</section>`;
    }
    const p = pairOf(G(g), a, b);
    return `<section class="mu-bd-panel">${title(`${esc(nm(g, a))} & ${esc(nm(g, b))}`)}
        ${statusRow(g, a, b)}${secretRow(g, a, b)}${feelRows(g, a, b)}
        <div class="mu-bd-val"><span><i class="mu-bd-dot" style="background:${COLOR[toneOf(p.v)]}"></i><b data-bd-word>${wordOf(p.v)}</b> <small data-bd-num>${p.v > 0 ? '+' : ''}${p.v}</small></span>
            ${canEdit(g) ? `<input type="range" min="-100" max="100" step="1" value="${p.v}" data-input="bd-val" data-k="${esc(pairKey(a, b))}" style="--c:${COLOR[toneOf(p.v)]}">` : `<span class="mu-bd-meter"><i style="left:${(p.v + 100) / 2}%;background:${COLOR[toneOf(p.v)]}"></i></span>`}</div>
        ${(() => { const t = p.t ?? p.v; return p.t !== undefined && Math.abs(p.t - p.v) >= 10 ? `<small class="mu-muted">Trust: <b>${t >= 45 ? 'full' : t >= 15 ? 'some' : t > -15 ? 'little' : 'none'}</b> (${t > 0 ? '+' : ''}${t}), apart from how they get along.</small>` : ''; })()}
        ${facts(g, factsOfPair(G(g), a, b), false, 'No facts yet. What happens between them is written here at night.')}
        ${addForm(g, [a, b])}</section>`;
}
function personPanel(g, a) {
    const isYou = a === YOU;
    const rows = [...(isYou ? [] : [YOU]), ...people(g).map(p => p.avatar).filter(x => x !== a)].map(x => {
        if (x === YOU || isYou) {
            const c = x === YOU ? a : x;
            return { x, v: bondOf(g, c) - 50, color: youTier(g, c).color, word: youLine(g, c) };
        }
        const p = pairOf(G(g), a, x);
        return { x, v: p.v, color: COLOR[toneOf(p.v)], word: wordOf(p.v) };
    });
    if (!isYou)
        rows.sort((m, k) => (m.x === YOU ? -1 : k.x === YOU ? 1 : k.v - m.v));
    return `<section class="mu-bd-panel">${title(isYou ? `${esc(nm(g, YOU))} (you)` : esc(nm(g, a)))}
        <div class="mu-ph-list">${rows.map(({ x, color, word }) => {
        const st = shortStatus(g, a, x);
        return `<button class="mu-ph-row" data-act="bd-sel" data-k="e:${esc(pairKey(a, x))}"><img src="${esc(pic(x))}" alt="">
            <span><b data-notr>${esc(x === YOU ? `${nm(g, x)} (you)` : nm(g, x))}</b><small><i class="mu-bd-dot" style="background:${color}"></i>${esc(word)}${st ? ` · <span data-notr>${esc(st)}</span>` : ''} · ${factsOfPair(G(g), a, x).length} facts</small></span></button>`;
    }).join('')}</div>
        ${facts(g, factsOfPerson(G(g), a), true, 'Nothing written yet.')}
        ${addForm(g, [a])}</section>`;
}
function housePanel(g) {
    const life = LIVES.find(l => l[0] === bondsOf(G(g)).life);
    return `<section class="mu-bd-panel"><p class="mu-muted mu-bd-hint">Tap a person or a line between two people to see what is known about them.</p>
        <small class="mu-muted">Life without you: <b>${life[1]}</b>${canEdit(g) ? ' · editing on' : ' · view only'} (phone Settings).</small></section>`;
}
export function bondsApp(g, w, header) {
    void w;
    syncTies(G(g));
    if (BV.sel.startsWith('p:') && !known(g, BV.sel.slice(2)))
        BV.sel = '';
    if (BV.sel.startsWith('e:') && BV.sel.slice(2).split('|').some(a => !known(g, a)))
        BV.sel = '';
    if (!canEdit(g)) {
        BV.edit = '';
        BV.adding = false;
    }
    const panel = BV.sel.startsWith('e:') ? pairPanel(g, ...BV.sel.slice(2).split('|'))
        : BV.sel.startsWith('p:') ? personPanel(g, BV.sel.slice(2)) : housePanel(g);
    return `${header}<div class="mu-ph-body mu-bd">${graph(g)}${panel}</div>`;
}
// In the phone's Settings (Home only): unlock editing, and how lively life without you is.
export function bondsSettingsHtml() {
    const g = game();
    const w = g && getWorld(g.world);
    if (!g || !w || !isScenario(w))
        return '';
    const b = bondsOf(G(g));
    const life = LIVES.find(l => l[0] === b.life);
    return `<section class="mu-bd-set"><h4>Relationships and the house</h4>
        <label class="mu-check"><input type="checkbox" data-input="bd-unlock" ${b.edit ? 'checked' : ''}><span>Let me edit relationships and the house's things</span></label>
        <label class="mu-check"><input type="checkbox" data-input="bd-truth" ${b.truth ? 'checked' : ''}><span>Show the truth<small>${b.truth ? 'Relationships shows everything, and marks what you do not know.' : 'Off: Relationships shows what you know: what you saw, were told or suspect. Editing shows everything too.'}</small></span></label>
        <small class="mu-muted">${b.edit ? 'In Relationships you can edit facts, statuses and values; in Storage you can add, count, label, move and remove things.' : 'Off: Relationships and Storage only show; they change by themselves, with the story and night by night.'}</small>
        <b>Life without you</b>
        <div class="mu-bd-seg">${LIVES.map(([id, label]) => `<button class="${id === b.life ? 'is-on' : ''}" data-act="bd-life" data-v="${id}">${label}</button>`).join('')}</div>
        <small class="mu-muted">${life[2]} Each night the day's scenes are also read for what changed between the people in them.</small>
        <label class="mu-check"><input type="checkbox" data-input="bd-flirt" ${L.flirtOn(G(g)) ? 'checked' : ''}><span>Flirting and romance<small>${L.flirtOn(G(g)) ? 'Feelings between them grow and fade, crushes, confessions, couples, how flirting lands, nights together.' : 'Off: no feelings between them, no new couples, no nights together (yours with your partners stay upstream\'s).'}</small></span></label>
        ${L.flirtOn(G(g)) ? `<label class="mu-check"><input type="checkbox" data-input="wc-poly" ${cfg(g).poly ? 'checked' : ''}><span>Open relationships for you<small>Your partners know about each other and do not mind: you can be with several people at once, no jealousy.</small></span></label>
        <label class="mu-check"><input type="checkbox" data-input="bd-polyhouse" ${cfg(g).polyHouse ? 'checked' : ''}><span>Open relationships in the house<small>Between the housemates: someone with a partner may start seeing someone else too, and nobody calls it cheating. Someone whose profile says "taken" or "married" (outside the house) still is.</small></span></label>` : ''}
        ${L.flirtOn(G(g)) ? `<b>Partners staying the night</b><div class="mu-bd-seg">${NI.STAYS.map(([id, label]) => `<button class="${(NI.nightsOf(g).stay ?? 'sometimes') === id ? 'is-on' : ''}" data-act="bd-stay" data-v="${id}">${label}</button>`).join('')}</div>
        <small class="mu-muted">Couples sleep in one room now and then (yours with you too); a secret one slips out early, and someone up early may see.</small>` : ''}
        <b>The walls</b>
        <div class="mu-bd-seg">${WALLS.map(([id, label]) => `<button class="${wallsOf(g) === id ? 'is-on' : ''}" data-act="bd-walls" data-v="${id}">${label}</button>`).join('')}</div>
        <small class="mu-muted">What is heard through them: a fight, a night together, someone listening at a door (yours too: rarely, a nosy one).</small>
        <b>What the AI reads of today</b>
        <div class="mu-bd-seg">${CTX_MODES.map(([id, label]) => `<button class="${ctxMode(g) === id ? 'is-on' : ''}" data-act="bd-ctx" data-v="${id}">${label}</button>`).join('')}</div>
        <small class="mu-muted">${CTX_MODES.find(x => x[0] === ctxMode(g))[2]}</small>
        <b>How the house talks</b>
        <div class="mu-bd-seg">${MOODS.map(([id, label]) => `<button class="${gossipOf(g).mood === id ? 'is-on' : ''}" data-act="bd-mood" data-v="${id}">${label}</button>`).join('')}</div>
        <div class="mu-bd-seg">${[3, 6, 10].map(n => `<button class="${gossipOf(g).max === n ? 'is-on' : ''}" data-act="bd-gmax" data-v="${n}">${n} at once</button>`).join('')}</div>
        <b>Bigger changes without you</b>
        <div class="mu-bd-seg">${[['rare', 'Rare'], ['normal', 'Every few weeks'], ['often', 'Often']].map(([id, label]) => `<button class="${(b.shifts ?? 'normal') === id ? 'is-on' : ''}" data-act="bd-shifts" data-v="${id}">${label}</button>`).join('')}</div>
        <div class="mu-bd-seg">${[['off', 'No romance'], ['story', 'Romance from the story'], ['grow', 'Romance may grow']].map(([id, label]) => `<button class="${(b.romance ?? 'story') === id ? 'is-on' : ''}" data-act="bd-romance" data-v="${id}">${label}</button>`).join('')}</div>
        <small class="mu-muted">Becoming friends, falling out for good, breaking up${(b.romance ?? 'story') !== 'off' ? ', or starting to see each other' : ''}: only with a reason in what happened lately, checked by the rules (how they get along, partners, orientation). ${(b.romance ?? 'story') === 'story' ? 'Romance only where there was flirting before.' : (b.romance ?? 'story') === 'grow' ? 'Romance may start between two who get along well.' : ''} Off with "Life without you" off.</small>
        <b>Limits</b>
        <div class="mu-bd-seg">${[6, 12, 24].map(n => `<button class="${(b.keep ?? 12) === n ? 'is-on' : ''}" data-act="bd-keep" data-v="${n}">${n} facts a pair</button>`).join('')}</div>
        <div class="mu-bd-seg">${[10, 15, 25].map(n => `<button class="${roomLimit(g) === n ? 'is-on' : ''}" data-act="bd-roomlimit" data-v="${n}">${n} things a room</button>`).join('')}</div>
        <small class="mu-muted">What happened between two people: the oldest go first (what their relationship is stays). A full room takes nothing more until something goes.</small>
        <small class="mu-muted">Who knows something tells the ones they spent the day with, by how juicy it is, how well they keep secrets, how loyal they are to the people it is about and how much they trust the listener. Only the juiciest few go around at once; a promise to keep it nearly stops it. You hear it from the ones close to you.</small>
        <label class="mu-check"><input type="checkbox" data-input="bd-money" ${g.house?.on ? 'checked' : ''}><span>Money in this house</span></label>
        <small class="mu-muted">${g.house?.on ? 'Your wallet and the house fund are in the Money app; groceries cost money, and you can take a job.' : 'Off: things are free, nobody works for money (as in Mundi\'s Home).'}</small>
        ${houseRulesHtml(g)}</section>${eraSettingsHtml(g)}${chatSettingsHtml(g)}${talkSettingsHtml(g) /* 0.2.0.11 */}`;
}
/* ---------- actions ---------- */
const done = () => { saveGame(); refreshPrompt(); notify(); };
const closeForms = () => { BV.edit = ''; BV.draft = ''; BV.adding = false; BV.addText = ''; BV.addWho = []; };
const editing = () => { const g = game(); return g && canEdit(g) ? g : null; };
let redraw = null;
Object.assign(ACT, {
    'bd-sel': (el) => { const k = el.dataset.k ?? ''; BV.sel = BV.sel === k && k.startsWith('p:') ? '' : k; closeForms(); notify(); },
    'bd-life': (el) => { const g = game(); if (!g)
        return; bondsOf(G(g)).life = el.dataset.v || 'calm'; saveGame(); notify(); },
    'bd-edit': (el) => {
        const g = editing();
        if (!g)
            return;
        const f = bondsOf(G(g)).facts.find(x => x.id === el.dataset.id);
        if (!f)
            return;
        closeForms();
        BV.edit = f.id;
        BV.draft = f.text;
        notify();
        setTimeout(() => document.querySelector('#mundi-root [data-focus="bd-draft"]')?.focus(), 0);
    },
    'bd-save': (el) => { const g = editing(); if (!g)
        return; if (editFact(G(g), el.dataset.id, BV.draft)) {
        closeForms();
        done();
    } },
    'bd-cancel': () => { closeForms(); notify(); },
    'bd-pin': (el) => { const g = editing(); if (!g)
        return; pinFact(G(g), el.dataset.id); done(); },
    'bd-del': (el) => { const g = editing(); if (!g)
        return; removeFact(G(g), el.dataset.id); if (BV.edit === el.dataset.id)
        closeForms(); done(); },
    'bd-add': () => { if (!editing())
        return; closeForms(); BV.adding = true; notify(); setTimeout(() => document.querySelector('#mundi-root [data-focus="bd-addtext"]')?.focus(), 0); },
    'bd-addwho': (el) => {
        const a = el.dataset.who;
        const base = BV.sel.startsWith('e:') ? 2 : 1;
        if (BV.addWho.includes(a))
            BV.addWho = BV.addWho.filter(x => x !== a);
        else if (base + BV.addWho.length < 3)
            BV.addWho = [...BV.addWho, a];
        notify();
    },
    'bd-addsave': () => {
        const g = editing();
        if (!g)
            return;
        const base = BV.sel.startsWith('e:') ? BV.sel.slice(2).split('|') : BV.sel.startsWith('p:') ? [BV.sel.slice(2)] : [];
        if (addFact(G(g), [...base, ...BV.addWho], BV.addText, 'standing', 'user')) {
            closeForms();
            done();
        }
    },
});
// [expanded] 0.2.0.8/0.2.0.9: the settings' segment buttons (actions, not inputs)
Object.assign(ACT, {
    'bd-stay': (el) => { const g = game(); if (!g)
        return; NI.nightsOf(g).stay = el.dataset.v || 'sometimes'; saveGame(); notify(); },
    'bd-movein': (el) => { const g = game(); if (!g)
        return; const why = NI.askMoveIn(g, el.dataset.who); toast(why || `${nm(g, el.dataset.who)} is moving into your room.${g.furnishx?.items?.some((x) => x.room === 'home:player' && x.cat === 'doublebed') ? '' : ' A double bed would help (the shop).'}`, why ? 'info' : 'success', { ms: 8000 }); refreshPrompt(); notify(); },
    'bd-moveout': (el) => { const g = game(); if (!g)
        return; NI.moveOut(g, el.dataset.who); toast(`${nm(g, el.dataset.who)} is back in their own room.`, 'info'); refreshPrompt(); notify(); },
    'bd-date': async (el) => {
        const g = game();
        const w = g && getWorld(g.world);
        if (!g || !w || !DV.room)
            return;
        const c = el.dataset.who;
        const d = NI.planDate(g, w, c, DV.room);
        if (typeof d === 'string') {
            toast(d, 'info');
            return;
        }
        const room = (w.places.find(p => p.id === d.room)?.name ?? 'the room').toLowerCase();
        toast(`You asked the house for the ${room} tonight, with ${nm(g, c)}.${d.stay.length ? ` ${d.stay.map(a => nm(g, a)).join(', ')} won't make it easy.` : ''}`, 'success', { ms: 8000 });
        // said in the house chat (the others answer as decided)
        try {
            const C = await import('../sim/chats.js');
            const { write, flushChat } = await import('../sim/chatrun.js');
            const ch = C.chatById(g, C.HOUSE);
            if (ch) {
                flushChat(ch.id);
                C.post(ch, C.ME, `Could I have the ${room} tonight from ${String(Math.floor(d.from / 60)).padStart(2, '0')}:00? 🙏`, nowAbs(g));
                const ans = [...d.away, ...d.stay].filter(a => a !== c).slice(0, 3);
                void write(g, w, ch, ans, `${personaName()} asked the house for the ${room} tonight (a date${(bondsOf(G(g)).hide ?? {})[c] ? ', with someone they do not name' : ` with ${nm(g, c)}`}). Already decided: ${ans.map(a => `${nm(g, a)} — ${d.away.includes(a) ? 'fine, will keep away' : 'will not leave (teases, or has plans there)'}`).join('; ')}. Short replies; light teasing is fine.`, [], true);
            }
        }
        catch (e) {
            console.warn('[Mundi Expanded] date', e);
        }
        saveGame();
        refreshPrompt();
        notify();
    },
    'bd-ctx': (el) => { const g = game(); if (!g)
        return; setCtxMode(g, el.dataset.v || 'shared'); saveGame(); notify(); }, // [expanded] 0.2.1-13
    'bd-walls': (el) => { const g = game(); if (!g)
        return; bondsOf(G(g)).walls = el.dataset.v || 'normal'; saveGame(); notify(); },
    'bd-shifts': (el) => { const g = game(); if (!g)
        return; bondsOf(G(g)).shifts = el.dataset.v || 'normal'; saveGame(); notify(); },
    'bd-romance': (el) => { const g = game(); if (!g)
        return; bondsOf(G(g)).romance = el.dataset.v || 'story'; saveGame(); notify(); },
    'bd-keep': (el) => { const g = game(); if (!g)
        return; bondsOf(G(g)).keep = Number(el.dataset.v) || 12; saveGame(); notify(); },
    'bd-roomlimit': (el) => { const g = game(); if (!g)
        return; g.furnishx = g.furnishx ?? { items: [], seq: 0 }; g.furnishx.limit = Number(el.dataset.v) || 15; saveGame(); notify(); },
    'bd-mood': (el) => { const g = game(); if (!g)
        return; gossipOf(g).mood = el.dataset.v || 'usual'; saveGame(); notify(); },
    'bd-gmax': (el) => { const g = game(); if (!g)
        return; gossipOf(g).max = Number(el.dataset.v) || 6; saveGame(); notify(); },
});
Object.assign(INPUT, {
    'bd-polyhouse': (el) => { const g = game(); if (!g)
        return; cfg(g).polyHouse = el.checked || undefined; saveGame(); notify(); }, // [expanded] 0.2.1-14.3
    'bd-dateroom': (el) => { DV.room = String(el.value); notify(); },
    'bd-draft': (el) => { BV.draft = el.value; },
    'bd-addtext': (el) => { BV.addText = el.value; },
    'bd-money': (el) => { const g = game(); if (!g)
        return; enableMoney(g, !!el.checked); refreshPrompt(); notify(); },
    'bd-mine': (el) => {
        const g = game();
        if (!g)
            return;
        const c = el.dataset.who;
        const x = L.loveOf(G(g));
        const v = el.value;
        if (!v) {
            if (x.mine)
                delete x.mine[c];
        }
        else {
            (x.mine ??= {})[c] = { ...(x.mine[c] ?? { secret: true, day: g.day }), lvl: v };
        }
        saveGame();
        refreshPrompt();
        notify();
    },
    'bd-minesecret': (el) => { const g = game(); if (!g)
        return; const m = L.loveOf(G(g)).mine?.[el.dataset.who]; if (m) {
        m.secret = !!el.checked;
        if (!m.secret)
            delete m.know;
    } saveGame(); refreshPrompt(); notify(); },
    'bd-flirt': (el) => { const g = game(); if (!g)
        return; L.loveOf(G(g)).on = !!el.checked; saveGame(); refreshPrompt(); notify(); },
    'bd-truth': (el) => { const g = game(); if (!g)
        return; bondsOf(G(g)).truth = !!el.checked; saveGame(); notify(); },
    'bd-secret': (el) => {
        const g = game();
        if (!g)
            return;
        const a = el.dataset.a, b = el.dataset.b;
        const on = !!el.checked;
        const c = a === YOU ? b : b === YOU ? a : '';
        if (c && partnersOf(g).includes(c)) {
            const bs = bondsOf(G(g));
            bs.hide ??= {};
            if (on)
                bs.hide[c] ??= { day: g.day };
            else if (bs.hide[c]) { // out in the open: your other partners find out now (unless they knew)
                const k = bs.hide[c].know ?? {};
                delete bs.hide[c];
                for (const o of partnersOf(g))
                    if (o !== c && !k[o]) {
                        const t = foundOut(g, o, c);
                        if (t)
                            toast(t, 'warn', { ms: 9000 });
                    }
            }
        }
        else {
            const t = statusOf(G(g), a, b);
            if (!t)
                return;
            if (on) {
                t.secret = true;
                t.day ??= g.day;
            }
            else {
                delete t.secret;
                delete t.know;
            }
        }
        saveGame();
        refreshPrompt();
        notify();
    },
    'bd-unlock': (el) => { const g = game(); if (!g)
        return; bondsOf(G(g)).edit = !!el.checked; if (!el.checked)
        closeForms(); saveGame(); notify(); },
    'bd-status': (el) => {
        const g = editing();
        if (!g)
            return;
        const a = el.dataset.a, b = el.dataset.b;
        const v = String(el.value);
        if (!v)
            setStatus(G(g), a, b, '');
        else {
            const [dir, type] = v.split(':');
            dir === 'ab' ? setStatus(G(g), a, b, type) : setStatus(G(g), b, a, type);
        }
        done();
    },
    // the slider: the number and word change as it moves; the graph is redrawn once it stops
    'bd-val': (el) => {
        const g = editing();
        if (!g)
            return;
        const [a, b] = (el.dataset.k ?? '').split('|');
        if (!g.cast[a] || !g.cast[b])
            return;
        setValue(G(g), a, b, Number(el.value));
        const v = pairOf(G(g), a, b).v;
        const box = el.closest('.mu-bd-val');
        const word = box?.querySelector('[data-bd-word]');
        if (word)
            word.textContent = wordOf(v);
        const num = box?.querySelector('[data-bd-num]');
        if (num)
            num.textContent = `${v > 0 ? '+' : ''}${v}`;
        el.style.setProperty('--c', COLOR[toneOf(v)]);
        saveGame();
        if (redraw)
            clearTimeout(redraw);
        redraw = setTimeout(() => { redraw = null; refreshPrompt(); notify(); }, 700);
    },
});
