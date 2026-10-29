// [expanded] The phone in the corner comes alive (Mundi Expanded 0.2.0.10): a new message makes it buzz and slide up
// with the message on its screen for a few seconds (who, what, which chat), instead of a notice at the top; a tap opens
// it. And when you look at your phone in the middle of a scene, the people there notice.
import { game, notify } from '../core/store.js';
import { getWorld, isScenario } from '../core/world.js';
import { presentNotes } from '../sim/lifehooks.js';
import { presentAt } from '../sim/people.js';
export const PEEK = { list: [], until: 0, timer: 0 };
/** A message arrived: the phone buzzes and shows it (the newest three). */
export function pushPeek(p) {
    PEEK.list = [...PEEK.list, { ...p, at: Date.now() }].slice(-3);
    PEEK.until = Date.now() + 6500;
    clearTimeout(PEEK.timer);
    PEEK.timer = setTimeout(() => { PEEK.list = []; notify(); }, 6600);
    globalThis.__muSfx?.('info');
    try {
        navigator.vibrate?.(60);
    }
    catch { /* not a phone */ }
    notify();
}
export const peeking = () => PEEK.list.length > 0 && Date.now() < PEEK.until;
// you looked at your phone while people were talking to you
const LOOK = { at: 0, n: 0 };
export function phoneOpened() {
    const g = game();
    const w = g && getWorld(g.world);
    if (!g || !w || !isScenario(w))
        return;
    if (presentAt(g, w, g.player.loc).length) {
        LOOK.n = Date.now() - LOOK.at < 5 * 60_000 ? LOOK.n + 1 : 1;
        LOOK.at = Date.now();
    }
}
presentNotes.push((g, w, present) => {
    if (!present.length || Date.now() - LOOK.at > 3 * 60_000)
        return [];
    void w;
    void g;
    return [`{{user}} has just been looking at their phone while the others were there${LOOK.n > 2 ? ', again and again' : ''}: someone may notice, and mind.`];
});
