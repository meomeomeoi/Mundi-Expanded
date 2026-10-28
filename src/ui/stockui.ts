// [expanded] The Storage app (Home): the fridge, the pantry and everyone's room, the errands, and whether food is
// running low. View only by default; with editing on (phone Settings) things can be added, counted, labelled,
// moved and removed. Rules in sim/stock.ts.
import { saveGame, notify, esc, game, type Save } from '../core/store.js';
import type { WorldDef } from '../core/world.js';
import { thumb, personaThumb, personaName } from '../st/bridge.js';
import { icon } from './icons.js';
import { ACT, INPUT } from './reg.js';
import { refreshPrompt } from '../sim/prompt.js';
import { bondsOf } from '../sim/bonds.js';
import * as S from '../sim/stock.js';

const SV = { tab: S.FRIDGE as string, adding: false, name: '', qty: 1 };
const G = (g: Save) => g as unknown as S.GLike;
const canEdit = (g: Save) => bondsOf(g as any).edit === true;
const you = () => personaName();
const pic = (who: string) => (who === S.PLAYER ? personaThumb() : thumb(who));

function itemRow(g: Save, it: S.Item, edit: boolean): string {
    const owner = it.owner ? `<em class="mu-st-owner" data-notr>${esc(S.ownerName(G(g), it.owner, you()))}'s</em>` : '';
    if (!edit) return `<div class="mu-st-item"><span data-notr>${esc(it.name)}</span>${owner}<b>${it.qty > 1 ? `×${it.qty}` : ''}</b></div>`;
    const people = [S.PLAYER, ...Object.keys(g.cast)];
    const opt = (v: string, label: string, on: boolean) => `<option value="${esc(v)}" ${on ? 'selected' : ''}>${esc(label)}</option>`;
    return `<div class="mu-st-item is-edit">
        <span class="mu-st-name" data-notr>${esc(it.name)}</span>
        <div class="mu-st-qty"><button class="mu-ibtn mu-ghost" data-act="st-qty" data-id="${esc(it.id)}" data-d="-1" aria-label="One less">−</button><b>${it.qty}</b><button class="mu-ibtn mu-ghost" data-act="st-qty" data-id="${esc(it.id)}" data-d="1" aria-label="One more">+</button></div>
        <button class="mu-ibtn mu-ghost mu-st-del" data-act="st-del" data-id="${esc(it.id)}" aria-label="Remove" title="Remove">${icon('trash')}</button>
        <select class="mu-st-own" data-input="st-owner" data-id="${esc(it.id)}" aria-label="Whose">${opt('', 'Anyone\'s', !it.owner)}${people.map(p => opt(p, `${S.ownerName(G(g), p, you())}'s`, it.owner === p)).join('')}</select>
        <select class="mu-st-mv" data-input="st-move" data-id="${esc(it.id)}" aria-label="Move to">${opt('', 'Move to…', true)}${S.storesOf(G(g)).filter(s => s !== it.store).map(s => opt(s, S.storeName(G(g), s, you()), false)).join('')}</select></div>`;
}

function addForm(g: Save, store: string): string {
    if (!canEdit(g)) return '';
    const cat = store === S.FRIDGE || store === S.PANTRY ? S.CATALOG.filter(c => c.store === store && c.id !== 'leftovers') : [];
    return `<div class="mu-st-add">
        ${cat.length ? `<div class="mu-chips">${cat.map(c => `<button class="mu-chip" data-act="st-quick" data-name="${esc(c.name)}" title="Add one">+ ${esc(c.name)}</button>`).join('')}</div>` : ''}
        <div class="mu-bd-row"><input type="text" maxlength="60" placeholder="Something else…" data-input="st-name" data-focus="st-name" value="${esc(SV.name)}" aria-label="Thing">
            <input type="number" min="1" max="99" value="${SV.qty}" data-input="st-qtyin" aria-label="How many" class="mu-st-n"><button data-act="st-add">${icon('plus')}<span>Add</span></button></div>
        ${store === S.FRIDGE || store === S.PANTRY ? `<button class="mu-ghost" data-act="st-restock">${icon('undo')}<span>Restock the staples</span></button>` : ''}</div>`;
}

function errands(g: Save): string {
    const list = S.stockOf(G(g)).errands; if (!list.length) return '';
    return `<section class="mu-bd-panel"><b>Errands</b>${list.map(e => `<div class="mu-st-item"><span data-notr>${esc(S.ownerName(G(g), e.by, you()))} → ${esc(e.item)} for ${esc(S.ownerName(G(g), e.forWho, you()))}</span><small class="mu-muted">day ${e.day}</small>
        ${canEdit(g) ? `<button class="mu-ibtn mu-ghost" data-act="st-errdel" data-id="${esc(e.id)}" aria-label="Drop" title="Drop">${icon('x')}</button>` : ''}</div>`).join('')}</section>`;
}

export function stockApp(g: Save, w: WorldDef, header: string): string {
    void w;
    S.seed(G(g));
    const edit = canEdit(g);
    const stores = S.storesOf(G(g));
    if (!stores.includes(SV.tab) && SV.tab !== 'rooms') SV.tab = S.FRIDGE;
    const lvl = S.foodLevel(G(g));
    const count = (s: string) => S.itemsIn(G(g), s).reduce((a, i) => a + i.qty, 0);
    const tabs = `<div class="mu-bd-seg mu-st-tabs">${[[S.FRIDGE, 'Fridge'], [S.PANTRY, 'Pantry'], ['rooms', 'Rooms']].map(([id, l]) => `<button class="${SV.tab === id || (id === 'rooms' && S.isRoom(SV.tab)) ? 'is-on' : ''}" data-act="st-tab" data-v="${id}">${l}${id !== 'rooms' ? ` <small>${count(id)}</small>` : ''}</button>`).join('')}</div>`;
    let body = '';
    if (SV.tab === 'rooms') {
        body = `<div class="mu-ph-list">${stores.filter(S.isRoom).map(s => `<button class="mu-ph-row" data-act="st-tab" data-v="${esc(s)}"><img src="${esc(pic(S.roomWho(s)))}" alt="">
            <span><b data-notr>${esc(S.storeName(G(g), s, you()))}</b><small>${S.itemsIn(G(g), s).length ? `${S.itemsIn(G(g), s).length} things` : 'nothing written down'}</small></span></button>`).join('')}</div>`;
    } else {
        const items = S.itemsIn(G(g), SV.tab).sort((a, b) => S.KINDS.indexOf(a.kind) - S.KINDS.indexOf(b.kind) || a.name.localeCompare(b.name));
        body = `${S.isRoom(SV.tab) ? `<div class="mu-bd-title"><b data-notr>${esc(S.storeName(G(g), SV.tab, you()))}</b><button class="mu-ibtn mu-ghost" data-act="st-tab" data-v="rooms" aria-label="Back">${icon('back')}</button></div>` : ''}
            <div class="mu-st-list">${items.map(it => itemRow(g, it, edit)).join('') || `<p class="mu-muted">${S.isRoom(SV.tab) ? 'Nothing written down here yet. Things given to them, or bought for their room, show up here.' : 'Empty.'}</p>`}</div>
            ${addForm(g, SV.tab)}`;
    }
    return `${header}<div class="mu-ph-body mu-st">
        ${lvl !== 'ok' ? `<p class="mu-st-low ${lvl === 'empty' ? 'is-empty' : ''}">${icon('utensils')}<span>${lvl === 'empty' ? 'The house is out of food. Someone has to go shopping.' : 'Food is running low.'}</span></p>` : ''}
        ${tabs}<section class="mu-bd-panel">${body}</section>${errands(g)}
        ${!edit ? '<p class="mu-muted mu-bd-hint">View only (editing can be turned on in the phone\'s Settings).</p>' : ''}</div>`;
}

/* ---------- actions ---------- */

const done = () => { saveGame(); refreshPrompt(); notify(); };
const editing = () => { const g = game(); return g && canEdit(g) ? g : null; };
const itemOf = (g: Save, id?: string) => S.stockOf(G(g)).items.find(i => i.id === id) ?? null;
Object.assign(ACT, {
    'st-tab': (el) => { SV.tab = el.dataset.v || S.FRIDGE; SV.adding = false; notify(); },
    'st-qty': (el) => { const g = editing(); if (!g) return; const it = itemOf(g, el.dataset.id); if (!it) return; const d = Number(el.dataset.d);
        if (d < 0) S.useItem(G(g), it, 1); else it.qty += 1; done(); },
    'st-del': (el) => { const g = editing(); if (!g) return; S.removeItem(G(g), el.dataset.id!); done(); },
    'st-quick': (el) => { const g = editing(); if (!g || S.isRoom(SV.tab) || SV.tab === 'rooms') return; S.addItem(G(g), SV.tab, el.dataset.name!, 1); done(); },
    'st-add': () => { const g = editing(); if (!g || SV.tab === 'rooms') return; const owner = S.isRoom(SV.tab) ? S.roomWho(SV.tab) : undefined;
        if (S.addItem(G(g), SV.tab, SV.name, SV.qty, owner)) { SV.name = ''; SV.qty = 1; done(); } },
    'st-restock': () => { const g = editing(); if (!g) return; S.restock(G(g)); done(); },
    'st-errdel': (el) => { const g = editing(); if (!g) return; S.closeErrand(G(g), el.dataset.id!); done(); },
});
Object.assign(INPUT, {
    'st-name': (el) => { SV.name = el.value; },
    'st-qtyin': (el) => { SV.qty = Math.max(1, Math.min(99, Math.round(Number(el.value) || 1))); },
    'st-owner': (el) => { const g = editing(); if (!g) return; const it = itemOf(g, el.dataset.id); if (!it) return;
        const o = String(el.value); if (o) it.owner = o; else delete it.owner;
        // the same thing, same owner, already there: merge
        const twin = S.stockOf(G(g)).items.find(x => x !== it && x.store === it.store && x.name.toLowerCase() === it.name.toLowerCase() && (x.owner ?? '') === (it.owner ?? ''));
        if (twin) { twin.qty += it.qty; S.removeItem(G(g), it.id); }
        done(); },
    'st-move': (el) => { const g = editing(); if (!g) return; const it = itemOf(g, el.dataset.id); const to = String(el.value); if (!it || !to) return;
        S.moveItem(G(g), it, to, it.qty); done(); },
});
