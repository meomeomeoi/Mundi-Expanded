// [expanded] Mundi Expanded 15.3: a plan proposed in your own words ("oh, listen, let's do some embroidery today at 2?",
// "давай посмотрим фильм завтра вечером"). Pure text, no AI call: a line is a proposal only when it has BOTH a way of
// proposing (let's, how about, давай, хочешь…) and a time (at 14, tomorrow evening, in an hour…), so ordinary talk is never
// taken for one. Who decides, and what happens, is in askplanrun.ts (the engine decides, the AI only voices it).
import type { CAct } from './cplans.js';
import { mentions, type Person } from './turnplan.js';

export type PlanAct = CAct | 'hang';
export interface Proposal {
    from: number;            // absolute minutes
    act: PlanAct;            // 'hang': nothing in particular (the title says what)
    title: string;           // what it is, for the calendar ("Movie night", "embroidery")
    kind: 'hangout' | 'date';
    all: boolean;            // said to everyone ("everyone", "ребят")
    names: string[];         // who is named (avatars), in order
}

const L = '[\\p{L}\\p{N}_]';
const word = (alts: string) => new RegExp(`(?<!${L})(?:${alts})(?!${L})`, 'iu');
const CUE = word("давай(?:те)?|может|как насч[её]т|хочешь|хотите|не хочешь|пойд[её]м|пойд[её]мте|сходим|посмотрим|поиграем|приготовим|встретимся|погуляем|предлагаю|приглашаю|зову|свободн\\p{L}*|занят\\p{L}*|let'?s|how about|what about|do you want|wanna|want to|would you like|shall we|fancy|care to|join me|why don'?t we|we should|i was thinking|up for|are you free|you free|available|busy");
const EVERYONE = word('все|всем|всех|ребят\\p{L}*|народ|everyone|everybody|guys|all of you|y\'?all|team|folks');
const DATE = word('свидани\\p{L}*|romantic|date');

const ACTS: [CAct, RegExp][] = [
    ['cinema', word('кинотеатр\\p{L}*|в кино|cinema|movie theat(?:er|re)')],
    ['movie', word('фильм\\p{L}*|кино|сериал\\p{L}*|посмотр\\p{L}*|movie|film|watch|netflix|series')],
    ['games', word('игр\\p{L}*|поигра\\p{L}*|настолк\\p{L}*|карты|game|games|play|gaming')],
    ['cook', word('готов\\p{L}*|приготов\\p{L}*|испеч\\p{L}*|выпеч\\p{L}*|cook|cooking|bake|baking')],
    ['workout', word('трениров\\p{L}*|спортзал\\p{L}*|качалк\\p{L}*|потренир\\p{L}*|gym|workout|exercise')],
    ['swim', word('бассейн\\p{L}*|плава\\p{L}*|поплав\\p{L}*|pool|swim|swimming')],
    ['cafe', word('кофе|кафе|coffee|café|cafe')],
    ['dinner', word('ужин\\p{L}*|пообедать|обед|ресторан\\p{L}*|dinner|lunch|restaurant')],
    ['drinks', word('выпить|выпьем|бар|пиво|вино|drinks|beer|wine')],
    ['walk', word('прогул\\p{L}*|погулять|гулять|walk|stroll')],
    ['mall', word('торговый|шоппинг\\p{L}*|магазин\\p{L}*|mall|shopping')],
];

/** What it is, from the words: a thing the house knows how to do, or null. */
export const actOf = (t: string): CAct | null => ACTS.find(([, re]) => re.test(t))?.[0] ?? null;

const DAYPART: [RegExp, number][] = [[word('вечером|this evening|tonight|in the evening|evening'), 19], [word('днем|днём|after lunch|in the afternoon|afternoon'), 15], [word('утром|in the morning|morning'), 10]];
const TODAY = word('сегодня|today|tonight|tonite');
const TOMORROW = word('завтра|tomorrow');
const AFTER = word('послезавтра|day after tomorrow');
// at 14, at 14:30, at 2pm, в 14, в 8 вечера, к трём (digits only)
const CLOCK = new RegExp(`(?<!${L})(?:в|к|at|around|около|by)\\s*(\\d{1,2})(?:[:.](\\d{2}))?(?!\\d)(?:\\s*(a\\.?m\\.?|p\\.?m\\.?|утра|вечера|дня|ночи))?`, 'iu');
const REL_H = new RegExp(`(?<!${L})(?:in|через)\\s+(\\d{1,2}|an?|пару|couple of)?\\s*(?:hours?|hrs?|час(?:а|ов)?)(?!${L})`, 'iu');
const REL_M = new RegExp(`(?<!${L})(?:in|через)\\s+(\\d{1,3})\\s*(?:minutes?|mins?|минут\\p{L}*)(?!${L})`, 'iu');

