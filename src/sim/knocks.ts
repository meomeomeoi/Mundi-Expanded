// [expanded] Night visits (Mundi Expanded): late in the evening or at night, while you are awake in your room,
// someone may knock. Not often, and never at random: who comes, and why, follows from how close you are, romance,
// what happened (a fight between two of them today: one comes to vent; something between you and them: they want
// to talk it out), and who is a night owl. Off / rare (default) / normal / often.
// Pure logic; the hour check in nightknock.ts, the knock at the door in ui/knockui.ts.

export type Often = 'off' | 'rare' | 'normal' | 'often';
export const OFTEN: [Often, string][] = [['off', 'Off'], ['rare', 'Rare'], ['normal', 'Sometimes'], ['often', 'Often']];
// per hour of the night, for a single so-so candidate; someone close and in love about doubles it (rare: about one night
// in eight for a love interest, one in fifteen for a friend)
export const RATE: Record<Often, number> = { off: 0, rare: 0.015, normal: 0.035, often: 0.07 };
export const NIGHT_HOURS = [22, 23, 0, 1, 2, 3];
export interface Cand { avatar: string; bond: number; romance: number; partner: boolean; grudge: boolean; owl: boolean; vent?: string; lastVisit?: number }
export interface Visit { avatar: string; reason: string }
// The night a moment belongs to (after midnight is still the night before).
export const nightOf = (day: number, hour: number) => (hour < 12 ? day - 1 : day);

export function weightOf(c: Cand, night: number): number {
    if (c.bond < 30 && !c.partner && !c.grudge) return 0;
    let w = Math.max(0, (c.bond - 30) / 30) + Math.max(0, c.romance) / 25 + (c.partner ? 2 : 0) + (c.owl ? 0.5 : 0) + (c.vent ? 1 : 0) + (c.grudge ? 0.4 : 0);
    if (c.lastVisit !== undefined && night - c.lastVisit <= 1 && !c.partner) w *= 0.2;   // not two nights running
    return w;
}
const ROMANTIC = ['cannot sleep and wants to be close to {{user}}', 'brings two cups of tea and an excuse to stay', 'misses {{user}} and finally knocks'];
const FRIENDLY = ['cannot sleep and wants to talk', 'had a bad dream', 'saw the light under the door and wants company', 'wants to borrow something, and stays to chat'];
/** One hour of the night: maybe someone knocks (`roll`, `pick`, `which`: 0–1). */
export function pickVisitor(cands: Cand[], often: Often, night: number, roll: number, pick: number, which: number): Visit | null {
    const ws = cands.map(c => weightOf(c, night)); const total = ws.reduce((a, b) => a + b, 0);
    if (!total || roll >= RATE[often] * Math.min(2, 0.5 + total / 3)) return null;
    let x = pick * total, c = cands[cands.length - 1];
    for (let i = 0; i < cands.length; i++) { x -= ws[i]; if (x < 0) { c = cands[i]; break; } }
    const one = (l: string[]) => l[Math.floor(which * l.length) % l.length];
    const reason = c.grudge ? 'wants to talk about what happened between them and {{user}}'
        : c.vent ? `needs to vent about ${c.vent}`
        : c.partner || c.romance >= 40 ? one(ROMANTIC) : one(FRIENDLY);
    return { avatar: c.avatar, reason };
}
