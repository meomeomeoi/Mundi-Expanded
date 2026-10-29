// [expanded] Your own life (Mundi Expanded 0.2.1-12), the pure part: skills and how they grow, how good the ideas
// you are offered are (writing, coding), chores and their rota, the house's calendar (seasons, birthdays, holidays,
// what each person has coming up), and how often "while you were away" speaks up. Tested on its own.

export type Skill = 'cooking' | 'music' | 'writing' | 'coding' | 'study' | 'work' | 'fitness';
export const SKILLS: Record<Skill, { name: string; icon: string }> = {
    cooking: { name: 'Cooking', icon: '🍳' }, music: { name: 'Guitar', icon: '🎸' }, writing: { name: 'Writing', icon: '✍️' },
    coding: { name: 'Programming', icon: '💻' }, study: { name: 'Studying', icon: '📚' }, work: { name: 'Work', icon: '💼' }, fitness: { name: 'Fitness', icon: '🏋️' },
};
export const SKILL_LIST = Object.keys(SKILLS) as Skill[];

/* ---------- levels ---------- */

/** Experience for levels 1–10 (level 1 is where everyone starts). Slow on purpose: a good session gives ~20–30. */
export const LEVELS = [0, 40, 100, 180, 290, 430, 600, 800, 1050, 1350];
export const levelOf = (xp: number) => { let l = 1; for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i]) l = i + 1; return l; };
export const xpAt = (level: number) => LEVELS[Math.max(0, Math.min(LEVELS.length, level) - 1)];
/** Progress to the next level, 0–1. */
export const toNext = (xp: number) => { const l = levelOf(xp); if (l >= 10) return 1; return (xp - LEVELS[l - 1]) / (LEVELS[l] - LEVELS[l - 1]); };
export type Pace = 'slow' | 'normal' | 'fast';
export const PACE: Record<Pace, number> = { slow: 0.5, normal: 1, fast: 2 };
/** Experience for a session: just doing it gives an average amount; a mini-game by how well it went, more when perfect. */
export function xpFor(score: number | null, pace: Pace = 'normal'): number {
    const base = score === null ? 12 : 6 + 24 * Math.max(0, Math.min(1, score)) + (score >= 0.95 ? 6 : 0);
    return Math.round(base * PACE[pace]);
}
export const LEVEL_WORDS = ['', 'a beginner', 'a beginner', 'getting there', 'decent', 'good', 'good', 'very good', 'very good', 'excellent', 'a master'];

/** Starting levels from the traits picked when the persona was made (Mundi's Proficiency and Interests). */
const TRAIT_SKILL: Record<string, [Skill, number][]> = {
    'good cook': [['cooking', 4]], musical: [['music', 4]], 'tech-savvy': [['coding', 4]], smart: [['study', 3], ['coding', 2]], creative: [['writing', 3], ['music', 2]],
    athletic: [['fitness', 4]], strong: [['fitness', 3]], 'good with numbers': [['work', 3], ['coding', 2]], handy: [['cooking', 2]], charming: [['work', 2]],
    cooking: [['cooking', 2]], music: [['music', 2]], books: [['writing', 2], ['study', 2]], technology: [['coding', 2]], games: [['coding', 1]], sports: [['fitness', 2]], art: [['writing', 1]],
    ambitious: [['work', 2], ['study', 1]], curious: [['study', 1]],
};
export function seedFromTraits(traits: Record<string, string[]> | undefined): Partial<Record<Skill, number>> {
    const out: Partial<Record<Skill, number>> = {};
    for (const t of Object.values(traits ?? {}).flat()) for (const [s, l] of TRAIT_SKILL[String(t).toLowerCase()] ?? []) out[s] = Math.max(out[s] ?? 1, l);
    return out;
}
/** What the traits mean for the scene, in words ("good cook, musical; outgoing, sarcastic; into games and music"). */
export function traitsLine(traits: Record<string, string[]> | undefined): string {
    const t = traits ?? {}; const low = (l?: string[]) => (l ?? []).map(x => x.toLowerCase());
    const parts = [low(t.proficiency).join(', '), low(t.personality).join(', '), t.interests?.length ? `into ${low(t.interests).join(', ')}` : ''].filter(Boolean);
    return parts.join('; ');
}