/** The start asked for, in absolute minutes, or null (none, or already past). `now`: the game's clock. */
export function parseWhen(text: string, now: { day: number; minutes: number }): number | null {
    const t = String(text ?? ''); const nowAbs = now.day * 1440 + now.minutes; const earliest = nowAbs + 30;
    const rm = REL_M.exec(t); if (rm) return Math.max(earliest, nowAbs + Number(rm[1]));
    const rh = REL_H.exec(t); if (rh) { const k = rh[1]; const n = !k || /^an?$/i.test(k) ? 1 : /пару|couple/i.test(k) ? 2 : Number(k); return Math.max(earliest, nowAbs + n * 60); }
    const offset = AFTER.test(t) ? 2 : TOMORROW.test(t) ? 1 : 0; const sayDay = offset > 0 || TODAY.test(t);
    const day = now.day + offset;
    const c = CLOCK.exec(t);
    if (c) {
        let h = Number(c[1]); const m = c[2] ? Number(c[2]) : 0; const mk = (c[3] ?? '').toLowerCase().replace(/\./g, '');
        if (h > 24 || m > 59 || (h === 24 && m > 0)) return null;
        let nextMorning = false;
        if (mk === 'pm' || mk === 'вечера') { if (h < 12) h += 12; }
        else if (mk === 'дня') { if (h >= 1 && h <= 6) h += 12; }
        else if (mk === 'am' || mk === 'утра') { if (h === 12) h = 0; }
        else if (mk === 'ночи') { if (h >= 10) { /* late evening: as it is */ } else nextMorning = true; }
        else if (h <= 12 && h >= 1) {   // no marker: the next time that hour comes (or, on another day, the hour as it is, afternoon for the small ones)
            const cands = (h === 12 ? [12, 0] : [h, h + 12]).map(x => day * 1440 + x * 60 + m);
            if (offset === 0) { const f = cands.find(x => x >= earliest); if (f !== undefined) return f; return sayDay ? null : (day + 1) * 1440 + (h <= 6 ? h + 12 : h) * 60 + m; }
            return day * 1440 + (h <= 6 ? h + 12 : h) * 60 + m;
        }
        const at = (nextMorning ? day + 1 : day) * 1440 + h * 60 + m;
        if (at >= earliest) return at;
        return sayDay ? null : at + 1440;   // "at 9" said at ten at night: tomorrow
    }
    for (const [re, h] of DAYPART) if (re.test(t)) { const at = (day * 1440) + h * 60; return at >= earliest ? at : null; }
    return null;
}

/** Is it a proposal? Both a way of proposing and a time. */
export function parseProposal(text: string, now: { day: number; minutes: number }, people: Person[] = []): Proposal | null {
    const t = String(text ?? '').replace(/\s+/g, ' ').trim(); if (!t || t.length > 400) return null;
    if (!CUE.test(t) && !/\?\s*$/.test(t)) return null;
    const from = parseWhen(t, now); if (from === null) return null;
    if (!CUE.test(t)) return null;   // a question mark alone is not enough
    const act = actOf(t) ?? 'hang';
    const ment = people.length ? mentions(t, people) : [];
    return { from, act, title: act === 'hang' ? titleOf(t, people) : '', kind: DATE.test(t) ? 'date' : 'hangout', all: EVERYONE.test(t), names: ment.map(m => m.avatar) };
}
/** What it is, in the player's own words, for something the house has no word for: the line without the asking and the time. */
export function titleOf(t: string, people: Person[] = []): string {
    let s = t;
    for (const p of people) s = s.replace(new RegExp(`(?<!${L})${p.name.split(/\s+/)[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\p{L}*(?!${L})`, 'giu'), ' ');
    s = s.replace(CLOCK, ' ').replace(REL_H, ' ').replace(REL_M, ' ');
    for (const re of [TODAY, TOMORROW, AFTER, EVERYONE, ...DAYPART.map(d => d[0])]) s = s.replace(new RegExp(re.source, 'giu'), ' ');
    s = s.replace(new RegExp(CUE.source, 'giu'), ' ');
    const lead = /^[\s,.!?:;—–-]*(?:ой|слушай|слушайте|эй|привет|ну|а|и|тогда|oh|hey|listen|so|well|and|then|now)(?!\p{L})[\s,.!?:;—–-]*/iu;
    for (let i = 0; i < 4 && lead.test(s); i++) s = s.replace(lead, ' ');
    s = s.replace(/[?!.…"“”«»*]+/g, ' ').replace(/\s+/g, ' ').replace(/^[\s,:;—–-]+|[\s,:;—–-]+$/g, '').trim();
    return s.slice(0, 40);
}

/** The first time that is fine, near the one asked for: later that day (every half hour, up to five hours), then earlier (not before `earliest`), then the next day at the same time. */
export function findAlt(from: number, ok: (at: number) => boolean, earliest: number): number | null {
    const dayEnd = (Math.floor(from / 1440) + 1) * 1440 - 60;   // the last start that day: 23:00
    for (let d = 30; d <= 300; d += 30) { const at = from + d; if (at <= dayEnd && ok(at)) return at; }
    for (let d = 30; d <= 240; d += 30) { const at = from - d; if (at >= earliest && ok(at)) return at; }
    return ok(from + 1440) ? from + 1440 : null;
}
/** A refusal that a different time could fix (they are busy), not one about you (they do not know you well enough). */
export const isTimeIssue = (why: string) => /work|too late|too early|already have plans|plans with|later that day|tomorrow at|tired|mood|busy|homebod|quiet|other things/i.test(why) && !/know you|not ready|comfortable/i.test(why);
