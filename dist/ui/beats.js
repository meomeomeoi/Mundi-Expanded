// [expanded] Quick reactions (Mundi Expanded 0.2.0.10): now and then, when the last line puts you on the spot in a
// light way (a tease, a quick question, something sudden, something tossed to you, everyone looking at you), two or
// three short options show over the message box, written for who your persona is. Tap one to use it as the start of
// your line (add to it, or send it as it is); ignore them and write your own. Only when it truly cannot wait, a thin
// bar runs out: then the option is sent at once, and doing nothing is a hesitation the story plays.
// Never for serious moments, never twice in a row: the expressions call decides (sim/exprs.ts), the rules space them out.
import { esc, notify, state, settings, saveSettings } from '../core/store.js';
import { chat, personaName, persona, personas } from '../st/bridge.js';
import { ACT, INPUT } from './reg.js';
import { beatAllowed } from '../sim/exprs.js';
export const beatCfg = () => { const r = (settings().regulator ??= {}); r.beats ??= 'rare'; r.beatTimer ??= true; return r; };
const B = { beat: null, at: -1, users: -999, ends: 0, timer: 0, chatLen: -1 };
const userCount = () => chat().filter((m) => m.is_user && !m.is_system).length;
/** Asked with this turn's expressions: when the rules allow one now. */
export const beatWanted = () => beatAllowed(beatCfg().beats, userCount() - B.users) && !B.beat;
/** Who you are, for the options (your persona's description). */
export const personaText = () => String(personas().find(p => p.file === persona())?.description ?? '').replace(/\{\{user\}\}/g, personaName());
export function showBeat(b) {
    clearBeat(false);
    B.beat = b;
    B.users = userCount();
    B.chatLen = chat().length;
    if (b.timer && beatCfg().beatTimer) {
        const ms = b.kind === 'physical' ? 8000 : 11000;
        B.ends = Date.now() + ms;
        B.timer = setTimeout(() => { if (B.beat === b && chat().length === B.chatLen)
            void send(`*${personaName()} hesitates a moment too long*`); }, ms);
    }
    notify();
}
export function clearBeat(redraw = true) { clearTimeout(B.timer); B.beat = null; B.ends = 0; if (redraw)
    notify(); }
async function send(text) {
    clearBeat(false);
    state.composer = text;
    notify();
    await ACT['send']?.(document.createElement('button'), new Event('click'));
}
/** Over the message box (nothing most of the time). */
export function beatsHtml() {
    const b = B.beat;
    if (!b)
        return '';
    if (chat().length !== B.chatLen) {
        clearBeat(false);
        return '';
    } // the story went on: gone
    const timed = !!B.ends;
    const left = timed ? Math.max(0, B.ends - Date.now()) : 0, total = b.kind === 'physical' ? 8000 : 11000;
    return `<div class="mu-beats ${timed ? 'is-timed' : ''}" role="group" aria-label="Quick reactions">
        ${b.options.map((o, i) => `<button class="mu-beat" data-act="bt-pick" data-i="${i}" data-notr>${esc(o)}</button>`).join('')}
        <button class="mu-ibtn mu-ghost mu-beat-x" data-act="bt-x" aria-label="Dismiss" title="Dismiss">✕</button>
        ${timed ? `<i class="mu-beat-bar" data-morph-skip style="--t:${left}ms;--p:${(left / total).toFixed(3)}"></i>` : ''}</div>`;
}
Object.assign(ACT, {
    'bt-pick': (el) => {
        const b = B.beat;
        if (!b)
            return;
        const o = b.options[Number(el.dataset.i)];
        if (!o)
            return;
        // when it cannot wait, it is said at once; otherwise it starts your line
        if (B.ends) {
            void send(o);
            return;
        }
        clearBeat(false);
        state.composer = state.composer.trim() ? `${o} ${state.composer}` : `${o} `;
        notify();
        setTimeout(() => { const t = document.querySelector('#mundi-root [data-focus="composer"]'); if (t) {
            t.focus();
            t.setSelectionRange(t.value.length, t.value.length);
        } }, 0);
    },
    'bt-x': () => clearBeat(),
    'bt-freq': (el) => { beatCfg().beats = el.dataset.v || 'rare'; saveSettings(); notify(); },
});
Object.assign(INPUT, { 'bt-timer': (el) => { beatCfg().beatTimer = !!el.checked; saveSettings(); notify(); } });
