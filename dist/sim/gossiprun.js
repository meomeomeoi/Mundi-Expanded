// [expanded] News in the house at runtime (Relationships 2.0, part 3; rules in gossip.ts): each night what is going
// around passes from those who know to those who spent time with them (yesterday's plans, their own group chats);
// you hear it from the ones close to you, in a scene with them (they bring it up when the people it is about are not
// around). Out of the house with a secret partner, now and then "someone saw you two in town" reaches the house.
import { saveGame, toast } from '../core/store.js';
import { isScenario } from '../core/world.js';
import { personaName } from '../st/bridge.js';
import { onDay, onHour } from './hooks.js';
import { housePlan } from './lifeday.js';
import { isOuting } from './places.js';
import { outingOf } from './outing.js';
import { bondOf } from './social.js';
import { profileOf, discreetOf } from './profile.js';
import { bondsOf, factK, valueOf, trustOf, tieWord, YOU } from './bonds.js';
import { learn, knows, tieK } from './knows.js';
import { spread, juiciness, garble } from './gossip.js';
import { LOVE } from './secrets.js';
import { react, caughtTalking } from './consequences.js';
const G = (g) => g;
const H = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
} h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
export const gossipOf = (g) => { const b = bondsOf(G(g)); const x = (b.gossip ??= {}); x.mood ??= 'usual'; x.max ??= 6; x.tell ??= {}; return x; };
const nm = (g, a) => (a === YOU ? personaName() : g.cast[a]?.name ?? a);
export function newsOf(g) {
    const b = bondsOf(G(g));
    const out = [];
    for (const f of b.facts) {
        const k = factK(f);
        if (k.pub === 'public')
            continue;
        out.push({ id: f.id, parts: f.who, pub: k.pub, know: f.know, day: f.day, juicy: juiciness({ delta: f.delta, secret: k.pub === 'private' }), text: `${f.who.map(a => nm(g, a)).join(' & ')}: ${f.text}`, k, store: f });
    }
    for (const t of (G(g).living?.ties ?? [])) {
        if (!t.secret || (t.a !== YOU && !g.cast[t.a]) || (t.b !== YOU && !g.cast[t.b]))
            continue;
        out.push({ id: `t:${t.a}|${t.b}`, parts: [t.a, t.b], pub: 'private', know: t.know, day: t.day ?? 0, juicy: juiciness({ love: LOVE.has(t.type), secret: true, delta: 2 }), text: tieWord(t, (a) => nm(g, a)), k: tieK(t), store: t, love: LOVE.has(t.type) });
    }
    for (const [a, h] of Object.entries(b.hide ?? {}))
        if (g.cast[a])
            out.push({ id: `h:${a}`, parts: [YOU, a], pub: 'private', know: h.know, day: h.day, juicy: 0.9, text: `${nm(g, YOU)} and ${nm(g, a)} are together`, k: { parts: [YOU, a], pub: 'private', know: h.know, day: h.day }, store: h, love: true });
    // [expanded] small secrets: told once, then they stop
    for (const x of b.small ?? [])
        if (g.cast[x.who])
            out.push({ id: x.id, parts: [x.who], pub: 'private', know: x.know, day: x.day, juicy: juiciness({ small: true }), small: true, text: `${nm(g, x.who)} ${x.text}`, k: { parts: [x.who], pub: 'private', know: x.know, day: x.day }, store: x, smallOf: x });
    return out;
}
// who spent time with whom on a day (the plans: an hour or more awake in the same room), their own group chats, and
// for you: the scenes you were in with them that day
async function togetherOn(g, day) {
    const { getWorld } = await import('../core/world.js');
    const w = getWorld(g.world);
    const plan = housePlan(g, w, day);
    const met = new Map();
    for (const [a, sa] of Object.entries(plan))
        for (const [b, sb] of Object.entries(plan)) {
            if (a >= b)
                continue;
            let n = 0;
            for (let h = 0; h < 24; h++) {
                const x = sa[h], y = sb[h];
                if (x && y && !x.asleep && !y.asleep && x.kind !== 'out' && x.loc === y.loc)
                    n++;
            }
            if (n)
                met.set(`${a}|${b}`, n);
        }
    const { chatsOf } = await import('./chatrun.js');
    const own = chatsOf(g).chats.filter(c => !c.you);
    const { chat } = await import('../st/bridge.js');
    const withYou = new Set(chat().filter(m => Math.floor((m.extra?.mundi_at ?? -1) / 1440) === day).flatMap(m => m.extra?.mundi_here ?? []));
    return (a, b) => {
        if (a === YOU || b === YOU) {
            const o = a === YOU ? b : a;
            return withYou.has(o) ? 1 : 0.3;
        }
        const n = met.get(a < b ? `${a}|${b}` : `${b}|${a}`) ?? 0;
        const chat0 = own.some(c => c.members.includes(a) && c.members.includes(b)) ? 0.8 : 0;
        return Math.max(n >= 2 ? 1 : n ? 0.7 : 0.12, chat0);
    };
}
/** One night of news going around (the day that ended). Short notes of what changed (for the console). */
export async function gossipNight(g, day) {
    const x = gossipOf(g);
    if (x.last === day)
        return [];
    x.last = day;
    const items = newsOf(g);
    if (!items.length)
        return [];
    const together = await togetherOn(g, day);
    const people = [...Object.keys(g.cast), YOU];
    const likeYou = (a) => (bondOf(g, a) - 50) * 2;
    const told = spread({
        news: items, people, day, mood: x.mood, max: x.max, quiet: [YOU],
        discreet: (a) => discreetOf(profileOf(g, a)),
        liking: (a, b) => (a === YOU ? 0 : b === YOU ? likeYou(a) : valueOf(G(g), a, b)),
        trust: (a, b) => (b === YOU ? likeYou(a) : a === YOU ? 0 : trustOf(G(g), a, b)),
        together, roll: (k) => H(`${g.world}|${k}`),
    });
    const notes = [];
    for (const t of told) {
        const it = items.find(i => i.id === t.news);
        if ((t.know.hops ?? 1) >= 3) {
            const v = garble(t.know.ver ?? it.text, it.parts.map(a => nm(g, a)), Object.keys(g.cast).filter(a => !it.parts.includes(a)).map(a => nm(g, a)), H(`${g.world}|${t.news}|${t.to}|garble`));
            if (v)
                t.know.ver = v;
        }
        if (t.to === YOU) {
            x.tell[t.from] = { news: t.news, text: t.know.ver ?? it.text, day };
            notes.push(`${nm(g, t.from)} has news for you`);
            continue;
        }
        if (learn(it.k, t.to, t.know, it.store)) {
            notes.push(`${nm(g, t.from)} → ${nm(g, t.to)}: ${it.text}`);
            const f = { id: it.id, parts: it.parts, text: it.text, love: !!it.love, k: it.k, ...(it.smallOf ? { small: it.smallOf } : {}) };
            if (t.know.lvl === 'knows')
                react(g, f, t.to);
            if (it.pub === 'private')
                caughtTalking(g, f, t.from, t.to);
        }
    }
    // news for you that waited three days without a chance goes stale
    for (const [a, v] of Object.entries(x.tell))
        if (day - v.day > 3 || !g.cast[a])
            delete x.tell[a];
    if (notes.length)
        console.info('[Mundi Expanded] news in the house:', notes);
    return notes;
}
onDay.push((g, w) => { if (isScenario(w))
    void gossipNight(g, g.day - 1).then(n => { if (n.length)
        saveGame(); }).catch(e => console.warn('[Mundi Expanded] gossip', e)); return []; });
