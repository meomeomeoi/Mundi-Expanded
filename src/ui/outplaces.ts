// [expanded] Go out's places (rules in sim/outplaces.ts): your places and the starters as picture chips above
// "Where are you going?". Picking one fills in where and the background. Upstream's "Go" and "Use it" (a new
// background while out) are wrapped to remember the place and its picture.
import { esc, game, notify, saveGame } from '../core/store.js';
import { getWorld, worldFile, worldLocked, isScenario } from '../core/world.js';
import type { Save } from '../core/store.js';
import { icon } from './icons.js';
import { ACT } from './reg.js';
import { bgHref } from './bgpick.js';
import { outingOf } from '../sim/outing.js';
import * as O from '../sim/outplaces.js';
import { OD } from './outing.js';

const G = (g: Save) => g as unknown as O.GLike;
// A starter's picture: from Mundi's modern world (when it is there and not locked).
export const starterBg = (file: string) => {
    const w = getWorld('modern'); if (!w || worldLocked(w)) return '';
    try { return new URL(worldFile(w, file), location.href).pathname; } catch { return ''; }
};
export const OP = { edit: false };
// A starter's own picture is not stored (its address depends on where the extension is installed): found again.
const own = (place: string, bg = '') => (bg && bg === O.starterBgOf(place, starterBg) ? '' : bg);

/** Above "Where are you going?". */
export function outPlacesHtml(): string {
    const g = game(); const w = g && getWorld(g.world); if (!g || !w || !isScenario(w)) return '';
    const list = O.shownPlaces(G(g), starterBg);
    if (!list.length) return '';
    const on = (n: string) => O.norm(n) === O.norm(OD.place);
    return `<div class="mu-field mu-op"><span>Places <button class="mu-linkbtn" data-act="op-edit">${OP.edit ? 'Done' : 'Edit'}</button></span>
        <div class="mu-op-list">${list.map(p => `<span class="mu-op-item ${on(p.name) ? 'is-on' : ''}"><button class="mu-op-pick" data-act="op-pick" data-name="${esc(p.name)}" data-bg="${esc(p.bg)}" title="${esc(p.name)}">${p.bg ? `<img src="${esc(bgHref(p.bg))}" alt="" loading="lazy">` : `<i>${icon('map')}</i>`}<span data-notr>${esc(p.name)}</span></button>${OP.edit ? `<button class="mu-op-x" data-act="op-forget" data-name="${esc(p.name)}" aria-label="${p.saved ? 'Forget' : 'Hide'} ${esc(p.name)}">${icon('x')}</button>` : ''}</span>`).join('')}</div></div>`;
}

Object.assign(ACT, {
    'op-pick': (el) => {
        OD.place = el.dataset.name ?? ''; if (el.dataset.bg) OD.bg = el.dataset.bg;
        OD.miss = false; notify();
    },
    'op-edit': () => { OP.edit = !OP.edit; notify(); },
    'op-forget': (el) => { const g = game(); if (!g) return; O.forgetPlace(G(g), el.dataset.name ?? ''); saveGame(); notify(); },
});

// Upstream's buttons, wrapped once every module has loaded (outing.ts registers them after this file).
function wrap(id: string, before: (g: Save) => unknown, after: (g: Save, b: any) => void) {
    const orig = ACT[id]; if (!orig || (orig as any).__op) return;
    const fn = async (el: HTMLElement, e: Event) => {
        const g = game(); if (!g || !isScenario(getWorld(g.world))) return orig(el, e);
        const b = before(g);
        await orig(el, e);
        after(g, b); saveGame();
    };
    (fn as any).__op = true; ACT[id] = fn as any;
}
setTimeout(() => {
    // going out with no picture picked: the place's own (yours, or a starter's)
    wrap('out-go', (g) => { const place = OD.place.trim(); if (place && !OD.bg) OD.bg = O.bgFor(G(g), place, starterBg); return place; },
        (g, place: string) => { const o = outingOf(g); if (place && o) O.rememberPlace(G(g), place, own(place, o.bg)); });
    wrap('out-bg-save', () => null, (g) => { const o = outingOf(g); if (o?.place) O.rememberPlace(G(g), o.place, own(o.place, o.bg), false); });
}, 0);
