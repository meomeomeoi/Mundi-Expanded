// [expanded] Slow burn hooked into upstream's friendship and romance (rules in slow.ts). Only in a Home set to it.
import { cfg, type Save } from '../core/store.js';
import { getWorld, isScenario } from '../core/world.js';
import { onDay } from './hooks.js';
import * as L from './slow.js';

export const slowOn = (g: Save) => isScenario(getWorld(g.world)) && (cfg(g) as any).difficulty === 'slow';
const track = (g: Save) => L.trackMet(L.slowOf(g), Object.values(g.cast).filter(r => r.met).map(r => r.avatar), g.day);
// tracked in every Home (so turning slow burn on later knows who was met when)
onDay.push((g, w) => { if (isScenario(w)) track(g); return []; });

/** A friendship gain after slow burn (upstream's bump). */
export function slowBump(g: Save, avatar: string, delta: number): number {
    // 30 or more at once is a starting bond (a newborn's 60), not something earned
    return delta > 0 && delta < 30 && slowOn(g) ? L.scaleGain(L.slowOf(g), `b|${avatar}`, delta, L.SLOW.mult) : delta;
}
/** A romance gain after slow burn (the night's verdict). */
export function slowRomance(g: Save, avatar: string, delta: number, romNow: number, bond: number): number {
    return delta > 0 && slowOn(g) ? L.romanceGain(L.slowOf(g), avatar, g.day, delta, romNow, bond) : delta;
}
/** For upstream's "how ready are they": someone met in the game less than two weeks ago is far too soon. */
export function knownNote(g: Save, avatar: string, name: string): string {
    if (!slowOn(g)) return '';
    track(g);
    const k = L.knownFor(L.slowOf(g), avatar, g.day);
    if (k === 'start' || k === null || k >= L.SLOW.knownDays) return '';
    const when = k === 0 ? 'met {{user}} only today' : `has known {{user}} for only ${k} day${k === 1 ? '' : 's'}`;
    return ` [${name} ${when}: it is far too soon for this, whatever ${name} feels; let ${name} say so.]`;
}
