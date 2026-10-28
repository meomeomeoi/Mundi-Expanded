// [expanded] Relationships between the characters (Mundi Expanded).
//
// Upstream Mundi keeps friendship and romance between the player and each character; ties between characters
// ("sister of", "friend of"…) are fixed labels with a tone. Here every pair of characters has a value that moves,
// and every move has a reason written down as a fact.
//
//  - A pair's value goes from -100 to 100 (symmetric: A→B is B→A). It starts from the tie's tone set when the Home
//    was made (close 60, good 30, neutral 0, tense -30, hostile -60); a pair with no tie starts at 0.
//  - Values move only with a fact (an episode). The one change without a fact is a slow drift back to the starting
//    value when a pair has had nothing happen for a week.
//  - Facts are about two or three characters. "standing" facts say what a relationship is and are written by the
//    player; "episodes" say what happened and are written at night. An episode can be pinned (made standing).
//  - Upstream ties stay in step: when a value crosses a threshold the tie's tone is rewritten, so upstream's
//    "Family and ties" line agrees; a tone changed by upstream or by hand re-anchors the value.
//
// This file is pure logic (no SillyTavern, no DOM), so it can be tested on its own. The AI calls and the hook-ups
// live in bondsnight.ts; the phone app in ui/bondsui.ts.

export type Tone = 'close' | 'good' | 'neutral' | 'tense' | 'hostile';
export const TONES: Tone[] = ['close', 'good', 'neutral', 'tense', 'hostile'];
export const ANCHOR: Record<Tone, number> = { close: 60, good: 30, neutral: 0, tense: -30, hostile: -60 };
/** Points per step: the AI gives steps from -3 to +3. */
export const STEP = 3;
/** A pair with nothing new for this many days drifts back toward where it started. */
export const QUIET_DAYS = 7;
const MAX_EPISODES = 300;

export const toneOf = (v: number): Tone => (v >= 45 ? 'close' : v >= 15 ? 'good' : v > -15 ? 'neutral' : v > -45 ? 'tense' : 'hostile');
export const WORDS: Record<Tone, string> = { close: 'very close', good: 'on good terms', neutral: 'neutral', tense: 'tense', hostile: 'hostile' };
export const wordOf = (v: number) => WORDS[toneOf(v)];

export type Life = 'off' | 'calm' | 'lively';
export const LIVES: [Life, string, string][] = [
    ['off', 'Off', 'Only what happens in your scenes changes their relationships.'],
    ['calm', 'Calm', 'Most nights nothing happens; at most one small everyday moment between two of them.'],
    ['lively', 'Lively', 'Up to three moments a night, now and then a bigger one.'],
];

export interface Pair { v: number; base: number; /** the tie's tone as last seen or written */ seen?: string; /** day of the last change */ changed?: number }
export interface BondFact {
    id: string; who: string[]; text: string; kind: 'standing' | 'episode'; day: number;
    /** episodes: the step it moved the pair(s) by */ delta?: number; src: 'user' | 'scene' | 'offscreen';
}
export interface Bonds { pairs: Record<string, Pair>; facts: BondFact[]; life: Life; seq: number; decayDay?: number; lastNight?: number; /** the player may change relationships in the app (off: look only) */ edit?: boolean }
export interface TieLike { a: string; b: string; type: string; tone: string }
export interface CastLike { avatar: string; name: string }
export interface GLike { day: number; cast: Record<string, CastLike>; living?: { ties?: TieLike[] }; bonds?: Bonds }
/** The player in ties and facts (as upstream writes it). The player's own friendship and romance stay upstream's. */
export const YOU = '__you';
export interface Change { who: string[]; names: string[]; delta: number; text: string; src: 'scene' | 'offscreen' }

export const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
export const pairsIn = (who: string[]): [string, string][] => {
    const out: [string, string][] = [];
    for (let i = 0; i < who.length; i++) for (let j = i + 1; j < who.length; j++) out.push([who[i], who[j]]);
    return out;
};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function bondsOf(g: GLike): Bonds {
    const b = (g.bonds ??= { pairs: {}, facts: [], life: 'calm', seq: 0 });
    b.pairs ??= {}; b.facts ??= []; b.life ??= 'calm'; b.seq ??= 0;
    return b;
}
const tieOf = (g: GLike, a: string, b: string) => (g.living?.ties ?? []).find(t => (t.a === a && t.b === b) || (t.a === b && t.b === a));
const isTone = (t: string): t is Tone => (TONES as string[]).includes(t);

