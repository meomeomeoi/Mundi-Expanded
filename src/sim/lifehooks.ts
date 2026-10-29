// [expanded] Where this fork's parts add to what the scene is told about life in the house (kept apart, with no
// imports, like upstream's hooks.ts, so no module waits on another).
import type { Save, Resident } from '../core/store.js';
import type { WorldDef } from '../core/world.js';
/** About someone elsewhere in the house (null: nothing to add). */
export const houseNotes: ((g: Save, w: WorldDef, r: Resident) => string | null)[] = [];
/** Lines about the people here. */
export const presentNotes: ((g: Save, w: WorldDef, present: Resident[]) => string[])[] = [];
/** Lines about texts and group chats with the people here (their own prompt block, "Texts and chats"). */
export const phoneNotes: ((g: Save, w: WorldDef, present: Resident[]) => string[])[] = [];
/** [expanded] 0.2.0.8: changes to everyone's day plan (secret meetings): a new plan, never the one passed in changed. */
export const planMods: ((g: Save, w: WorldDef, day: number, plan: Record<string, import('./profile.js').Slot[]>) => Record<string, import('./profile.js').Slot[]>)[] = [];
