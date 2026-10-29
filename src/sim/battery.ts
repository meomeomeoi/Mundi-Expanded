// [expanded] 0.2.1-12.3: the phone's battery. It charges while you sleep and runs down through the day
// (about a fifth left by midnight), never below 5% — up at 4 in the morning, it still turns on.
import type { Save } from '../core/store.js';
import { onHour } from './hooks.js';

export const DRAIN = 5;       // % an hour awake (up at 7: ~20% at 23:00)
export const CHARGE = 30;     // % an hour asleep (a night fills it)
export const FLOOR = 5;
/** One game hour later. */
export const nextLevel = (lvl: number, asleep: boolean) =>
    asleep ? Math.min(100, lvl + CHARGE) : Math.max(FLOOR, lvl - DRAIN);
export const battery = (g: Save) => Math.round(((g as any).battx?.lvl ?? 100));

onHour.push((g) => {
    const x = ((g as any).battx ??= { lvl: 100 });
    x.lvl = nextLevel(Number(x.lvl) || 100, !!(g as any).asleep);
    return [];
});
