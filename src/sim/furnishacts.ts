// [expanded] What you can do with the things in the room you are in (Mundi Expanded 0.2.0.7), in a modern Home whose
// rooms are furnished. The world's own actions that need a thing (Watch TV, Run on the treadmill, Make coffee, Cook,
// Freelance on the computer, Paint) are offered only where that thing is and you may use it; the room's other things
// add actions of their own (play on the console, the guitar, a bath, a book; a game with someone here, which brings
// you a little closer). Someone else's things only with them in the room.
import type { Save } from '../core/store.js';
import type { WorldDef, ActionDef } from '../core/world.js';
import { actionMods, onAction } from './hooks.js';
import { presentAt } from './people.js';
import { addBond } from './social.js';
import { furnishOn } from './furnishrun.js';
import * as F from './furnish.js';

const G = (g: Save) => g as unknown as F.GLike;
/** The world's actions that need a thing, by id. */
export const WORLD_NEEDS: Record<string, F.Afford> = { 'x-tv': 'watch', 'x-treadmill': 'exercise', 'x-workout': 'exercise', 'x-coffee': 'coffee', cook: 'cook', 'x-freelance': 'work', 'x-paint': 'craft' };
const low = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const ACTS: Partial<Record<F.Afford, { label: (n: string) => string; icon: string; minutes: number; effects: Record<string, number> }>> = {
    watch: { label: n => `Watch something on the ${low(n)}`, icon: '📺', minutes: 90, effects: { mood: 6, energy: -2 } },
    game: { label: n => `Play on the ${low(n)}`, icon: '🎮', minutes: 60, effects: { mood: 6, energy: -3 } },
    game2: { label: n => `Play with the others (${low(n)})`, icon: '🎲', minutes: 60, effects: { mood: 7, energy: -3 } },
    work: { label: n => `Get some work done (${low(n)})`, icon: '💻', minutes: 120, effects: { energy: -10, mood: -2 } },
    music: { label: n => `Play the ${low(n)}`, icon: '🎸', minutes: 45, effects: { mood: 6, energy: -3 } },
    read: { label: () => 'Read for a while', icon: '📖', minutes: 60, effects: { mood: 4, energy: 3 } },
    exercise: { label: n => `Work out (${low(n)})`, icon: '🏋️', minutes: 45, effects: { energy: -15, hygiene: -20, mood: 4 } },
    bath: { label: n => `Take a long soak (${low(n)})`, icon: '🛁', minutes: 45, effects: { hygiene: 60, mood: 6, energy: 5 } },
    craft: { label: n => `Make something (${low(n)})`, icon: '🎨', minutes: 90, effects: { mood: 5, energy: -5 } },
    chill: { label: n => `Relax on the ${low(n)}`, icon: '🛋️', minutes: 30, effects: { energy: 4, mood: 2 } },
    dress: { label: n => `Get ready at the ${low(n)}`, icon: '💄', minutes: 20, effects: { mood: 3 } },
};
const on = (g: Save, w: WorldDef) => furnishOn(w) && !!(g as any).furnishx?.started;

actionMods.push((g, w, list) => {
    if (!on(g, w)) return list;
    const room = g.player.loc;
    const here = presentAt(g, w, room).map(r => r.avatar);
    // what you may use here: the house's, yours, and someone else's while they are here
    const things = F.fixturesIn(G(g), room).filter(x => !x.decor && (x.owner === 'house' || x.owner === 'player' || here.includes(x.owner)));
    const can = (a: F.Afford) => things.find(x => F.affordsOf(x).includes(a)) ?? null;
    const kept = list.filter(a => !WORLD_NEEDS[a.id] || can(WORLD_NEEDS[a.id]));
    const covered = new Set(kept.map(a => WORLD_NEEDS[a.id]).filter(Boolean));
    const add: ActionDef[] = [];
    for (const [afford, d] of Object.entries(ACTS) as [F.Afford, NonNullable<typeof ACTS[F.Afford]>][]) {
        if (covered.has(afford)) continue;
        const x = can(afford); if (!x) continue;
        if (afford === 'game2' && !here.length) continue;   // a game together needs someone to play with
        const whose = x.owner !== 'house' && x.owner !== 'player' ? ` (${g.cast[x.owner]?.name}'s)` : '';
        add.push({ id: `x-fx-${afford}`, name: d.label(x.name), label: `${d.label(x.name)}${whose}`, icon: d.icon, cost: 0, minutes: d.minutes, home: true, effects: d.effects } as ActionDef);
    }
    return [...kept, ...add];
});
// a game together: a little closer with everyone who played
onAction.push((g, w, a) => {
    if (a.id !== 'x-fx-game2') return;
    for (const r of presentAt(g, w, g.player.loc)) if (r.met) addBond(g, r.avatar, 1);
});