// Reads upstream's ties: a pair seen for the first time, or whose tie's tone changed since we last saw or wrote it,
// is (re)anchored to that tone. Ties with the player ('__you') are upstream's business and stay out.
export function syncTies(g: GLike) {
    const b = bondsOf(g);
    for (const t of g.living?.ties ?? []) {
        if (t.a === t.b || !g.cast[t.a] || !g.cast[t.b] || !isTone(t.tone)) continue;
        const k = pairKey(t.a, t.b);
        const p = b.pairs[k];
        if (!p) { b.pairs[k] = { v: ANCHOR[t.tone], base: ANCHOR[t.tone], seen: t.tone }; continue; }
        if (p.seen !== t.tone) { p.v = ANCHOR[t.tone]; p.base = ANCHOR[t.tone]; p.seen = t.tone; }
    }
}

export function pairOf(g: GLike, a: string, b: string): Pair {
    const bs = bondsOf(g); const k = pairKey(a, b);
    if (!bs.pairs[k]) {
        const t = tieOf(g, a, b);
        const v = t && isTone(t.tone) ? ANCHOR[t.tone] : 0;
        bs.pairs[k] = { v, base: v, ...(t ? { seen: t.tone } : {}) };
    }
    return bs.pairs[k];
}
export const valueOf = (g: GLike, a: string, b: string) => pairOf(g, a, b).v;

// Writes a pair's tone back to upstream's tie when the value crossed into another tone (only for pairs that have a
// tie: a pair without one is not added to upstream's list).
function writeBack(g: GLike, a: string, b: string, p: Pair) {
    const t = tieOf(g, a, b); if (!t) return;
    const tone = toneOf(p.v);
    if (t.tone !== tone) t.tone = tone;
    p.seen = tone;
}

// Sets a pair's value by hand (the slider in the app). The new value also becomes where it drifts back to.
export function setValue(g: GLike, a: string, b: string, v: number) {
    const p = pairOf(g, a, b);
    p.v = clamp(Math.round(v), -100, 100); p.base = p.v; p.changed = g.day;
    writeBack(g, a, b, p);
}

/* ---------- status: upstream's ties (sister of, friend of, rival of…) ---------- */

export const statusOf = (g: GLike, a: string, b: string): TieLike | null => tieOf(g, a, b) ?? null;
// Sets (or, with an empty type, removes) the tie between two people, "a is <type> of b". Between characters the
// tie's tone follows the pair's value; a tie with the player keeps its tone (or starts neutral).
export function setStatus(g: GLike, a: string, b: string, type: string) {
    if (a === b || (a !== YOU && !g.cast[a]) || (b !== YOU && !g.cast[b])) return;
    const ties = ((g.living ??= {}).ties ??= []);
    const i = ties.findIndex(t => (t.a === a && t.b === b) || (t.a === b && t.b === a));
    const old = i >= 0 ? ties[i] : null;
    const npc = a !== YOU && b !== YOU;
    if (!type) {
        if (i >= 0) ties.splice(i, 1);
        if (npc) delete pairOf(g, a, b).seen;
        return;
    }
    const tone = npc ? toneOf(pairOf(g, a, b).v) : old?.tone ?? 'neutral';
    const t: TieLike = { a, b, type, tone };
    if (i >= 0) ties.splice(i, 1, t); else ties.push(t);
    if (npc) pairOf(g, a, b).seen = tone;   // our own write: not an outside change to re-anchor to
}

/* ---------- facts ---------- */

const newId = (b: Bonds) => `b${(++b.seq).toString(36)}`;
const cleanWho = (g: GLike, who: string[]) => [...new Set(who)].filter(a => !!g.cast[a]);
// facts may also be about the player (written by the player; the night never writes them)
const cleanWhoYou = (g: GLike, who: string[]) => [...new Set(who)].filter(a => a === YOU || !!g.cast[a]);