/* ---------- how good an idea is (writing, coding) ---------- */

export type Tier = 0 | 1 | 2 | 3 | 4;
export const TIERS = ['weak', 'ordinary', 'good', 'great', 'brilliant'];
/** One idea's quality: better ones come more often with skill; brilliant ones are rare even for a master. */
export function rollTier(level: number, r: number): Tier {
    const L = Math.max(1, Math.min(10, level));
    const genius = Math.max(0, L - 5) * 0.012, great = 0.04 + L * 0.025, good = 0.15 + L * 0.03, weak = Math.max(0.04, 0.36 - L * 0.032);
    if (r < genius) return 4; if (r < genius + great) return 3; if (r < genius + great + good) return 2; if (r > 1 - weak) return 0; return 1;
}
/** A finished work: the average of what was chosen (0–4), with a little luck and a little skill; the words for it. */
export function verdict(points: number, steps: number, level: number, luck: number): { score: number; word: string } {
    const avg = steps ? points / steps : 0;
    const score = Math.max(0, Math.min(4.2, avg + (luck - 0.5) * 0.5 + level * 0.03));
    return { score, word: score >= 3.3 ? 'a masterpiece' : score >= 2.6 ? 'excellent' : score >= 1.9 ? 'good' : score >= 1.2 ? 'readable' : 'weak' };
}
export const AXES = { writing: ['originality', 'style', 'grip'], coding: ['design', 'polish', 'features'] } as const;
export const SIZES: [string, string, number][] = [['short', 'A short story', 3], ['novella', 'A novella', 6], ['novel', 'A novel', 10]];

/* ---------- chores ---------- */

export type ChoreId = 'dishes' | 'trash' | 'clean' | 'bath';
export const CHORES: { id: ChoreId; name: string; room: RegExp; per: number; mess: string }[] = [
    { id: 'dishes', name: 'Wash the dishes', room: /kitchen|кухн/i, per: 7, mess: 'dishes piling up in the sink' },
    { id: 'trash', name: 'Take out the trash', room: /kitchen|кухн/i, per: 2, mess: 'the trash overflowing' },
    { id: 'clean', name: 'Clean the common rooms', room: /living|lounge|гостин/i, per: 1, mess: 'the common rooms a mess' },
    { id: 'bath', name: 'Clean the bathroom', room: /bath|shower|wash|ванн|душ/i, per: 1, mess: 'the bathroom grimy' },
];
export const weekOf = (day: number) => Math.floor((Math.max(1, day) - 1) / 7);
/** The week's rota: chores go round the people (you too), a different one each week. */
export function rota(people: string[], week: number): Record<ChoreId, string> {
    const out = {} as Record<ChoreId, string>; if (!people.length) return out;
    CHORES.forEach((c, i) => { out[c.id] = people[(i + week) % people.length]; });
    return out;
}
/** Does someone do their chore today (tidy 0–100; reminded lately: much likelier)? */
export const willDo = (tidy: number, nudged: boolean, r: number) => r < Math.min(0.97, 0.12 + (tidy / 100) * 0.8 + (nudged ? 0.35 : 0));
/** How dirty a chore's room is (0–100) in words, or '' when it is fine. */
export const messWord = (v: number) => (v >= 70 ? 'a real mess' : v >= 40 ? 'messy' : v >= 20 ? 'a bit untidy' : '');

/* ---------- the calendar ---------- */

