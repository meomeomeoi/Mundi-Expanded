// [expanded] Someone at your door at night (rules in sim/knocks.ts): let them in, talk at the door, or not now.
import { esc, game, notify, saveGame, toast, nowAbs } from '../core/store.js';
import { thumb } from '../st/bridge.js';
import { icon } from './icons.js';
import { ACT } from './reg.js';
import { social, isPartner } from '../sim/social.js';
import { feel } from '../sim/life.js';
import * as P from '../sim/profile.js';
import '../sim/nightknock.js';
const G = (g) => g;
// [expanded] 0.2.0.10: a knock is a moment: you do not see who it is until you ask, and if you do nothing for a
// while, they give up and go (the bar at the bottom)
const KN = { key: '', asked: false, ends: 0, timer: 0 };
const KNOCK_MS = 14000;
export function knockHtml() {
    const g = game();
    if (!g)
        return '';
    const k = P.lifexOf(G(g)).knock;
    const r = k && g.cast[k.avatar];
    if (!k || !r) {
        KN.key = '';
        return '';
    }
    const key = `${k.avatar}|${k.at}`;
    if (KN.key !== key) {
        KN.key = key;
        KN.asked = false;
        KN.ends = Date.now() + KNOCK_MS;
        clearTimeout(KN.timer);
        KN.timer = setTimeout(() => { if (KN.key === key)
            gaveUp(); }, KNOCK_MS);
    }
    const left = Math.max(0, KN.ends - Date.now());
    return `<div class="mu-dlg-veil"></div><div class="mu-panel mu-dlg mu-glassdlg mu-door" role="dialog"><div class="mu-door-faces">${KN.asked ? `<img src="${esc(thumb(r.avatar))}" alt="">` : `<span class="mu-door-who">?</span>`}</div>
        <h3>${icon('home')} A knock at your door</h3>${KN.asked ? `<p>"It's me, <b data-notr>${esc(r.name)}</b>." <span class="mu-muted">(${esc(k.reason.replace(/\{\{user\}\}/g, 'you'))})</span></p>` : k.day ? '<p>Someone knocks at your door.</p>' : '<p>Someone knocks, quietly. It is late.</p>'}
        <div class="mu-row mu-dlg-btns">${KN.asked ? '' : `<button data-act="knock-who">${icon('help')}<span>Who is it?</span></button>`}<button data-act="knock-no">${KN.asked ? 'Not now' : 'Stay quiet'}</button><button data-act="knock-door">${icon('chat')}<span>Talk at the door</span></button><button class="mu-primary" data-act="knock-in">${icon('home')}<span>Let them in</span></button></div>
        <i class="mu-beat-bar mu-knock-bar" data-morph-skip style="--t:${left}ms;--p:${(left / KNOCK_MS).toFixed(3)}"></i></div>`;
}
function gaveUp() {
    const g = game();
    if (!g)
        return;
    const lx = P.lifexOf(G(g));
    const k = lx.knock;
    if (!k)
        return;
    const r = g.cast[k.avatar];
    lx.knock = null;
    KN.key = '';
    toast(r && KN.asked ? `${r.name} waits a moment more, then goes back to their room.` : 'The knocking stops. Footsteps go away.', 'info');
    saveGame();
    notify();
}
async function sync() { saveGame(); const { syncScene } = await import('../sim/game.js'); await syncScene(); const { refreshPrompt } = await import('../sim/prompt.js'); refreshPrompt(); notify(); }
function open(door) {
    const g = game();
    if (!g)
        return;
    const lx = P.lifexOf(G(g));
    const k = lx.knock;
    if (!k || !g.cast[k.avatar])
        return;
    const now = nowAbs(g), until = now + (door ? 30 : 120);
    const s = social(g);
    const c = s.with.find(x => x.avatar === k.avatar);
    if (c)
        c.until = Math.max(c.until, until);
    else
        s.with.push({ avatar: k.avatar, until });
    lx.visit = { avatar: k.avatar, reason: k.reason, until, door, ...(k.day ? { day: true } : {}) };
    lx.knock = null;
    KN.key = '';
    clearTimeout(KN.timer);
    sync();
}
Object.assign(ACT, {
    'knock-who': () => { KN.asked = true; KN.ends = Math.max(KN.ends, Date.now() + 8000); clearTimeout(KN.timer); const key = KN.key; KN.timer = setTimeout(() => { if (KN.key === key)
        gaveUp(); }, KN.ends - Date.now()); notify(); },
    'knock-in': () => open(false),
    'knock-door': () => open(true),
    'knock-no': () => {
        const g = game();
        if (!g)
            return;
        const lx = P.lifexOf(G(g));
        const k = lx.knock;
        if (!k)
            return;
        const r = g.cast[k.avatar];
        lx.knock = null;
        KN.key = '';
        clearTimeout(KN.timer);
        // someone who came for you (romance, a partner) is a little hurt to be sent away
        if (r && (isPartner(g, k.avatar) || Number(g.romance?.[k.avatar]?.value ?? 0) >= 40))
            feel(g, k.avatar, 'A little hurt: you sent them away at night', 1);
        toast(r ? `${r.name} goes back to their room.` : 'They go away.', 'info');
        saveGame();
        notify();
    },
});
