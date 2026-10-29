// [expanded] Feelings between the characters (Mundi Expanded 0.2.0.9): romance as its own axis, one way. Kathie's
// feelings for Leah are not Leah's for Kathie, the way upstream's romance with you is a character's feelings for you.
// Liking (bonds.ts) says how they get along; this says whether there is more. It grows from the moments the night
// reader notes (flirting, a look held too long, a kiss), only where it fits who they are (orientation and gender in
// their profiles; someone with a partner outside the house grows slower), and fades slowly when nothing feeds it.
// A crush is unspoken until it is confessed; two crushes and a reason make a couple (the night's bigger change).
// Your own feelings for someone are not a number: you set them (Relationships), so the house can notice them.
import type { Know } from './knows.js';

export type Gender = '' | 'f' | 'm' | 'nb';
export type Orient = '' | 'straight' | 'gay' | 'lesbian' | 'bi' | 'pan' | 'ace' | 'unsure';
export const LOVE_TIERS: [number, string][] = [[0, 'nothing'], [15, 'interest'], [40, 'a crush'], [70, 'in love']];
export const loveWord = (v: number) => [...LOVE_TIERS].reverse().find(([lo]) => v >= lo)![1];
export const CRUSH = 40;
export interface LoveX {
    /** "a>b": a's feelings for b, 0–100 */ v: Record<string, number>;
    /** "a>b": when it last grew (for the fading) */ fed?: Record<string, number>;
    /** "a>b": said out loud (confessed) */ said?: Record<string, number>;
    /** "a>b": who else knows about a's feelings for b */ know?: Record<string, { know?: Record<string, Know> }>;
    /** your own feelings, by avatar: set by you */ mine?: Record<string, { lvl: 'like' | 'love'; secret: boolean; day: number; know?: Record<string, Know> }>;
    /** flirting and romance on at all (the master switch) */ on?: boolean;
}
export type GL = { bonds?: { love?: LoveX } };
export const loveOf = (g: GL): LoveX => { const b = ((g as any).bonds ??= {}); const x = (b.love ??= { v: {} }); x.v ??= {}; return x; };
export const lk = (a: string, b: string) => `${a}>${b}`;
export const feelings = (g: GL, a: string, b: string) => loveOf(g).v[lk(a, b)] ?? 0;
export const flirtOn = (g: GL) => loveOf(g).on !== false;

/** Can `a` (orientation, gender) fall for `b` (gender)? Unknown either way: yes. */
export function canFall(orient: Orient, ga: Gender, gb: Gender): boolean {
    if (orient === 'ace') return false;
    if (!orient || orient === 'bi' || orient === 'pan' || orient === 'unsure' || !gb) return true;
    if (orient === 'gay') return ga === 'f' ? gb === 'f' : gb === 'm' || (ga === '' && gb !== 'f');
    if (orient === 'lesbian') return gb === 'f';
    if (orient === 'straight') return !ga || gb === 'nb' ? true : ga !== gb;
    return true;
}
/** A night's step: +/- up to 3 steps of 5 points; slower for someone taken (a partner outside the house). */
export function grow(g: GL, a: string, b: string, steps: number, day: number, o: { can: boolean; taken: boolean }): number {
    if (!flirtOn(g) || !o.can || a === b) return 0;
    const s = Math.max(-3, Math.min(3, Math.round(steps))); if (!s) return 0;
    const x = loveOf(g); const k = lk(a, b); const d = s * (s > 0 && o.taken ? 2 : 5);
    const before = x.v[k] ?? 0; x.v[k] = Math.max(0, Math.min(100, before + d));
    if (s > 0) (x.fed ??= {})[k] = day;
    return x.v[k] - before;
}
/** Each day: feelings nobody fed for two weeks fade a point (a couple's do not: their status keeps them). */
export function fade(g: GL, day: number, together: (a: string, b: string) => boolean) {
    const x = loveOf(g);
    for (const [k, v] of Object.entries(x.v)) {
        const [a, b] = k.split('>'); if (!v || together(a, b) || day - (x.fed?.[k] ?? -99) < 14) continue;
        x.v[k] = v - 1; if (!x.v[k]) delete x.v[k];
    }
}
/** Two people who both have a crush on each other (a couple may form, by the night's rules). */
export const mutual = (g: GL, a: string, b: string) => feelings(g, a, b) >= CRUSH && feelings(g, b, a) >= CRUSH;

/** "SPARK | A > B | +2 | what" (or A <> B for both ways): whose feelings grew for whom. */
export function parseSparks(raw: string, find: (n: string) => string | null): { a: string; b: string; d: number; text: string }[] {
    const out: { a: string; b: string; d: number; text: string }[] = [];
    for (const line of String(raw ?? '').split('\n')) {
        const p = line.trim().replace(/^[-*•]\s*/, '').split('|').map(x => x.trim()); if ((p[0] ?? '').toUpperCase() !== 'SPARK' || p.length < 3) continue;
        const both = /<->|<>|↔|&/.test(p[1]);
        const [x, y] = p[1].split(/\s*(?:<->|<>|↔|->|>|→|&)\s*/).map(find);
        const d = Number(String(p[2]).replace(/\s/g, '')); if (!x || !y || x === y || !Number.isFinite(d) || !d) continue;
        out.push({ a: x, b: y, d, text: p[3] ?? '' }); if (both) out.push({ a: y, b: x, d, text: p[3] ?? '' });
    }
    return out.slice(0, 6);
}
/** How someone takes flirting from you right now (for the scene): welcome, flustered, or uncomfortable. */
export function flirtMood(o: { romance: number; partnerHere: boolean; taken: boolean; grudge: boolean }): 'welcome' | 'flustered' | 'uncomfortable' {
    if (o.grudge || o.partnerHere || (o.taken && o.romance < 40)) return 'uncomfortable';
    return o.romance >= 40 ? 'welcome' : o.romance >= 15 ? 'flustered' : 'uncomfortable';
}
/** Who knows about a's feelings for b (the holder learn() writes into). */
export const loveKnow = (g: GL, a: string, b: string) => { const x = loveOf(g); return ((x.know ??= {})[lk(a, b)] ??= {}); };
/** "NIGHT | A & B | where | secret": two spent the night together in today's scenes. */
export function parseNights(raw: string, find: (n: string) => string | null): { who: string[]; where: string; secret: boolean }[] {
    const out: { who: string[]; where: string; secret: boolean }[] = [];
    for (const line of String(raw ?? '').split('\n')) {
        const p = line.trim().replace(/^[-*•]\s*/, '').split('|').map(x => x.trim()); if ((p[0] ?? '').toUpperCase() !== 'NIGHT' || p.length < 2) continue;
        const who = p[1].split(/\s*(?:&|\+|,)\s*|\s+(?:and|и)\s+/i).map(find).filter(Boolean) as string[];
        if (who.length >= 2 && new Set(who).size === who.length) out.push({ who: who.slice(0, 3), where: p[2] ?? '', secret: /secret|тайн/i.test(p[3] ?? p[2] ?? '') });
    }
    return out.slice(0, 2);
}