export function addFact(g: GLike, who: string[], text: string, kind: BondFact['kind'] = 'standing', src: BondFact['src'] = 'user', delta?: number): BondFact | null {
    const people = cleanWhoYou(g, who); const t = text.trim();
    if (people.length < 2 || people.length > 3 || !t) return null;
    const b = bondsOf(g);
    const f: BondFact = { id: newId(b), who: people, text: t, kind, day: g.day, src, ...(delta ? { delta } : {}) };
    b.facts.push(f);
    // only episodes are trimmed (oldest first); standing facts are the player's and are never dropped
    const eps = b.facts.filter(x => x.kind === 'episode');
    if (eps.length > MAX_EPISODES) { const drop = new Set(eps.slice(0, eps.length - MAX_EPISODES).map(x => x.id)); b.facts = b.facts.filter(x => !drop.has(x.id)); }
    return f;
}
export const factById = (g: GLike, id: string) => bondsOf(g).facts.find(f => f.id === id) ?? null;
export function editFact(g: GLike, id: string, text: string) { const f = factById(g, id); const t = text.trim(); if (f && t) f.text = t; return !!(f && t); }
export function removeFact(g: GLike, id: string) { const b = bondsOf(g); const n = b.facts.length; b.facts = b.facts.filter(f => f.id !== id); return b.facts.length < n; }
export function pinFact(g: GLike, id: string) { const f = factById(g, id); if (f) { f.kind = 'standing'; delete f.delta; } return !!f; }
export const factsOfPair = (g: GLike, a: string, b: string) => bondsOf(g).facts.filter(f => f.who.includes(a) && f.who.includes(b));
export const factsOfPerson = (g: GLike, a: string) => bondsOf(g).facts.filter(f => f.who.includes(a));

/* ---------- changes ---------- */

// Applies one moment: every pair among `who` moves by `steps` (-3…3) and the moment becomes an episode.
export function applyChange(g: GLike, who: string[], steps: number, text: string, src: 'scene' | 'offscreen'): Change | null {
    const people = cleanWho(g, who); const s = clamp(Math.round(steps), -3, 3);
    if (people.length < 2 || people.length > 3 || !text.trim()) return null;
    for (const [a, b] of pairsIn(people)) {
        const p = pairOf(g, a, b);
        if (s) { p.v = clamp(p.v + s * STEP, -100, 100); writeBack(g, a, b, p); }
        p.changed = g.day;
    }
    addFact(g, people, text, 'episode', src, s || undefined);
    return { who: people, names: people.map(a => g.cast[a].name), delta: s, text: text.trim(), src };
}

// Once a day: pairs with nothing new for a week drift one point back toward where they started. Safe to call more
// than once a day (it only runs once per day).
export function drift(g: GLike, day = g.day) {
    const b = bondsOf(g);
    if (b.decayDay === day) return;
    b.decayDay = day;
    for (const [k, p] of Object.entries(b.pairs)) {
        if (p.v === p.base || day - (p.changed ?? -Infinity) < QUIET_DAYS) continue;
        p.v += p.v > p.base ? -1 : 1;
        const [a, c] = k.split('|');
        if (g.cast[a] && g.cast[c]) writeBack(g, a, c, p);
    }
}

/* ---------- what the AI is told in a scene ---------- */

const PROMPT_CHARS = 2800;   // about 800 tokens
const fmtFact = (f: BondFact) => (f.kind === 'standing' ? f.text : `(day ${f.day}) ${f.text}`);

