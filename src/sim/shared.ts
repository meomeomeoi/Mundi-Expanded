// [expanded] 15.4.1: which of the things you can do in a room can be done with someone, and which are yours alone.
// The list of mini-games that take a partner used to live in ui/minigames.ts; it is here so the action list can show
// it too (a 👥 or a 👤 on each action) from the same place the picker reads it.
import { GAME_OF, type Game } from './ownrun.js';

/** The mini-games that can be done with someone who is here (the picker offers "With: …"). */
export const WITH: Game[] = ['cook', 'guitar', 'clean', 'crossword', 'study'];
/** Room actions that only exist with someone (a game with the others). */
const NEEDS_OTHERS = new Set(['x-fx-game2']);

export type Sharing = 'with' | 'alone';
/** Can this action be done with someone? ('with': yes, or only that way; 'alone': it is just you.) */
export function sharingOf(actionId: string): Sharing {
    const m = GAME_OF[actionId] ?? GAME_OF[actionId.replace(/^(x-own-chore)-\w+$/, '$1-clean')];
    if (NEEDS_OTHERS.has(actionId) || (m && WITH.includes(m.game))) return 'with';
    return 'alone';
}
/** The small badge in front of an action's details line. */
export function sharingBadge(actionId: string): string {
    return sharingOf(actionId) === 'with'
        ? '<span class="mh-share is-with" title="Can be done with someone here" aria-label="Can be done with someone">👥</span>'
        : '<span class="mh-share is-alone" title="Just you" aria-label="Just you">👤</span>';
}
