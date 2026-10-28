// [expanded] Where this fork's parts add to what the scene is told about life in the house (kept apart, with no
// imports, like upstream's hooks.ts, so no module waits on another).
import type { Save, Resident } from '../core/store.js';
import type { WorldDef } from '../core/world.js';
/** About someone elsewhere in the house (null: nothing to add). */
export const houseNotes: ((g: Save, w: WorldDef, r: Resident) => string | null)[] = [];
/** Lines about the people here. */
export const presentNotes: ((g: Save, w: WorldDef, present: Resident[]) => string[])[] = [];
