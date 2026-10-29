// [expanded] How news travels in the house (Relationships 2.0, part 3; Mundi Expanded 0.2.0.8). Pure rules, tested.
//
// Each night, for every piece of news that is still alive (not known to everyone, not gone cold) and everyone who
// knows it, the chance to tell someone who does not is
//
//     juiciness · freshness · (1 - discretion) · loyalty to the people it is about · trust in the listener ·
//     opportunity · the house's mood (discreet, usual, gossips) · (a promise to keep it: almost nothing)
//
//  - Nobody tells the people it is about. The ones in a secret rarely talk (a best friend, now and then).
//  - Opportunity: time together that day (the plans), their own group chat (fast), else a word in passing (rare).
//  - Only the juiciest few are alive at once (the setting): a new big one pushes out an old small one; a small
//    secret is told once and stops there. At most a few new knowers a night, at most one per teller.
//  - Told by someone who was there: "told" (first-hand). Retold: "heard", one more mouth each time; from the third
//    mouth on, the story may come out wrong (the runtime garbles the version).
import type { Know, Pub } from './knows.js';

export type Mood = 'discreet' | 'usual' | 'gossips';
export const MOODS: [Mood, string, number][] = [['discreet', 'Discreet', 0.5], ['usual', 'Usual', 1], ['gossips', 'Gossips', 1.8]];
export interface News { id: string; parts: string[]; pub: Pub; know?: Record<string, Know>; day: number; juicy: number; small?: boolean }
export interface GossipIn {
    news: News[]; people: string[]; day: number; mood: Mood; max: number; perNight?: number; /** who never tells here (you: you tell in scenes) */ quiet?: string[];
    discreet: (a: string) => number;            // 0–100
    liking: (a: string, b: string) => number;   // -100…100 (the teller toward the people it is about)
    trust: (a: string, b: string) => number;    // -100…100 (the teller toward the listener)
    together: (a: string, b: string) => number; // 0–1, the day's opportunity
    roll: (k: string) => number;
}
export interface Told { news: string; from: string; to: string; know: Know }

/** How fresh it is (1 new … 0 after two weeks). */
export const freshness = (day: number, since: number) => Math.max(0, 1 - Math.max(0, day - since) / 14);
/** The pieces still worth telling, juiciest first, at most `max`. */
export function alive(news: News[], day: number, max: number): News[] {
    return news.filter(n => n.pub !== 'public' && n.juicy * freshness(day, n.day) > 0.08)
        .sort((a, b) => b.juicy * freshness(day, b.day) - a.juicy * freshness(day, a.day)).slice(0, Math.max(0, max));
}
const loyaltyOf = (v: number) => (v >= 40 ? 0.25 : v >= 15 ? 0.6 : v <= -15 ? 1.4 : 1);
const trustOf = (v: number) => (v >= 45 ? 1 : v >= 15 ? 0.7 : v > -15 ? 0.35 : 0.1);

/** One night of gossip. */
export function spread(x: GossipIn): Told[] {
    const out: Told[] = []; const mood = MOODS.find(m => m[0] === x.mood)?.[2] ?? 1;
    const told = new Set<string>(); const cap = x.perNight ?? 3;
    for (const n of alive(x.news, x.day, x.max)) {
        const fresh = freshness(x.day, n.day);
        const knowers = x.people.filter(a => n.parts.includes(a) || n.know?.[a]?.lvl === 'knows' || n.know?.[a]?.lvl === 'suspects');
        for (const a of knowers) {
            if (told.has(a) || out.length >= cap || x.quiet?.includes(a)) continue;
            const mine = n.know?.[a];
            if (n.small && mine && mine.how !== 'saw') continue;   // a small thing is told once
            const inIt = n.parts.includes(a);
            const loyal = n.parts.filter(p => p !== a).map(p => loyaltyOf(x.liking(a, p)));
            const loyalty = loyal.length ? loyal.reduce((s, v) => s + v, 0) / loyal.length : 1;
            for (const b of x.people) {
                if (b === a || n.parts.includes(b) || n.know?.[b] || out.some(o => o.news === n.id && o.to === b)) continue;
                const p = n.juicy * fresh * (1 - x.discreet(a) / 100) * loyalty * trustOf(x.trust(a, b)) * x.together(a, b) * mood
                    * (inIt ? (n.pub === 'private' ? 0.15 : 0.6) : 1) * (mine?.promised ? 0.08 : 1);
                if (x.roll(`${n.id}|${a}|${b}|${x.day}`) >= Math.min(0.9, p)) continue;
                const hops = inIt || mine?.how === 'saw' ? 1 : (mine?.hops ?? 1) + 1;
                out.push({ news: n.id, from: a, to: b, know: { lvl: mine?.lvl === 'suspects' ? 'suspects' : 'knows', how: hops <= 1 ? 'told' : 'heard', day: x.day, from: a, hops, ...(mine?.ver && !inIt ? { ver: mine.ver } : {}) } });
                told.add(a); break;
            }
        }
    }
    return out;
}

/** How juicy something is: a secret love most, a bad fight, a small kindness least. */
export function juiciness(o: { love?: boolean; secret?: boolean; delta?: number; small?: boolean }): number {
    if (o.small) return 0.25;
    if (o.love) return o.secret ? 0.9 : 0.6;
    const d = Math.abs(o.delta ?? 0);
    return Math.min(1, (d >= 3 ? 0.75 : d >= 2 ? 0.55 : d >= 1 ? 0.3 : 0.2) + (o.secret ? 0.15 : 0));
}
/** A retold story from the third mouth on may name the wrong person. */
export function garble(text: string, parts: string[], others: string[], roll: number): string | null {
    if (roll >= 0.35 || !parts.length || !others.length) return null;
    const who = parts[Math.floor(roll * 1000) % parts.length]; const instead = others[Math.floor(roll * 7919) % others.length];
    return text.includes(who) ? text.replace(who, instead) : null;
}
