// [expanded] What a plan is for (Mundi Expanded): a movie night, cooking together, drinks out… and plans with
// several people at once.
//
//  - An activity is picked in the plan form (Home only). It names the plan (upstream's title) and has an effect when
//    the plan happens: on how you feel, a little more closeness, the house's things (cooking takes ingredients and
//    leaves leftovers, a movie night takes a snack) and money (out of the house, with money on).
//  - A group plan is one upstream plan per person, linked by a group id: each one is kept (or missed) on its own,
//    and the activity happens once, when the first of them arrives.
//  - Stored apart from upstream's plans (`g.plansx`, by plan id), so old saves and upstream's code are untouched.
//
// Pure logic (no SillyTavern), tested on its own; the clock and the scene in activityrun.ts, the form in activityui.ts.
import { doAction, blockedBy } from './stock.js';
import { moneyOn, walletAdd } from './money.js';
export const ACTIVITIES = [
    { id: 'movie', name: 'Movie night', icon: 'image', home: 'living', stats: { mood: 8, energy: -2 }, bond: 1, use: 'snack', story: 'a movie night: picking something to watch, snacks, the couch' },
    { id: 'cook', name: 'Cook together', icon: 'utensils', home: 'kitchen', stats: { hunger: 55, mood: 5 }, bond: 2, use: 'cook', story: 'cooking a meal together from what is in the kitchen, then eating it' },
    { id: 'games', name: 'Game night', icon: 'happy', home: 'living', stats: { mood: 8, energy: -3 }, bond: 2, story: 'a game night: board games, cards or video games, some friendly rivalry' },
    { id: 'workout', name: 'Work out together', icon: 'bolt', home: 'gym', stats: { mood: 6, energy: -12, hygiene: -20 }, bond: 1, story: 'working out together, cheering each other on' },
    { id: 'walk', name: 'A walk', icon: 'map', out: 'a walk around the neighbourhood', stats: { mood: 6, energy: -6 }, bond: 1, story: 'a walk together, talking on the way' },
    { id: 'cafe', name: 'Coffee out', icon: 'drop', out: 'a café downtown', stats: { mood: 5, energy: 10, thirst: 30 }, bond: 1, cost: 6, story: 'coffee out at a café' },
    { id: 'dinner', name: 'Dinner out', icon: 'utensils', out: 'a restaurant', stats: { hunger: 60, mood: 8 }, bond: 2, cost: 18, story: 'dinner out at a restaurant' },
    { id: 'drinks', name: 'Drinks', icon: 'sparkles', out: 'a bar', stats: { mood: 10, energy: -5, thirst: 20 }, bond: 1, cost: 12, story: 'drinks at a bar' },
    { id: 'groceries', name: 'Grocery run', icon: 'wallet', out: 'the supermarket', stats: { energy: -4 }, bond: 1, story: 'a grocery run together (the house\'s shopping)' },
];
export const actOf = (id) => ACTIVITIES.find(a => a.id === id) ?? null;
export const plansxOf = (g) => {
    const p = (g.plansx ??= { meta: {}, done: {} });
    p.meta ??= {};
    p.done ??= {};
    return p;
};
export function setMeta(g, id, m) {
    const clean = {};
    if (m.act && actOf(m.act))
        clean.act = m.act;
    if (m.group)
        clean.group = m.group;
    if (m.treat)
        clean.treat = true;
    if (clean.act || clean.group)
        plansxOf(g).meta[id] = clean;
}
export const metaOf = (g, id) => plansxOf(g).meta[id] ?? null;
// Old plans are forgotten with upstream's (it keeps the last few days of them).
export function tidy(g, liveIds, day) {
    const p = plansxOf(g);
    const keep = new Set(liveIds);
    for (const id of Object.keys(p.meta))
        if (!keep.has(id))
            delete p.meta[id];
    for (const [k, d] of Object.entries(p.done))
        if (day - d > 7) {
            delete p.done[k];
            if (p.notes)
                delete p.notes[k];
        }
}
// Before a home activity: why it would not work now ('' when it can). Cooking needs ingredients.
export const actBlocked = (g, a) => (a.use === 'cook' ? blockedBy(g, 'cook') : '');
/**
 * The activity happens: `key` is the group id (or the plan's own id), `people` how many came with you so far
 * (for your share or the whole bill). Once per key: later arrivals of a group only get the closeness.
 */
export function happen(g, a, key, people, treat, priceMult = 1, names = '') {
    const p = plansxOf(g);
    const out = { first: !(key in p.done), stats: {}, bond: a.bond + (treat ? 1 : 0), paid: 0, used: [], failed: '', lines: [] };
    if (!out.first)
        return out;
    p.done[key] = g.day;
    out.stats = { ...a.stats };
    if (a.use === 'cook') {
        out.used = doAction(g, 'cook');
        if (!out.used.length) {
            out.failed = 'There was nothing to cook with, so the plan turned into ordering in and talking instead.';
            out.stats = { mood: 3, hunger: 30 };
            out.bond = Math.max(1, out.bond - 1);
        }
    }
    else if (a.use === 'snack')
        out.used = doAction(g, 'snack');
    if (a.cost && moneyOn(g)) {
        const n = treat ? 1 + Math.max(0, people) : 1;
        const bill = Math.round(a.cost * priceMult * n);
        out.paid = Math.max(0, Math.min(bill, Math.floor(g.player.money ?? 0))); // never into the red: short, you pay what you have
        if (out.paid)
            walletAdd(g, -out.paid, treat ? `${a.name}: you paid for everyone` : `${a.name}: your share`);
        if (out.paid < bill)
            out.lines.push(`{{user}} was short of money for ${a.name.toLowerCase()} (${out.paid} of ${bill}); the others covered the rest.`);
    }
    (p.notes ??= {})[key] = [out.failed, out.used.length ? `They used: ${out.used.join(', ')}.` : ''].filter(Boolean).join(' ');
    out.lines.unshift(`${a.name}${names ? ` with ${names}` : ''}.${out.used.length ? ` Used: ${out.used.join(', ')}.` : ''}${out.failed ? ` ${out.failed}` : ''}${out.paid ? ` You paid ${out.paid}${treat ? ' for everyone' : ''}.` : ''}`);
    return out;
}
