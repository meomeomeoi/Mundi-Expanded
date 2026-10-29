export const LOVE_TIERS = [[0, 'nothing'], [15, 'interest'], [40, 'a crush'], [70, 'in love']];
export const loveWord = (v) => [...LOVE_TIERS].reverse().find(([lo]) => v >= lo)[1];
export const CRUSH = 40;
export const loveOf = (g) => { const b = (g.bonds ??= {}); const x = (b.love ??= { v: {} }); x.v ??= {}; return x; };
export const lk = (a, b) => `${a}>${b}`;
export const feelings = (g, a, b) => loveOf(g).v[lk(a, b)] ?? 0;
export const flirtOn = (g) => loveOf(g).on !== false;
/** Can `a` (orientation, gender) fall for `b` (gender)? Unknown either way: yes. */
export function canFall(orient, ga, gb) {
    if (orient === 'ace')
        return false;
    if (!orient || orient === 'bi' || orient === 'pan' || orient === 'unsure' || !gb)
        return true;
    if (orient === 'gay')
        return ga === 'f' ? gb === 'f' : gb === 'm' || (ga === '' && gb !== 'f');
    if (orient === 'lesbian')
        return gb === 'f';
    if (orient === 'straight')
        return !ga || gb === 'nb' ? true : ga !== gb;
    return true;
}
/** A night's step: +/- up to 3 steps of 5 points; slower for someone taken (a partner outside the house). */
export function grow(g, a, b, steps, day, o) {
    if (!flirtOn(g) || !o.can || a === b)
        return 0;
    const s = Math.max(-3, Math.min(3, Math.round(steps)));
    if (!s)
        return 0;
    const x = loveOf(g);
    const k = lk(a, b);
    const d = s * (s > 0 && o.taken ? 2 : 5);
    const before = x.v[k] ?? 0;
    x.v[k] = Math.max(0, Math.min(100, before + d));
    if (s > 0)
        (x.fed ??= {})[k] = day;
    return x.v[k] - before;
}
/** Each day: feelings nobody fed for two weeks fade a point (a couple's do not: their status keeps them). */
export function fade(g, day, together) {
    const x = loveOf(g);
    for (const [k, v] of Object.entries(x.v)) {
        const [a, b] = k.split('>');
        if (!v || together(a, b) || day - (x.fed?.[k] ?? -99) < 14)
            continue;
        x.v[k] = v - 1;
        if (!x.v[k])
            delete x.v[k];
    }
}
/** Two people who both have a crush on each other (a couple may form, by the night's rules). */
export const mutual = (g, a, b) => feelings(g, a, b) >= CRUSH && feelings(g, b, a) >= CRUSH;
/** "SPARK | A > B | +2 | what" (or A <> B for both ways): whose feelings grew for whom. */
export function parseSparks(raw, find) {
    const out = [];
    for (const line of String(raw ?? '').split('\n')) {
        const p = line.trim().replace(/^[-*•]\s*/, '').split('|').map(x => x.trim());
        if ((p[0] ?? '').toUpperCase() !== 'SPARK' || p.length < 3)
            continue;
        const both = /<->|<>|↔|&/.test(p[1]);
        const [x, y] = p[1].split(/\s*(?:<->|<>|↔|->|>|→|&)\s*/).map(find);
        const d = Number(String(p[2]).replace(/\s/g, ''));
        if (!x || !y || x === y || !Number.isFinite(d) || !d)
            continue;
        out.push({ a: x, b: y, d, text: p[3] ?? '' });
        if (both)
            out.push({ a: y, b: x, d, text: p[3] ?? '' });
    }
    return out.slice(0, 6);
}
/** How someone takes flirting from you right now (for the scene): welcome, flustered, or uncomfortable. */
export function flirtMood(o) {
    if (o.grudge || o.partnerHere || (o.taken && o.romance < 40))
        return 'uncomfortable';
    return o.romance >= 40 ? 'welcome' : o.romance >= 15 ? 'flustered' : 'uncomfortable';
}
/** Who knows about a's feelings for b (the holder learn() writes into). */
export const loveKnow = (g, a, b) => { const x = loveOf(g); return ((x.know ??= {})[lk(a, b)] ??= {}); };
