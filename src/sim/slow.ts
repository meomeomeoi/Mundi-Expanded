// [expanded] Slow burn (Mundi Expanded): a Home difficulty where closeness takes weeks. Pure logic; the hook-ups are
// in slowburn.ts.
//  - Every gain of friendship and romance is halved (the fractions carry over, so small gains are not rounded away).
//  - Romance grows from closeness: it cannot rise above friendship − 25.
//  - Romance rises at most 2 a day (with the rest, about 3–5 weeks of play from friends to a couple).
//  - Someone you met during the game (not known when it began) is "far too soon" to ask out for two weeks.

export const SLOW = { mult: 0.5, romMult: 0.5, romDay: 2, gap: 25, knownDays: 14 };
export interface SlowState { frac: Record<string, number>; rom: Record<string, number>; met: Record<string, number | 'start'>; seen?: boolean }
export function slowOf(g: any): SlowState {
    const s = (g.slow ??= { frac: {}, rom: {}, met: {} });
    s.frac ??= {}; s.rom ??= {}; s.met ??= {};
    return s;
}
// A gain scaled down, with the fraction kept for next time.
export function scaleGain(s: SlowState, key: string, delta: number, mult: number): number {
    if (delta <= 0) return delta;
    const exact = delta * mult + (s.frac[key] ?? 0);
    const whole = Math.floor(exact + 1e-9);
    s.frac[key] = Math.round((exact - whole) * 1000) / 1000;
    return whole;
}
// A romance gain after the slow-burn rules: scaled, at most `romDay` a day, never above friendship − `gap`.
export function romanceGain(s: SlowState, avatar: string, day: number, delta: number, romNow: number, bond: number): number {
    if (delta <= 0) return delta;
    let d = scaleGain(s, `r|${avatar}`, delta, SLOW.romMult);
    const key = `${avatar}|${day}`;
    for (const k of Object.keys(s.rom)) if (!k.endsWith(`|${day}`)) delete s.rom[k];
    d = Math.min(d, Math.max(0, SLOW.romDay - (s.rom[key] ?? 0)));
    d = Math.min(d, Math.max(0, bond - SLOW.gap - romNow));
    if (d > 0) s.rom[key] = (s.rom[key] ?? 0) + d;
    return Math.max(0, d);
}
// Who the player knows: everyone known the first time this is seen counts as known from the start; anyone met later
// is remembered with the day.
export function trackMet(s: SlowState, met: string[], day: number) {
    if (!s.seen) { s.seen = true; for (const a of met) s.met[a] = 'start'; return; }
    for (const a of met) if (s.met[a] === undefined) s.met[a] = day;
}
/** Days known; 'start' for people known when the game began; null when not met. */
export const knownFor = (s: SlowState, avatar: string, day: number): number | 'start' | null => {
    const m = s.met[avatar]; return m === undefined ? null : m === 'start' ? 'start' : day - m;
};
