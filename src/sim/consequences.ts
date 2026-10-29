// [expanded] What finding out does (Relationships 2.0, part 4; Mundi Expanded 0.2.0.8). Rules decide, the AI words it.
//
//  - Someone finds out their partner is seeing someone else behind their back: a big drop with both, and they need to
//    talk with the partner (unfinished business: it does not drift away until it is talked out).
//  - A partner of yours finds out you are also with someone: upstream's jealousy, now when they find out.
//  - "You knew and said nothing": those close to the hurt one who knew before are resented a little, trusted less.
//  - Someone finds out a small thing done to them (a borrowed sweater, a broken mug): a little sourness.
//  - Whoever talked about a secret may be found out by the people it is about: less trust, a little anger.
//  - A secret couple steady for weeks may tell the house on their own; the secret is over.
import { saveGame, toast, type Save } from '../core/store.js';
import { isScenario } from '../core/world.js';
import { personaName } from '../st/bridge.js';
import { onDay } from './hooks.js';
import { partnersOf, foundOut, polyHouseOn } from './romance.js';
import { bondsOf, applyChange, addTrust, valueOf, YOU, type GLike, type TieLike, type Talk, type Small } from './bonds.js';
import { knowOf, type Knowable } from './knows.js';
import { LOVE } from './secrets.js';

const G = (g: Save) => g as unknown as GLike;
const H = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; return (h >>> 0) / 4294967296; };
const N = (g: Save, a: string) => (a === YOU ? personaName() : g.cast[a]?.name ?? a);
/** Who a character is with in the house (their love ties). */
export const loversOf = (g: Save, a: string) => ((G(g).living?.ties ?? []) as TieLike[]).filter(t => LOVE.has(t.type) && (t.a === a || t.b === a)).map(t => (t.a === a ? t.b : t.a)).filter(x => x === YOU || g.cast[x]);

export interface Found { id: string; parts: string[]; text: string; love: boolean; k: Knowable; small?: Small }
/** Someone (not you) has just found out. */
export function react(g: Save, it: Found, who: string) {
    if (who === YOU || !g.cast[who] || it.parts.includes(who)) return;
    if (it.love && it.parts.includes(YOU)) {   // your secret romance
        const a = it.parts.find(x => x !== YOU)!;
        if (partnersOf(g).includes(who)) { const t = foundOut(g, who, a); if (t) toast(t, 'warn', { ms: 9000 }); silent(g, it, who); }
        return;
    }
    if (it.love && !polyHouseOn(g)) for (const p of it.parts) {   // [expanded] 14.3: open in the house: not cheating
        if (!loversOf(g, who).includes(p)) continue;
        const other = it.parts.find(x => x !== p)!;
        applyChange(G(g), [who, p], -3, `${N(g, who)} found out that ${N(g, p)} is seeing ${N(g, other)} behind their back.`, 'offscreen', { pub: 'witnessed' });
        if (g.cast[other]) applyChange(G(g), [who, other], -2, `${N(g, who)} found out about ${N(g, other)} and ${N(g, p)}.`, 'offscreen', { pub: 'witnessed' });
        openTalk(g, who, p, `${N(g, p)} and ${N(g, other)}`);
        silent(g, it, who);
    }
    if (it.small?.about === who && g.cast[it.small.who]) {
        applyChange(G(g), [who, it.small.who], -1, `${N(g, who)} found out that ${N(g, it.small.who)} ${it.small.text}, and said nothing about it.`, 'offscreen', { pub: 'witnessed' });
        addTrust(G(g), who, it.small.who, -8);
    }
}
// those close to the hurt one who knew before, and said nothing
function silent(g: Save, it: Found, who: string) {
    for (const x of Object.keys(g.cast)) {
        if (x === who || it.parts.includes(x)) continue;
        const k = knowOf(it.k, x); if (!k || k.lvl !== 'knows' || k.how === 'house' || k.day >= g.day || valueOf(G(g), who, x) < 30) continue;
        applyChange(G(g), [who, x], -1, `${N(g, who)} learned that ${N(g, x)} knew about ${it.text.toLowerCase()} and said nothing.`, 'offscreen', { pub: 'witnessed' });
        addTrust(G(g), who, x, -15);
    }
}
/** Whoever talked was found out by the people it is about (now and then). */
export function caughtTalking(g: Save, it: Found, from: string, to: string) {
    for (const p of it.parts) {
        if (!g.cast[p] || p === from || H(`${g.world}|${g.day}|${it.id}|${p}|${from}|caught`) >= 0.3) continue;
        addTrust(G(g), p, from, -20);
        applyChange(G(g), [p, from], -1, `${N(g, p)} found out that ${N(g, from)} told ${N(g, to)} about ${it.text.toLowerCase()}.`, 'offscreen', { pub: 'witnessed' });
    }
}
/** Someone needs to talk with someone (about something): unfinished business until they do. */
export function openTalk(g: Save, a: string, b: string, about: string) {
    const x = (bondsOf(G(g)).talk ??= []);
    if (x.some(t => (t.a === a && t.b === b) || (t.a === b && t.b === a))) return;
    x.push({ id: `k${g.day}${x.length}`, a, b, about, day: g.day }); if (x.length > 8) x.splice(0, x.length - 8);
}
export const talksOf = (g: Save): Talk[] => bondsOf(G(g)).talk ?? [];
export function closeTalk(g: Save, id: string) { const b = bondsOf(G(g)); b.talk = (b.talk ?? []).filter(t => t.id !== id); }

