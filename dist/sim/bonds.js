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
export const TONES = ['close', 'good', 'neutral', 'tense', 'hostile'];
export const ANCHOR = { close: 60, good: 30, neutral: 0, tense: -30, hostile: -60 };
/** Points per step: the AI gives steps from -3 to +3. */
export const STEP = 3;
/** A pair with nothing new for this many days drifts back toward where it started. */
export const QUIET_DAYS = 7;
const MAX_EPISODES = 300;
export const toneOf = (v) => (v >= 45 ? 'close' : v >= 15 ? 'good' : v > -15 ? 'neutral' : v > -45 ? 'tense' : 'hostile');
export const WORDS = { close: 'very close', good: 'on good terms', neutral: 'neutral', tense: 'tense', hostile: 'hostile' };
export const wordOf = (v) => WORDS[toneOf(v)];
export const LIVES = [
    ['off', 'Off', 'Only what happens in your scenes changes their relationships.'],
    ['calm', 'Calm', 'Most nights nothing happens; at most one small everyday moment between two of them.'],
    ['lively', 'Lively', 'Up to three moments a night, now and then a bigger one.'],
];
/** [expanded] 0.2.0.8: trust between two characters (-100…100; unset: as much as they like each other). */
export const trustOf = (g, a, b) => { const p = bondsOf(g).pairs[pairKey(a, b)]; return p ? p.t ?? p.v : 0; };
export function addTrust(g, a, b, d) { const p = pairOf(g, a, b); p.t = clamp(Math.round((p.t ?? p.v) + d), -100, 100); }
/** The player in ties and facts (as upstream writes it). The player's own friendship and romance stay upstream's. */
export const YOU = '__you';
export const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
export const pairsIn = (who) => {
    const out = [];
    for (let i = 0; i < who.length; i++)
        for (let j = i + 1; j < who.length; j++)
            out.push([who[i], who[j]]);
    return out;
};
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
import { knowOf, knows, unaware, tieK, howText, NEWSY } from './knows.js';
import { liveEpisodes, isLandmark, memCfgOf } from './memory.js'; // [expanded] 0.2.1-14
/** [expanded] 0.2.1-14: a landmark already told by a story the AI reads now (the story of someone here). Pinned: never. */
export function foldedHere(f, here) {
    if (f.kind === 'standing' || !f.foldedIn?.length)
        return false;
    return f.who.includes(YOU) ? f.who.some(a => a !== YOU && here.includes(a) && f.foldedIn.includes(`you|${a}`)) : f.who.some(a => here.includes(a) && f.foldedIn.includes(`own|${a}`));
}
/** [expanded] 0.2.0.8: a fact as something known (standing facts are public unless set otherwise; episodes witnessed). */
export const factK = (f) => ({ parts: f.who, pub: f.pub ?? (f.kind === 'standing' ? 'public' : 'witnessed'), know: f.know, day: f.day });
export function bondsOf(g) {
    const b = (g.bonds ??= { pairs: {}, facts: [], life: 'calm', seq: 0 });
    b.pairs ??= {};
    b.facts ??= [];
    b.life ??= 'calm';
    b.seq ??= 0;
    return b;
}
const tieOf = (g, a, b) => (g.living?.ties ?? []).find(t => (t.a === a && t.b === b) || (t.a === b && t.b === a));
const isTone = (t) => TONES.includes(t);
// Reads upstream's ties: a pair seen for the first time, or whose tie's tone changed since we last saw or wrote it,
// is (re)anchored to that tone. Ties with the player ('__you') are upstream's business and stay out.
export function syncTies(g) {
    const b = bondsOf(g);
    for (const t of g.living?.ties ?? []) {
        if (t.a === t.b || !g.cast[t.a] || !g.cast[t.b] || !isTone(t.tone))
            continue;
        const k = pairKey(t.a, t.b);
        const p = b.pairs[k];
        if (!p) {
            b.pairs[k] = { v: ANCHOR[t.tone], base: ANCHOR[t.tone], seen: t.tone };
            continue;
        }
        if (p.seen !== t.tone) {
            p.v = ANCHOR[t.tone];
            p.base = ANCHOR[t.tone];
            p.seen = t.tone;
        }
    }
}
export function pairOf(g, a, b) {
    const bs = bondsOf(g);
    const k = pairKey(a, b);
    if (!bs.pairs[k]) {
        const t = tieOf(g, a, b);
        const v = t && isTone(t.tone) ? ANCHOR[t.tone] : 0;
        bs.pairs[k] = { v, base: v, ...(t ? { seen: t.tone } : {}) };
    }
    return bs.pairs[k];
}
export const valueOf = (g, a, b) => pairOf(g, a, b).v;
// Writes a pair's tone back to upstream's tie when the value crossed into another tone (only for pairs that have a
// tie: a pair without one is not added to upstream's list).
function writeBack(g, a, b, p) {
    const t = tieOf(g, a, b);
    if (!t)
        return;
    const tone = toneOf(p.v);
    if (t.tone !== tone)
        t.tone = tone;
    p.seen = tone;
}
// Sets a pair's value by hand (the slider in the app). The new value also becomes where it drifts back to.
export function setValue(g, a, b, v) {
    const p = pairOf(g, a, b);
    p.v = clamp(Math.round(v), -100, 100);
    p.base = p.v;
    p.changed = g.day;
    writeBack(g, a, b, p);
}
/* ---------- status: upstream's ties (sister of, friend of, rival of…) ---------- */
export const statusOf = (g, a, b) => tieOf(g, a, b) ?? null;
// Sets (or, with an empty type, removes) the tie between two people, "a is <type> of b". Between characters the
// tie's tone follows the pair's value; a tie with the player keeps its tone (or starts neutral).
export function setStatus(g, a, b, type) {
    if (a === b || (a !== YOU && !g.cast[a]) || (b !== YOU && !g.cast[b]))
        return;
    const ties = ((g.living ??= {}).ties ??= []);
    const i = ties.findIndex(t => (t.a === a && t.b === b) || (t.a === b && t.b === a));
    const old = i >= 0 ? ties[i] : null;
    const npc = a !== YOU && b !== YOU;
    if (!type) {
        if (i >= 0)
            ties.splice(i, 1);
        if (npc)
            delete pairOf(g, a, b).seen;
        return;
    }
    const tone = npc ? toneOf(pairOf(g, a, b).v) : old?.tone ?? 'neutral';
    const t = { a, b, type, tone };
    if (i >= 0)
        ties.splice(i, 1, t);
    else
        ties.push(t);
    if (npc)
        pairOf(g, a, b).seen = tone; // our own write: not an outside change to re-anchor to
}
/* ---------- facts ---------- */
const newId = (b) => `b${(++b.seq).toString(36)}`;
const cleanWho = (g, who) => [...new Set(who)].filter(a => !!g.cast[a]);
// facts may also be about the player (written by the player; the night never writes them)
const cleanWhoYou = (g, who) => [...new Set(who)].filter(a => a === YOU || !!g.cast[a]);
export function addFact(g, who, text, kind = 'standing', src = 'user', delta, k) {
    const people = cleanWhoYou(g, who);
    const t = text.trim();
    if (people.length < 2 || people.length > 3 || !t)
        return null;
    const b = bondsOf(g);
    const f = { id: newId(b), who: people, text: t, kind, day: g.day, src, ...(delta ? { delta } : {}), ...(k?.pub ? { pub: k.pub } : {}) };
    for (const a of k?.seen ?? [])
        if (!people.includes(a) && (a === YOU || g.cast[a]))
            (f.know ??= {})[a] = { lvl: 'knows', how: 'saw', day: g.day };
    b.facts.push(f);
    // [expanded] 0.2.0.8: at most `keep` episodes per pair (or trio): the oldest go first
    // [expanded] 0.2.1-14: landmarks are never trimmed (only you delete them)
    const lm = (x) => isLandmark(x, memCfgOf(g));
    {
        const key = [...people].sort().join('|');
        const mine = b.facts.filter(x => x.kind === 'episode' && !lm(x) && [...x.who].sort().join('|') === key);
        if (mine.length > (b.keep ?? 12)) {
            const drop = new Set(mine.slice(0, mine.length - (b.keep ?? 12)).map(x => x.id));
            b.facts = b.facts.filter(x => !drop.has(x.id));
        }
    }
    // only episodes are trimmed (oldest first); standing facts are the player's and are never dropped
    const eps = b.facts.filter(x => x.kind === 'episode' && !lm(x));
    if (eps.length > MAX_EPISODES) {
        const drop = new Set(eps.slice(0, eps.length - MAX_EPISODES).map(x => x.id));
        b.facts = b.facts.filter(x => !drop.has(x.id));
    }
    return f;
}
export const factById = (g, id) => bondsOf(g).facts.find(f => f.id === id) ?? null;
export function editFact(g, id, text) { const f = factById(g, id); const t = text.trim(); if (f && t)
    f.text = t; return !!(f && t); }
