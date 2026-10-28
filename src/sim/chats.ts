// [expanded] Group chats (Mundi Expanded): the house's chat (everyone), chats of three or four you make, and later
// the characters' own. Pure logic here: the chats, who answers a message, the prompt and reading the answer.
//
//  - Who answers is decided by rules before the AI writes anything: someone asked by name always (if they can),
//    the others by how social they are, how they get along with the one who wrote, and whether there is a question;
//    nobody asleep, and nobody in the same room as the one who wrote (people side by side do not text each other).
//    At most four. The AI then writes exactly those people's messages, in that order.
//  - One AI call writes all the replies at once (a transcript of several speakers).

export interface Msg { by: string; text: string; at: number }   // by: an avatar, or 'me'
export interface Chat { id: string; name: string; members: string[]; you: boolean; msgs: Msg[]; made?: number }
export type Writer = 'main' | 'mech';
export type Freq = 'off' | 'quiet' | 'calm' | 'lively';
export const FREQS: [Freq, string, [number, number]][] = [['off', 'Off', [0, 0]], ['quiet', 'Quiet', [0, 1]], ['calm', 'Calm', [1, 2]], ['lively', 'Lively', [2, 3]]];
export interface ChatsX { chats: Chat[]; writer: Writer; freq: Freq; seq: number; talks?: { day: number; hours: number[]; done: number[] }; calls?: Call[] }
export type GLike = { cast: Record<string, { avatar: string; name: string; met?: boolean }>; chatsx?: ChatsX };
export const ME = 'me';
export const HOUSE = 'house';
export const MAX_KEEP = 200;

export function chatsOf(g: GLike): ChatsX {
    const x = (g.chatsx ??= { chats: [], writer: 'main', freq: 'calm', seq: 0 } as ChatsX);
    x.chats ??= []; x.writer ??= 'main'; x.freq ??= 'calm'; x.seq ??= 0;
    // the house's chat: everyone who lives here, and you
    let h = x.chats.find(c => c.id === HOUSE);
    if (!h) { h = { id: HOUSE, name: 'House', members: [], you: true, msgs: [] }; x.chats.unshift(h); }
    h.members = Object.keys(g.cast);
    return x;
}
export const chatById = (g: GLike, id: string) => chatsOf(g).chats.find(c => c.id === id) ?? null;
export function post(c: Chat, by: string, text: string, at: number) {
    const t = String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, 500); if (!t) return null;
    const m = { by, text: t, at }; c.msgs.push(m);
    if (c.msgs.length > MAX_KEEP) c.msgs.splice(0, c.msgs.length - MAX_KEEP);
    return m;
}
export function newChat(g: GLike, name: string, members: string[], you = true, at = 0): Chat {
    const x = chatsOf(g);
    const c: Chat = { id: `g${++x.seq}`, name: name.trim().slice(0, 40) || 'Group', members: [...new Set(members)].filter(a => g.cast[a]).slice(0, 4), you, msgs: [], made: at };
    x.chats.push(c); return c;
}

/* ---------- who answers ---------- */

export interface Who { avatar: string; name: string; social: number; awake: boolean; room: string; nick?: string }
export interface AnswerIn { author: string; authorRoom: string; text: string; people: Who[]; closeness: (a: string) => number; roll: (k: string) => number; max?: number }
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
/** Asked by name ("Kathie, …", "@kathie"), in the text. */
export const named = (text: string, w: Who) => [w.name, w.nick].filter(Boolean).some(n => new RegExp(`(^|[^\\p{L}])@?${norm(n!).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\p{L}]|$)`, 'u').test(norm(text)));
/** The people who answer, in order (0 to `max`). */
export function answerers(a: AnswerIn): string[] {
    const max = a.max ?? 4;
    const can = a.people.filter(p => p.avatar !== a.author && p.awake && !(a.authorRoom && p.room === a.authorRoom));
    const asked = can.filter(p => named(a.text, p));
    const question = /\?/.test(a.text);
    const rest = can.filter(p => !asked.includes(p)).map(p => {
        const chance = 0.12 + p.social / 300 + Math.max(0, a.closeness(p.avatar)) / 250 + (question && !asked.length ? 0.2 : 0) - (asked.length ? 0.1 : 0);
        return { p, chance, roll: a.roll(p.avatar) };
    }).filter(x => x.roll < x.chance).sort((x, y) => (x.roll - x.chance) - (y.roll - y.chance)).map(x => x.p);
    let out = [...asked, ...rest].slice(0, max);
    // a question to everyone nobody felt like answering: the likeliest one does
    if (!out.length && question && can.length) out = [[...can].sort((x, y) => (y.social + a.closeness(y.avatar)) - (x.social + a.closeness(x.avatar)))[0]];
    return out.map(p => p.avatar);
}

/* ---------- the prompt and the answer ---------- */

