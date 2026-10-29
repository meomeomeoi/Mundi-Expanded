import { onHour } from './hooks.js';
export const DRAIN = 5; // % an hour awake (up at 7: ~20% at 23:00)
export const CHARGE = 30; // % an hour asleep (a night fills it)
export const FLOOR = 5;
/** One game hour later. */
export const nextLevel = (lvl, asleep) => asleep ? Math.min(100, lvl + CHARGE) : Math.max(FLOOR, lvl - DRAIN);
export const battery = (g) => Math.round((g.battx?.lvl ?? 100));
onHour.push((g) => {
    const x = (g.battx ??= { lvl: 100 });
    x.lvl = nextLevel(Number(x.lvl) || 100, !!g.asleep);
    return [];
});
