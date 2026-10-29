// [expanded] The house in 3D, in the game (Mundi Expanded, prototype; an extra way to look at the map). A Home with a
// floor plan: walk through it from the first person, or see it as a dollhouse. Everyone is where their day puts them;
// a bedroom with its door shut shows only "someone is inside". Clicking someone, or "Be here", takes you there (the
// usual way: time passes, doors are knocked on).
import { esc, game, notify } from '../core/store.js';
import { getWorld, isScenario } from '../core/world.js';
import { fetchSprites, thumb } from '../st/bridge.js';
import { icon } from './icons.js';
import { ACT } from './reg.js';
import { planTarget, planOn } from '../sim/plan.js';
import { placeOf, playerHomeId } from '../sim/places.js';
import { residents, whereNow, presentAt } from '../sim/people.js';
import { slotAt } from '../sim/lifeday.js';
import { nowAbs } from '../core/store.js';
import * as H from '../sim/house3d.js';
export const H3 = { open: false, room: '', floor: '', mode: 'walk', pick: null };
let view = null;
const SPR = new Map();
const libUrl = () => new URL('../../lib/three.module.min.js', import.meta.url).href;
export const can3d = (w) => !!w && isScenario(w) && planOn(w) && (w.plan?.rooms?.length ?? 0) > 2;
function layout(g, w) {
    const loc = new Map(); // plan room → place
    const info = (id) => {
        const pr = w.plan.rooms.find(r => r.id === id);
        const t = planTarget(g, w, pr);
        if (t)
            loc.set(id, t.loc);
        const p = t ? placeOf(g, w, t.loc) : null;
        const name = !t ? (id.startsWith('spot:') ? 'Empty bedroom' : id) : t.loc === playerHomeId ? 'Your room' : String(p?.name ?? id).replace(/'s home$/, "'s room");
        return { id, name: t && !t.known ? 'A bedroom' : name, kind: H.kindOf(t?.loc ?? id, p?.name ?? '', p?.tags ?? []) };
    };
    const house = H.buildHouse(w.plan.rooms, w.plan.floors, info);
    return { house, loc };
}
const timeOf = (g) => { const h = Math.floor(g.minutes / 60); return h >= 7 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'afternoon' : 'night'; };
async function spriteOf(avatar) {
    if (SPR.has(avatar))
        return SPR.get(avatar);
    const l = await fetchSprites(avatar);
    const hit = l.find((s) => String(s.label).toLowerCase() === 'neutral') ?? l[0];
    const src = hit?.path ? String(hit.path) : thumb(avatar);
    SPR.set(avatar, src);
    return src;
}
async function peopleOf(g, w, loc) {
    const back = new Map([...loc].map(([k, v]) => [v, k]));
    const floorOfRoom = (id) => w.plan.rooms.find(r => r.id === id)?.floor ?? '';
    const closed = [...loc].filter(([, l]) => l.startsWith('home:') && l !== g.player.loc).map(([id]) => id);
    const inside = closed.filter(id => presentAt(g, w, loc.get(id)).length > 0);
    const out = [];
    for (const r of residents(g)) {
        const at = whereNow(g, w, r);
        const id = back.get(at);
        if (!id)
            continue;
        out.push({ id: r.avatar, name: r.met ? r.name : 'Someone', room: id, floor: floorOfRoom(id), img: await spriteOf(r.avatar), asleep: !!slotAt(g, w, r, nowAbs(g))?.asleep, hidden: closed.includes(id) });
    }
    return { people: out, closed, inside };
}
export function house3dHtml() {
    if (!H3.open)
        return '';
    const name = H3.room;
    return `<div class="mu-h3"><div class="mu-h3-stage" data-keep="h3" data-morph-skip></div>
        <div class="mu-h3-top"><b data-notr>${esc(name || '…')}</b><span class="mu-h3-floor" data-notr>${esc(H3.floor)}</span></div>
        <div class="mu-h3-tools"><div class="mu-bd-seg"><button class="${H3.mode === 'walk' ? 'is-on' : ''}" data-act="h3-mode" data-v="walk">${icon('user')}<span>Walk</span></button><button class="${H3.mode === 'overview' ? 'is-on' : ''}" data-act="h3-mode" data-v="overview">${icon('home')}<span>Dollhouse</span></button></div>
            <button class="mu-ibtn mu-ghost" data-act="h3-close" aria-label="Close">${icon('x')}</button></div>
        ${H3.pick ? `<div class="mu-h3-pick"><span data-notr>${esc(H3.pick.name)}</span><button class="mu-primary" data-act="h3-go">${icon('forward')}<span>Go to them</span></button><button class="mu-ghost" data-act="h3-unpick">${icon('x')}</button></div>` : ''}
        <small class="mu-h3-hint">${H3.mode === 'walk' ? 'Drag to look · click the floor to walk there · WASD · click a door or someone' : 'Drag to turn · wheel to zoom · click a room to walk in'}</small></div>`;
}
let ctx = null;
export async function open3d() {
    const g = game();
    const w = g && getWorld(g.world);
    if (!g || !w || !can3d(w))
        return;
    H3.open = true;
    H3.pick = null;
    notify();
    await new Promise(r => setTimeout(r, 30));
    const el = document.querySelector('#mundi-root .mu-h3-stage');
    if (!el)
        return;
    const THREE = await import(/* @vite-ignore */ libUrl());
    const { mountHouse } = await import('./house3dview.js');
    const { house, loc } = layout(g, w);
    ctx = { loc };
    const back = new Map([...loc].map(([k, v]) => [v, k]));
    const start = back.get(g.player.loc) ?? undefined;
    const startFloor = house.floors.find(f => f.rooms.some(r => r.id === start))?.id;
    const ppl = await peopleOf(g, w, loc);
    view?.dispose();
    view = mountHouse(el, THREE, house, {
        floor: startFloor, start, time: timeOf(g), mode: H3.mode, people: ppl.people, closed: ppl.closed, inside: ppl.inside,
        onRoom: (r, f) => { H3.room = r?.name ?? ''; H3.floor = f.name; notify(); },
        onPick: (p) => { H3.pick = { id: p.id, name: p.name }; notify(); },
        onDoor: (r) => { const l = loc.get(r.id); if (l && l !== g.player.loc)
            go(l); },
    });
}
function close3d() { view?.dispose(); view = null; H3.open = false; H3.pick = null; notify(); }
async function go(l) {
    close3d();
    const b = document.createElement('button');
    b.dataset.loc = l;
    await ACT['go']?.(b, new Event('click'));
}
Object.assign(ACT, {
    'h3-open': () => open3d(),
    'h3-close': () => close3d(),
    'h3-mode': (el) => { H3.mode = el.dataset.v === 'overview' ? 'overview' : 'walk'; view?.setMode(H3.mode); notify(); },
    'h3-unpick': () => { H3.pick = null; notify(); },
    'h3-go': () => { const g = game(); const w = g && getWorld(g.world); if (!g || !w || !H3.pick)
        return; const r = g.cast[H3.pick.id]; if (r)
        go(whereNow(g, w, r)); },
});
void ctx;
