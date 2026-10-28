// [expanded] Gifts and money in the story: what the reader found (GIFT / PAY / LEND / REPAY lines, see money.ts)
// applied to the game. A gift from the player moves upstream's friendship (with the limits of money.ts: less for
// each gift that week, +8 a week at most, none above 80, a bad one in full) and leaves a feeling and a memory; a gift
// between two characters is an episode of their relationship (bonds.ts).
import { type Save } from '../core/store.js';
import { bondOf, bump } from './social.js';
import { feel } from './life.js';
import { note } from './facts.js';
import { applyChange, type GLike as BGLike } from './bonds.js';
import * as M from './money.js';

const FEEL: Partial<Record<M.Rating, [string, number]>> = { loved: ['Touched by your gift', 3], liked: ['Pleased with your gift', 1], disliked: ['Unimpressed by your gift', 1], offended: ['Offended by your gift', 3] };
const VERB: Record<M.Rating, string> = { loved: 'loved', liked: 'liked', meh: 'shrugged at', disliked: 'did not like', offended: 'was offended by' };

export function applyGifts(g: Save, ops: M.MOp[], you: string): string[] {
    const G = g as unknown as M.GLike; const notes: string[] = [];
    const nm = (a: string) => (a === M.PLAYER ? you : g.cast[a]?.name ?? a);
    for (const o of ops) {
        if (o.op !== 'gift' || !o.rating) continue;
        const thing = o.thing ?? 'a gift';
        if (o.from === M.PLAYER && g.cast[o.to]) {
            const gift = M.giftToRate(G, M.PLAYER, o.to, thing);
            if (gift.delta !== undefined) continue;
            const d = M.giftDelta(G, o.to, o.rating, bondOf(g, o.to), gift.id);
            gift.delta = d;
            if (d) bump(g, o.to, d);
            const f = FEEL[o.rating]; if (f) feel(g, o.to, f[0], f[1]);
            note(g, '{u} gave {0} {1}, and {0} {2} it.', [nm(o.to), thing, VERB[o.rating]], [o.to], g.player.loc, 'gift');
            notes.push(`${nm(o.to)} ${VERB[o.rating]} your gift${d ? ` (${d > 0 ? '+' : ''}${d} friendship)` : ''}`);
        } else if (g.cast[o.from] && g.cast[o.to]) {
            M.recordGift(G, o.from, o.to, thing).delta = M.GIFT_STEP[o.rating];
            const c = applyChange(g as unknown as BGLike, [o.from, o.to], M.GIFT_STEP[o.rating], `${nm(o.from)} gave ${nm(o.to)} ${thing}; ${nm(o.to)} ${VERB[o.rating]} it.`, 'scene');
            if (c) notes.push(`${nm(o.from)} → ${nm(o.to)}: ${thing}`);
        } else if (g.cast[o.from] && o.to === M.PLAYER) {
            M.recordGift(G, o.from, M.PLAYER, thing);
            note(g, '{0} gave {u} {1}.', [nm(o.from), thing], [o.from], g.player.loc, 'gift');
        }
    }
    return notes;
}
// For the scene: when the player keeps giving someone gifts, the people here notice.
export function giftLines(g: Save, present: string[]): string[] {
    const G = g as unknown as M.GLike;
    return present.filter(a => g.cast[a]).map(a => ({ a, n: M.giftsTo(G, a).length })).filter(x => x.n >= 2)
        .map(x => `{{user}} has given ${g.cast[x.a].name} ${x.n} gifts this week.`);
}