/** For the scene: unfinished business with the people here; small secrets the people here carry or know. */
export function consequenceLines(g: Save, present: string[]): string[] {
    const out: string[] = [];
    for (const t of talksOf(g)) {
        const ia = present.includes(t.a) || t.a === YOU, ib = present.includes(t.b) || t.b === YOU;
        if (!ia && !ib) continue;
        const a = t.a === YOU ? '{{user}}' : N(g, t.a), b = t.b === YOU ? '{{user}}' : N(g, t.b);
        out.push(ia && ib ? `${a} needs to talk with ${b} about ${t.about}: it has been on their mind, and it may come up now.` : `${ia ? a : b} has unfinished business with ${ia ? b : a} (about ${t.about}): cold on that subject until they talk.`);
    }
    for (const s of (bondsOf(G(g)).small ?? []).filter(x => g.day - x.day <= 10)) {
        const k: Knowable = { parts: [s.who], pub: 'private', know: s.know, day: s.day };
        if (present.includes(s.who)) { const un = present.filter(a => a !== s.who && !knowOf(k, a)); if (un.length) out.push(`${N(g, s.who)} is keeping something small to themselves: ${N(g, s.who)} ${s.text}${s.about ? ` (it was ${N(g, s.about)}'s)` : ''}. ${un.map(a => N(g, a)).join(', ')} ${un.length > 1 ? 'do' : 'does'} not know.`); continue; }
        for (const a of present) { const x = knowOf(k, a); if (x?.lvl === 'knows') { out.push(`${N(g, a)} knows that ${N(g, s.who)} ${x.ver ?? s.text}.`); break; } }
    }
    return out.slice(0, 5);
}

// each day: a steady secret couple may tell the house; unfinished business left a week may get talked out off-screen
onDay.push((g, w) => {
    if (!isScenario(w)) return [];
    const out: string[] = [];
    for (const t of (G(g).living?.ties ?? []) as TieLike[]) {
        if (!t.secret || !LOVE.has(t.type) || !g.cast[t.a] || !g.cast[t.b]) continue;
        if (g.day - (t.day ?? g.day) < 21 || valueOf(G(g), t.a, t.b) < 50 || H(`${g.world}|${g.day}|${t.a}|${t.b}|out`) >= 0.04) continue;
        delete t.secret; delete t.know;
        applyChange(G(g), [t.a, t.b], 1, `${N(g, t.a)} and ${N(g, t.b)} told everyone they are together.`, 'offscreen', { pub: 'public' });
        out.push(`${N(g, t.a)} and ${N(g, t.b)} told the house they are together.`);
    }
    for (const t of talksOf(g)) if (g.day - t.day >= 7 && H(`${g.world}|${g.day}|${t.id}|lapse`) < 0.12) {
        closeTalk(g, t.id);
        if (g.cast[t.a] && g.cast[t.b]) applyChange(G(g), [t.a, t.b], 0, `${N(g, t.a)} and ${N(g, t.b)} finally talked about ${t.about}.`, 'offscreen');
    }
    if (out.length) saveGame();
    return out;
});
