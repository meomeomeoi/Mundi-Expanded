// [expanded] 0.2.1-12.3: who would go out with you right now (Home's "Go out"). Upstream takes anyone you click;
// here a stranger, someone asleep, or someone not close enough near their bedtime says no, and the picker says why.
import { nowAbs, type Save, type Resident } from '../core/store.js';
import type { WorldDef } from '../core/world.js';
import { bondOf, isPartner } from './social.js';
import { ALONG_BOND, isSleeping } from './plans.js';
import { slotAt } from './lifeday.js';
import { lifexOf } from './profile.js';
import { guestOf } from './guests.js';

export const LATE_BOND = 50;   // near their own bedtime, only people this close (or your partner) stay up to come out
export const LATE_AHEAD = 120; // "near": they would be asleep within two hours (each by their own schedule)

/** Why they would not come ('' when they would). */
export function alongWhy(g: Save, w: WorldDef, r: Resident): string {
    const now = nowAbs(g); const guest = !!guestOf(g, r.avatar);
    if (!r.met && !guest) return 'You have not met yet.';
    const b = isPartner(g, r.avatar) ? 100 : bondOf(g, r.avatar);
    if (!guest && b < ALONG_BOND) return 'They do not know you well enough yet.';
    const sleepsAt = (t: number) => { const s = slotAt(g, w, r, t); return s ? s.asleep : isSleeping(r, t); };
    if (sleepsAt(now) && !(lifexOf(g as any).woke?.[r.avatar] ?? 0)) return 'Asleep.';
    // their own bedtime, not the clock: a night owl comes out at 1 a.m., an early bird says no at 21:30
    if (b < LATE_BOND) for (let t = now + 30; t <= now + LATE_AHEAD; t += 30) if (sleepsAt(t)) return 'Going to bed soon.';
    return '';
}
