export const MOODS = [['discreet', 'Discreet', 0.5], ['usual', 'Usual', 1], ['gossips', 'Gossips', 1.8]];
/** How fresh it is (1 new … 0 after two weeks). */
export const freshness = (day, since) => Math.max(0, 1 - Math.max(0, day - since) / 14);
/** The pieces still worth telling, juiciest first, at most `max`. */
export function alive(news, day, max) {
    return news.filter(n => n.pub !== 'public' && n.juicy * freshness(day, n.day) > 0.08)
        .sort((a, b) => b.juicy * freshness(day, b.day) - a.juicy * freshness(day, a.day)).slice(0, Math.max(0, max));
}
const loyaltyOf = (v) => (v >= 40 ? 0.25 : v >= 15 ? 0.6 : v <= -15 ? 1.4 : 1);
const trustOf = (v) => (v >= 45 ? 1 : v >= 15 ? 0.7 : v > -15 ? 0.35 : 0.1);
/** One night of gossip. */
export function spread(x) {
    const out = [];
    const mood = MOODS.find(m => m[0] === x.mood)?.[2] ?? 1;
    const told = new Set();
    const cap = x.perNight ?? 3;
    for (const n of alive(x.news, x.day, x.max)) {
        const fresh = freshness(x.day, n.day);
        const knowers = x.people.filter(a => n.parts.includes(a) || n.know?.[a]?.lvl === 'knows' || n.know?.[a]?.lvl === 'suspects');
        for (const a of knowers) {
            if (told.has(a) || out.length >= cap || x.quiet?.includes(a))
                continue;
            const mine = n.know?.[a];
            if (n.small && mine && mine.how !== 'saw')
                continue; // a small thing is told once
            const inIt = n.parts.includes(a);
            const loyal = n.parts.filter(p => p !== a).map(p => loyaltyOf(x.liking(a, p)));
            const loyalty = loyal.length ? loyal.reduce((s, v) => s + v, 0) / loyal.length : 1;
            for (const b of x.people) {
                if (b === a || n.parts.includes(b) || n.know?.[b] || out.some(o => o.news === n.id && o.to === b))
                    continue;
                const p = n.juicy * fresh * (1 - x.discreet(a) / 100) * loyalty * trustOf(x.trust(a, b)) * x.together(a, b) * mood
                    * (inIt ? (n.pub === 'private' ? 0.15 : 0.6) : 1) * (mine?.promised ? 0.08 : 1);
                if (x.roll(`${n.id}|${a}|${b}|${x.day}`) >= Math.min(0.9, p))
                    continue;
                const hops = inIt || mine?.how === 'saw' ? 1 : (mine?.hops ?? 1) + 1;
                out.push({ news: n.id, from: a, to: b, know: { lvl: mine?.lvl === 'suspects' ? 'suspects' : 'knows', how: hops <= 1 ? 'told' : 'heard', day: x.day, from: a, hops, ...(mine?.ver && !inIt ? { ver: mine.ver } : {}) } });
                told.add(a);
                break;
            }
        }
    }
    return out;
}
/** How juicy something is: a secret love most, a bad fight, a small kindness least. */
export function juiciness(o) {
    if (o.small)
        return 0.25;
    if (o.love)
        return o.secret ? 0.9 : 0.6;
    const d = Math.abs(o.delta ?? 0);
    return Math.min(1, (d >= 3 ? 0.75 : d >= 2 ? 0.55 : d >= 1 ? 0.3 : 0.2) + (o.secret ? 0.15 : 0));
}
/** A retold story from the third mouth on may name the wrong person. */
export function garble(text, parts, others, roll) {
    if (roll >= 0.35 || !parts.length || !others.length)
        return null;
    const who = parts[Math.floor(roll * 1000) % parts.length];
    const instead = others[Math.floor(roll * 7919) % others.length];
    return text.includes(who) ? text.replace(who, instead) : null;
}