// The pairs of the people here (and what is known about them), then what the people here are known to feel about
// housemates who are not here; within a size budget, the closest things first.
export function bondsLines(g: GLike, present: string[], budget = PROMPT_CHARS): string[] {
    syncTies(g);
    const here = present.filter(a => g.cast[a]);
    if (!here.length) return [];
    const others = Object.keys(g.cast).filter(a => !here.includes(a));
    const lines: string[] = []; let size = 0, full = false; const used = new Set<string>();
    // once something does not fit, nothing after it goes in (a less important line must not take its place)
    const push = (l: string) => { if (full || size + l.length > budget) { full = true; return false; } lines.push(l); size += l.length; return true; };
    const name = (a: string) => g.cast[a].name;
    // 1) both here: how they get along, what their relationship is, what happened lately
    for (const [a, b] of pairsIn(here)) {
        const p = pairOf(g, a, b);
        const fs = factsOfPair(g, a, b).filter(f => !used.has(f.id));
        const standing = fs.filter(f => f.kind === 'standing');
        const recent = fs.filter(f => f.kind === 'episode').slice(-2);
        if (p.v === 0 && !standing.length && !recent.length) continue;
        const parts = [...standing, ...recent].map(fmtFact);
        if (!push(`${name(a)} & ${name(b)}: ${wordOf(p.v)}.${parts.length ? ` ${parts.join(' ')}` : ''}`)) break;
        [...standing, ...recent].forEach(f => used.add(f.id));
    }
    // 2) the player and the people here: what the player wrote about them (their closeness is upstream's line)
    for (const a of here) {
        if (full) break;
        const fs = factsOfPair(g, YOU, a).filter(f => !used.has(f.id) && f.who.every(x => x === YOU || here.includes(x)));
        if (!fs.length) continue;
        const shown = [...fs.filter(f => f.kind === 'standing'), ...fs.filter(f => f.kind === 'episode').slice(-2)];
        if (!push(`{{user}} & ${name(a)}: ${shown.map(fmtFact).join(' ')}`)) break;
        shown.forEach(f => used.add(f.id));
    }
    // 3) one here, one not: only what their relationship is (standing facts), so they can talk about each other
    for (const a of here) for (const b of others) {
        if (full) break;
        const standing = factsOfPair(g, a, b).filter(f => f.kind === 'standing' && !used.has(f.id));
        if (!standing.length) continue;
        if (!push(`${name(a)} about ${name(b)} (not here): ${wordOf(valueOf(g, a, b))}. ${standing.map(fmtFact).join(' ')}`)) break;
        standing.forEach(f => used.add(f.id));
    }
    return lines.length ? [`How the people here get along with each other:`, ...lines] : [];
}

/* ---------- the night: one AI call ---------- */