export interface PromptIn {
    chatName: string; when: string; lang: string; voice: string; era: string;
    members: { name: string; about: string }[]; you: string; youIn: boolean;
    known: string;            // what was said face to face lately, and who heard it
    news: string[];           // what happened that the chat may be about
    history: { name: string; text: string }[];
    writers: string[];        // who writes now, in order
    topic?: string;           // what to write about (a conversation without you)
}
export const CHAT_SYSTEM = 'You write the messages of characters in a group chat on their phones, for an interactive fiction (a role-play between consenting adults). Each message sounds like that character. You write only the messages asked for, in the format "Name: message", one per line, nothing else.';
export function chatPrompt(p: PromptIn): string {
    return [
        `[Group chat "${p.chatName}" on their phones. ${p.when}. Members: ${[...p.members.map(m => m.name), ...(p.youIn ? [p.you] : [])].join(', ')}. They are texting, not together in one room.]`,
        ...p.members.map(m => `[${m.name}: ${m.about}]`),
        `[Messages are short (one or two sentences), casual, ${p.voice}, written in ${p.lang}.${p.era ? ` ${p.era}` : ''} Each reacts to what was said before; they may tease, joke, ask, ignore, or disagree, in character. No one describes actions or narrates.]`,
        ...(p.known ? [p.known] : []),
        ...(p.news.length ? [`[Recent things in the house they may know about: ${p.news.join(' ')}]`] : []),
        ...(p.history.length ? ['[The chat so far:]', ...p.history.map(h => `${h.name}: ${h.text}`)] : ['[The chat is quiet so far.]']),
        `[${p.topic ? `${p.writers[0]} starts a conversation about: ${p.topic}. ` : ''}Now write the next messages, by ${p.writers.join(', then ')}${p.writers.length > 1 ? ' (each one message, a second short one only if it fits)' : ''}. Only these people write. Format: "Name: message".]`,
    ].join('\n');
}
/** The AI's answer → messages by the people asked to write (at most two each, in order). */
export function parseChat(text: string, writers: { avatar: string; name: string }[]): { by: string; text: string }[] {
    const out: { by: string; text: string }[] = []; const count: Record<string, number> = {};
    for (const raw of String(text ?? '').split(/\n+/)) {
        const m = raw.replace(/^\s*[-*•]\s*/, '').match(/^\s*\**([^:*\n]{1,40})\**\s*:\s*(.+)$/); if (!m) continue;
        const who = writers.find(w => norm(w.name) === norm(m[1].trim())); if (!who) continue;
        if ((count[who.avatar] = (count[who.avatar] ?? 0) + 1) > 2) continue;
        const t = m[2].replace(/^["“]|["”]$/g, '').replace(/\*[^*]+\*/g, '').trim(); if (!t) continue;
        out.push({ by: who.avatar, text: t.slice(0, 400) });
    }
    return out;
}
/** For the scene: the house chat lately (members only know it; the people in a scene are members). */
export function recentLines(c: Chat, now: number, nameOf: (by: string) => string, hours = 4, n = 6): string[] {
    const m = c.msgs.filter(x => now - x.at <= hours * 60).slice(-n);
    return m.length ? [`In the "${c.name}" group chat lately (on their phones): ${m.map(x => `${nameOf(x.by)}: "${x.text.slice(0, 160)}"`).join(' / ')}`] : [];
}

/* ---------- conversations without you (part 4) ---------- */

/** The hours of today's conversations (`freq`'s range, 9:00–23:00, apart). */
export function dayTalks(freq: Freq, roll: (k: string) => number): number[] {
    const [lo, hi] = FREQS.find(f => f[0] === freq)?.[2] ?? [0, 0];
    const n = lo + Math.floor(roll('n') * (hi - lo + 1));
    const hours: number[] = [];
    for (let i = 0; i < n * 4 && hours.length < n; i++) { const h = 9 + Math.floor(roll(`h${i}`) * 14); if (hours.every(x => Math.abs(x - h) >= 2)) hours.push(h); }
    return hours.sort((a, b) => a - b);
}
export interface News { kind: 'plan' | 'fight' | 'fridge' | 'errand' | 'money' | 'small'; who: string[]; text: string; weight: number }
/** What a conversation is about: the weightiest recent thing (a little luck among close ones). */
export function pickNews(news: News[], roll: number): News | null {
    if (!news.length) return null;
    const total = news.reduce((s, n) => s + n.weight, 0); let x = roll * total;
    for (const n of news) { x -= n.weight; if (x < 0) return n; }
    return news[news.length - 1];
}

/* ---------- open calls: "movie night at 9, who's in?" ---------- */

export interface Call { id: string; chat: string; by: string; act: string; place: string; from: number; to: number; plan?: string; answers: Record<string, 'yes' | 'no'>; why: Record<string, string>; you?: 'yes' | 'no' }
export interface CallWho { avatar: string; free: boolean; social: number; withHost: number; grudge?: boolean }
/** Each one's answer to a call for everyone: by whether they are free, how they get along with the host, how social they are. */
export function callAnswer(p: CallWho, roll: number): { yes: boolean; why: string } {
    if (!p.free) return { yes: false, why: 'busy then' };
    if (p.withHost <= -15 || p.grudge) return { yes: false, why: 'not in the mood (and not keen on the host)' };
    const chance = 0.2 + p.social / 250 + Math.max(0, p.withHost) / 200;
    return roll < chance ? { yes: true, why: '' } : { yes: false, why: ['tired', 'has other things to do', 'not in the mood', 'wants a quiet evening'][Math.floor(roll * 97) % 4] };
}
/** Your answer, from what you wrote in the chat (yes, no, or nothing clear). */
export function yourAnswer(text: string): 'yes' | 'no' | null {
    const t = text.toLowerCase();
    if (/\b(can'?t|cannot|not tonight|i'?ll pass|pass|no thanks|count me out)\b|не могу|не получится|без меня|пас\b/.test(t)) return 'no';
    if (/\b(i'?m in|count me in|i'?ll come|i'?ll be there|sure|yes|yeah|ok(ay)?|down)\b|я за|приду|буду|иду|давай|ок\b|конечно/.test(t)) return 'yes';
    return null;
}
