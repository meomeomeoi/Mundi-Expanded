// [expanded] Your portrait (Mundi Expanded 0.2.0.7): your persona's sprite in the bottom-left corner of the scene, in a
// frame of the house's era (the 2000s: glossy chrome; the 2010s: a flat card; now: no frame, a soft glow; other worlds:
// the same as now). The sprites are your own, in a folder of SillyTavern's sprites like a character's ("<persona>
// (Mundi)"; an outfit is a subfolder, worn by the room's dress code like everyone else's), uploaded here as a .zip or as
// images named by their label. The face: the one you pick (click the portrait), always neutral, or read from the story
// (with the expressions call: Settings → Game, "Facial expressions"). Hidden on phones unless you want it there.
import { esc, game, notify, saveSettings, settings, toast, deviceMode } from '../core/store.js';
import { getWorld } from '../core/world.js';
import { furnishOn, eraOf } from '../sim/furnishrun.js';
import { personaName, persona, spritesIn, uploadSpritesTo } from '../st/bridge.js';
import { EXPR_LABELS } from '../sim/exprs.js';
import { dressAt } from '../sim/dress.js';
import { icon } from './icons.js';
import { ACT, INPUT } from './reg.js';
export const youCfg = () => {
    const s = settings();
    const c = (s.youpic ??= {});
    c.on ??= true;
    c.mode ??= 'manual';
    c.phone ??= false;
    c.fit ??= 'bust';
    c.label ??= 'neutral';
    c.folders ??= {};
    return c;
};
/** The folder of your sprites (for the persona in use). */
export const youFolder = () => { const c = youCfg(); const f = persona(); return (c.folders[f] || `${personaName()} (Mundi)`).replace(/[\\/:*?"<>|]/g, '').trim(); };
const YP = { open: false, busy: false, lists: new Map() };
const listOf = (folder) => {
    if (!YP.lists.has(folder)) {
        YP.lists.set(folder, null);
        void spritesIn(folder).then(l => { YP.lists.set(folder, l); notify(); });
    }
    return YP.lists.get(folder) ?? null;
};
const again = () => YP.lists.clear();
/** What you wear here: the dress code's outfit when you have one (a subfolder with sprites), else your usual sprites. */
function sprites() {
    const base = youFolder();
    const g = game();
    const code = g ? dressAt(g, g.player.loc) : '';
    if (code) {
        const o = listOf(`${base}/${code}`);
        if (o?.length)
            return o;
    }
    return listOf(base) ?? [];
}
/** Your labels (for the expressions call in auto mode): none when you have no sprites. */
export const youLabels = () => sprites().map(x => String(x.label).toLowerCase()).filter(Boolean);
export const youAuto = () => { const c = youCfg(); return c.on && c.mode === 'auto' && (!deviceMode() || c.phone) && youLabels().length > 0; };
const pick = (list, label) => list.find(x => String(x.label).toLowerCase() === label) ?? list.find(x => String(x.label).toLowerCase() === 'neutral') ?? list[0];
// the frame: the house's era (a modern house in Home), else today's look
const eraClass = () => { const g = game(); const w = g && getWorld(g.world); return g && w && furnishOn(w) ? `is-${eraOf(g)}` : 'is-now'; };
/** The portrait (in the scene). `auto`: the face read from the story (null: none yet). */
export function youPicHtml(auto) {
    const c = youCfg();
    if (!c.on || (deviceMode() && !c.phone))
        return '';
    const list = sprites();
    const name = personaName();
    if (!list.length && !YP.open)
        return listOf(youFolder()) === null ? '' : `<button class="mu-yp-empty" data-act="yp-open" title="Your portrait: add your sprites">${icon('user')}</button>`;
    const label = c.mode === 'neutral' ? 'neutral' : c.mode === 'auto' ? (auto ?? 'neutral') : c.label;
    const hit = list.length ? pick(list, label) : null;
    return `<aside class="mu-yp ${eraClass()} ${c.fit === 'full' ? 'is-full' : ''} ${YP.open ? 'is-open' : ''}">
        ${hit ? `<button class="mu-yp-frame" data-act="yp-open" title="${esc(name)}: ${esc(String(hit.label))}"><img src="${esc(String(hit.path))}" alt="" draggable="false"><i class="mu-yp-gloss"></i></button>
        <span class="mu-yp-name" data-notr>${esc(name)}</span>` : ''}
        ${YP.open ? pickerHtml(list, label) : ''}</aside>`;
}
function pickerHtml(list, label) {
    const c = youCfg();
    const have = new Map(list.map(x => [String(x.label).toLowerCase(), String(x.path)]));
    const labels = [...new Set([...EXPR_LABELS.filter(l => have.has(l)), ...have.keys()])];
    const seg = (k, t) => `<button class="${c.mode === k ? 'is-on' : ''}" data-act="yp-mode" data-v="${k}">${t}</button>`;
    return `<div class="mu-yp-pop" role="dialog" aria-label="Your portrait">
        <div class="mu-yp-pophead"><b>Your face</b><button class="mu-ibtn mu-ghost" data-act="yp-close" aria-label="Close">${icon('x')}</button></div>
        <div class="mu-bd-seg">${seg('manual', 'I pick')}${seg('neutral', 'Always neutral')}${seg('auto', 'From the story')}</div>
        <small class="mu-muted">${c.mode === 'auto' ? 'Read with the others\' faces after each turn (Settings → Game, "Facial expressions"; with SillyTavern\'s classifier, from your own line).' : c.mode === 'neutral' ? 'Your neutral sprite, whatever happens.' : 'The one you pick stays until you pick another.'}</small>
        ${labels.length ? `<div class="mu-yp-grid" data-keep="yp-grid">${labels.map(l => `<button class="${l === label ? 'is-on' : ''}" data-act="yp-label" data-v="${esc(l)}" title="${esc(l)}" ${c.mode !== 'manual' ? 'aria-disabled="true"' : ''}><img src="${esc(have.get(l))}" alt="" loading="lazy"><span>${esc(l)}</span></button>`).join('')}</div>`
        : `<p class="mu-muted">No sprites yet in "${esc(youFolder())}". Add a .zip of them, or images named by their label (joy.png, sadness.png…): the same labels as a character's Expressions.</p>`}
        <div class="mu-row mu-yp-tools">
            <label class="mu-file mu-ghost">${icon('upload')}<span>${YP.busy ? 'Uploading…' : 'Add sprites (.zip or images)'}</span><input type="file" accept=".zip,image/*" multiple hidden data-input="yp-up" ${YP.busy ? 'disabled' : ''}></label>
            <button class="mu-ghost" data-act="yp-fit">${c.fit === 'full' ? 'Show the face' : 'Show it whole'}</button>
            <button class="mu-ghost" data-act="yp-hide">Hide the portrait</button>
        </div>
        <label class="mu-field"><span>Folder (SillyTavern's sprites, for ${esc(personaName())})</span><input type="text" value="${esc(youFolder())}" data-input="yp-folder"></label>
        <label class="mu-check"><input type="checkbox" data-input="yp-phone" ${c.phone ? 'checked' : ''}><span>Show it on phones too</span></label></div>`;
}
/** Settings → Display: bring the portrait back. */
export function youSettingsHtml() {
    const c = youCfg();
    return `<label class="mu-check"><input type="checkbox" data-input="yp-on" ${c.on ? 'checked' : ''}><span>Your portrait in the scene <small class="mu-muted">(Mundi Expanded: your persona's sprites, bottom left; click it for your face, outfits and uploads)</small></span></label>`;
}
Object.assign(ACT, {
    'yp-open': () => { YP.open = !YP.open; notify(); },
    'yp-close': () => { YP.open = false; notify(); },
    'yp-mode': (el) => { youCfg().mode = el.dataset.v || 'manual'; saveSettings(); notify(); },
    'yp-label': (el) => { if (el.getAttribute('aria-disabled'))
        return; youCfg().label = el.dataset.v || 'neutral'; saveSettings(); notify(); },
    'yp-fit': () => { const c = youCfg(); c.fit = c.fit === 'full' ? 'bust' : 'full'; saveSettings(); notify(); },
    'yp-hide': () => { youCfg().on = false; YP.open = false; saveSettings(); toast('Portrait hidden. Settings → Display brings it back.', 'info'); notify(); },
});
Object.assign(INPUT, {
    'yp-on': (el) => { youCfg().on = !!el.checked; saveSettings(); notify(); },
    'yp-phone': (el) => { youCfg().phone = !!el.checked; saveSettings(); notify(); },
    'yp-folder': (el) => { const v = String(el.value).trim(); youCfg().folders[persona()] = v; saveSettings(); again(); notify(); },
    'yp-up': async (el) => {
        const files = [...(el.files ?? [])];
        if (!files.length || YP.busy)
            return;
        YP.busy = true;
        notify();
        let ok = 0;
        try {
            for (const f of files) {
                await uploadSpritesTo(youFolder(), f);
                ok++;
            }
            toast(`Added: ${ok} file${ok === 1 ? '' : 's'} to "${youFolder()}".`, 'success');
        }
        catch (e) {
            toast(String(e?.message ?? e), 'error');
        }
        YP.busy = false;
        el.value = '';
        again();
        notify();
    },
});