// The "# Personality { … }" part of a card written with headed sections; otherwise the start of the description.
export function personalityOf(description: string, personality = '', max = 700): string {
    const d = String(description ?? '');
    const m = d.match(/^#\s*Personality\b[^\n]*\n([\s\S]*?)(?=^#\s(?!#)|(?![\s\S]))/m);
    let text = m ? m[1] : (String(personality ?? '').trim() ? `${personality}\n${d}` : d);
    text = text.replace(/[{}]/g, ' ').replace(/\{\{\/\/[\s\S]*?\}\}/g, '').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
    return text.length > max ? `${text.slice(0, max).replace(/\s+\S*$/, '')}…` : text;
}

export interface NightInput {
    day: number; user: string; premise?: string;
    people: { avatar: string; name: string; personality: string }[];
    /** today's conversation, "Name: line" per line ('' when none) */ convo: string;
    /** who spoke today among the people */ spoke: string[];
    life: Life;
}
export const NIGHT_SYSTEM = 'You keep track of how the people sharing a house get along with each other. You are honest and sparing: most days little or nothing changes between them. You never invent what happened in a conversation.';

export function nightPrompt(g: GLike, n: NightInput): string {
    const name = (a: string) => g.cast[a]?.name ?? a;
    const ids = n.people.map(p => p.avatar);
    const rel: string[] = [];
    for (const [a, b] of pairsIn(ids)) {
        const p = pairOf(g, a, b); const fs = factsOfPair(g, a, b);
        const standing = fs.filter(f => f.kind === 'standing').map(f => f.text);
        const recent = fs.filter(f => f.kind === 'episode').slice(-3).map(fmtFact);
        if (p.v === 0 && !standing.length && !recent.length) continue;
        rel.push(`- ${name(a)} & ${name(b)}: ${wordOf(p.v)}.${standing.length ? ` Known: ${standing.join(' ')}` : ''}${recent.length ? ` Lately: ${recent.join(' ')}` : ''}`);
    }
    const scene = n.spoke.length >= 2 && n.convo.trim();
    const off = n.life === 'calm'
        ? 'Most nights nothing worth noting happens between them: then write NONE. At most ONE small everyday moment between two housemates (cooking together, a squabble over the bathroom, a game night, a borrowed sweater…), step -1 or +1.'
        : 'Up to THREE moments between housemates (two or three people each): everyday life, small kindnesses and annoyances; steps from -2 to +2, and now and then (not every night) one bigger moment of -3 or +3. NONE is fine on a quiet night.';
    return [
        `A house where these people live together${n.premise ? ` (${n.premise})` : ''}. Day ${n.day} has just ended. ${n.user} is the player: leave ${n.user} out, this is only about the others.`,
        '',
        'The people (only these):',
        ...n.people.map(p => `- ${p.name}: ${p.personality || '(no description)'}`),
        '',
        'How they get along now:',
        ...(rel.length ? rel : ['- nothing particular yet']),
        '',
        'PART 1 — today\'s scenes.',
        scene
            ? `What was said today:\n${n.convo}\n\nList what changed between these people (not with ${n.user}) because of today's scenes: only real moments that were in the conversation (a fight, a kindness, teasing that hurt, a shared laugh, help, a secret kept…). Step from -3 to +3. If nothing changed between them, write NONE.`
            : 'There were no scenes with two of them today: write NONE.',
        '',
        'PART 2 — life in the house without ' + n.user + '.',
        n.life === 'off' ? 'Turned off: write NONE.' : `${off} It must fit who they are and how they get along now, and not repeat what happened lately.`,
        '',
        'One moment per line, exactly like this (the sentence says what happened, short, in the past tense):',
        'Name & Name | +1 | what happened',
        'Name & Name & Name | -1 | what happened (three people)',
        'Write each sentence in the language the conversation is written in (English if there was none).',
        '',
        'Reply with only this:',
        'SCENE',
        '(lines or NONE)',
        'OFF-SCREEN',
        '(lines or NONE)',
    ].join('\n');
}

export interface Parsed { who: string[]; delta: number; text: string; src: 'scene' | 'offscreen' }
// Reads the night's reply. Lines naming anyone who is not one of `people` (or the player) are dropped, and the
// off-screen part is held to what the setting allows.
export function parseNight(raw: string, people: CastLike[], life: Life): Parsed[] {
    const text = String(raw ?? '').replace(/<(think|thinking|reasoning)>[\s\S]*?<\/\1>/gi, '');
    const find = (s: string): string | null => {
        const q = s.trim().replace(/^[*_"'`]+|[*_"'`]+$/g, '').toLowerCase(); if (!q) return null;
        const exact = people.filter(p => p.name.toLowerCase() === q);
        if (exact.length === 1) return exact[0].avatar;
        const loose = people.filter(p => { const n = p.name.toLowerCase(); return n.split(/\s+/)[0] === q || q.split(/\s+/)[0] === n || n.startsWith(q + ' ') || q.startsWith(n + ' '); });
        return loose.length === 1 ? loose[0].avatar : null;
    };
    let part: 'scene' | 'offscreen' | null = null;
    const out: Parsed[] = [];
    for (const line of text.split('\n')) {
        const l = line.trim().replace(/^[-*•]\s*/, '');
        if (/^#*\s*\**\s*off[\s-]?screen\b/i.test(l)) { part = 'offscreen'; continue; }
        if (/^#*\s*\**\s*scene\b/i.test(l)) { part = 'scene'; continue; }
        if (!part) continue;
        const m = l.match(/^(.+?)\s*\|\s*([+-]?\s*\d)\s*\|\s*(.+)$/);
        if (!m) continue;
        const names = m[1].split(/\s*(?:&|\+|,)\s*|\s+(?:and|и)\s+/i).filter(Boolean);   // (\b does not see Cyrillic letters)
        const who = names.map(find);
        if (who.some(x => !x) || new Set(who).size !== who.length || who.length < 2 || who.length > 3) continue;
        let delta = Number(m[2].replace(/\s/g, ''));
        if (!Number.isFinite(delta)) continue;
        delta = part === 'scene' ? clamp(delta, -3, 3) : life === 'calm' ? clamp(delta, -1, 1) : clamp(delta, -3, 3);
        out.push({ who: who as string[], delta, text: m[3].trim().replace(/^["“]|["”]$/g, ''), src: part });
    }
    // off-screen limits: off → none; calm → one, two people; lively → three, at most one of ±3
    const scene = out.filter(x => x.src === 'scene');
    let off = out.filter(x => x.src === 'offscreen');
    if (life === 'off') off = [];
    else if (life === 'calm') off = off.filter(x => x.who.length === 2).slice(0, 1);
    else {
        let big = 0;
        off = off.slice(0, 3).map(x => { if (Math.abs(x.delta) === 3) { big++; if (big > 1) return { ...x, delta: Math.sign(x.delta) * 2 }; } return x; });
    }
    return [...scene, ...off];
}