export function removeFact(g, id) { const b = bondsOf(g); const n = b.facts.length; b.facts = b.facts.filter(f => f.id !== id); return b.facts.length < n; }
export function pinFact(g, id) { const f = factById(g, id); if (f) {
    f.kind = 'standing';
    delete f.delta;
} return !!f; }
export const factsOfPair = (g, a, b) => bondsOf(g).facts.filter(f => f.who.includes(a) && f.who.includes(b));
export const factsOfPerson = (g, a) => bondsOf(g).facts.filter(f => f.who.includes(a));
/* ---------- changes ---------- */
// Applies one moment: every pair among `who` moves by `steps` (-3…3) and the moment becomes an episode.
export function applyChange(g, who, steps, text, src, k) {
    const people = cleanWho(g, who);
    const s = clamp(Math.round(steps), -3, 3);
    if (people.length < 2 || people.length > 3 || !text.trim())
        return null;
    for (const [a, b] of pairsIn(people)) {
        const p = pairOf(g, a, b);
        if (s) {
            p.v = clamp(p.v + s * STEP, -100, 100);
            writeBack(g, a, b, p);
        }
        p.changed = g.day;
    }
    const f = addFact(g, people, text, 'episode', src, s || undefined, k ?? (src === 'scene' ? { seen: [YOU] } : undefined)); // a scene: you were there
    return { who: people, names: people.map(a => g.cast[a].name), delta: s, text: text.trim(), src, you: !!f && knows(factK(f), YOU) };
}
// Once a day: pairs with nothing new for a week drift one point back toward where they started. Safe to call more
// than once a day (it only runs once per day).
export function drift(g, day = g.day) {
    const b = bondsOf(g);
    if (b.decayDay === day)
        return;
    b.decayDay = day;
    for (const [k, p] of Object.entries(b.pairs)) {
        if (p.v === p.base || day - (p.changed ?? -Infinity) < QUIET_DAYS)
            continue;
        if ((b.talk ?? []).some(t => pairKey(t.a, t.b) === k))
            continue; // [expanded] 0.2.0.8: unfinished business does not fade
        p.v += p.v > p.base ? -1 : 1;
        const [a, c] = k.split('|');
        if (g.cast[a] && g.cast[c])
            writeBack(g, a, c, p);
    }
}
/* ---------- what the AI is told in a scene ---------- */
const PROMPT_CHARS = 2800; // about 800 tokens
const fmtFact = (f) => (f.kind === 'standing' ? f.text : `(day ${f.day}) ${f.text}`);
// The pairs of the people here (and what is known about them), then what the people here are known to feel about
// housemates who are not here; within a size budget, the closest things first.
// [expanded] 0.2.0.8: who knows what. A fact not everyone here knows says so ("Kathie does not know"); what someone
// here knows about people who are not here (a fight they saw, a secret they were told) is told as theirs; the last
// thing between someone here and someone who is not, for a few days.
const KNOWN_DAYS = 10;
export function bondsLines(g, present, budget = PROMPT_CHARS) {
    syncTies(g);
    const here = present.filter(a => g.cast[a]);
    if (!here.length)
        return [];
    const others = Object.keys(g.cast).filter(a => !here.includes(a));
    const lines = [];
    let size = 0, full = false;
    const used = new Set();
    // once something does not fit, nothing after it goes in (a less important line must not take its place)
    const push = (l) => { if (full || size + l.length > budget) {
        full = true;
        return false;
    } lines.push(l); size += l.length; return true; };
    const name = (a) => (a === YOU ? '{{user}}' : g.cast[a]?.name ?? a);
    const list = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
    // who here (besides the ones in it) does not know it
    const tag = (f) => {
        const by = here.filter(a => !f.who.includes(a));
        if (!by.length)
            return '';
        const un = unaware(factK(f), by);
        if (!un.length)
            return '';
        const secret = factK(f).pub === 'private';
        return ` (${secret ? 'a secret: ' : ''}${un.length === by.length && by.length > 1 ? 'the others here do not know' : `${list(un.map(name))} ${un.length > 1 ? 'do' : 'does'} not know`})`;
    };
    const fmt = (f) => `${fmtFact(f)}${tag(f)}`;
    // [expanded] 0.2.1-14: an episode lasts as long as it weighs; landmarks stay (unless a story here holds them)
    const mc = memCfgOf(g);
    const live = (fs, near, max = 4) => liveEpisodes(fs, g.day, mc, near, max, f => foldedHere(f, here));
    // 1) both here: how they get along, what their relationship is, what happened lately
    for (const [a, b] of pairsIn(here)) {
        const p = pairOf(g, a, b);
        const fs = factsOfPair(g, a, b).filter(f => !used.has(f.id));
        const standing = fs.filter(f => f.kind === 'standing');
        const recent = live(fs, true); // [expanded] 0.2.1-14: landmarks and what is still fresh, not just the last two
        if (p.v === 0 && !standing.length && !recent.length)
            continue;
        const parts = [...standing, ...recent].map(fmt);
        if (!push(`${name(a)} & ${name(b)}: ${wordOf(p.v)}.${parts.length ? ` ${parts.join(' ')}` : ''}`))
            break;
        [...standing, ...recent].forEach(f => used.add(f.id));
    }
    // 2) the player and the people here: what the player wrote about them (their closeness is upstream's line)
    for (const a of here) {
        if (full)
            break;
        const fs = factsOfPair(g, YOU, a).filter(f => !used.has(f.id) && f.who.every(x => x === YOU || here.includes(x)));
        if (!fs.length)
            continue;
        const shown = [...fs.filter(f => f.kind === 'standing'), ...live(fs, true)];
        if (!shown.length)
            continue;
        if (!push(`{{user}} & ${name(a)}: ${shown.map(fmt).join(' ')}`))
            break;
        shown.forEach(f => used.add(f.id));
    }
    // 3) one here, one not: what their relationship is (standing facts), and the last thing that happened lately
    for (const a of here)
        for (const b of others) {
            if (full)
                break;
            const fs = factsOfPair(g, a, b).filter(f => !used.has(f.id));
            const standing = fs.filter(f => f.kind === 'standing');
            const last = live(fs, false, 2);
            if (!standing.length && !last.length)
                continue;
            if (!push(`${name(a)} about ${name(b)} (not here): ${wordOf(valueOf(g, a, b))}. ${[...standing, ...last].map(fmt).join(' ')}`))
                break;
            [...standing, ...last].forEach(f => used.add(f.id));
        }
    // 4) [expanded] what someone here knows about others (not about themselves): seen, told or heard, lately
    const known = [];
    for (const f of bondsOf(g).facts) {
        if (used.has(f.id) || f.kind !== 'episode' || g.day - f.day > KNOWN_DAYS || f.who.every(x => here.includes(x)))
            continue;
        const k = factK(f);
        if (k.pub === 'public')
            continue;
        const by = here.filter(a => !f.who.includes(a) && knowOf(k, a));
        if (!by.length)
            continue;
        const how = by.map(a => { const x = knowOf(k, a); return x.lvl === 'suspects' ? `${name(a)} only suspects it` : `${name(a)} knows (${howText(x, name)}${x.ver ? `; the version they heard: ${x.ver}` : ''})`; });
        known.push(`${f.who.map(name).join(' & ')}: ${fmtFact(f)} — ${how.join('; ')}.`);
        used.add(f.id);
    }
    for (const l of known.slice(-4))
        if (!push(l))
            break;
    return lines.length ? [`How the people here get along with each other:`, ...lines] : [];
}
// [expanded] 0.2.0.8: statuses (ties) the AI must know beyond upstream's line, which only has the ties of the people
// here: what the house knows about people who are not here (couples, family, exes…), and secrets: who here does not
// know (they hide it in front of them), or who here knows a secret about people who are not here.
export function tieKnowLines(g, present) {
    const here = present.filter(a => g.cast[a]);
    const name = (a) => (a === YOU ? '{{user}}' : g.cast[a]?.name ?? a);
    const list = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
    const word = (t) => `${name(t.a)} is ${TIE_WORD[t.type] ?? `${t.type} of`} ${name(t.b)}`;
    const ok = (a) => a === YOU || !!g.cast[a];
    const house = [], out = [];
    for (const t of g.living?.ties ?? []) {
        if (!ok(t.a) || !ok(t.b) || t.a === t.b)
            continue;
        const k = tieK(t);
        const inScene = [t.a, t.b].filter(a => a === YOU || here.includes(a));
        if (!t.secret) {
            if (!inScene.length && NEWSY.has(t.type))
                house.push(word(t));
            continue;
        }
        const un = here.filter(a => !k.parts.includes(a) && !knows(k, a));
        const sus = un.filter(a => knowOf(k, a)?.lvl === 'suspects');
        const knowers = here.filter(a => !k.parts.includes(a) && knows(k, a));
        if (inScene.length) {
            out.push(`A secret: ${word(t)}.${un.length ? ` ${list(un.map(name))} ${un.length > 1 ? 'do' : 'does'} not know: ${inScene.filter(a => a !== YOU).length ? 'they hide it in front of them' : 'it is not shown'}.` : ' Everyone here knows.'}${sus.length ? ` ${list(sus.map(a => { const v = knowOf(k, a)?.ver; return v ? `${name(a)} (${v})` : name(a); }))} only suspect${sus.length > 1 ? '' : 's'} it (hints, never stated).` : ''}`);
        }
        else
            for (const a of knowers) {
                {
                    const x = knowOf(k, a);
                    out.push(`${name(a)} knows a secret (${x.ver ?? howText(x, name)}): ${word(t)}. They keep it to themselves unless they decide otherwise.`);
                }
            }
        if (!inScene.length)
            for (const a of sus) {
                const v = knowOf(k, a)?.ver;
                out.push(`${name(a)} suspects that ${word(t).replace(/ is /, ' might be ')} (${v ? `${v}; ` : ''}a hunch: hints, never stated).`);
            }
    }
    return [...(house.length ? [`Known to everyone in the house: ${house.slice(0, 10).join('; ')}.`] : []), ...out.slice(0, 6)];
}
/** "Masha is dating Leah" (for the AI). */
export const tieWord = (t, name) => `${name(t.a)} is ${TIE_WORD[t.type] ?? `${t.type} of`} ${name(t.b)}`;
const TIE_WORD = { parent: 'a parent of', child: 'a child of', sibling: 'a sibling of', spouse: 'married to', partner: 'the partner of', dating: 'dating', cousin: 'a cousin of', roommate: 'a roommate of', friend: 'a friend of', bestfriend: 'the best friend of', ally: 'an ally of', colleague: 'a colleague of', rival: 'a rival of', enemy: 'an enemy of', ex: 'the ex of', mentor: 'the mentor of', apprentice: 'the apprentice of' };
/* ---------- the night: one AI call ---------- */
// The "# Personality { … }" part of a card written with headed sections; otherwise the start of the description.
export function personalityOf(description, personality = '', max = 700) {
    const d = String(description ?? '');
    const m = d.match(/^#\s*Personality\b[^\n]*\n([\s\S]*?)(?=^#\s(?!#)|(?![\s\S]))/m);
    let text = m ? m[1] : (String(personality ?? '').trim() ? `${personality}\n${d}` : d);
    text = text.replace(/[{}]/g, ' ').replace(/\{\{\/\/[\s\S]*?\}\}/g, '').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
    return text.length > max ? `${text.slice(0, max).replace(/\s+\S*$/, '')}…` : text;
}
export const NIGHT_SYSTEM = 'You keep the records of an interactive fiction (a role-play story between consenting adults): how the people sharing a house get along with each other. The story may include dark or mature events; you do not judge or soften them, you only note plainly what changed between the characters. You are honest and sparing: most days little or nothing changes between them. You never invent what happened in a conversation.';
/** A reply with neither part's heading is not an answer (a refusal, or something else entirely). */
export const looksAnswered = (raw) => /^\s*[#*\s]*(scene|off[\s-]?screen)\b/im.test(String(raw ?? '').replace(/<(think|thinking|reasoning)>[\s\S]*?<\/\1>/gi, ''));
export function nightPrompt(g, n) {
    const name = (a) => g.cast[a]?.name ?? a;
    const ids = n.people.map(p => p.avatar);
    const rel = [];
    for (const [a, b] of pairsIn(ids)) {
        const p = pairOf(g, a, b);
        const fs = factsOfPair(g, a, b);
        const standing = fs.filter(f => f.kind === 'standing').map(f => f.text);
        const recent = fs.filter(f => f.kind === 'episode').slice(-3).map(fmtFact);
        if (p.v === 0 && !standing.length && !recent.length)
            continue;
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
        ...(scene && n.secrets?.length ? ['', `Secrets in the house (never reveal them yourself): ${n.secrets.map((x, i) => `${i + 1}. ${x.text} (known to: ${x.known.join(', ')})`).join(' ')}`,
            `If today's scenes let someone else see or overhear one of them (a slip, a kiss seen, a careless word, someone told), add a line in the SCENE part: FOUND | who found out | the secret's number | who told them (if someone did). ${n.user} counts too. If someone who knows one promised in a scene to keep it to themselves: PROMISE | who promised | the secret's number. Only what clearly happened in the scenes.`] : []),
        '',
        'PART 2 — life in the house without ' + n.user + '.',
        n.life === 'off' ? 'Turned off: write NONE.' : `${off} It must fit who they are and how they get along now, and not repeat what happened lately.`,
        ...(n.talks?.length ? ['', `Unfinished business: ${n.talks.map((t, i) => `${i + 1}. ${t}`).join(' ')}`, 'If today\'s scenes had them really talk it out (or it happened without ' + n.user + ' tonight), add: TALKED | the number.'] : []),
        ...(n.shift ? ['', `Tonight, only if there is a real reason in how they get along and what happened lately, ONE bigger change may happen between two of them: SHIFT | Name & Name | friends, enemies${n.shift !== 'off' ? ', dating' : ''} or ex | why, in a few words | secret (optional: they keep it to themselves). ${n.shift === 'story' ? 'Dating only if both already have feelings for each other. ' : ''}${n.shift !== 'off' ? 'Dating must fit who they are (orientation, partners outside the house). ' : ''}Most nights: no SHIFT line.`] : []),
        ...(n.extra ?? []),
        ...(n.small ? ['', 'Maybe (not often) someone did a small thing and kept quiet about it (borrowed something without asking, broke something, ate someone\'s food, lost their job, owes money): SMALL | Name | what they did | whose it was (optional).'] : []),
        '',
        'One moment per line, exactly like this (the sentence says what happened, short, in the past tense):',
        'Name & Name | +1 | what happened',
        'Name & Name & Name | -1 | what happened (three people)',
        'Name & Name | +1 | what happened | who else saw it',
        `The last part is optional. For a moment in today's scenes: the names of the others who saw or heard it (the [In …] notes say who was in the room), or "nobody else" when the ones in it kept it between themselves (a whisper, a closed door, "don't tell anyone"); left out, everyone in the room saw it (${n.user} too). For a moment without ${n.user}: "secret" when they would hide it from the house, or the names of housemates who saw it; left out, only the ones in it know.`,
        'Write each sentence in the language the conversation is written in (English if there was none).',
        '',
        'Reply with only this:',
        'SCENE',
        '(lines or NONE)',
        'OFF-SCREEN',
        '(lines or NONE)',
    ].join('\n');
}
// Reads the night's reply. Lines naming anyone who is not one of `people` (or the player) are dropped, and the
// off-screen part is held to what the setting allows.
export function parseNight(raw, people, life) {
    const text = String(raw ?? '').replace(/<(think|thinking|reasoning)>[\s\S]*?<\/\1>/gi, '');
    const find = (s) => {
        const q = s.trim().replace(/^[*_"'`]+|[*_"'`]+$/g, '').toLowerCase();
        if (!q)
            return null;
        const exact = people.filter(p => p.name.toLowerCase() === q);
        if (exact.length === 1)
            return exact[0].avatar;
        const loose = people.filter(p => { const n = p.name.toLowerCase(); return n.split(/\s+/)[0] === q || q.split(/\s+/)[0] === n || n.startsWith(q + ' ') || q.startsWith(n + ' '); });
        return loose.length === 1 ? loose[0].avatar : null;
    };
    let part = null;
    const out = [];
    for (const line of text.split('\n')) {
        const l = line.trim().replace(/^[-*•]\s*/, '');
        if (/^#*\s*\**\s*off[\s-]?screen\b/i.test(l)) {
            part = 'offscreen';
            continue;
        }
        if (/^#*\s*\**\s*scene\b/i.test(l)) {
            part = 'scene';
            continue;
        }
        if (!part)
            continue;
        const m = l.match(/^(.+?)\s*\|\s*([+-]?\s*\d)\s*\|\s*(.+)$/);
        if (!m)
            continue;
        // [expanded] 0.2.0.8: "| who else saw it" at the end
        let seen;
        {
            const cut = m[3].lastIndexOf('|');
            if (cut > 0) {
                const tail = m[3].slice(cut + 1).trim();
                m[3] = m[3].slice(0, cut).trim();
                if (/^(nobody( else)?|no one( else)?|none|secret|private|никто)/i.test(tail))
                    seen = 'none';
                else {
                    const ns = tail.split(/\s*(?:&|\+|,|;)\s*|\s+(?:and|и)\s+/i).map(find).filter(Boolean);
                    if (ns.length)
                        seen = ns;
                }
            }
        }
        const names = m[1].split(/\s*(?:&|\+|,)\s*|\s+(?:and|и)\s+/i).filter(Boolean); // (\b does not see Cyrillic letters)
        const who = names.map(find);
        if (who.some(x => !x) || new Set(who).size !== who.length || who.length < 2 || who.length > 3)
            continue;
        let delta = Number(m[2].replace(/\s/g, ''));
        if (!Number.isFinite(delta))
            continue;
        delta = part === 'scene' ? clamp(delta, -3, 3) : life === 'calm' ? clamp(delta, -1, 1) : clamp(delta, -3, 3);
        out.push({ who: who, delta, text: m[3].trim().replace(/^["“]|["”]$/g, ''), src: part, ...(seen ? { seen: Array.isArray(seen) ? seen.filter(a => !who.includes(a)) : seen } : {}) });
    }
    // off-screen limits: off → none; calm → one, two people; lively → three, at most one of ±3
    const scene = out.filter(x => x.src === 'scene');
    let off = out.filter(x => x.src === 'offscreen');
    if (life === 'off')
        off = [];
    else if (life === 'calm')
        off = off.filter(x => x.who.length === 2).slice(0, 1);
    else {
        let big = 0;
        off = off.slice(0, 3).map(x => { if (Math.abs(x.delta) === 3) {
            big++;
            if (big > 1)
                return { ...x, delta: Math.sign(x.delta) * 2 };
        } return x; });
    }
    return [...scene, ...off];
}
/** [expanded] 0.2.0.8: the night's "FOUND | who | number" lines: who found out which secret (indexes from 0). */
export function parseFound(raw, find, count, kind = 'FOUND') {
    const out = [];
    for (const line of String(raw ?? '').split('\n')) {
        const m = line.trim().replace(/^[-*•]\s*/, '').match(new RegExp(`^${kind}\\s*\\|\\s*(.+?)\\s*\\|\\s*#?(\\d+)`, 'i'));
        if (!m)
            continue;
        const i = Number(m[2]) - 1;
        const who = find(m[1]);
        const tail = line.split('|')[3]?.trim();
        const by = tail ? find(tail.replace(/^(told by|by)\s+/i, '')) : null; // [expanded] who told them
        if (who && i >= 0 && i < count && !out.some(x => x.who === who && x.i === i))
            out.push({ who, i, ...(by ? { by } : {}) });
    }
    return out.slice(0, 4);
}
/** [expanded] 0.2.0.8: "TALKED | number" (indexes from 0). */
export function parseTalked(raw, count) {
    const out = new Set();
    for (const line of String(raw ?? '').split('\n')) {
        const m = line.trim().replace(/^[-*•]\s*/, '').match(/^TALKED\s*\|\s*#?(\d+)/i);
        if (m && +m[1] >= 1 && +m[1] <= count)
            out.add(+m[1] - 1);
    }
    return [...out];
}
/** "SHIFT | A & B | kind | why | secret" (people found by `find`; at most one). */
export function parseShift(raw, find) {
    for (const line of String(raw ?? '').split('\n')) {
        const p = line.trim().replace(/^[-*•]\s*/, '').split('|').map(x => x.trim());
        if ((p[0] ?? '').toUpperCase() !== 'SHIFT' || p.length < 4)
            continue;
        const [x, y] = p[1].split(/\s*(?:&|\+|,)\s*|\s+(?:and|и)\s+/i).map(find);
        const kind = (p[2].toLowerCase().match(/friends|enemies|dating|ex/)?.[0] ?? '');
        if (x && y && x !== y && kind)
            return { a: x, b: y, kind, why: p[3] || '', secret: /secret|тайн/i.test(p[4] ?? '') };
    }
    return null;
}
/** "SMALL | Name | what | whose" (at most one). */
export function parseSmall(raw, find) {
    for (const line of String(raw ?? '').split('\n')) {
        const p = line.trim().replace(/^[-*•]\s*/, '').split('|').map(x => x.trim());
        if ((p[0] ?? '').toUpperCase() !== 'SMALL' || p.length < 3)
            continue;
        const who = find(p[1]);
        const about = p[3] ? find(p[3]) : null;
        if (who && p[2])
            return { who, text: p[2].slice(0, 160), ...(about && about !== who ? { about } : {}) };
    }
    return null;
}
/** Whether a bigger change is believable by the rules (the model only proposes it). `lovers`: who already has a
 *  partner in the house; `taken`: who has one outside (their profile); `spark`: flirting before (for "from the story"). */
export function shiftOk(g, s, o) {
    const v = valueOf(g, s.a, s.b);
    const t = statusOf(g, s.a, s.b);
    const family = !!t && ['parent', 'child', 'sibling', 'cousin'].includes(t.type);
    if (s.kind === 'friends')
        return v >= 35 && !family && !(t && ['friend', 'bestfriend', 'dating', 'partner', 'spouse'].includes(t.type));
    if (s.kind === 'enemies')
        return v <= -40 && !(t && ['enemy', 'rival'].includes(t.type));
    if (s.kind === 'ex')
        return !!t && ['dating', 'partner'].includes(t.type) && v <= 10;
    if (o.romance === 'off' || family || (t && ['dating', 'partner', 'spouse', 'ex'].includes(t.type)))
        return false;
    if (o.lovers(s.a).length || o.lovers(s.b).length || o.taken(s.a) || o.taken(s.b))
        return false;
    return o.romance === 'grow' ? v >= 45 : v >= 55 && o.spark;
}
