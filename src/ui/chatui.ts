// [expanded] Group chats in the phone (rules in sim/chats.ts): their rows at the top of Messages, the chat itself
// (in every skin: bubbles with names on the smartphone, lines on the keypad phone and the PDA), and sending.
import { esc, game, notify, saveGame, toast, type Save } from '../core/store.js';
import { getWorld, isScenario, type WorldDef } from '../core/world.js';
import { thumb } from '../st/bridge.js';
import { icon } from './icons.js';
import { ACT, INPUT } from './reg.js';
import { social } from '../sim/social.js';
import { hm, weekday } from '../sim/time.js';
import * as C from '../sim/chats.js';
import { chatsOf, nameOf, sendToChat, unreadKey, TYPING } from '../sim/chatrun.js';

export const GC = { draft: '', busy: false };
const when = (g: Save, at: number) => { const d = Math.floor(at / 1440); return d === g.day ? hm(at % 1440) : `${weekday(d).slice(0, 3)} ${hm(at % 1440)}`; };
const faces = (c: C.Chat) => `<span class="mu-gc-faces">${c.members.slice(0, 3).map(a => `<img src="${esc(thumb(a))}" alt="">`).join('')}</span>`;

/** At the top of Messages (Home): the group chats you are in. */
export function groupRowsHtml(g: Save): string {
    const w = getWorld(g.world); if (!w || !isScenario(w)) return '';
    const s = social(g);
    return chatsOf(g).chats.filter(c => c.you && c.members.length).map(c => {
        const last = c.msgs.at(-1); const n = s.unread[unreadKey(c.id)] ?? 0;
        return `<button class="mu-ph-row mu-gc-row" data-act="gc-open" data-id="${esc(c.id)}">${faces(c)}<span><b data-notr>${esc(c.name)}</b><small data-notr>${last ? `${esc(nameOf(g, last.by))}: ${esc(last.text)}` : `${c.members.length + 1} people`}</small></span>${n ? `<em>${n}</em>` : last ? `<small>${when(g, last.at)}</small>` : ''}</button>`;
    }).join('');
}

/** The chat (the phone's 'gchat' app; P.who is the chat's id). */
export function gchatApp(g: Save, _w: WorldDef, id: string): string {
    const c = C.chatById(g as any, id);
    if (!c) return '<p class="mu-muted mu-pad">This chat is gone.</p>';
    social(g).unread[unreadKey(c.id)] = 0;
    const typing = TYPING.chat === c.id && TYPING.who.length ? `${TYPING.who.map(a => g.cast[a]?.name).filter(Boolean).join(', ')} ${TYPING.who.length > 1 ? 'are' : 'is'} typing…` : '';
    return `<div class="mu-ph-head is-chat"><button class="mu-ibtn mu-ghost" data-act="ph-go" data-app="messages" aria-label="Back">${icon('back')}</button>
            <span class="mu-ph-chathead mu-gc-head">${faces(c)}<span><b data-notr>${esc(c.name)}</b><small>${typing || esc([...c.members.map(a => g.cast[a]?.name ?? '?'), 'you'].join(', '))}</small></span></span><span></span></div>
        <div class="mu-ph-thread mu-gc-thread" data-keep="ph-thread" data-bottom>${c.msgs.map(m => m.by === C.ME
            ? `<div class="mu-ph-msg is-me" data-notr>${esc(m.text)}<small>${when(g, m.at)}</small></div>`
            : `<div class="mu-gc-line"><img src="${esc(thumb(m.by))}" alt=""><div class="mu-ph-msg mu-gc-msg" data-notr><b class="mu-gc-by">${esc(nameOf(g, m.by))}</b>${esc(m.text)}<small>${when(g, m.at)}</small></div></div>`).join('')}
            ${typing ? '<div class="mu-ph-msg is-typing"><i></i><i></i><i></i></div>' : ''}
            ${c.msgs.length ? '' : '<p class="mu-muted mu-pad">Nothing here yet. Say something to everyone.</p>'}</div>
        <div class="mu-ph-compose"><input type="text" placeholder="Message to ${esc(c.name)}" value="${esc(GC.draft)}" data-input="gc-draft" data-focus="gc-draft" ${GC.busy ? 'disabled' : ''}>
            <button class="mu-ibtn mu-primary" data-act="gc-send" data-id="${esc(c.id)}" aria-label="Send" ${GC.busy ? 'disabled' : ''}>${icon('send')}</button></div>`;
}

