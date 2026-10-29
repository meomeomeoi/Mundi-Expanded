export const LOVE = new Set(['dating', 'partner', 'spouse']);
const MEET_HOURS = [23, 22, 21];
/** Tonight's secret meetings (about every other day per couple). `roomOf`: whose room is where. */
export function meetsFor(couples, plan, day, roll, roomOf) {
    const out = [];
    for (const c of couples) {
        const pa = plan[c.a], pb = plan[c.b];
        if (!pa || !pb)
            continue;
        if (roll(`${c.a}|${c.b}|${day}|meet`) >= 0.5)
            continue;
        const free = (s) => !!s && s.kind !== 'out';
        const hours = MEET_HOURS.filter(h => free(pa[h]) && free(pb[h]));
        if (!hours.length)
            continue;
        // the hour with the fewest others awake (ties: the latest)
        const awake = (h) => Object.entries(plan).filter(([a, s]) => a !== c.a && a !== c.b && s[h] && !s[h].asleep && s[h].kind !== 'out').length;
        const hour = [...hours].sort((x, y) => awake(x) - awake(y) || y - x)[0];
        const host = roll(`${c.a}|${c.b}|${day}|host`) < 0.5 ? c.a : c.b;
        out.push({ host, guest: host === c.a ? c.b : c.a, hour, room: roomOf(host) });
    }
    return out;
}
/** The day plans with tonight's meetings in them (a copy: the plans may be shared). */
export function withMeets(plan, meets, nameOf) {
    if (!meets.length)
        return plan;
    const out = { ...plan };
    for (const m of meets)
        for (const [a, b] of [[m.host, m.guest], [m.guest, m.host]]) {
            const slots = [...out[a]];
            slots[m.hour] = { kind: 'room', loc: m.room, act: `quietly with ${nameOf(b)}, in secret`, asleep: false };
            out[a] = slots;
        }
    return out;
}
export const MEET_MARK = /, in secret$/;
/** How close someone is to a meeting in `room` (0–1), from where they are then. */
export function accessTo(s, room, sharesRoom) {
    if (!s || s.kind === 'out')
        return 0;
    if (sharesRoom)
        return s.asleep ? 0.3 : 0.9;
    if (s.loc === room)
        return 1;
    if (s.asleep)
        return 0.004;
    return s.loc.startsWith('home:') ? 0.03 : 0.06;
}
/** The chance one person notices: access · nosiness (0–100) · (1 - care, 0–1). */
export const noticeChance = (access, nosy, care) => Math.max(0, Math.min(0.95, access * (0.5 + nosy / 100) * (1 - care)));
/** How careful two people are with their secret: from how well each keeps secrets (0–100). */
export const careOf = (discreetA, discreetB) => Math.max(0.2, Math.min(0.85, 0.35 + (discreetA + discreetB) / 400));
/** A loud fight heard through the walls (step -2 or worse): the chance for one person at home. */
export const hearFight = (delta, nosy) => (delta > -2 ? 0 : Math.min(0.8, (delta <= -3 ? 0.45 : 0.25) * (0.5 + nosy / 100)));
/** The chance you are caught listening at a door: someone inside awake and nosy, and more each time today. */
export function caughtChance(nosy, tries) { return nosy.length ? Math.min(0.6, (0.06 + Math.max(...nosy) / 400) * (1 + tries * 0.6)) : 0; }
