// Home settings (This Home › Home, in a Home game): the clock per message, whether the housemates go out, and
// for each one a job in your own words with its shift.
import { notify, saveGame, cfg, game } from '../core/store.js';
import { getWorld, isScenario } from '../core/world.js';
import { perMessage, npcOut, msgMinutes, MSG_MINUTES } from '../sim/hometime.js';
import { refreshPrompt } from '../sim/prompt.js';
import { ACT, INPUT } from './reg.js';
Object.assign(ACT, { 'home-min': (el) => { const g = game(); if (!g)
        return; cfg(g).msgMinutes = Number(el.dataset.v) || 5; saveGame(); refreshPrompt(); notify(); } });
export function homeSettingsHtml(g) {
    const w = getWorld(g.world);
    if (!w || !isScenario(w))
        return '';
    // [expanded] 0.2.1-14.3: the minutes per message are a choice; the jobs and shifts moved into each one's profile
    // (People → their Day and habits: what they do, and when they are out of the house)
    const m = msgMinutes(g);
    return `<h4>Home</h4>
        <label class="mu-check"><input type="checkbox" data-input="home-permsg" ${perMessage(g) ? 'checked' : ''}><span>Time passes with each message<small>Off: time only moves with "Let time pass", sleeping and what you do.</small></span></label>
        ${perMessage(g) ? `<div class="mu-bd-seg">${MSG_MINUTES.map(n => `<button class="${n === m ? 'is-on' : ''}" data-act="home-min" data-v="${n}">${n} min</button>`).join('')}</div>
        <small class="mu-muted">Each message you send is ${m} minutes.</small>` : ''}
        <label class="mu-check"><input type="checkbox" data-input="home-out" ${npcOut(g) ? 'checked' : ''}><span>The housemates leave the house<small>When their profile says they are out (classes, work, nights out: People → their Day and habits). Off: everyone stays in.</small></span></label>`;
}
const job = (g, who) => { const r = g.cast[who]; return r ? (r.homeJob ??= {}) : null; };
const done = (g) => { saveGame(); refreshPrompt(); notify(); };
Object.assign(INPUT, {
    'home-permsg': (el) => { const g = game(); if (!g)
        return; cfg(g).perMessage = el.checked; done(g); },
    'home-out': (el) => { const g = game(); if (!g)
        return; cfg(g).npcOut = el.checked; done(g); },
    'home-job': (el) => { const g = game(); const j = g && job(g, el.dataset.who); if (!g || !j)
        return; j.name = el.value.trim(); saveGame(); refreshPrompt(); },
    'home-shift': (el) => { const g = game(); const j = g && job(g, el.dataset.who); if (!g || !j)
        return; j.shift = el.value; done(g); },
    'home-days': (el) => { const g = game(); const j = g && job(g, el.dataset.who); if (!g || !j)
        return; j.days = el.value; done(g); },
});
