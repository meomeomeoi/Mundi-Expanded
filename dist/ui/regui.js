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
        <label class="mu-field"><span>Facial expressions (sprites)</span><select data-input="reg-expr">${opt('st', "SillyTavern's Expressions classifier (its own setting: Local, LLM…)", c.expr === 'st')}${opt('mech', 'The mechanics model: everyone in the scene, one short call per reply', c.expr === 'mech')}${opt('main', 'The main model: the same, with the story model', c.expr === 'main')}</select></label>
        <small class="mu-muted">${c.expr === 'st' ? 'One line at a time: the one who spoke gets a face, the others keep theirs.' : `Speakers and listeners alike (teased, praised, ignored), from each one's sprite labels.${c.expr === 'mech' && !c.profile ? ' No mechanics model is set: the main model is used.' : ''} If the call fails, SillyTavern's classifier is used.`}</small>
        <small class="mu-muted">Short prompts of their own (no chat preset, no chat history). Pick a model without "thinking", or with it set low: hidden reasoning is paid output.${c.profile ? ` Today: ${st.calls} call${st.calls === 1 ? '' : 's'}, about ${st.tin.toLocaleString()} tokens in and ${st.tout.toLocaleString()} out${st.fails ? `, ${st.fails} failed` : ''}.` : ''}</small>
    </section>`;
}
Object.assign(INPUT, {
    'reg-profile': (el) => { regCfg().profile = String(el.value); saveSettings(); notify(); },
    'reg-expr': (el) => { const v = String(el.value); regCfg().expr = v === 'mech' || v === 'main' ? v : 'st'; saveSettings(); notify(); },
    'reg-mode': (el) => { regCfg().mode = String(el.value) || 'message'; saveSettings(); notify(); },
});
