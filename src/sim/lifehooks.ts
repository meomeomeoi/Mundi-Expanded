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
/** [expanded] 0.2.0.11: after the scene follows who is here (you moved, someone came or left). */
export const afterSync: ((g: Save, w: WorldDef, here: Resident[]) => void)[] = [];
/** [expanded] 0.2.0.11: minutes from room to room in a Home (the first that answers a number wins; none: 0). */
export const roomMinutes: ((g: Save, w: WorldDef, from: string, to: string) => number | null)[] = [];
/** [expanded] 0.2.1-12: an action clicked in a room that something else takes over (a mini-game first): true = handled. */
export const takeover: ((g: Save, w: WorldDef, a: import('../core/world.js').ActionDef) => boolean)[] = [];
/** [expanded] 0.2.1-12: a day nobody works (the golden week). */
export const dayOff: ((g: Save, day: number) => boolean)[] = [];
/** [expanded] 0.2.1-12: more things the house may talk about (the talk engine's "house" source). */
export const talkHooks: ((g: Save, who: string[]) => { t: string; tone?: string }[])[] = [];
/** [expanded] 0.2.1-12: news for the group chats (chores left undone…). */
export const chatNews: ((g: Save) => { text: string; who: string[]; weight: number }[])[] = [];
/** [expanded] 0.2.1-12: more buttons in someone's ring menu. */
export const ringButtons: ((g: Save, w: WorldDef, avatar: string) => { act: string; icon: string; label: string }[])[] = [];
