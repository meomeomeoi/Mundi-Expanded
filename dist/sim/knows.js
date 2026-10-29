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
const RANK = { suspects: 1, knows: 2 };
const GOOD = { in: 5, house: 4, saw: 3, told: 2, heard: 1 };
/** What `who` knows of it (null: nothing). */
export function knowOf(k, who) {
    if (k.parts.includes(who))
        return { lvl: 'knows', how: 'in', day: k.day };
    const own = k.know?.[who] ?? null;
    if (k.pub === 'public')
        return own && own.lvl === 'knows' ? own : { lvl: 'knows', how: 'house', day: k.day };
    return own;
}
export const knows = (k, who) => knowOf(k, who)?.lvl === 'knows';
export const suspects = (k, who) => knowOf(k, who)?.lvl === 'suspects';
/** `who` learns it, kept when it is more than they knew (knowing over suspecting, seeing over being told over
 *  hearing it second-hand). `store`: where the knowers are kept (the thing itself by default). True: changed. */
export function learn(k, who, x, store = k) {
    if (k.parts.includes(who))
        return false;
    const old = store.know?.[who];
    if (old && (RANK[old.lvl] > RANK[x.lvl] || (old.lvl === x.lvl && GOOD[old.how] >= GOOD[x.how])))
        return false;
    (store.know ??= {})[who] = x;
    return true;
}
/** A suspicion seen a second time (another clue) becomes knowledge. */
export function clue(k, who, day, store = k) {
    if (k.parts.includes(who))
        return null;
    const old = store.know?.[who];
    if (old?.lvl === 'knows')
        return null;
    learn(k, who, { lvl: old ? 'knows' : 'suspects', how: 'saw', day }, store);
    return old ? 'knows' : 'suspects';
}
/** Who among `people` does not know it (they are not in it and have not found out). */
export const unaware = (k, people) => people.filter(a => !knows(k, a));
/** How someone knows it, in words for the AI and for you ("saw it", "Kathie told her", "heard it third-hand"). */
export function howText(x, nameOf) {
    if (x.lvl === 'suspects')
        return 'only suspects it';
    if (x.how === 'saw')
        return 'saw it';
    if (x.how === 'told')
        return x.from ? `${nameOf(x.from)} told them` : 'was told';
    if (x.how === 'heard')
        return (x.hops ?? 2) >= 3 ? 'heard it third-hand or further (details may be wrong)' : 'heard it second-hand';
    return x.how === 'house' ? 'everyone in the house knows' : 'was there';
}
export const tieK = (t) => ({ parts: [t.a, t.b], pub: t.secret ? 'private' : 'public', know: t.know, day: t.day ?? 0 });
/** Kinds of ties the house talks about when the two are not there (a friend of is not news). */
export const NEWSY = new Set(['parent', 'child', 'sibling', 'spouse', 'partner', 'dating', 'cousin', 'ex', 'rival', 'enemy', 'roommate', 'bestfriend']);
