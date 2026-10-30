// [expanded] Mundi Expanded 15: who answers (pure logic; the glue is sim/turnrun.ts).
//
// SillyTavern's Natural order rolls a die per member against a number on the card; it does not know who was spoken to,
// who is in the middle of the talk, who is worn out. Here the line you send is read first: obvious cases by name, the
// rest by the mechanics model (one short call), and when that is not there (or too slow) by a score. The plan says one
// person answers alone ("single") or the room answers together in one reply ("ensemble"), and who is likely to speak.
import { whoIs, type Who } from './ensemble.js';

export interface Person { avatar: string; name: string; talk: number; tired?: boolean; done?: boolean; upset?: boolean; inThread?: boolean; about?: string; mood?: string }
export type To = 'room' | 'some' | 'story';
export interface Plan { mode: 'single' | 'ensemble'; speakers: string[]; to: To; toNames: string[]; private: boolean; by: 'name' | 'names' | 'story' | 'model' | 'score' }
export interface PlanIn { text: string; people: Person[]; max: number; story?: boolean; seed?: string }

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const L = '[\\p{L}\\p{N}_]';
/** The ways a name shows up in a line: whole, first name, and (for names ending in a Cyrillic vowel) the cases. */
export function nameRe(name: string): RegExp {
    const first = name.trim().split(/\s+/)[0] ?? '';
    const alts = [esc(name.trim())];
    if (first && first !== name.trim()) alts.push(esc(first));
    if (/[а-яё]$/i.test(first) && first.length >= 3) {   // Russian cases: Мира → Мире, Мирой; Финн → Финну; Сергей → Сергея
        if (/[аяАЯ]$/.test(first)) alts.push(`${esc(first.slice(0, -1))}(?:[аяыиеуюо]|ой|ою|ей|ею)?`);
        else if (/[йьЙЬ]$/.test(first)) alts.push(`${esc(first.slice(0, -1))}(?:[йья]|ю|ем|е)`);
        else if (!/[еёиоуыэюяЕЁИОУЫЭЮЯ]$/.test(first)) alts.push(`${esc(first)}(?:а|у|ом|е)?`);
    }
    return new RegExp(`(?<!${L})(?:${[...new Set(alts)].sort((a, b) => b.length - a.length).join('|')})(?!${L})`, 'iu');
}
export interface Mention { avatar: string; at: number; vocative: boolean }
/** Who is named in the line, in order. A name used as a call ("Mira, …", "hey Mira!", or first in the line) is a vocative. */
export function mentions(text: string, people: Person[]): Mention[] {
    const out: Mention[] = [];
    for (const p of people) {
        const m = nameRe(p.name).exec(text); if (!m) continue;
        const before = text.slice(0, m.index).trim().split(/\s+/).filter(Boolean).length;
        const after = text.slice(m.index + m[0].length);
        out.push({ avatar: p.avatar, at: m.index, vocative: before === 0 || (before <= 2 && /^\s*[,!?:—–-]/.test(after)) });
    }
    return out.sort((a, b) => a.at - b.at);
}
const names = (people: Person[], avatars: string[]) => avatars.map(a => people.find(p => p.avatar === a)?.name ?? '').filter(Boolean);

/* ---------- the score (when the model is not there) ---------- */

const H = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; return (h >>> 0) / 4294967296; };
/** How much each person wants to answer now; higher first. Someone who has had enough (done) is left out. */
export function scores(inp: PlanIn, said: Mention[] = mentions(inp.text, inp.people)): { avatar: string; score: number }[] {
    const seed = inp.seed ?? inp.text;
    return inp.people.filter(p => !p.done).map(p => {
        const m = said.find(x => x.avatar === p.avatar);
        const s = 100 * (m?.vocative ? 1 : 0) + 30 * (p.inThread ? 1 : 0) + 20 * (m ? 1 : 0) + 20 * Math.max(0, Math.min(1, p.talk))
            - 30 * (p.tired ? 1 : 0) - 15 * (p.upset ? 1 : 0) + (H(`${seed}|${p.avatar}`) * 10 - 5);
        return { avatar: p.avatar, score: s };
    }).sort((a, b) => b.score - a.score);
}
export const SPEAK_MIN = 25;
/** The plan by score alone: up to `max` people above the line (at least one); one alone only if one was spoken to. */
export function scorePlan(inp: PlanIn): Plan {
    const said = mentions(inp.text, inp.people);
    const ranked = scores(inp, said);
    let speakers = ranked.filter(r => r.score > SPEAK_MIN).slice(0, Math.max(1, inp.max)).map(r => r.avatar);
    if (!speakers.length && ranked.length) speakers = [ranked[0].avatar];
    const some = said.length ? said.map(m => m.avatar) : [];
    const single = speakers.length === 1 && said.length === 1;
    return { mode: single ? 'single' : 'ensemble', speakers, to: some.length ? 'some' : 'room', toNames: names(inp.people, some), private: false, by: 'score' };
}

