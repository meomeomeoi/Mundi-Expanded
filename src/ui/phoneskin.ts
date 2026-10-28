// [expanded] The phone's look (Mundi Expanded): a smartphone (upstream's), a keypad phone or a PDA, and the era
// setting. Every app works the same in each; the look is CSS (css/66-phoneskin.css) plus the hardware under the
// screen drawn here, whose keys work: home, back, messages, close.
import { esc, game, notify, saveGame, toast, type Save } from '../core/store.js';
import { getWorld, isScenario } from '../core/world.js';
import { ACT } from './reg.js';
import { icon } from './icons.js';
import { chatLore, loadLore, saveLore, newLoreEntry } from '../st/bridge.js';
import * as E from '../sim/era.js';

const G = (g: Save) => g as unknown as E.GLike;
/** The class on upstream's phone. */
export const skinClass = () => { const g = game(); const s = E.skinOf(g ? G(g) : null); return s === 'phone' ? '' : `is-skin-${s}`; };

const KEYS = [['1', ''], ['2', 'abc'], ['3', 'def'], ['4', 'ghi'], ['5', 'jkl'], ['6', 'mno'], ['7', 'pqrs'], ['8', 'tuv'], ['9', 'wxyz'], ['*', '+'], ['0', '␣'], ['#', '⇧']];
/** The hardware under the screen. */
export function skinChrome(): string {
    const g = game(); const s = E.skinOf(g ? G(g) : null);
    // the arrows on the navigation key are drawn (four small marks around the middle), only up and down scroll
    const arrows = '<u class="is-u"></u><u class="is-r"></u><u class="is-d"></u><u class="is-l"></u>';
    if (s === 'keypad') return `<div class="mu-sk-keys" aria-label="Keypad">
        <div class="mu-sk-soft"><button data-act="ph-go" data-app="home" title="Menu"><span>Menu</span></button>
            <span class="mu-sk-dpad"><button data-act="sk-scroll" data-d="-1" aria-label="Up"></button><button data-act="sk-scroll" data-d="1" aria-label="Down"></button>${arrows}<i></i></span>
            <button data-act="sk-back" title="Back"><span>Back</span></button></div>
        <div class="mu-sk-call"><button class="is-green" data-act="ph-go" data-app="messages" title="Messages" aria-label="Messages">${icon('handset')}</button><button class="is-red" data-act="ph-close" title="Close" aria-label="Close">${icon('handset')}</button></div>
        <div class="mu-sk-pad">${KEYS.map(([k, l]) => `<span><b>${k}</b><small>${esc(l)}</small></span>`).join('')}</div><i class="mu-sk-mic"></i></div>`;
    if (s === 'pda') return `<div class="mu-sk-pdabtns" aria-label="Buttons">
        <button data-act="ph-go" data-app="plans" title="Calendar" aria-label="Calendar">${icon('calendar')}</button><button data-act="ph-go" data-app="people" title="Contacts" aria-label="Contacts">${icon('users')}</button>
        <span class="mu-sk-dpad"><button data-act="sk-scroll" data-d="-1" aria-label="Up"></button><button data-act="sk-scroll" data-d="1" aria-label="Down"></button>${arrows}<button data-act="ph-go" data-app="home" aria-label="Home" class="is-ok"></button></span>
        <button data-act="ph-go" data-app="messages" title="Messages" aria-label="Messages">${icon('chat')}</button><button data-act="sk-back" title="Back" aria-label="Back">${icon('back')}</button>
        <i class="mu-sk-grille"></i></div>`;
    return '';
}
Object.assign(ACT, {
    // back: the screen's own back button (each app knows where it goes back to), else the home screen
    'sk-back': () => { const b = document.querySelector<HTMLElement>('#mundi-root .mu-phone .mu-ph-head button[data-act="ph-go"]'); if (b) { b.click(); return; } const h = document.createElement('button'); h.dataset.app = 'home'; ACT['ph-go']?.(h, new Event('click')); },
    'sk-scroll': (el) => { const sc = document.querySelector<HTMLElement>('#mundi-root .mu-phone .mu-ph-screen'); sc?.scrollBy({ top: Number(el.dataset.d) * 80, behavior: 'smooth' }); },
});

/* ---------- settings (the phone's Settings, in a Home) ---------- */

export function eraSettingsHtml(g: Save): string {
    const w = getWorld(g.world); if (!w || !isScenario(w)) return '';
    const e = E.eraxOf(G(g)); const def = E.eraDef(G(g));
    return `<section class="mu-bd-set"><h4>Era and phone</h4>
        <b>Era</b><div class="mu-bd-seg">${E.ERAS.map(x => `<button class="${x.id === e.era ? 'is-on' : ''}" data-act="sk-era" data-v="${x.id}">${esc(x.name)}</button>`).join('')}</div>
        <small class="mu-muted">${def.lore ? 'Written into this game\'s lorebook (one entry of its own), and texting follows the time.' : 'Nothing special: today\'s world.'}</small>
        <b>Phone</b><div class="mu-bd-seg">${E.SKINS.map(([id, name]) => `<button class="${id === e.skin ? 'is-on' : ''}" data-act="sk-skin" data-v="${id}">${esc(name)}${id === def.skin && def.id !== 'now' ? ' ✓' : ''}</button>`).join('')}</div>
        <small class="mu-muted">${def.id !== 'now' && def.skin !== e.skin ? `${esc(def.name)} suggests: ${esc(E.SKINS.find(s => s[0] === def.skin)![1].toLowerCase())}.` : 'Every app works the same in each.'}</small></section>`;
}
/** The era's lorebook entry in this chat's lorebook (none bound: the scene gets the line instead). */
export async function writeEraLore(g: Save): Promise<boolean> {
    const name = chatLore(); if (!name) return false;
    try {
        const data = await loadLore(name);
        if (E.eraEntry(data, E.eraDef(G(g)), () => newLoreEntry(name, data))) await saveLore(name, data);
        return true;
    } catch (e) { console.warn('[Mundi Expanded] era lore', e); return false; }
}
Object.assign(ACT, {
    'sk-era': async (el) => {
        const g = game(); if (!g) return; const e = E.eraxOf(G(g)); const was = e.era;
        e.era = (el.dataset.v as E.Era) || 'now';
        // the era's phone, when the phone was the old era's (a phone you chose yourself stays)
        const old = E.ERAS.find(x => x.id === was)!; if (e.skin === old.skin) e.skin = E.eraDef(G(g)).skin;
        saveGame(); notify();
        const ok = await writeEraLore(g);
        toast(E.eraDef(G(g)).lore ? (ok ? `Era: ${E.eraDef(G(g)).name}. Written into the game's lorebook.` : `Era: ${E.eraDef(G(g)).name}. (This chat has no lorebook: the scene is told instead.)`) : 'Era: today.', 'success');
        const { refreshPrompt } = await import('../sim/prompt.js'); refreshPrompt();
    },
    'sk-skin': (el) => { const g = game(); if (!g) return; E.eraxOf(G(g)).skin = (el.dataset.v as E.Skin) || 'phone'; saveGame(); notify(); },
});
