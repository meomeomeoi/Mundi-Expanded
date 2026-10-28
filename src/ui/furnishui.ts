// [expanded] The Furniture tab of the Storage app (Home): every room of the house and what stands in it. View only by
// default; with editing on (phone Settings) things can be added from the catalog (those of the era that fit the room),
// decor written in, things moved to another room or given another owner, and removed. Rules in sim/furnish.ts.
import { saveGame, notify, esc, game, type Save } from '../core/store.js';
import { getWorld, type WorldDef } from '../core/world.js';
import { thumb, personaThumb } from '../st/bridge.js';
import { icon } from './icons.js';
import { ACT, INPUT } from './reg.js';
import { refreshPrompt } from '../sim/prompt.js';
import { bondsOf } from '../sim/bonds.js';
import * as F from '../sim/furnish.js';
import { furnishOn, houseRooms, seedCommon, eraOf, ownerName, type HouseRoom } from '../sim/furnishrun.js';

export const FV = { room: '', decor: '' };
const G = (g: Save) => g as unknown as F.GLike;
const canEdit = (g: Save) => bondsOf(g as any).edit === true;
const pic = (r: HouseRoom) => (r.owner === 'player' ? personaThumb() : r.owner ? thumb(r.owner) : '');
const VIA: Partial<Record<F.Via, string>> = { order: 'ordered', shop: 'bought', bought: 'bought', found: 'found', gift: 'a gift', story: 'from the story' };

function thingRow(g: Save, w: WorldDef, x: F.Fixture, edit: boolean, room: HouseRoom): string {
    const own = x.owner !== 'house' && x.owner !== room.owner ? `<em class="mu-st-owner" data-notr>${esc(ownerName(g, x.owner, 'you'))}'s</em>` : '';
    const what = x.decor ? '<small class="mu-muted">decor</small>' : `<small class="mu-muted">${esc(F.affordsOf(x).map(a => F.AFFORDS[a]).join(', '))}${VIA[x.via] ? ` · ${VIA[x.via]}` : ''}</small>`;
    if (!edit) return `<div class="mu-st-item mu-fx-item ${x.decor ? 'is-decor' : ''}"><span data-notr>${esc(x.name)}${own}</span>${what}</div>`;
    const opt = (v: string, label: string, on: boolean) => `<option value="${esc(v)}" ${on ? 'selected' : ''}>${esc(label)}</option>`;
    const owners: [string, string][] = [['house', 'The house\'s'], ['player', 'Yours'], ...Object.keys(g.cast).map(a => [a, `${g.cast[a].name}'s`] as [string, string])];
    return `<div class="mu-st-item is-edit mu-fx-item ${x.decor ? 'is-decor' : ''}">
        <span class="mu-st-name" data-notr>${esc(x.name)}</span>${what}
        <button class="mu-ibtn mu-ghost mu-st-del" data-act="fx-del" data-id="${esc(x.id)}" aria-label="Remove" title="Remove">${icon('trash')}</button>
        <select class="mu-st-own" data-input="fx-owner" data-id="${esc(x.id)}" aria-label="Whose">${owners.map(([v, l]) => opt(v, l, x.owner === v)).join('')}</select>
        <select class="mu-st-mv" data-input="fx-move" data-id="${esc(x.id)}" aria-label="Move to">${opt('', 'Move to…', true)}${houseRooms(g, w).filter(r => r.id !== x.room).map(r => opt(r.id, r.name, false)).join('')}</select></div>`;
}

