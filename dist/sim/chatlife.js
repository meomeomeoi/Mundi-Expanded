// [expanded] Conversations without you, and calls for everyone (rules in chats.ts): at midnight the day's
// conversations get their hours; at each, a topic from what happened (a plan that is over, a fight, the empty fridge,
// money, or something light from someone's day) and who joins in; sometimes a call ("movie night at nine, who's
// in?") whose answers are decided before the AI writes them, and that you can answer too.
import { nowAbs, notify, saveGame, toast } from '../core/store.js';
import { isScenario } from '../core/world.js';
import { onDay, onHour } from './hooks.js';
import { personaName } from '../st/bridge.js';
import { bondsOf, pairKey } from './bonds.js';
import { whereNow, OUT } from './people.js';
import { isSleeping } from './plans.js';
import { foodLevel } from './stock.js';
import { slotAt, commonRooms } from './lifeday.js';
import { cplansOf, freeAt, joinPlan, storyOf } from './cplanrun.js';
import * as CP from './cplans.js';
import * as P from './profile.js';
import * as C from './chats.js';
import { chatsOf, peopleOf, write, nameOf, unreadKey } from './chatrun.js';
import { presentNotes } from './lifehooks.js';
const H = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
} h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const pairValue = (g, a, b) => bondsOf(g).pairs[pairKey(a, b)]?.v ?? 0;
const names = (g, who) => { const n = who.map(a => g.cast[a]?.name ?? '?'); return n.length <= 1 ? n.join('') : `${n.slice(0, -1).join(', ')} and ${n.at(-1)}`; };
const hh = (m) => `${String(Math.floor((m % 1440) / 60)).padStart(2, '0')}:00`;
let busy = false;
/** What happened lately that the house may talk about. */
export function newsOf(g, w) {
    const now = nowAbs(g);
    const out = [];
    for (const p of cplansOf(g))
        if (p.state === 'done' && now - p.to < 6 * 60 && now >= p.to)
            out.push({ kind: 'plan', who: p.who, text: `${names(g, p.who)} were ${storyOf(p)} earlier today.`, weight: 3 });
    for (const f of bondsOf(g).facts.filter(x => x.kind === 'episode' && x.day >= g.day - 1 && x.who.every(a => g.cast[a]))) {
        if ((f.delta ?? 0) < 0)
            out.push({ kind: 'fight', who: f.who, text: f.text, weight: 3 });
    }
    const food = foodLevel(g);
    if (food !== 'ok')
        out.push({ kind: 'fridge', who: [], text: food === 'empty' ? 'The fridge and pantry are empty.' : 'Food is running low in the house.', weight: food === 'empty' ? 2 : 1 });
    if (g.house?.on && g.house?.tight)
        out.push({ kind: 'money', who: [], text: 'Money is tight in the house this week: the bills were not fully covered.', weight: 1.5 });
    out.push({ kind: 'small', who: [], text: '', weight: 1.5 });
    return out;
}
// Someone who can start a conversation now: awake, not in the scene with you.
function openers(g, w, c, prefer) {
    const now = nowAbs(g);
    const ok = c.members.filter(a => g.cast[a] && !isSleeping(g.cast[a], now) && whereNow(g, w, g.cast[a]) !== g.player.loc);
    const pref = ok.filter(a => prefer.includes(a));
    return pref.length ? pref : ok;
}
function topicFor(g, w, n, opener) {
    const name = g.cast[opener]?.name ?? '';
    if (n.kind === 'plan')
        return `how it went: ${n.text} ${n.who.includes(opener) ? `${name} shares a short impression or review` : `${name} asks how it was`}`;
    if (n.kind === 'fight')
        return `what happened between people here ("${n.text}"); ${n.who.includes(opener) ? `${name} hints at it, a little passive-aggressive, without spelling everything out` : `${name} carefully brings it up`}`;
    if (n.kind === 'fridge')
        return `${n.text} Who is going shopping?`;
    if (n.kind === 'money')
        return n.text;
    const s = slotAt(g, w, g.cast[opener], nowAbs(g));
    return s && !s.asleep && s.kind !== 'out' ? `something light from their moment (${name} is ${s.act}): a passing thought, a small question to everyone, or a joke` : 'something light: a passing thought, a small question to everyone, or a joke';
}
/** A conversation now (fired at one of the day's hours; by hand in tests). */
export async function startTalk(g, w, force) {
    if (busy)
        return [];
    busy = true;
    try {
        const now = nowAbs(g);
        const news = newsOf(g, w);
        const n = C.pickNews(news, H(`${now}|news`));
        // now and then in a chat of theirs (no messages: what they talked about), or in one of yours
        const hidden = chatsOf(g).chats.filter(x => !x.you && x.members.every(a => g.cast[a]));
        if (!force && hidden.length && H(`${now}|hid`) < 0.3) {
            hiddenTalk(g, hidden[Math.floor(H(`${now}|hw`) * hidden.length)], n);
            return [];
        }
        const mine = chatsOf(g).chats.filter(x => x.you && x.id !== C.HOUSE && x.members.length >= 2);
        const c = (!force && mine.length && H(`${now}|mine`) < 0.3) ? mine[Math.floor(H(`${now}|mw`) * mine.length)] : C.chatById(g, C.HOUSE);
        const ops = openers(g, w, c, n.who);
        if (!ops.length)
            return [];
        const opener = ops[Math.floor(H(`${now}|op`) * ops.length)];
        const social = P.profileOf(g, opener)?.social ?? 50;
        const hour = Math.floor(g.minutes / 60);
        if (force === 'call' || (!force && c.id === C.HOUSE && hour <= 19 && social >= 45 && H(`${now}|call`) < 0.3)) {
            const m = await call(g, w, c, opener);
            if (m.length || force)
                return m;
        }
        const people = peopleOf(g, w, c);
        const room = people.find(p => p.avatar === opener)?.room ?? '';
        const rest = C.answerers({ author: opener, authorRoom: room, text: n.kind === 'small' ? 'hey' : `${n.text}?`, people, closeness: (a) => pairValue(g, opener, a), roll: (k) => H(`${now}|${k}|ans`), max: 4 });
        const msgs = await write(g, w, c, [opener, ...rest], topicFor(g, w, n, opener), news.filter(x => x.text).map(x => x.text));
        tell(g, c, msgs);
        return msgs;
    }
    finally {
        busy = false;
    }
}
/* ---------- their own chats ---------- */
// A conversation in a chat without you: no messages, a line of what it was about, and a little closeness.
function hiddenTalk(g, c, n) {
    const who = names(g, c.members);
    const about = n.kind === 'small' ? 'their day and nothing in particular' : n.kind === 'plan' ? `how it went (${n.text.replace(/\.$/, '')})` : n.kind === 'fight' ? `what happened ("${n.text.replace(/\.$/, '')}")` : n.kind === 'fridge' ? 'the empty fridge and who should go shopping' : n.kind === 'money' ? 'money being tight' : 'the house';
    C.note(c, g.day, `${who} talked in their group chat about ${about}.`);
    import('./bonds.js').then(b => { b.applyChange(g, c.members.slice(0, 3), n.kind === 'fight' ? 0 : 1, `${who} chatted in their own group chat about ${about}.`, 'offscreen'); saveGame(); }).catch(() => { });
}
// At night: three close friends may start a chat of their own.
onDay.push((g, w) => {
    if (!isScenario(w))
        return [];
    const x = chatsOf(g);
    const t = C.hiddenTrio(Object.keys(g.cast), (a, b) => pairValue(g, a, b), x.chats, (k) => H(`${g.world}|${g.day}|hid|${k}`));
    if (t) {
        const c = C.newChat(g, 'Their chat', t, false, nowAbs(g));
        C.note(c, g.day, `${names(g, t)} started a group chat of their own.`);
    }
    return [];
});
presentNotes.push((g, _w, present) => {
    const here = new Set(present.map(r => r.avatar));
    return chatsOf(g).chats.filter(c => !c.you && c.notes?.length && c.members.filter(a => here.has(a)).length >= 1).map(c => `${names(g, c.members)} have a group chat of their own, without {{user}}${c.members.every(a => here.has(a)) ? '' : ` (${names(g, c.members.filter(a => here.has(a)))} here ${c.members.filter(a => here.has(a)).length > 1 ? 'are' : 'is'} in it)`}. Lately they talked there about: ${c.notes.slice(-3).map(x => x.text).join(' ')} They may refer to it; {{user}} has not read it.`);
});
/* ---------- a call for everyone ---------- */
async function call(g, w, c, host) {
    const day = g.day, now = nowAbs(g);
    const hostR = g.cast[host];
    const rooms = commonRooms(g, w).map(x => x.id);
    const acts = CP.CACTS.filter(a => a.room && rooms.includes(a.room) && a.id !== 'workout');
    if (!acts.length)
        return [];
    const act = acts[Math.floor(H(`${now}|cact`) * acts.length)];
    const fits = (r, h) => Array.from({ length: act.hours }, (_, k) => h + k).every(x => x < 24 && freeAt(g, w, r, day, x)) && !CP.takenBy(cplansOf(g), r.avatar, day * 1440 + h * 60, day * 1440 + (h + act.hours) * 60);
    const h0 = Math.floor(g.minutes / 60) + 2;
    const start = [19, 20, 21, 18, 17, 16, 15].filter(h => h >= h0 && h + act.hours <= 24).find(h => fits(hostR, h));
    if (start === undefined)
        return [];
    const from = day * 1440 + start * 60, to = from + act.hours * 60;
    const answers = {};
    const why = {};
    for (const a of c.members.filter(x => x !== host && g.cast[x])) {
        const r = g.cast[a];
        if (isSleeping(r, now) || whereNow(g, w, r) === OUT)
            continue; // asleep or out: they do not see it now
        const ans = C.callAnswer({ avatar: a, free: fits(r, start), social: P.profileOf(g, a)?.social ?? 50, withHost: pairValue(g, host, a) }, H(`${now}|${a}|call`));
        answers[a] = ans.yes ? 'yes' : 'no';
        if (!ans.yes)
            why[a] = ans.why;
    }
    const yes = Object.keys(answers).filter(a => answers[a] === 'yes');
    const x = chatsOf(g);
    const id = `k${now}`;
    const call = { id, chat: c.id, by: host, act: act.id, place: act.room, from, to, answers, why };
    if (yes.length) {
        const p = { id: `o${now}`, who: [host, ...yes].slice(0, 4), act: act.id, place: act.room, from, to, state: 'set', invite: host, asked: true };
        cplansOf(g).push(p);
        call.plan = p.id;
    }
    (x.calls ??= []).push(call);
    x.calls = x.calls.filter(k => k.to > now - 1440).slice(-10);
    const answered = Object.keys(answers).slice(0, 4);
    const place = (w.places.find(p => p.id === act.room)?.name ?? act.room).toLowerCase();
    const topic = `${hostR.name} invites everyone in the chat (${personaName()} too) to ${act.story} in the ${place} at ${hh(from)} today. Their answers are already decided: ${answered.length ? answered.map(a => `${g.cast[a].name} — ${answers[a] === 'yes' ? 'yes' : `no (${why[a]})`}`).join('; ') : 'nobody else has seen it yet'}. ${hostR.name} asks; the others answer exactly that way, in their own words. ${personaName()} has not answered.`;
    const msgs = await write(g, w, c, [host, ...answered], topic, []);
    tell(g, c, msgs);
    return msgs;
}
/** You answer a call (a button, or what you wrote in the chat). */
export function answerCall(g, w, id, yes) {
    const x = chatsOf(g);
    const k = (x.calls ?? []).find(c => c.id === id);
    if (!k || k.you)
        return '';
    k.you = yes ? 'yes' : 'no';
    if (!yes) {
        const p = cplansOf(g).find(q => q.id === k.plan);
        if (p)
            p.you = 'no';
        return '';
    }
    let p = cplansOf(g).find(q => q.id === k.plan);
    if (!p) {
        p = { id: `o${k.from}y`, who: [k.by], act: k.act, place: k.place, from: k.from, to: k.to, state: 'set', invite: k.by, asked: true };
        cplansOf(g).push(p);
        k.plan = p.id;
    }
    return joinPlan(g, w, p.id);
}
/** The open call in a chat that waits for your answer (null: none). */
export const pendingCall = (g, chatId) => { const now = nowAbs(g); return (chatsOf(g).calls ?? []).filter(k => k.chat === chatId && !k.you && k.from > now && !cplansOf(g).find(p => p.id === k.plan)?.you).at(-1) ?? null; };
export const callText = (g, w, k) => `${nameOf(g, k.by)}: ${CP.cactOf(k.act)?.name.toLowerCase()} at ${hh(k.from)}, the ${(w.places.find(p => p.id === k.place)?.name ?? k.place).toLowerCase()}`;
function tell(g, c, msgs) {
    if (!msgs.length)
        return;
    import('../ui/phone.js').then(({ P: ph }) => {
        if (ph.open && ph.app === 'gchat' && ph.who === c.id)
            social0(g, c.id);
        else
            toast(`${c.name} · ${nameOf(g, msgs[0].by)}: ${msgs[0].text.slice(0, 70)}`, 'info');
        saveGame();
        notify();
    }).catch(() => { saveGame(); });
}
const social0 = (g, id) => { const s = g.social; if (s?.unread)
    s.unread[unreadKey(id)] = 0; };
// The day's hours at midnight; a conversation when one comes.
onDay.push((g, w) => {
    if (!isScenario(w))
        return [];
    const x = chatsOf(g);
    x.talks = { day: g.day, hours: C.dayTalks(x.freq, (k) => H(`${g.world}|${g.day}|talk|${k}`)), done: [] };
    return [];
});
onHour.push((g, w) => {
    if (!isScenario(w) || g.asleep)
        return [];
    const x = chatsOf(g);
    const t = x.talks;
    if (!t || t.day !== g.day || x.freq === 'off')
        return [];
    const h = Math.floor(g.minutes / 60);
    const due = t.hours.find(x2 => x2 <= h && !t.done.includes(x2));
    if (due === undefined)
        return [];
    t.done.push(due);
    void startTalk(g, w).catch(e => console.warn('[Mundi Expanded] conversation', e));
    return [];
});
