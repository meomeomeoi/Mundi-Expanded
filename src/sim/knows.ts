// [expanded] Who knows what (Relationships 2.0, Mundi Expanded 0.2.0.8). Every relationship fact, status (a tie) and
// secret of yours has a publicity and the people who know it:
//
//  - public: the whole house knows (family, couples, exes, roommates, standing facts, ties that are not secret);
//  - witnessed: the ones in it, and whoever saw it or was told (a fight, a kind moment);
//  - private: a secret; the ones in it, and whoever found out.
//
// Someone knows something by being in it, by living in the house (public), by seeing it, by being told (first-hand
// from someone who was there) or by hearing it (second-hand and further, maybe garbled: `ver` is the version they
// heard). Or they only suspect it (one clue; a second makes it knowledge). Pure logic, tested on its own.

export type Pub = 'public' | 'witnessed' | 'private';
export type How = 'in' | 'house' | 'saw' | 'told' | 'heard';
export interface Know { lvl: 'suspects' | 'knows'; how: How; day: number; /** who told them */ from?: string; /** the version they heard, when it differs */ ver?: string; /** how many mouths it went through */ hops?: number; /** they promised to keep it */ promised?: boolean }
/** Anything that can be known: who it is about, how public it is, who else knows. */
export interface Knowable { parts: string[]; pub: Pub; know?: Record<string, Know>; day: number }

const RANK = { suspects: 1, knows: 2 } as const;
const GOOD: Record<How, number> = { in: 5, house: 4, saw: 3, told: 2, heard: 1 };
/** What `who` knows of it (null: nothing). */
export function knowOf(k: Knowable, who: string): Know | null {
    if (k.parts.includes(who)) return { lvl: 'knows', how: 'in', day: k.day };
    const own = k.know?.[who] ?? null;
    if (k.pub === 'public') return own && own.lvl === 'knows' ? own : { lvl: 'knows', how: 'house', day: k.day };
    return own;
}
export const knows = (k: Knowable, who: string) => knowOf(k, who)?.lvl === 'knows';
export const suspects = (k: Knowable, who: string) => knowOf(k, who)?.lvl === 'suspects';
/** `who` learns it, kept when it is more than they knew (knowing over suspecting, seeing over being told over
 *  hearing it second-hand). `store`: where the knowers are kept (the thing itself by default). True: changed. */
export function learn(k: Knowable, who: string, x: Know, store: { know?: Record<string, Know> } = k): boolean {
    if (k.parts.includes(who)) return false;
    const old = store.know?.[who];
    if (old && (RANK[old.lvl] > RANK[x.lvl] || (old.lvl === x.lvl && GOOD[old.how] >= GOOD[x.how]))) return false;
    (store.know ??= {})[who] = x;
    return true;
}
/** A suspicion seen a second time (another clue) becomes knowledge. */
export function clue(k: Knowable, who: string, day: number, store: { know?: Record<string, Know> } = k): 'suspects' | 'knows' | null {
    if (k.parts.includes(who)) return null;
    const old = store.know?.[who];
    if (old?.lvl === 'knows') return null;
    learn(k, who, { lvl: old ? 'knows' : 'suspects', how: 'saw', day }, store);
    return old ? 'knows' : 'suspects';
}
/** Who among `people` does not know it (they are not in it and have not found out). */
export const unaware = (k: Knowable, people: string[]) => people.filter(a => !knows(k, a));
/** How someone knows it, in words for the AI and for you ("saw it", "Kathie told her", "heard it third-hand"). */
export function howText(x: Know, nameOf: (a: string) => string): string {
    if (x.lvl === 'suspects') return 'only suspects it';
    if (x.how === 'saw') return 'saw it';
    if (x.how === 'told') return x.from ? `${nameOf(x.from)} told them` : 'was told';
    if (x.how === 'heard') return (x.hops ?? 2) >= 3 ? 'heard it third-hand or further (details may be wrong)' : 'heard it second-hand';
    return x.how === 'house' ? 'everyone in the house knows' : 'was there';
}

/* ---------- ties (statuses) ---------- */

/** A tie between two people (upstream's "sister of", "dating"…): known to the house unless it is a secret. */
export interface TieK { a: string; b: string; type: string; tone: string; secret?: boolean; know?: Record<string, Know>; day?: number }
export const tieK = (t: TieK): Knowable => ({ parts: [t.a, t.b], pub: t.secret ? 'private' : 'public', know: t.know, day: t.day ?? 0 });
/** Kinds of ties the house talks about when the two are not there (a friend of is not news). */
export const NEWSY = new Set(['parent', 'child', 'sibling', 'spouse', 'partner', 'dating', 'cousin', 'ex', 'rival', 'enemy', 'roommate', 'bestfriend']);
