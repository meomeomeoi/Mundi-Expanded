// [expanded] 0.2.1-13: the day's conversations, cut into scenes (pure: no game, no SillyTavern).
// Each line in a Home carries where it was said, who was there and when (witness.ts stamps it). A new scene starts
// when you are somewhere else, after a long pause, or when almost everyone around you is new. Someone coming in or
// leaving is a mark inside the scene; a line or two said next door before coming straight back is an aside, not a
// scene of its own.
export const GAP = 60; // game minutes of silence in the same place: a new scene
export const ASIDE_LINES = 2; // a quick trip next door: at most this many lines…
export const ASIDE_MIN = 15; // …and back within this many minutes
const shared = (a, b) => a.filter(x => b.includes(x)).length;
/** Almost everyone is new: both groups have people, and fewer than half of the bigger one stayed. */
export const newCompany = (prev, cur) => prev.length > 0 && cur.length > 0 && shared(prev, cur) * 2 < Math.max(prev.length, cur.length);
/** Entries in chat order → scenes. */
export function cutScenes(entries) {
    const runs = [];
    for (const e of entries) {
        const last = runs.at(-1);
        if (last && (e.loc === null || last.loc === null || e.loc === last.loc)) {
            if (last.loc === null)
                last.loc = e.loc;
            last.e.push(e);
        }
        else
            runs.push({ loc: e.loc, e: [e] });
    }
    // 2) a short run between two runs of the same place, all within a few minutes: an aside
    const asideOf = new Map();
    for (let k = 1; k < runs.length - 1; k++) {
        const a = runs[k - 1], b = runs[k], c = runs[k + 1];
        if (a.loc === null || a.loc !== c.loc || b.e.length > ASIDE_LINES)
            continue;
        const away = c.e[0].at - a.e.at(-1).at;
        if (away > ASIDE_MIN)
            continue;
        for (const e of b.e)
            asideOf.set(e.i, b.loc ?? '');
        a.e.push(...b.e, ...c.e);
        runs.splice(k, 2);
        k--;
    }
    // 3) scenes: a new place, a long pause, or a new company
    const out = [];
    for (const r of runs) {
        let cur = null;
        let here = [];
        let lastAt = -1;
        for (const e of r.e) {
            const aside = asideOf.has(e.i);
            const stamped = e.loc !== null;
            const pause = stamped && lastAt >= 0 && e.at - lastAt > GAP;
            const company = stamped && !aside && cur !== null && newCompany(here, e.here);
            if (!cur || pause || company) {
                cur = { start: e.i, end: e.i, lines: [], loc: r.loc ?? '', from: stamped ? e.at : 0, to: stamped ? e.at : 0, first: stamped ? [...e.here] : [], all: [], marks: [], aside: {}, stamped };
                out.push(cur);
                here = stamped ? [...e.here] : [];
            }
            else if (stamped && !aside) {
                const came = e.here.filter(x => !here.includes(x)), left = here.filter(x => !e.here.includes(x));
                if (came.length || left.length)
                    cur.marks.push({ i: e.i, came, left });
                here = [...e.here];
            }
            cur.lines.push(e.i);
            cur.end = e.i;
            if (stamped) {
                cur.stamped = true;
                cur.to = e.at;
                if (!cur.from)
                    cur.from = e.at;
                for (const x of e.here)
                    if (!cur.all.includes(x))
                        cur.all.push(x);
                lastAt = e.at;
            }
            if (aside)
                cur.aside[e.i] = asideOf.get(e.i);
        }
    }
    return out;
}
/**
 * For the prompt: the chat lines the people here could not have heard (a scene earlier today with none of them in
 * it). 'shared' keeps the scenes you had alone (your own continuity); 'strict' drops those too. The scene going on
 * now is always kept.
 */
export function unheard(scenes, present, mode) {
    const out = new Set();
    if (mode === 'all' || !present.length)
        return out; // alone: nobody to let it slip to
    for (const s of scenes.slice(0, -1)) {
        if (!s.stamped)
            continue;
        if (!s.all.length) {
            if (mode === 'strict' && present.length)
                s.lines.forEach(i => out.add(i));
            continue;
        }
        if (!shared(s.all, present))
            s.lines.forEach(i => out.add(i));
    }
    return out;
}
