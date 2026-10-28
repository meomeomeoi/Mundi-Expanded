// [expanded] The characters' own plans (Mundi Expanded): two or three of them watch a movie in the living room, go
// to the cinema, cook together, without you, and sometimes they ask you along. And they are not always free for you.
//
//  - Made each night for the day, by rules (no AI call): each pair that gets along may make a plan (close friends
//    more often), more for social people, never right after a fight; homebodies keep to plans at home. At most two
//    plans a day in the house and one per person; now and then a third person joins.
//  - The time is an hour both are free (awake, home, not at work, not dinner); going out prefers the evening.
//  - When it is over: a good episode between them (Relationships), and cooking takes from the fridge.
//  - Your plans with them: a time they already have a plan is refused ("plans with Masha then"), unless you clearly
//    matter more (your partner, or a lot closer than they are with the other), and then the other plan is called off
//    (which the other one minds). Sometimes they just say no (upset with you, a homebody asked out, tired), more
//    rarely the closer you are, never a partner unless upset; and they may suggest another time.
//
// Pure logic (no SillyTavern), tested on its own; runtime in cplanrun.ts.

export type CAct = 'movie' | 'games' | 'cook' | 'workout' | 'swim' | 'cafe' | 'dinner' | 'drinks' | 'walk' | 'cinema' | 'mall';
export interface CActDef { id: CAct; name: string; room?: string; out?: string; hours: number; story: string }
export const CACTS: CActDef[] = [
    { id: 'movie', name: 'Movie night', room: 'living', hours: 2, story: 'watching a movie together' },
    { id: 'games', name: 'Game night', room: 'living', hours: 2, story: 'playing games together' },
    { id: 'cook', name: 'Cooking together', room: 'kitchen', hours: 2, story: 'cooking something together' },
    { id: 'workout', name: 'Working out together', room: 'gym', hours: 1, story: 'working out together' },
    { id: 'swim', name: 'At the pool', room: 'pool', hours: 2, story: 'hanging out at the pool' },
    { id: 'cafe', name: 'Coffee out', out: 'a café downtown', hours: 2, story: 'out for coffee' },
    { id: 'dinner', name: 'Dinner out', out: 'a restaurant', hours: 3, story: 'out for dinner' },
    { id: 'drinks', name: 'Drinks', out: 'a bar', hours: 3, story: 'out for drinks' },
    { id: 'walk', name: 'A walk', out: 'a walk around the neighbourhood', hours: 2, story: 'out for a walk' },
    { id: 'cinema', name: 'The cinema', out: 'the cinema', hours: 3, story: 'at the cinema' },
    { id: 'mall', name: 'Shopping', out: 'the shopping mall', hours: 3, story: 'shopping at the mall' },
];
export const cactOf = (id: string) => CACTS.find(a => a.id === id) ?? null;

export interface CPlan {
    id: string; who: string[]; act: CAct; place: string;   // place: a room id, or '' when out (see `out`)
    out?: string; from: number; to: number; state: 'set' | 'done' | 'cancelled';
    invite?: string;            // who asks you along (avatar), when they do
    asked?: boolean;            // the invitation was sent
    you?: 'yes' | 'no';         // your answer
}
export interface Person { avatar: string; social: number; free: (hour: number) => boolean }
export interface MakeIn {
    day: number; people: Person[]; rooms: string[];
    value: (a: string, b: string) => number;        // how they get along (−100..100)
    recent: (a: string, b: string) => number;       // the latest episode between them in the last two days: <0 a fight, >0 good, 0 none
    likesYou: (a: string) => number;                // their friendship with you (0..100)
    busy?: (a: string, from: number, to: number) => boolean;   // already has plans with you
    roll: (k: string) => number;                    // 0–1
}
export const MAX_A_DAY = 2;
const PAIR_GOOD = 15, PAIR_CLOSE = 45;

