// [expanded] Bedroom doors in a Home (Mundi Expanded): knocking instead of walking in, people asleep, waking
// someone up, a key. Pure decisions here; the dialog in ui/doors.ts.
//
//  - Someone in their room and awake: you knock. They let you in, come to the door to talk, or say not now, by how
//    close you are, how social they are, the hour (late at night is worse) and whether they are upset with you now.
//    A partner just comes in.
//  - Asleep: a knock may wake them (now and then) and they answer groggy, or nobody answers. Waking them on purpose is
//    for a partner or someone very close (friendship 60+), and costs a little unless you are together.
//  - Nobody in: a partner, or someone who gave you a key, lets themselves in; anyone else does not (part 4: break in).

export type Answer = 'in' | 'door' | 'no' | 'asleep';
export interface Who { bond: number; partner: boolean; key: boolean; social: number; grudge: boolean }
export const WAKE_BOND = 60, WOKEN_MIN = 120;
export const isLate = (hour: number) => hour >= 23 || hour < 7;
export const GRUDGE = /resent|angry|upset|hurt|annoy|betray|disappoint|mad at|furious|jealous|offended|stood/i;

/** Knocking on an awake person's door. `roll` 0–1 (the moment's luck). */
export function knock(o: Who, hour: number, roll: number, groggy = false): Answer {
    if (o.partner && !o.grudge) return 'in';
    const score = o.bond + (o.social - 50) * 0.3 - (isLate(hour) ? 20 : 0) - (o.grudge ? 30 : 0) - (groggy ? 15 : 0) + (roll - 0.5) * 30;
    return score >= 35 ? 'in' : score >= 12 ? 'door' : 'no';
}
/** Knocking on a sleeping person's door: about one time in three they wake up (and answer groggy). */
export function knockAsleep(o: Who, hour: number, rollWake: number, roll: number): Answer {
    return rollWake < 0.35 ? knock(o, hour, roll, true) : 'asleep';
}
export const canWake = (o: Who) => o.partner || o.bond >= WAKE_BOND;
export const letsSelfIn = (o: Who) => o.partner || o.key;

// A door just answered (let in, or let yourself in): upstream's own door check lets this one through, once.
// (it lasts a few seconds: a trip that never happened does not leave the door open)
let PASS = '', PASS_AT = 0;
export const passDoor = (loc: string) => { PASS = loc; PASS_AT = Date.now(); };
export const passPending = (loc: string) => !!PASS && PASS === loc && Date.now() - PASS_AT < 5000;
export const passing = (loc: string) => { const ok = passPending(loc); if (PASS === loc) PASS = ''; return ok; };
