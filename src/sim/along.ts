// [expanded] 0.2.1-12.3: who would go out with you right now (Home's "Go out"). Upstream takes anyone you click;
// here a stranger, someone asleep, or someone not close enough at night says no, and the picker says why.
import { nowAbs, type Save, type Resident } from '../core/store.js';
import type { WorldDef } from '../core/world.js';
import { bondOf, isPartner } from './social.js';
import { ALONG_BOND, isSleeping } from './plans.js';
import { slotAt } from './lifeday.js';
import { lifexOf } from './profile.js';
import { guestOf } from './guests.js';
import { lateHour } from './own.js';

export const LATE_BOND = 50;   // after 23:00 (and before 6), only people this close (or your partner) come out

/** Why they would not come ('' when they would). */
export function alongWhy(g: Save, w: WorldDef, r: Resident): string {
    const now = nowAbs(g); const guest = !!guestOf(g, r.avatar);
    if (!r.met && !guest) return 'You have not met yet.';
    const b = isPartner(g, r.avatar) ? 100 : bondOf(g, r.avatar);
    if (!guest && b < ALONG_BOND) return 'They do not know you well enough yet.';
    const s = slotAt(g, w, r, now);
    const asleep = s ? s.asleep && !(lifexOf(g as any).woke?.[r.avatar] ?? 0) : isSleeping(r, now);
    if (asleep) return 'Asleep.';
    if (lateHour(g.minutes) && b < LATE_BOND) return 'Too late to go out with you.';
    return '';
}
