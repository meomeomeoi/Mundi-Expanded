// [expanded] Group chats at runtime (rules in chats.ts): who can answer now, writing the messages (the main model
// by default, or the mechanics model), sending yours, and what the scene is told.
import { nowAbs, notify } from '../core/store.js';
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
export async function write(g, w, c, writers, topic = '', news = []) {
    const ws = writers.map(a => g.cast[a]).filter(Boolean);
    if (!ws.length)
        return [];
    const now = nowAbs(g);
    const prompt = C.chatPrompt({
        chatName: c.name, when: `${weekday(g.day)}, ${hm(g.minutes)}`, lang: aiLangName(g.lang), voice: aiVoice(w), era: eraTextLine(g),
        members: c.members.map(a => g.cast[a]).filter(Boolean).map(r => ({ name: r.name, about: about(r) })), you: personaName(), youIn: c.you,
        known: liveDigest(g, w, ws.map(r => r.avatar), { lines: 8, chars: 1200 }), news,
        history: c.msgs.slice(-16).map(m => ({ name: nameOf(g, m.by), text: m.text })), writers: ws.map(r => r.name), topic,
    });
    const x = chatsOf(g);
    let ans = '';
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
        console.warn('[Mundi Expanded] group chat', e);
    }
    finally {
        TYPING.chat = '';
        TYPING.who = [];
    }
    const lines = C.parseChat(ans, ws.map(r => ({ avatar: r.avatar, name: r.name })));
    const out = [];
    lines.forEach((l, i) => { const m = C.post(c, l.by, l.text, now + 1 + i + Math.floor(H(`${c.id}|${now}|${i}`) * 2)); if (m)
        out.push(m); });
    if (out.length)
        social(g).unread[unreadKey(c.id)] = (social(g).unread[unreadKey(c.id)] ?? 0) + out.length;
    return out;
}
/** You write in a chat: who answers is decided, then their messages are written. */
export async function sendToChat(g, w, id, text) {
    const c = C.chatById(G(g), id);
    if (!c || !isScenario(w))
        return [];
    const mine = C.post(c, C.ME, text, nowAbs(g));
    if (!mine)
        return [];
    const who = C.answerers({ author: C.ME, authorRoom: g.player.loc, text, people: peopleOf(g, w, c), closeness: (a) => closeness(g, C.ME, a), roll: (k) => H(`${c.id}|${mine.at}|${c.msgs.length}|${k}`) });
    return who.length ? write(g, w, c, who) : [];
}
// The scene: the chats you are in, lately, when someone here is in them too.
presentNotes.push((g, _w, present) => {
    const now = nowAbs(g);
    const here = new Set(present.map(r => r.avatar));
    return chatsOf(g).chats.filter(c => c.you && c.members.some(a => here.has(a))).flatMap(c => C.recentLines(c, now, (by) => (by === C.ME ? '{{user}}' : nameOf(g, by))));
});
