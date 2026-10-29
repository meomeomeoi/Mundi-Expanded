// [expanded] 0.2.1-14: Memory (pure: no game, no SillyTavern). Four layers, each with its own fate:
//  - Landmarks: moments that matter (weight from the night's reader, 1–5; at the threshold or above) or that you
//    pinned: never forgotten. From time to time they are folded into a short "story so far" (you and each person;
//    each person's own), which is what the AI reads, plus whatever is pinned or newer than the story.
//  - Episodes: ordinary moments; they fade with time (a half-life), the heavier ones slower.
//  - What they know about each other: small lasting facts (a new one may replace an old one).
//  - Who they have become: steps of change, only added (never rewritten), each earned by what happened, at most one
//    per person every few days. You keep, edit or delete any of it.
export const PRESETS = [
    ['light', 'Light', { on: true, diary: 1, landmark: 5, half: 4, every: 7, story: 4, arc: 14 }],
    ['normal', 'Normal', { on: true, diary: 2, landmark: 4, half: 7, every: 5, story: 6, arc: 7 }],
    ['rich', 'Rich', { on: true, diary: 4, landmark: 4, half: 14, every: 3, story: 10, arc: 5 }],
];
export const DEFAULT = PRESETS[1][2];
/** The memory settings kept in a save (missing: the defaults). */
export const memCfgOf = (g) => ({ ...DEFAULT, ...(g?.memx?.cfg ?? {}) });
export const presetOf = (c) => PRESETS.find(p => Object.keys(p[2]).every(k => p[2][k] === c[k]))?.[0] ?? 'custom';
/** An episode's weight: the reader's, else from how much it moved them. */
export const weightOf = (f) => f.w ?? Math.min(4, Math.max(1, Math.abs(f.delta ?? 0) + 1));
/** How alive an episode is now: weight halved every `half` days (people here: it is fresher in mind). */
export const alive = (w, age, half, here = false) => w * Math.pow(0.5, Math.max(0, age) / Math.max(1, half * (here ? 1.5 : 1)));
/** Shown while alive enough (a weight-1 moment: that day; a 3: a few half-lives). */
export const SHOW = 1;
export const isLandmark = (f, c) => f.kind === 'standing' || (f.w ?? 0) >= c.landmark;
/** Episodes to show for a pair: landmarks not yet folded into a story, and the ordinary ones still alive (newest). */
export function liveEpisodes(fs, day, c, here = false, max = 4, folded = () => false) {
    const eps = fs.filter(f => f.kind === 'episode');
    const marks = eps.filter(f => isLandmark(f, c) && !folded(f));
    const rest = eps.filter(f => !isLandmark(f, c) && alive(weightOf(f), day - f.day, c.half, here) >= SHOW);
    return [...marks, ...rest.slice(-Math.max(0, max - marks.length))].sort((a, b) => a.day - b.day);
}
const strip = (raw) => String(raw ?? '').replace(/<(think|thinking|reasoning)>[\s\S]*?<\/\1>/gi, '');
const cell = (s) => s.trim().replace(/^[*_"'`«“]+|[*_"'`»”]+$/g, '').trim();
const wOf = (s) => { const n = Number(String(s).replace(/[^\d]/g, '')); return n >= 1 && n <= 5 ? n : null; };
/** Lines that are not the asked form are skipped; a reply with none of the forms (and no NONE) is not an answer. */
export function parseMemNight(raw, find) {
    const out = { moments: [], rates: [], knows: [], changes: [], none: false };
    for (const line of strip(raw).split('\n')) {
        const l = line.trim().replace(/^[-*•\d.)\s]+(?=[A-Z])/, '').replace(/\*\*/g, '');
        if (/^none\.?$/i.test(l)) {
            out.none = true;
            continue;
        }
        const p = l.split('|').map(cell);
        const head = (p[0] ?? '').toUpperCase();
        if (head === 'MOMENT' && p.length >= 4) {
            const who = find(p[1]), w = wOf(p[2]);
            if (who && w && p[3])
                out.moments.push({ who, w, text: p.slice(3).join(' | ').slice(0, 300) });
        }
        else if (head === 'RATE' && p.length >= 3) {
            const i = Number(p[1].replace(/[^\d]/g, '')), w = wOf(p[2]);
            if (i >= 1 && w)
                out.rates.push({ i: i - 1, w });
        }
        else if (head === 'KNOWS' && p.length >= 4) {
            const who = find(p[1]), about = find(p[2]);
            if (!who || !about || who === about || !p[3])
                continue;
            const rep = p.slice(4).join(' ').match(/\b(k\d+)\b/i);
            out.knows.push({ who, about, text: p[3].slice(0, 200), ...(rep ? { replaces: rep[1].toLowerCase() } : {}) });
        }
        else if (head === 'CHANGE' && p.length >= 3) {
            const who = find(p[1]);
            if (who && p[2])
                out.changes.push({ who, text: p.slice(2).join(' | ').slice(0, 300) });
        }
    }
    return out;
}
export const answered = (o) => o.none || o.moments.length + o.rates.length + o.knows.length + o.changes.length > 0;
/** STORY | Name | text (you and them); OWN | Name | text (their own). */
export function parseStories(raw, find) {
    const out = { pair: {}, own: {} };
    for (const line of strip(raw).split('\n')) {
        const l = line.trim().replace(/^[-*•\s]+/, '').replace(/\*\*/g, '');
        const p = l.split('|').map(cell);
        const head = (p[0] ?? '').toUpperCase();
        if ((head === 'STORY' || head === 'OWN') && p.length >= 3) {
            const who = find(p[1]);
            const t = p.slice(2).join(' | ').trim();
            if (who && t.length >= 20)
                (head === 'STORY' ? out.pair : out.own)[who] = t.slice(0, 1600);
        }
    }
    return out;
}
/** May this person take a step of change tonight? Not too soon after the last, and only with something behind it. */
export const mayChange = (lastStep, day, every, evidence) => evidence && (lastStep === undefined || day - lastStep >= every);
/** Roughly how many tokens a text costs (4 characters a token). */
export const tokens = (s) => Math.ceil(String(s ?? '').length / 4);