function addForm(g: Save, room: HouseRoom): string {
    const era = eraOf(g);
    const fits = F.catalogFor(era, room.kind ?? undefined);
    const rest = F.catalogFor(era).filter(c => !fits.includes(c));
    const chip = (c: F.CatFixture) => `<button class="mu-chip" data-act="fx-add" data-cat="${esc(c.id)}" title="${esc(c.affords.map(a => F.AFFORDS[a]).join(', '))}">+ ${esc(F.catName(c, era))}</button>`;
    return `<div class="mu-st-add">
        <div class="mu-chips">${fits.map(chip).join('')}</div>
        ${rest.length ? `<details class="mu-fx-more"><summary>Other things</summary><div class="mu-chips">${rest.map(chip).join('')}</div></details>` : ''}
        <div class="mu-bd-row"><input type="text" maxlength="60" placeholder="Decor: posters of…, plants, photos…" data-input="fx-decor" data-focus="fx-decor" value="${esc(FV.decor)}" aria-label="Decor">
            <button data-act="fx-decor">${icon('plus')}<span>Add</span></button></div></div>`;
}

/** The tab's body (inside the Storage app). */
export function furnitureTab(g: Save, w: WorldDef): string {
    if (!furnishOn(w)) return '<p class="mu-muted">Rooms and their things are for a modern house.</p>';
    seedCommon(g, w);
    const edit = canEdit(g); const rooms = houseRooms(g, w);
    const room = rooms.find(r => r.id === FV.room);
    if (!room) {
        return `<div class="mu-ph-list">${rooms.map(r => { const n = F.fixturesIn(G(g), r.id).length; const p = pic(r);
            return `<button class="mu-ph-row" data-act="fx-room" data-v="${esc(r.id)}">${p ? `<img src="${esc(p)}" alt="">` : `<i class="mu-fx-ic">${icon('home')}</i>`}
                <span><b data-notr>${esc(r.name)}</b><small>${n ? `${n} thing${n === 1 ? '' : 's'}` : 'nothing yet'}</small></span></button>`; }).join('')}</div>`;
    }
    const list = F.fixturesIn(G(g), room.id).sort((a, b) => Number(!!a.decor) - Number(!!b.decor) || a.name.localeCompare(b.name));
    return `<div class="mu-bd-title"><b data-notr>${esc(room.name)}</b><button class="mu-ibtn mu-ghost" data-act="fx-room" data-v="" aria-label="Back">${icon('back')}</button></div>
        <div class="mu-st-list">${list.map(x => thingRow(g, w, x, edit, room)).join('') || '<p class="mu-muted">Nothing here yet.</p>'}</div>
        ${edit ? addForm(g, room) : ''}`;
}

/* ---------- actions ---------- */

const done = () => { saveGame(); refreshPrompt(); notify(); };
const editing = () => { const g = game(); return g && canEdit(g) ? g : null; };
const ownerFor = (g: Save, roomId: string): F.Owner => { const w = getWorld(g.world); const r = w ? houseRooms(g, w).find(x => x.id === roomId) : null; return r?.owner ?? 'house'; };
Object.assign(ACT, {
    'fx-room': (el) => { FV.room = el.dataset.v ?? ''; FV.decor = ''; notify(); },
    'fx-add': (el) => { const g = editing(); if (!g || !FV.room) return; F.addFixture(G(g), { cat: el.dataset.cat!, room: FV.room, owner: ownerFor(g, FV.room), via: 'hand', era: eraOf(g) }); done(); },
    'fx-decor': () => { const g = editing(); if (!g || !FV.room || !FV.decor.trim()) return; if (F.addFixture(G(g), { name: FV.decor, room: FV.room, owner: ownerFor(g, FV.room), via: 'hand' })) { FV.decor = ''; done(); } },
    'fx-del': (el) => { const g = editing(); if (!g) return; F.removeFixture(G(g), el.dataset.id!); done(); },
});
Object.assign(INPUT, {
    'fx-decor': (el) => { FV.decor = el.value; },
    'fx-owner': (el) => { const g = editing(); if (!g) return; const x = F.fixtureById(G(g), el.dataset.id!); if (!x) return; x.owner = String(el.value) || 'house'; done(); },
    'fx-move': (el) => { const g = editing(); if (!g) return; const to = String(el.value); if (!to) return;
        const x = F.fixtureById(G(g), el.dataset.id!); if (!x) return;
        // moved into someone's bedroom from the house: it stays the house's (a lent TV); their own things keep their owner
        F.moveFixture(G(g), x.id, to); done(); },
});
