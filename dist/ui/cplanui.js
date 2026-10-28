// [expanded] The characters' own plans in the Calendar app (rules in sim/cplans.ts): their invitations to you
// (join or not) and what the house is up to today.
import { esc, notify, saveGame, toast, game, nowAbs } from '../core/store.js';
import { getWorld } from '../core/world.js';
import { thumb } from '../st/bridge.js';
import { icon } from './icons.js';
import { ACT } from './reg.js';
import { cplansOf, joinPlan, declinePlan, placeText } from '../sim/cplanrun.js';
import { cactOf } from '../sim/cplans.js';
const hh = (m) => `${String(Math.floor((m % 1440) / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const names = (g, who) => who.map(a => g.cast[a]?.name ?? '?').join(' & ');
export function housePlansHtml(g, w) {
    const now = nowAbs(g);
    const list = cplansOf(g).filter(p => p.state === 'set' && p.to > now);
    const invites = list.filter(p => p.invite && p.asked && !p.you && p.from > now);
    const today = list.filter(p => Math.floor(p.from / 1440) === g.day && !invites.includes(p));
    if (!invites.length && !today.length)
        return '';
    const row = (p, btns) => `<div class="mu-ph-job mu-plan-row"><span class="mu-cp-faces">${p.who.map(a => `<img src="${esc(thumb(a))}" alt="">`).join('')}</span><span>
        <b data-notr>${esc(names(g, p.who))} · ${esc(cactOf(p.act)?.name ?? '')}</b><small>${esc(placeText(g, w, p))} · ${hh(p.from)}–${hh(p.to)}${p.you === 'yes' ? ' · you are going' : ''}</small></span>${btns}</div>`;
    return `${invites.length ? `<section><h4>They ask you along</h4>${invites.map(p => row(p, `<button class="mu-primary" data-act="cp-join" data-id="${esc(p.id)}">${icon('check')}<span>Join</span></button><button class="mu-ghost" data-act="cp-no" data-id="${esc(p.id)}">No thanks</button>`)).join('')}</section>` : ''}
        ${today.length ? `<section><h4>In the house today</h4>${today.map(p => row(p, '')).join('')}</section>` : ''}`;
}
Object.assign(ACT, {
    'cp-join': (el) => {
        const g = game();
        const w = g && getWorld(g.world);
        if (!g || !w)
            return;
        const why = joinPlan(g, w, el.dataset.id ?? '');
        if (why) {
            toast(why, 'info');
            return;
        }
        toast('You are going: be there on time (it is in your plans).', 'success');
        saveGame();
        notify();
    },
    'cp-no': (el) => { const g = game(); if (!g)
        return; declinePlan(g, el.dataset.id ?? ''); saveGame(); notify(); },
});
