// [expanded] Group chats at runtime (rules in chats.ts): who can answer now, writing the messages (the main model
// by default, or the mechanics model), sending yours, and what the scene is told.
import { nowAbs, notify, game, toast, saveGame } from '../core/store.js';
import { isScenario, aiVoice } from '../core/world.js';
import { aiLangName } from '../core/i18n.js';
import { charOf, personaName, quiet } from '../st/bridge.js';
import { bondOf, social } from './social.js';
import { bondsOf, pairKey, personalityOf } from './bonds.js';
import { whereNow, OUT } from './people.js';
import { isSleeping } from './plans.js';
import { weekday, hm } from './time.js';
import { liveDigest } from './livelog.js';
import { eraTextLine } from './era.js';
import { presentNotes } from './lifehooks.js';
import * as P from './profile.js';
import * as C from './chats.js';
const G = (g) => g;
const H = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
} h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
export const chatsOf = (g) => C.chatsOf(G(g));
export const nameOf = (g, by) => (by === C.ME ? personaName() : g.cast[by]?.name ?? '?');
const pairValue = (g, a, b) => bondsOf(g).pairs[pairKey(a, b)]?.v ?? 0;
export const closeness = (g, author, a) => (author === C.ME ? bondOf(g, a) : pairValue(g, author, a));
export const unreadKey = (id) => `chat:${id}`;
export const TYPING = { chat: '', who: [] };
// [expanded] The answers are saved at once (nothing is lost if the page closes) but shown one by one, as if typed:
// "Name is typing…" for a few real seconds by the message's length, then the message. Hidden messages are only hidden
// on screen (the scene and the night still read them); after a reload everything shows. When you write again, what is
// still waiting shows at once, so it never lands above your message.
const HIDDEN = new WeakSet();
const QUEUE = new Map();
/** The messages of a chat as the phone shows them now. */
export const shownMsgs = (c) => c.msgs.filter(m => !HIDDEN.has(m));
/** Real milliseconds to "type" a message: a short pause and about 30 characters a second, at most 5 seconds. */
export const typeMs = (text, first = false) => Math.min(5000, (first ? 500 : 900) + String(text ?? '').length * 33);
function shown(chatId, m) {
    HIDDEN.delete(m);
    const g = game();
    if (g) {
        const u = social(g).unread;
        u[unreadKey(chatId)] = (u[unreadKey(chatId)] ?? 0) + 1;
        saveGame();
    }
}
function revealNext(chatId, first = false) {
    const q = QUEUE.get(chatId);
    if (!q || !q.msgs.length) {
        QUEUE.delete(chatId);
        if (TYPING.chat === chatId) {
            TYPING.chat = '';
            TYPING.who = [];
        }
        notify();
        return;
    }
    const m = q.msgs[0];
    TYPING.chat = chatId;
    TYPING.who = [m.by];
    notify();
    q.timer = setTimeout(() => { q.msgs.shift(); shown(chatId, m); revealNext(chatId); }, typeMs(m.text, first));
}
function reveal(chatId, msgs) {
    if (!msgs.length)
        return;
    for (const m of msgs)
        HIDDEN.add(m);
    const q = QUEUE.get(chatId);
    if (q) {
        q.msgs.push(...msgs);
        return;
    } // already showing: these come after
    QUEUE.set(chatId, { msgs: [...msgs], timer: null });
    revealNext(chatId, true);
}
/** Shows at once what a chat still has waiting (you are writing in it). */
export function flushChat(chatId) {
    const q = QUEUE.get(chatId);
    if (!q)
        return;
    if (q.timer)
        clearTimeout(q.timer);
    for (const m of q.msgs)
        shown(chatId, m);
    QUEUE.delete(chatId);
    if (TYPING.chat === chatId) {
        TYPING.chat = '';
        TYPING.who = [];
    }
    notify();
}
/** The members as they are right now: awake, where (people side by side do not text each other). */
export function peopleOf(g, w, c) {
    const now = nowAbs(g);
    return c.members.map(a => g.cast[a]).filter(Boolean).map((r) => {
        const at = whereNow(g, w, r);
        return { avatar: r.avatar, name: r.name, social: (P.profileOf(g, r.avatar)?.social ?? 50), awake: !isSleeping(r, now), room: at === OUT ? '' : at, nick: (social(g).nick ?? {})[r.avatar] };
    });
}
const about = (r) => { const c = charOf(r.avatar); return personalityOf(c?.description ?? '', c?.personality ?? '', 260).replace(/\n/g, ' '); };
/** Writes the next messages of `writers` (in order) and posts them, a minute or two apart. */
/** `loud`: you wrote, so a failure is shown (conversations without you only log it). */
export async function write(g, w, c, writers, topic = '', news = [], loud = false) {
    const ws = writers.map(a => g.cast[a]).filter(Boolean);
    if (!ws.length)
        return [];
    const prompt = C.chatPrompt({
        chatName: c.name, when: `${weekday(g.day)}, ${hm(g.minutes)}`, lang: aiLangName(g.lang), voice: aiVoice(w), era: eraTextLine(g),
        members: c.members.map(a => g.cast[a]).filter(Boolean).map(r => ({ name: r.name, about: about(r) })), you: personaName(), youIn: c.you,
        known: liveDigest(g, w, ws.map(r => r.avatar), { lines: 8, chars: 1200 }), news,
        history: c.msgs.slice(-16).map(m => ({ name: nameOf(g, m.by), text: m.text })), writers: ws.map(r => r.name), topic,
    });
    const x = chatsOf(g);
    let ans = '';
    let failed = '';
    TYPING.chat = c.id;
    TYPING.who = ws.map(r => r.avatar);
    notify();
    try {
        if (x.writer === 'mech') {
            const { bgAsk } = await import('./regulator.js');
            ans = await bgAsk(prompt, 2500, C.CHAT_SYSTEM);
        }
        else
            ans = await quiet(prompt, 2500, C.CHAT_SYSTEM);
    }
    catch (e) {
        failed = String(e?.message ?? e);
        console.warn('[Mundi Expanded] group chat', e);
    }
    finally {
        if (TYPING.chat === c.id) {
            TYPING.chat = '';
            TYPING.who = [];
        }
    }
    // [expanded] the answer can take a while: write into the save and the chat as they are NOW (the chat may have been
    // reloaded meanwhile; the objects from before the call would be lost), and never lose an answer silently
    const g2 = game() ?? g;
    const c2 = C.chatById(G(g2), c.id) ?? c;
    const lines = C.parseChat(ans, ws.map(r => ({ avatar: r.avatar, name: r.name })));
    if (!lines.length) {
        if (!failed) {
            failed = ans.trim() ? 'the answer had no "Name: message" lines from the people asked' : 'the model sent an empty answer';
            console.warn(`[Mundi Expanded] group chat: ${failed}. Asked: ${ws.map(r => r.name).join(', ')}. Answer:`, ans);
        }
        if (loud)
            toast(`${c.name}: no answers came (${failed}). Try again, or let the mechanics model write chats (phone Settings).`, 'warn');
        notify();
        return [];
    }
    const out = [];
    // [expanded] never ahead of the game's clock: with the clock moved only by what you do, "a minute or two later"
    // stayed in the future (answers at 10:02 while it is 10:00). The answers end at the time they arrive, a minute apart
    // backwards when there is room, never before the last message already in the chat (so after yours, at the same minute).
    const at = nowAbs(g2);
    const after = c2.msgs.at(-1)?.at ?? -Infinity;
    lines.forEach((l, i) => { const m = C.post(c2, l.by, l.text, Math.max(after, at - (lines.length - 1 - i))); if (m)
        out.push(m); });
    reveal(c2.id, out); // unread counts grow as they show
    return out;
}
/** You write in a chat: who answers is decided, then their messages are written. */
export async function sendToChat(g, w, id, text) {
    const c = C.chatById(G(g), id);
    if (!c || !isScenario(w))
        return [];
    flushChat(id);
    const mine = C.post(c, C.ME, text, nowAbs(g));
    if (!mine)
        return [];
    const who = C.answerers({ author: C.ME, authorRoom: g.player.loc, text, people: peopleOf(g, w, c), closeness: (a) => closeness(g, C.ME, a), roll: (k) => H(`${c.id}|${mine.at}|${c.msgs.length}|${k}`) });
    return who.length ? write(g, w, c, who, '', [], true) : [];
}
// The scene: the chats you are in, lately, when someone here is in them too.
presentNotes.push((g, _w, present) => {
    const now = nowAbs(g);
    const here = new Set(present.map(r => r.avatar));
    return chatsOf(g).chats.filter(c => c.you && c.members.some(a => here.has(a))).flatMap(c => C.recentLines(c, now, (by) => (by === C.ME ? '{{user}}' : nameOf(g, by))));
});