/** The obvious cases, without asking anyone: a call by name, two or more named, a direction for the story. null: not obvious. */
export function quickPlan(inp: PlanIn): Plan | null {
    const said = mentions(inp.text, inp.people);
    const ids = said.map(m => m.avatar);
    if (inp.story) return { mode: 'ensemble', speakers: ids.slice(0, inp.max), to: 'story', toNames: [], private: false, by: 'story' };
    if (ids.length >= 2) return { mode: 'ensemble', speakers: ids.slice(0, inp.max), to: 'some', toNames: names(inp.people, ids), private: false, by: 'names' };
    if (ids.length === 1 && said[0].vocative) return { mode: 'single', speakers: ids, to: 'some', toNames: names(inp.people, ids), private: false, by: 'name' };
    return null;
}

/** "Scene reply" mode: always one reply for the room (one person called by name just leads it). */
export function asEnsemble(p: Plan): Plan {
    return p.mode === 'ensemble' ? p : { ...p, mode: 'ensemble' };
}

/* ---------- the model's say ---------- */

export const PLAN_SYSTEM = 'You decide who speaks next in a scene of an interactive fiction (a role-play between consenting adults). Answer with one JSON object only.';
export interface PlanAsk extends PlanIn { user: string; lines: { name: string; text: string }[] }
export function planPrompt(a: PlanAsk): string {
    return `People here:
${a.people.map(p => `- ${p.name}${p.about ? `: ${p.about.replace(/\s+/g, ' ').slice(0, 110)}` : ''}${p.tired ? ' (worn out by company)' : ''}${p.inThread ? ' (was in the talk just now)' : ''}`).join('\n')}
Recent lines:
${a.lines.map(l => `${l.name}: ${l.text.replace(/\s+/g, ' ').slice(0, 250)}`).join('\n') || '(none yet)'}
${a.user} just said: "${a.text.replace(/\s+/g, ' ').slice(0, 500)}"

Decide:
- "to": who ${a.user} is talking to: "room", or the name(s) of the one or few people.
- "private": true if ${a.user} wants a word with one person alone (a whisper, "can I talk to you", something personal).
- "mode": "single" if one person would naturally answer alone; "ensemble" if more than one would react.
- "speakers": who speaks, in order (1 to ${a.max}), only people here; leave out whoever would stay quiet.
JSON only: {"to": "room", "private": false, "mode": "single", "speakers": ["Name"]}`;
}
/** The model's answer as a plan, or null when it cannot be used (unknown people, nobody). */
export function parsePlan(j: any, people: Person[], max: number): Plan | null {
    if (!j || typeof j !== 'object') return null;
    const cast: Who[] = people.map(p => ({ avatar: p.avatar, name: p.name }));
    const one = (s: unknown) => whoIs(String(s ?? '').replace(/^\W+|\W+$/g, ''), cast)?.avatar ?? null;
    const speakers = [...new Set((Array.isArray(j.speakers) ? j.speakers : []).map(one).filter(Boolean) as string[])].slice(0, Math.max(1, max));
    if (!speakers.length) return null;
    const rawTo = Array.isArray(j.to) ? j.to : String(j.to ?? 'room').split(/,|\band\b|&/i);
    const toIds = [...new Set(rawTo.map(one).filter(Boolean) as string[])];
    const priv = j.private === true;
    const to: To = toIds.length ? 'some' : 'room';
    const base = { to, toNames: names(people, toIds), by: 'model' as const };
    if (priv || String(j.mode).toLowerCase() === 'single') return { mode: 'single', speakers: [speakers[0]], private: priv, ...base };
    return { mode: 'ensemble', speakers, private: false, ...base };
}
