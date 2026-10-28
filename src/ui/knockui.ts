// [expanded] Someone at your door at night (rules in sim/knocks.ts): let them in, talk at the door, or not now.
import { esc, game, notify, saveGame, toast, nowAbs, type Save } from '../core/store.js';
import { thumb } from '../st/bridge.js';
import { icon } from './icons.js';
import { ACT } from './reg.js';
import { social, isPartner } from '../sim/social.js';
import { feel } from '../sim/life.js';
import * as P from '../sim/profile.js';
import '../sim/nightknock.js';

const G = (g: Save) => g as unknown as P.GLike;
export function knockHtml(): string {
    const g = game(); if (!g) return '';
    const k = P.lifexOf(G(g)).knock; const r = k && g.cast[k.avatar]; if (!k || !r) return '';
    return `<div class="mu-dlg-veil"></div><div class="mu-panel mu-dlg mu-glassdlg mu-door" role="dialog"><div class="mu-door-faces"><img src="${esc(thumb(r.avatar))}" alt=""></div>
        <h3>${icon('home')} A knock at your door</h3><p><b data-notr>${esc(r.name)}</b> is at your door, late. <span class="mu-muted">(${esc(k.reason.replace(/\{\{user\}\}/g, 'you'))})</span></p>
        <div class="mu-row mu-dlg-btns"><button data-act="knock-no">Not now</button><button data-act="knock-door">${icon('chat')}<span>Talk at the door</span></button><button class="mu-primary" data-act="knock-in">${icon('home')}<span>Let them in</span></button></div></div>`;
}
async function sync() { saveGame(); const { syncScene } = await import('../sim/game.js'); await syncScene(); const { refreshPrompt } = await import('../sim/prompt.js'); refreshPrompt(); notify(); }
function open(door: boolean) {
    const g = game(); if (!g) return; const lx = P.lifexOf(G(g)); const k = lx.knock; if (!k || !g.cast[k.avatar]) return;
    const now = nowAbs(g), until = now + (door ? 30 : 120);
    const s = social(g); const c = s.with.find(x => x.avatar === k.avatar); if (c) c.until = Math.max(c.until, until); else s.with.push({ avatar: k.avatar, until });
    lx.visit = { avatar: k.avatar, reason: k.reason, until, door }; lx.knock = null;
    sync();
}
Object.assign(ACT, {
    'knock-in': () => open(false),
    'knock-door': () => open(true),
    'knock-no': () => {
        const g = game(); if (!g) return; const lx = P.lifexOf(G(g)); const k = lx.knock; if (!k) return;
        const r = g.cast[k.avatar]; lx.knock = null;
        // someone who came for you (romance, a partner) is a little hurt to be sent away
        if (r && (isPartner(g, k.avatar) || Number((g as any).romance?.[k.avatar]?.value ?? 0) >= 40)) feel(g, k.avatar, 'A little hurt: you sent them away at night', 1);
        toast(r ? `${r.name} goes back to their room.` : 'They go away.', 'info'); saveGame(); notify();
    },
});