/** How likely a pair is to make a plan today. */
export function pairChance(v: number, sa: number, sb: number, recent: number): number {
    if (v < PAIR_GOOD || recent < 0) return 0;
    const base = v >= PAIR_CLOSE ? 0.16 : 0.06;
    return base * ((sa + sb) / 100) * (recent > 0 ? 1.5 : 1);
}
/** The day's plans. */
export function makeDayPlans(m: MakeIn): CPlan[] {
    const out: CPlan[] = []; const taken = new Set<string>();
    const ps = [...m.people].sort((a, b) => a.avatar.localeCompare(b.avatar));
    const pairs: [Person, Person][] = [];
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) pairs.push([ps[i], ps[j]]);
    // the likeliest pairs try first (shuffled by the day among equals)
    pairs.sort((x, y) => pairChance(m.value(y[0].avatar, y[1].avatar), y[0].social, y[1].social, 0) - pairChance(m.value(x[0].avatar, x[1].avatar), x[0].social, x[1].social, 0) || m.roll(`o|${x[0].avatar}|${x[1].avatar}`) - m.roll(`o|${y[0].avatar}|${y[1].avatar}`));
    for (const [a, b] of pairs) {
        if (out.length >= MAX_A_DAY) break;
        if (taken.has(a.avatar) || taken.has(b.avatar)) continue;
        const key = `${a.avatar}|${b.avatar}`;
        if (m.roll(`p|${key}`) >= pairChance(m.value(a.avatar, b.avatar), a.social, b.social, m.recent(a.avatar, b.avatar))) continue;
        // out of the house, or at home (homebodies stay in)
        const goOut = Math.min(a.social, b.social) >= 35 && m.roll(`out|${key}`) < Math.min(a.social, b.social) / 100 * 0.7;
        const acts = CACTS.filter(x => (goOut ? !!x.out : !!x.room && m.rooms.includes(x.room!)));
        if (!acts.length) continue;
        const act = acts[Math.floor(m.roll(`act|${key}`) * acts.length)];
        // an hour both are free, for as long as it lasts (out: the evening first)
        const both = (h: number) => Array.from({ length: act.hours }, (_, k) => h + k).every(x => x < 24 && a.free(x) && b.free(x));
        const order = goOut ? [18, 19, 17, 20, 16, 15, 14, 13, 12, 11, 21] : [19, 20, 21, 15, 16, 17, 14, 13, 12, 11, 10, 18, 22];
        const start = order.filter(both).find(h => !m.busy?.(a.avatar, m.day * 1440 + h * 60, m.day * 1440 + (h + act.hours) * 60) && !m.busy?.(b.avatar, m.day * 1440 + h * 60, m.day * 1440 + (h + act.hours) * 60));
        if (start === undefined) continue;
        const who = [a.avatar, b.avatar];
        // now and then a third who gets along with both and is free
        const third = ps.find(c => !who.includes(c.avatar) && !taken.has(c.avatar) && m.value(c.avatar, a.avatar) >= PAIR_GOOD && m.value(c.avatar, b.avatar) >= PAIR_GOOD
            && Array.from({ length: act.hours }, (_, k) => start + k).every(x => c.free(x)) && (!goOut || c.social >= 35));
        if (third && m.roll(`3|${key}`) < 0.25) who.push(third.avatar);
        const from = m.day * 1440 + start * 60;
        const p: CPlan = { id: `c${m.day}_${out.length}`, who, act: act.id, place: act.room ?? '', ...(act.out ? { out: act.out } : {}), from, to: from + act.hours * 60, state: 'set' };
        // the one who likes you most may ask you along (not a plan that starts in the morning)
        const fan = [...who].sort((x, y) => m.likesYou(y) - m.likesYou(x))[0];
        if (start >= 15 && m.likesYou(fan) >= 45 && m.roll(`inv|${key}`) < 0.35) p.invite = fan;
        out.push(p); who.forEach(x => taken.add(x));
    }
    return out;
}

/* ---------- your plans with them ---------- */

const overlaps = (p: { from: number; to: number }, from: number, to: number) => p.from < to && from < p.to;
/** Their own plan at that time (not one you are part of), or null. */
export const takenBy = (plans: CPlan[], avatar: string, from: number, to: number) => plans.find(p => p.state === 'set' && p.you !== 'yes' && p.who.includes(avatar) && overlaps(p, from, to)) ?? null;
/** You matter more than the other plan: your partner, or a lot closer to you than to the other(s). */
export const outranks = (yourBond: number, partner: boolean, pairValue: number) => partner || yourBond >= Math.max(0, pairValue) + 20;
export interface Soft { grudge: boolean; homebody: boolean; out: boolean; planToday: boolean; partner: boolean; bond: number }
/** Sometimes they just say no (`roll` 0–1): the reason, or ''. */
export function softNo(o: Soft, roll: number): string {
    if (o.partner && !o.grudge) return '';
    const chance = 0.05 + (o.grudge ? 0.4 : 0) + (o.homebody && o.out ? 0.2 : 0) + (o.planToday ? 0.1 : 0) - o.bond / 400;
    if (roll >= Math.max(0, chance)) return '';
    return o.grudge ? 'They are still upset with you.' : o.homebody && o.out ? 'They do not feel like going out.' : o.planToday ? 'They already spent time with you today and want some time to themselves.' : 'They would rather rest then.';
}
