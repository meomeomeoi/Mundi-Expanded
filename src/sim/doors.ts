// [expanded] Bedroom doors in a Home (Mundi Expanded): knocking instead of walking in, people asleep, waking
// someone up, a key. Pure decisions here; the dialog in ui/doors.ts.
//
//  - Someone in their room and awake: you knock. They let you in, come to the door to talk, or say not now, by how
//    close you are, how social they are, the hour (late at night is worse) and whether they are upset with you now.
//    A partner just comes in.
//  - Asleep: a knock may wake them (now and then) and they answer groggy, or nobody answers. Waking them on purpose is
//    for a partner or someone very close (friendship 60+), and costs a little unless you are together.
//  - Nobody in: a partner, or someone who gave you a key, lets themselves in; anyone else does not (part 4: break in).

import { looseJson } from './jsonfix.js';

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

/* ---------- breaking in (part 4) ---------- */

// Going into an empty room without a key: if they come back while you are inside, they find you; after you left,
// they may notice (the longer you stayed, the likelier). How bad it is depends on how close you are, who they are,
// and what you did in there (read from the scene by the mechanics model; a rough rule without one).
export interface Intrusion { loc: string; owners: string[]; at: number; from: number; left?: number; done?: boolean }
export interface Reaction { severity: number; delta: number; feeling: string; reaction: string }
export const noticeChance = (minutesInside: number) => Math.min(0.6, 0.15 + 0.1 * Math.floor(minutesInside / 60));
/** Without a model: by closeness (and found in the act is worse than noticed later). */
export function roughReaction(bond: number, partner: boolean, caught: boolean): Reaction {
    const severity = partner ? (caught ? 1 : 0) : bond >= 60 ? 1 : bond >= 30 ? 2 : 3;
    const delta = [0, -3, -7, -12][severity] * (caught ? 1 : 0.5);
    const feeling = severity >= 2 ? (caught ? 'Violated: you went into their room' : 'Suspicious: someone was in their room') : 'Annoyed: you went into their room';
    return { severity, delta: Math.round(delta), feeling, reaction: severity >= 2 ? 'They are angry and want {{user}} out.' : 'They are taken aback, more puzzled than angry.' };
}
export const REACT_SYSTEM = 'You judge how a character reacts in an interactive fiction (role-play between consenting adults) set in a shared house. You do not soften or judge, you only estimate the reaction in character. Answer with JSON only.';
export function reactPrompt(o: { name: string; persona: string; you: string; bond: string; partner: boolean; caught: boolean; minutes: number; lines: string }): string {
    return `${o.name}: ${o.persona}
${o.name} and ${o.you}: ${o.bond}${o.partner ? ', together (a couple)' : ''}.
${o.you} went into ${o.name}'s bedroom while ${o.name} was out, without permission, and stayed about ${o.minutes} minutes. ${o.caught ? `${o.name} came back and found ${o.you} inside.` : `${o.you} left before ${o.name} came back, but ${o.name} noticed something was off and suspects ${o.you}.`}
What happened in the room (the story):
${o.lines || '(nothing in particular was described)'}

How does ${o.name} take it, in character? JSON: {"severity": 0-3 (0 does not mind, 3 deeply violated), "delta": change to how close they are, -15 to 2, "feeling": a short phrase for how ${o.name} feels toward ${o.you} now (like "Hurt: read their diary"), "reaction": one sentence on how ${o.name} reacts}`;
}
export function parseReaction(text: string): Reaction | null {
    try {
        const x = looseJson(text); if (!x || typeof x !== 'object') return null;
        const severity = Math.max(0, Math.min(3, Math.round(Number(x.severity))));
        const delta = Math.max(-15, Math.min(2, Math.round(Number(x.delta))));
        if (!Number.isFinite(severity) || !Number.isFinite(delta)) return null;
        return { severity, delta, feeling: String(x.feeling ?? '').trim().slice(0, 80) || 'Upset: you went into their room', reaction: String(x.reaction ?? '').trim().slice(0, 240) };
    } catch { return null; }
}