export const yearDays = (seasonDays: number) => 4 * Math.max(1, seasonDays);
export const dayOfYear = (day: number, seasonDays: number) => (Math.max(1, day) - 1) % yearDays(seasonDays);
/** New Year: the middle of winter (the year starts in spring, Mundi's seasons). */
export const newYearDay = (sd: number) => 3 * sd + Math.floor(sd / 2);
/** The golden week: the first days of summer (a week, or less in short seasons), nobody works or studies. */
export const goldenDays = (sd: number) => Math.min(7, Math.max(1, Math.ceil(sd / 2)));
export const isGolden = (day: number, sd: number) => { const d = dayOfYear(day, sd) - sd; return d >= 0 && d < goldenDays(sd); };
export const isNewYear = (day: number, sd: number) => dayOfYear(day, sd) === newYearDay(sd);
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MONTHS_RU = ['январ', 'феврал', 'март', 'апрел', 'ма[яй]', 'июн', 'июл', 'август', 'сентябр', 'октябр', 'ноябр', 'декабр'];
/** A birthday from the card ("born on March 3", "день рождения 3 марта"), as a day of the game's year; else -1. */
export function birthdayFromText(text: string, sd: number): number {
    const t = String(text ?? '').toLowerCase();
    if (!/birthday|born|день рожд|родил/.test(t)) return -1;
    for (let m = 0; m < 12; m++) {
        const re = new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTHS[m]}|${MONTHS[m]}\\s+(\\d{1,2})|(\\d{1,2})\\s+${MONTHS_RU[m]}`);
        const x = t.match(re); if (!x) continue;
        const d = Math.max(1, Math.min(31, Number(x[1] ?? x[2] ?? x[3])));
        // the year starts in spring: March is the first month
        const k = (m - 2 + 12) % 12; const pos = (k * 30 + d - 1) / 360;
        return Math.min(yearDays(sd) - 1, Math.floor(pos * yearDays(sd)));
    }
    return -1;
}
export const birthdayRandom = (r: number, sd: number) => Math.floor(r * yearDays(sd));
export const nextOn = (today: number, doy: number, sd: number) => { const cur = dayOfYear(today, sd); const y = yearDays(sd); return today + ((doy - cur + y) % y); };

/** What someone has coming up this week, by who they are (a student has exams, someone with a job interviews…). */
export type EvKind = 'exam' | 'interview' | 'date' | 'trip' | 'deadline' | 'gig' | 'doctor';
export const EVENTS: Record<EvKind, { text: string; good: string; bad: string; fits?: RegExp }> = {
    exam: { text: 'an exam', good: 'passed the exam', bad: 'failed the exam', fits: /student|study|university|college|school|студент|учёб|универ/i },
    interview: { text: 'a job interview', good: 'got the job offer', bad: 'did not get the job' },
    date: { text: 'a date with someone from outside', good: 'had a great date', bad: 'had an awkward date' },
    trip: { text: 'a visit to their family', good: 'had a nice time with the family', bad: 'came back from the family visit tense' },
    deadline: { text: 'a big deadline', good: 'made the deadline', bad: 'missed the deadline', fits: /work|job|office|freelanc|programmer|writer|работ|программист/i },
    gig: { text: 'a performance', good: 'nailed the performance', bad: 'messed up the performance', fits: /music|band|singer|actor|dancer|музык|группа|певиц|актёр|танц/i },
    doctor: { text: "a doctor's appointment", good: 'got good news from the doctor', bad: 'is worried after the doctor' },
};
/** 0–2 things for someone this week; `r` gives randomness (three numbers 0–1). */
export function weekEvents(card: string, r: [number, number, number], taken: boolean): EvKind[] {
    const n = r[0] < 0.35 ? 0 : r[0] < 0.85 ? 1 : 2;
    const pool = (Object.keys(EVENTS) as EvKind[]).filter(k => (!EVENTS[k].fits || EVENTS[k].fits!.test(card)) && !(k === 'date' && taken));
    const out: EvKind[] = [];
    for (let i = 0; i < n && pool.length; i++) { const k = pool[Math.floor(r[i + 1] * pool.length) % pool.length]; if (!out.includes(k)) out.push(k); }
    return out;
}

/* ---------- while you were away ---------- */

export const AWAY_MIN = 90, DIGEST_GAP = 240, DIGEST_MAX = 3;
/** A digest when you get home or wake up: only after a real absence, not more often than every few hours. */
export const digestDue = (awayFrom: number, now: number, lastDigest: number, morning: boolean) => (morning || now - awayFrom >= AWAY_MIN) && now - lastDigest >= (morning ? 60 : DIGEST_GAP);
