// Click a character's sprite: a radial menu around them. On the right, what you can do with them (the same as their
// card in "Here", except "Play as them"); on the left, the outfits they have (subfolders of their Expressions folder),
// shown only when they have any.
import { esc, game, notify, state, toast } from '../core/store.js';
import { isScenario, getWorld } from '../core/world.js';
import { ACT } from './reg.js';
import { icon } from './icons.js';
import { isWith, bondOf, isPartner, social } from '../sim/social.js';
import { ALONG_BOND } from '../sim/plans.js';
import { featureOn } from '../sim/creator.js';
import { stayButton } from './events.js';
import { romanceButtons } from './relui.js';
import { outfitOf, wearOutfit, charOf } from '../st/bridge.js';
import { outfitsOf, outfitLabel } from './outfits.js';
import { guestButtons } from './guestsui.js';
export const RAD = { who: '', cy: 0, r: 0, at: '', side: 'full' }; // [expanded] cy, r: the ring's centre (px from the sprite's top) and radius, measured once open
const btn = (act, who, ic, label, extra = '') => `<button data-act="${esc(act)}" data-who="${esc(who)}" ${extra}>${icon(ic)}<span>${esc(label)}</span></button>`;
// The buttons of an HTML snippet (romance, stay), so they sit on the arc like the others.
const buttonsIn = (html) => html.match(/<button[\s\S]*?<\/button>/g) ?? [];
function actions(g, w, r) {
    if (!featureOn(w, 'plans'))
        return [];
    const b = bondOf(g, r.avatar), along = isWith(g, r.avatar), solo = String(social(g).solo ?? '') === r.avatar;
    const out = [];
    if (!r.met)
        out.push(btn('pc-intro', r.avatar, 'chat', 'Introduce yourself'));
    out.push(along ? btn('pc-bye', r.avatar, 'back', 'Say goodbye')
        : btn('pc-along', r.avatar, 'users', 'Come with me', b >= ALONG_BOND || isPartner(g, r.avatar) ? '' : `aria-disabled="true" title="Get closer first (${b}/${ALONG_BOND})"`));
    out.push(btn('pc-plan', r.avatar, 'pin', 'Make plans'));
    out.push(solo ? `<button data-act="solo-off">${icon('users')}<span>Talk with everyone</span></button>` : btn('solo-on', r.avatar, 'chat', 'Talk only with them'));
    out.push(...buttonsIn(stayButton(r.avatar)), ...guestButtons(g, r.avatar), ...buttonsIn(romanceButtons(r.avatar)));
    if (isScenario(w))
        out.push(btn('rd-watch', r.avatar, 'eye', 'Keep an eye on them')); // [expanded] 0.2.0.9
    out.push(btn('pc-open', r.avatar, 'user', 'Their card'));
    return out;
}
function outfits(avatar) {
    const list = outfitsOf(avatar);
    if (!list?.length)
        return [];
    const cur = outfitOf(avatar);
    return [`<button data-act="spr-outfit" data-who="${esc(avatar)}" data-o="" class="${cur ? '' : 'is-on'}">👕<span>Default</span></button>`,
        ...list.map(o => `<button data-act="spr-outfit" data-who="${esc(avatar)}" data-o="${esc(o)}" class="${cur.toLowerCase() === o.toLowerCase() ? 'is-on' : ''}">👗<span>${esc(outfitLabel(o))}</span></button>`)];
}
// All the way round, from the top.
function ring(n, r) {
    return Array.from({ length: n }, (_, k) => {
        const a = ((-90 + (360 / n) * k) * Math.PI) / 180, x = Math.cos(a) * r, y = Math.sin(a) * r;
        return { x, y, side: Math.abs(x) < r * 0.25 ? 'c' : x > 0 ? 'r' : 'l' };
    });
}
// A half on one side: rows a fixed step apart (they never overlap), bent into an arc.
const STEP = 40;
function half(n, r, side) {
    const R = Math.max(r, ((n - 1) * STEP) / 2 + 30);
    return Array.from({ length: n }, (_, k) => {
        const y = (k - (n - 1) / 2) * STEP, x = Math.sqrt(Math.max(0, R * R - y * y)) * 0.8 + 24;
        return { x: side === 'r' ? x : -x, y, side };
    });
}
export const ringRadius = (n) => (n <= 4 ? 115 : n <= 6 ? 135 : 150);
// How far a menu reaches up and down from its centre.
const reach = (n, full, r) => (full ? r : ((n - 1) * STEP) / 2) + 20;
const place = (items, pos, k0 = 0) => items.map((h, i) => h.replace('<button', `<button style="--x:${pos[i].x.toFixed(0)}px;--y:${pos[i].y.toFixed(0)}px;--k:${i + k0}" data-rad="${pos[i].side}"`)).join('');
// The menu for one sprite (empty when closed). `r` is null for someone who is not one of the world's people (a scenario's card).
export function radialHtml(avatar, r) {
    if (RAD.who !== avatar)
        return '';
    const g = game();
    const w = g && getWorld(g.world);
    if (!g || !w)
        return '';
    const right = r ? actions(g, w, r) : [], left = outfits(avatar);
    if (!right.length && !left.length)
        return '';
    const R = RAD.r || ringRadius(right.length);
    let html;
    if (!left.length && RAD.side === 'full')
        html = place(right, ring(right.length, R));
    else {
        // the actions on the roomier side (right unless measured otherwise), the outfits on the other
        const a = RAD.side === 'l' ? 'l' : 'r', b = a === 'r' ? 'l' : 'r';
        html = place(right, half(right.length, R, a)) + (left.length ? place(left, half(left.length, R, b), right.length) : '');
    }
    const measured = RAD.at === avatar;
    if (!measured)
        setTimeout(() => measure(avatar, R, right.length, left.length), 30);
    return `<div class="mu-radial ${measured ? '' : 'is-measuring'}" role="menu" style="--cy:${measured ? `${RAD.cy}px` : '28%'}" aria-label="${esc(r?.name ?? String(charOf(avatar)?.name ?? ''))}">${html}</div>`;
}
// Once open: the centre goes on the face, high enough that the ring stays above the text box and below the top.
function measure(avatar, R, nRight, nLeft) {
    if (RAD.who !== avatar)
        return;
    const fig = document.querySelector('#mundi-root .mu-sprite.is-menu');
    const img = fig?.querySelector(':scope > img, :scope > .is-avatar');
    if (!fig || !img) {
        Object.assign(RAD, { at: avatar, cy: 160, side: nLeft ? 'r' : 'full' });
        notify();
        return;
    }
    const f = fig.getBoundingClientRect(), im = img.getBoundingClientRect();
    const box = document.querySelector('#mundi-root .mu-dialog')?.getBoundingClientRect();
    const stage = fig.closest('.mu-sprites')?.getBoundingClientRect() ?? f;
    const top = Math.max(stage.top, 0) + 16, bottom = (box && box.top > top ? box.top : Math.min(stage.bottom, window.innerHeight)) - 16;
    // full ring only with room for labels (about 190 px) on both sides; else the roomier half
    const cx = f.left + f.width / 2, roomL = cx - Math.max(stage.left, 0), roomR = Math.min(stage.right, window.innerWidth) - cx;
    const side = !nLeft && roomL > R + 190 && roomR > R + 190 ? 'full' : roomR >= roomL ? 'r' : 'l';
    let r = R;
    const full = side === 'full';
    if (full && bottom - top < 2 * reach(nRight, true, r))
        r = Math.max(80, (bottom - top) / 2 - 20);
    const up = reach(Math.max(nRight, nLeft), full, r);
    const face = im.top + Math.min(im.height * 0.24, 230); // a sprite's face is near its top
    const cy = Math.min(Math.max(face, top + up), bottom - up);
    Object.assign(RAD, { at: avatar, cy: Math.round(cy - f.top), r: Math.round(r), side });
    notify();
}
window.addEventListener?.('resize', () => { if (RAD.who) {
    RAD.at = '';
    RAD.r = 0;
    RAD.side = 'full';
    notify();
} });
Object.assign(ACT, {
    'spr-menu': (el, e) => {
        if (e?.target?.closest?.('.mu-radial'))
            return;
        const who = el.dataset.who ?? '';
        RAD.who = RAD.who === who ? '' : who;
        RAD.at = '';
        RAD.r = 0;
        RAD.side = 'full';
        notify();
    },
    'rd-watch': async (el) => { const g = game(); if (!g)
        return; const { watch } = await import('../sim/listen.js'); watch(g, el.dataset.who); RAD.who = ''; toast(`You will keep an eye on ${g.cast[el.dataset.who]?.name ?? 'them'} for the next few hours: where they go, and with whom.`, 'info'); notify(); },
    'spr-close': () => { if (RAD.who) {
        RAD.who = '';
        notify();
    } },
    'spr-outfit': async (el) => {
        const who = el.dataset.who;
        const o = el.dataset.o ?? '';
        wearOutfit(who, o);
        delete state.sprites[who]; // the sprites of the new outfit are loaded again
        toast(o ? `${String(charOf(who)?.name ?? '')} is wearing: ${outfitLabel(o)}.` : `${String(charOf(who)?.name ?? '')} is back in the usual outfit.`, 'success');
        RAD.who = '';
        notify();
    },
});
// Any choice in the menu closes it.
document.addEventListener('click', (e) => {
    const t = e.target;
    if (!RAD.who)
        return;
    if (t.closest?.('[data-rad]')) {
        setTimeout(() => { if (RAD.who) {
            RAD.who = '';
            notify();
        } }, 0);
        return;
    }
    if (!t.closest?.('.mu-sprite')) {
        RAD.who = '';
        notify();
    }
}, true);
