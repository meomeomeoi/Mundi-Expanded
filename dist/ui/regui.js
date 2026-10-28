// [expanded] Settings → Game: which model works out the mechanics (see sim/regulator.ts).
import { saveSettings, notify } from '../core/store.js';
import { INPUT } from './reg.js';
import { regCfg, profiles } from '../sim/regulator.js';
export function regulatorSettingsHtml() {
    const c = regCfg();
    const list = profiles();
    const st = c.stats;
    const missing = c.profile && !list.some(p => p.id === c.profile);
    const opt = (v, label, on) => `<option value="${v.replace(/"/g, '&quot;')}" ${on ? 'selected' : ''}>${label.replace(/</g, '&lt;')}</option>`;
    return `<section><h3>Mechanics model <small class="mu-muted">(Mundi Expanded)</small></h3>
        <label class="mu-field"><span>Who works out the mechanics (relationships, the house's things)</span>
            <select data-input="reg-profile">${opt('', 'The main model, only at night', !c.profile)}${list.map(p => opt(p.id, `${p.name}${p.model ? ` — ${p.model}` : ''}`, p.id === c.profile)).join('')}</select></label>
        ${missing ? '<small class="mu-warn">That connection profile is gone: the main model is used, at night only.</small>' : ''}
        ${!list.length ? '<small class="mu-muted">No connection profiles yet. Make one in SillyTavern (API Connections → Connection Profile) with a cheap, fast model, then pick it here.</small>' : ''}
        ${c.profile ? `<label class="mu-field"><span>When</span><select data-input="reg-mode">${opt('message', 'After each message (when you send the next one)', c.mode === 'message')}${opt('night', 'Only at night', c.mode === 'night')}</select></label>` : ''}
        <small class="mu-muted">Short prompts of their own (no chat preset, no chat history). Pick a model without "thinking", or with it set low: hidden reasoning is paid output.${c.profile ? ` Today: ${st.calls} call${st.calls === 1 ? '' : 's'}, about ${st.tin.toLocaleString()} tokens in and ${st.tout.toLocaleString()} out${st.fails ? `, ${st.fails} failed` : ''}.` : ''}</small>
    </section>`;
}
Object.assign(INPUT, {
    'reg-profile': (el) => { regCfg().profile = String(el.value); saveSettings(); notify(); },
    'reg-mode': (el) => { regCfg().mode = String(el.value) || 'message'; saveSettings(); notify(); },
});
