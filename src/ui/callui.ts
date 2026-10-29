// [expanded] The call on screen (rules in sim/calls.ts): an incoming call rings for a while (answer, decline, or it rings
// out into a missed call); on the line, the caller's picture sits in a phone frame and a bar lets you hang up.
import { esc, game, notify, saveGame, toast } from '../core/store.js';
import { thumb } from '../st/bridge.js';
import { icon } from './icons.js';
import { ACT } from './reg.js';
import * as K from '../sim/calls.js';

const RING_MS = 15000;
const CL = { key: '', ends: 0, timer: 0 as any, sound: 0 as any };
function ringSound(on: boolean) {
    clearInterval(CL.sound); if (!on) return;
    const beep = () => (globalThis as any).__muSfx?.('info'); beep(); CL.sound = setInterval(beep, 1600);
    try { navigator.vibrate?.([200, 100, 200]); } catch { /* not a phone */ }
}
async function sync() { saveGame(); const { syncScene } = await import('../sim/game.js'); await syncScene(); const { refreshPrompt } = await import('../sim/prompt.js'); refreshPrompt(); notify(); }
export function callHtml(): string {
    const g = game(); if (!g) return '';
    const x = K.callsOf(g); const k = x.ring; const r = k && g.cast[k.avatar];
    if (!k || !r) { if (CL.key) { CL.key = ''; ringSound(false); } }
    else {
        const key = `${k.avatar}|${k.at}`;
        if (CL.key !== key) { CL.key = key; CL.ends = Date.now() + RING_MS; clearTimeout(CL.timer); ringSound(true); CL.timer = setTimeout(() => { if (CL.key === key) { ringSound(false); K.decline(g, true); toast(`Missed call: ${r.name}.`, 'info'); notify(); } }, RING_MS); }
        const left = Math.max(0, CL.ends - Date.now());
        return `<div class="mu-call is-ringing" role="dialog" aria-label="Incoming call"><img src="${esc(thumb(r.avatar))}" alt=""><span><small>Incoming call</small><b data-notr>${esc(r.name)}</b></span>
            <button class="mu-call-no" data-act="cl-no" aria-label="Decline">${icon('handset')}</button><button class="mu-call-yes" data-act="cl-yes" aria-label="Answer">${icon('handset')}</button>
            <i class="mu-beat-bar mu-call-bar" data-morph-skip style="--t:${left}ms;--p:${(left / RING_MS).toFixed(3)}"></i></div>`;
    }
    const on = x.on; const o = on && g.cast[on.avatar];
    return o ? `<div class="mu-call is-on"><img src="${esc(thumb(o.avatar))}" alt=""><span><small>On a call</small><b data-notr>${esc(o.name)}</b></span><button class="mu-call-no" data-act="cl-hang" aria-label="Hang up" title="Hang up">${icon('handset')}</button></div>` : '';
}
Object.assign(ACT, {
    'cl-yes': async () => { const g = game(); if (!g) return; clearTimeout(CL.timer); ringSound(false); CL.key = ''; K.answer(g); await sync(); },
    'cl-no': () => { const g = game(); if (!g) return; clearTimeout(CL.timer); ringSound(false); CL.key = ''; K.decline(g, false); notify(); },
    'cl-hang': async () => { const g = game(); if (!g) return; K.hangUp(g); toast('Call ended.', 'info'); await sync(); },
});