/** For the scene: who here has news for you (they bring it up when the people it is about are not around). */
export function tellLines(g, present) {
    const x = gossipOf(g);
    const out = [];
    for (const a of present) {
        const t = x.tell[a];
        if (!t)
            continue;
        const it = newsOf(g).find(i => i.id === t.news);
        if (!it || it.parts.some(p => present.includes(p)))
            continue;
        out.push(`${nm(g, a)} has news for {{user}} and brings it up when they can, in a low voice: ${t.text}.`);
    }
    return out;
}
/** A scene line with someone who has news for you, without the people it is about: now you know. */
export function hearNews(g, here) {
    const x = gossipOf(g);
    for (const a of here) {
        const t = x.tell[a];
        if (!t)
            continue;
        const it = newsOf(g).find(i => i.id === t.news);
        if (!it) {
            delete x.tell[a];
            continue;
        }
        if (it.parts.some(p => here.includes(p)))
            continue;
        delete x.tell[a];
        if (learn(it.k, YOU, { lvl: 'knows', how: it.k.parts.includes(a) || it.store.know?.[a]?.how === 'saw' ? 'told' : 'heard', from: a, day: g.day, ...(t.text !== it.text ? { ver: t.text } : {}) }, it.store))
            setTimeout(() => toast(`${nm(g, a)} told you: ${t.text}.`, 'info', { ms: 9000 }), 1500);
    }
}
// out of the house with a secret partner: now and then someone sees you two, and it reaches the house as a vague story
onHour.push((g, w) => {
    if (!isScenario(w) || !isOuting(g.player.loc))
        return [];
    const hide = bondsOf(G(g)).hide ?? {};
    for (const a of outingOf(g)?.with ?? []) {
        const h = hide[a];
        if (!h || H(`${g.world}|${g.day}|${g.minutes}|${a}|town`) >= 0.006)
            continue;
        const k = { parts: [YOU, a], pub: 'private', know: h.know, day: h.day };
        const who = Object.keys(g.cast).filter(x => x !== a && !knows(k, x));
        const b = who[Math.floor(H(`${g.day}|${a}|towho`) * who.length)];
        if (b)
            learn(k, b, { lvl: 'suspects', how: 'heard', day: g.day, hops: 2, ver: `heard someone saw ${nm(g, YOU)} and ${nm(g, a)} out in town, close` }, h);
    }
    return [];
});
