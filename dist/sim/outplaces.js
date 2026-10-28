// Pictures are paths inside the modern world (bg/…); the UI turns them into addresses.
export const STARTERS = [
    { name: 'a café downtown', bg: 'bg/cafe.jpg' },
    { name: 'a restaurant', bg: 'bg/pl_cafes.jpg' },
    { name: 'a bar', bg: 'bg/waterfront.jpg' },
    { name: 'the supermarket', bg: 'bg/mh_market.jpg' },
    { name: 'the shopping mall', bg: 'bg/mall.jpg' },
    { name: 'the cinema', bg: 'bg/cinema.jpg' },
    { name: 'the park', bg: 'bg/park.jpg' },
    { name: 'the beach', bg: 'bg/beach.jpg' },
    { name: 'a walk around the neighbourhood', bg: 'bg/mh_plaza.jpg' },
    { name: 'the amusement park', bg: 'bg/ferris.jpg' },
    { name: 'the gym', bg: 'bg/gym.jpg' },
    { name: 'the library', bg: 'bg/mh_library.jpg' },
    { name: 'the electronics store', bg: 'bg/downtown.jpg' }, // [expanded] 0.2.0.7: shops for things
    { name: 'a furniture store', bg: 'bg/gv_store.jpg' },
    { name: 'the flea market', bg: 'bg/pl_boardwalk.jpg' },
];
export const MAX_SAVED = 24;
export const norm = (s) => String(s ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
export const outxOf = (g) => { const o = (g.outx ??= { places: [], hidden: [] }); o.places ??= []; o.hidden ??= []; return o; };
/** You went there (or changed its picture while there): remembered, most used first. */
export function rememberPlace(g, name, bg, counts = true) {
    const t = String(name ?? '').trim().replace(/\s+/g, ' ').slice(0, 80);
    if (!t)
        return;
    const o = outxOf(g);
    let p = o.places.find(x => norm(x.name) === norm(t));
    if (!p) {
        p = { name: t, bg: '', n: 0, last: g.day };
        o.places.push(p);
    }
    if (bg)
        p.bg = bg;
    if (counts) {
        p.n++;
        p.last = g.day;
    }
    o.hidden = o.hidden.filter(h => h !== norm(t));
    o.places.sort((a, b) => b.n - a.n || b.last - a.last);
    if (o.places.length > MAX_SAVED)
        o.places.length = MAX_SAVED;
}
/** A saved place is forgotten; a starter is hidden. */
export function forgetPlace(g, name) {
    const o = outxOf(g);
    const k = norm(name);
    o.places = o.places.filter(p => norm(p.name) !== k);
    if (STARTERS.some(s => norm(s.name) === k) && !o.hidden.includes(k))
        o.hidden.push(k);
}
/** What the dialog shows: your places, then the starters you have not used or hidden. `starterBg` turns a starter's
 *  picture into an address ('' when the modern world is not there). */
export function shownPlaces(g, starterBg) {
    const o = outxOf(g);
    const isStarter = (n) => STARTERS.some(s => norm(s.name) === norm(n));
    const mine = o.places.map(p => ({ name: p.name, bg: p.bg || starterBgOf(p.name, starterBg), saved: true, starter: isStarter(p.name) }));
    const rest = STARTERS.filter(s => !o.hidden.includes(norm(s.name)) && !o.places.some(p => norm(p.name) === norm(s.name)))
        .map(s => ({ name: s.name, bg: starterBg(s.bg), saved: false, starter: true }));
    return [...mine, ...rest];
}
export const starterBgOf = (name, starterBg) => { const s = STARTERS.find(x => norm(x.name) === norm(name)); return s ? starterBg(s.bg) : ''; };
/** The picture for a place by its name (yours, or a starter's), for going out without one picked. */
export function bgFor(g, name, starterBg) {
    const p = outxOf(g).places.find(x => norm(x.name) === norm(name));
    return p?.bg || starterBgOf(name, starterBg);
}
