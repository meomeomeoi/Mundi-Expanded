// [expanded] Mundi Expanded 0.2.1-15.4: "Redo the night", in the phone's Settings (Home): read the last night again, one
// part at a time (memory, what they learned, the housemates' moments, secrets). Rules in sim/redonight.ts.
import { esc, game, notify, toast, type Save } from '../core/store.js';
import { getWorld, isScenario } from '../core/world.js';
import { ACT } from './reg.js';
import { icon } from './icons.js';
import { refreshPrompt } from '../sim/prompt.js';
import { REDO, nightRec, redoNight, type RedoKind } from '../sim/redonight.js';

const RN = { busy: '' as RedoKind | '' };
export function redoNightHtml(): string {
    const g = game(); const w = g && getWorld(g.world);
    if (!g || !w || !isScenario(w)) return '';
    const rec = nightRec(g);
    return `<section class="mu-bd-set mu-rn"><h4>Redo the night</h4>
        <small class="mu-muted">${rec ? `The last night was day ${rec.day}. If the night read it badly (nothing came out, the model refused, something that mattered was missed), read one part again. What that part wrote is taken back first, so nothing counts twice; if the model gives no answer, it stays as it was.` : 'Kept from the next time you sleep into a new day.'}</small>
        ${rec ? REDO.map(([id, label, desc]) => `<button class="mu-ghost mu-rn-btn" data-act="rn-redo" data-v="${id}" ${RN.busy ? 'disabled' : ''}>${icon('redo')}<span><b>${RN.busy === id ? 'Reading…' : esc(label)}</b><small>${esc(desc)}</small></span></button>`).join('') : ''}</section>`;
}
Object.assign(ACT, {
    'rn-redo': async (el) => {
        const g = game() as Save | null; const w = g && getWorld(g.world); if (!g || !w || RN.busy) return;
        const kind = el.dataset.v as RedoKind; RN.busy = kind; notify();
        try { toast(await redoNight(g, w, kind), 'success', { ms: 7000 }); refreshPrompt(); }
        catch (e: any) { toast(`Could not read it again (${String(e?.message ?? e).slice(0, 140)}). It stays as it was.`, 'warn', { ms: 8000 }); }
        RN.busy = ''; notify();
    },
});
