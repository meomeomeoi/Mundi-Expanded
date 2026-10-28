// [expanded] Group chats in the phone (rules in sim/chats.ts): their rows at the top of Messages, the chat itself
// (in every skin: bubbles with names on the smartphone, lines on the keypad phone and the PDA), and sending.
import { esc, game, notify, saveGame, toast, nowAbs } from '../core/store.js';
import { getWorld, isScenario } from '../core/world.js';
import { thumb } from '../st/bridge.js';
import { icon } from './icons.js';
import { ACT, INPUT } from './reg.js';
import { social } from '../sim/social.js';
import { hm, weekday } from '../sim/time.js';
import * as C from '../sim/chats.js';
import { chatsOf, nameOf, sendToChat, unreadKey, TYPING, shownMsgs, typeMs } from '../sim/chatrun.js';
import { pendingCall, answerCall, callText, startTalk } from '../sim/chatlife.js';
export const GC = { draft: '', busy: false };
// making or editing one of your chats: its name and members (id '' = a new one)
export const GN = { open: false, id: '', name: '', members: [] };
const when = (g, at) => { const d = Math.floor(at / 1440); return d === g.day ? hm(at % 1440) : `${weekday(d).slice(0, 3)} ${hm(at % 1440)}`; };
const faces = (c) => `<span class="mu-gc-faces">${c.members.slice(0, 3).map(a => `<img src="${esc(thumb(a))}" alt="">`).join('')}</span>`;
/** At the top of Messages (Home): the group chats you are in. */
export function groupRowsHtml(g) {
    const w = getWorld(g.world);
    if (!w || !isScenario(w))
        return '';
    const s = social(g);
    return `${groupForm(g)}${chatsOf(g).chats.filter(c => c.you && c.members.length).map(c => {
        const last = shownMsgs(c).at(-1);
        const n = s.unread[unreadKey(c.id)] ?? 0;
        return `<button class="mu-ph-row mu-gc-row" data-act="gc-open" data-id="${esc(c.id)}">${faces(c)}<span><b data-notr>${esc(c.name)}</b><small data-notr>${last ? `${esc(nameOf(g, last.by))}: ${esc(last.text)}` : `${c.members.length + 1} people`}</small></span>${n ? `<em>${n}</em>` : last ? `<small>${when(g, last.at)}</small>` : ''}</button>`;
    }).join('')}`;
}
function groupForm(g) {
    if (!GN.open)
        return `<button class="mu-ph-row mu-gc-new" data-act="gn-open">${icon('plus')}<span><b>New group</b><small>A chat with two to four people</small></span></button>`;
    const people = Object.values(g.cast).filter(r => r.met);
    return `<div class="mu-gc-form"><label class="mu-field"><span>${GN.id ? 'Group name' : 'New group'}</span><input type="text" maxlength="40" placeholder="Movie club, Gym bros…" value="${esc(GN.name)}" data-input="gn-name" data-focus="gn-name"></label>
        <div class="mu-chips">${people.map(r => `<button class="mu-chip ${GN.members.includes(r.avatar) ? 'is-on' : ''}" data-act="gn-member" data-who="${esc(r.avatar)}" ${!GN.members.includes(r.avatar) && GN.members.length >= 4 ? 'aria-disabled="true"' : ''}><img src="${esc(thumb(r.avatar))}" alt=""><span data-notr>${esc(r.name)}</span></button>`).join('')}</div>
        <small class="mu-muted">${GN.members.length < 2 ? 'Pick two to four people (you are in it too).' : `${GN.members.length + 1} people with you.`}</small>
        <div class="mu-row">${GN.id ? `<button class="mu-ghost mu-danger" data-act="gn-del">${icon('trash')}<span>Delete</span></button>` : ''}<button class="mu-ghost" data-act="gn-close">Cancel</button><button class="mu-primary" data-act="gn-save" ${GN.members.length < 2 ? 'aria-disabled="true"' : ''}>${GN.id ? 'Save' : 'Create'}</button></div></div>`;
}
/** The chat (the phone's 'gchat' app; P.who is the chat's id). */
export function gchatApp(g, w, id) {
    const c = C.chatById(g, id);
    if (!c)
        return '<p class="mu-muted mu-pad">This chat is gone.</p>';
    social(g).unread[unreadKey(c.id)] = 0;
    const typing = TYPING.chat === c.id && TYPING.who.length ? `${TYPING.who.map(a => g.cast[a]?.name).filter(Boolean).join(', ')} ${TYPING.who.length > 1 ? 'are' : 'is'} typing…` : '';
    return `<div class="mu-ph-head is-chat"><button class="mu-ibtn mu-ghost" data-act="ph-go" data-app="messages" aria-label="Back">${icon('back')}</button>
            <span class="mu-ph-chathead mu-gc-head">${faces(c)}<span><b data-notr>${esc(c.name)}</b><small>${typing || esc([...c.members.map(a => g.cast[a]?.name ?? '?'), 'you'].join(', '))}</small></span></span>${c.id === C.HOUSE ? '<span></span>' : `<button class="mu-ibtn mu-ghost" data-act="gn-edit" data-id="${esc(c.id)}" aria-label="Edit the group">${icon('pen')}</button>`}</div>
        <div class="mu-ph-thread mu-gc-thread" data-keep="ph-thread" data-bottom>${shownMsgs(c).map(m => m.by === C.ME
        ? `<div class="mu-ph-msg is-me" data-notr>${esc(m.text)}<small>${when(g, m.at)}</small></div>`
        : `<div class="mu-gc-line"><img src="${esc(thumb(m.by))}" alt=""><div class="mu-ph-msg mu-gc-msg" data-notr><b class="mu-gc-by">${esc(nameOf(g, m.by))}</b>${esc(m.text)}<small>${when(g, m.at)}</small></div></div>`).join('')}
            ${typing ? '<div class="mu-ph-msg is-typing"><i></i><i></i><i></i></div>' : ''}
            ${c.msgs.length ? '' : '<p class="mu-muted mu-pad">Nothing here yet. Say something to everyone.</p>'}</div>
        ${(() => { const k = pendingCall(g, c.id); return k ? `<div class="mu-gc-call"><span>${icon('calendar')}<b data-notr>${esc(callText(g, w, k))}</b></span><button class="mu-primary" data-act="gc-call" data-id="${esc(k.id)}" data-v="yes">I'm in</button><button class="mu-ghost" data-act="gc-call" data-id="${esc(k.id)}" data-v="no">Can't</button></div>` : ''; })()}
        <div class="mu-ph-compose"><input type="text" placeholder="Message to ${esc(c.name)}" value="${esc(GC.draft)}" data-input="gc-draft" data-focus="gc-draft" ${GC.busy ? 'disabled' : ''}>
            <button class="mu-ibtn mu-primary" data-act="gc-send" data-id="${esc(c.id)}" aria-label="Send" ${GC.busy ? 'disabled' : ''}>${icon('send')}</button></div>`;
}
async function send(id) {
    const g = game();
    const w = g && getWorld(g.world);
    const text = GC.draft.trim();
    if (!g || !w || !text || GC.busy)
        return;
    GC.draft = '';
    GC.busy = true;
    notify();
    try {
        // an answer to the call waiting in this chat ("I'm in", "can't tonight")
        const k = pendingCall(g, id);
        const yes = k ? C.yourAnswer(text) : null;
        if (k && yes) {
            const why = answerCall(g, w, k.id, yes === 'yes');
            if (why)
                toast(why, 'info');
            else if (yes === 'yes')
                toast('You are going: it is in your plans.', 'success');
        }
        const got = await sendToChat(g, w, id, text);
        // [expanded] told when the first answer shows (they appear one by one), unless you are looking at the chat then
        if (got.length)
            setTimeout(async () => { const { P } = await import('./phone.js'); if (!(P.open && P.app === 'gchat' && P.who === id))
                toast(`${C.chatById(g, id)?.name}: ${nameOf(g, got[0].by)}: ${got[0].text.slice(0, 60)}`, 'info'); }, typeMs(got[0].text, true));
    }
    catch (e) {
        toast(String(e?.message ?? e), 'error');
    }
    GC.busy = false;
    saveGame();
    notify();
}
Object.assign(ACT, {
    'gc-open': async (el) => { const { P } = await import('./phone.js'); P.app = 'gchat'; P.who = el.dataset.id ?? C.HOUSE; GC.draft = ''; notify(); },
    'gc-send': (el) => send(el.dataset.id ?? C.HOUSE),
    // the buttons: your answer, said in the chat too
    'gc-call': async (el) => {
        const g = game();
        const w = g && getWorld(g.world);
        if (!g || !w)
            return;
        const k = (chatsOf(g).calls ?? []).find(x => x.id === el.dataset.id);
        if (!k)
            return;
        GC.draft = el.dataset.v === 'yes' ? "I'm in!" : "Can't make it, sorry.";
        await send(k.chat);
    },
});
Object.assign(INPUT, { 'gc-draft': (el) => { GC.draft = el.value; }, 'gn-name': (el) => { GN.name = el.value; } });
Object.assign(ACT, {
    'gn-open': () => { Object.assign(GN, { open: true, id: '', name: '', members: [] }); notify(); },
    'gn-close': () => { GN.open = false; notify(); },
    'gn-member': (el) => { if (el.getAttribute('aria-disabled'))
        return; const a = el.dataset.who; GN.members = GN.members.includes(a) ? GN.members.filter(x => x !== a) : [...GN.members, a].slice(0, 4); notify(); },
    'gn-edit': async (el) => { const g = game(); const c = g && C.chatById(g, el.dataset.id ?? ''); if (!c)
        return; Object.assign(GN, { open: true, id: c.id, name: c.name, members: [...c.members] }); const { P } = await import('./phone.js'); P.app = 'messages'; notify(); },
    'gn-save': async (el) => {
        if (el.getAttribute('aria-disabled'))
            return;
        const g = game();
        if (!g)
            return;
        const names = GN.members.map(a => g.cast[a]?.name).filter(Boolean);
        const name = GN.name.trim() || names.join(', ');
        let c = GN.id ? C.chatById(g, GN.id) : null;
        if (c) {
            c.name = name.slice(0, 40);
            c.members = [...GN.members];
        }
        else
            c = C.newChat(g, name, GN.members, true, nowAbs(g));
        GN.open = false;
        saveGame();
        const { P } = await import('./phone.js');
        P.app = 'gchat';
        P.who = c.id;
        notify();
    },
    'gn-del': () => { const g = game(); if (!g || !GN.id)
        return; const x = chatsOf(g); x.chats = x.chats.filter(c => c.id !== GN.id); GN.open = false; saveGame(); notify(); },
});
// Enter sends (upstream's Enter only knows its own message box)
document.addEventListener?.('keydown', (e) => {
    const t = e.target;
    if (t?.dataset?.focus === 'gc-draft' && e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        const b = document.querySelector('#mundi-root [data-act="gc-send"]');
        send(b?.dataset.id ?? C.HOUSE);
    }
});
/* ---------- settings (phone Settings, Home) ---------- */
export function chatSettingsHtml(g) {
    const w = getWorld(g.world);
    if (!w || !isScenario(w))
        return '';
    const x = chatsOf(g);
    return `<section class="mu-bd-set"><h4>Group chats</h4>
        <b>Written by</b><div class="mu-bd-seg"><button class="${x.writer === 'main' ? 'is-on' : ''}" data-act="gc-writer" data-v="main">The main model</button><button class="${x.writer === 'mech' ? 'is-on' : ''}" data-act="gc-writer" data-v="mech">The mechanics model</button></div>
        <small class="mu-muted">${x.writer === 'main' ? 'The same model as the story: the best messages.' : 'Cheaper, plainer (Settings → Game; without one, the main model).'}</small>
        <b>Conversations without you</b><div class="mu-bd-seg">${C.FREQS.map(([id, label]) => `<button class="${x.freq === id ? 'is-on' : ''}" data-act="gc-freq" data-v="${id}">${label}</button>`).join('')}</div>
        <small class="mu-muted">${(() => { const f = C.FREQS.find(q => q[0] === x.freq); return f[2][1] ? `About ${f[2][0] === f[2][1] ? f[2][0] : `${f[2][0]}–${f[2][1]}`} a day: they talk about what happened (a film they saw, a fight, the fridge…).` : 'They only answer you.'; })()}</small>
        <div class="mu-row"><button class="mu-ghost" data-act="gc-now" data-v="talk" ${GC.busy ? 'aria-disabled="true"' : ''}>Conversation now</button><button class="mu-ghost" data-act="gc-now" data-v="call" ${GC.busy ? 'aria-disabled="true"' : ''}>Call now</button></div>
        <small class="mu-muted">Starts one right away, with whoever is awake and not here with you (a call needs a free evening slot).</small></section>`;
}
Object.assign(ACT, {
    'gc-writer': (el) => { const g = game(); if (!g)
        return; chatsOf(g).writer = el.dataset.v === 'mech' ? 'mech' : 'main'; saveGame(); notify(); },
    // [expanded] a conversation without you, right now (to see it without waiting for its hour)
    'gc-now': async (el) => {
        const g = game();
        const w = g && getWorld(g.world);
        if (!g || !w || GC.busy)
            return;
        GC.busy = true;
        notify();
        try {
            const got = await startTalk(g, w, el.dataset.v === 'call' ? 'call' : 'talk');
            if (!got.length)
                toast(el.dataset.v === 'call' ? 'No call now: nobody free to host one this evening, or nobody awake.' : 'Nobody could start one now (asleep, or here with you).', 'info');
        }
        catch (e) {
            toast(String(e?.message ?? e), 'error');
        }
        GC.busy = false;
        saveGame();
        notify();
    },
    'gc-freq': (el) => { const g = game(); if (!g)
        return; chatsOf(g).freq = el.dataset.v || 'calm'; saveGame(); notify(); },
});