async function send(id: string) {
    const g = game(); const w = g && getWorld(g.world); const text = GC.draft.trim();
    if (!g || !w || !text || GC.busy) return;
    GC.draft = ''; GC.busy = true; notify();
    try {
        const got = await sendToChat(g, w, id, text);
        const { P } = await import('./phone.js');
        const looking = P.open && P.app === 'gchat' && P.who === id;
        if (looking) social(g).unread[unreadKey(id)] = 0;
        else if (got.length) toast(`${C.chatById(g as any, id)?.name}: ${nameOf(g, got[0].by)}: ${got[0].text.slice(0, 60)}`, 'info');
    } catch (e: any) { toast(String(e?.message ?? e), 'error'); }
    GC.busy = false; saveGame(); notify();
}
Object.assign(ACT, {
    'gc-open': async (el) => { const { P } = await import('./phone.js'); P.app = 'gchat'; P.who = el.dataset.id ?? C.HOUSE; GC.draft = ''; notify(); },
    'gc-send': (el) => send(el.dataset.id ?? C.HOUSE),
});
Object.assign(INPUT, { 'gc-draft': (el) => { GC.draft = el.value; } });
// Enter sends (upstream's Enter only knows its own message box)
document.addEventListener?.('keydown', (e) => {
    const t = e.target as HTMLElement;
    if (t?.dataset?.focus === 'gc-draft' && e.key === 'Enter' && !(e as KeyboardEvent).isComposing) {
        e.preventDefault(); const b = document.querySelector<HTMLElement>('#mundi-root [data-act="gc-send"]'); send(b?.dataset.id ?? C.HOUSE);
    }
});

/* ---------- settings (phone Settings, Home) ---------- */

export function chatSettingsHtml(g: Save): string {
    const w = getWorld(g.world); if (!w || !isScenario(w)) return '';
    const x = chatsOf(g);
    return `<section class="mu-bd-set"><h4>Group chats</h4>
        <b>Written by</b><div class="mu-bd-seg"><button class="${x.writer === 'main' ? 'is-on' : ''}" data-act="gc-writer" data-v="main">The main model</button><button class="${x.writer === 'mech' ? 'is-on' : ''}" data-act="gc-writer" data-v="mech">The mechanics model</button></div>
        <small class="mu-muted">${x.writer === 'main' ? 'The same model as the story: the best messages.' : 'Cheaper, plainer (Settings → Game; without one, the main model).'}</small>
        <b>Conversations without you</b><div class="mu-bd-seg">${C.FREQS.map(([id, label]) => `<button class="${x.freq === id ? 'is-on' : ''}" data-act="gc-freq" data-v="${id}">${label}</button>`).join('')}</div>
        <small class="mu-muted">${(() => { const f = C.FREQS.find(q => q[0] === x.freq)!; return f[2][1] ? `About ${f[2][0] === f[2][1] ? f[2][0] : `${f[2][0]}–${f[2][1]}`} a day: they talk about what happened (a film they saw, a fight, the fridge…).` : 'They only answer you.'; })()}</small></section>`;
}
Object.assign(ACT, {
    'gc-writer': (el) => { const g = game(); if (!g) return; chatsOf(g).writer = el.dataset.v === 'mech' ? 'mech' : 'main'; saveGame(); notify(); },
    'gc-freq': (el) => { const g = game(); if (!g) return; chatsOf(g).freq = (el.dataset.v as C.Freq) || 'calm'; saveGame(); notify(); },
});
