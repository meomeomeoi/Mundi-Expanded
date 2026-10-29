// [expanded] 0.2.1-14.1: who notices you on your phone. Upstream says nothing about it; the scene only had what you
// texted, so everyone tended to react every time. Now each time you take the phone out (after a quarter of an hour
// without it) each person here who is awake rolls: a nosy one notices more often, someone who just noticed less
// (a third), and the scene is told who noticed and who did not. Texting someone who is right here: they notice.
import { nowAbs, saveGame } from '../core/store.js';
import { getWorld, isScenario } from '../core/world.js';
import { presentAt } from './people.js';
import { slotAt } from './lifeday.js';
import { profileOf, nosyOf } from './profile.js';
import { presentNotes } from './lifehooks.js';
const H = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
} h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; return (h >>> 0) / 4294967296; };
export const SESSION = 15; // game minutes without the phone: the next time is a new "taking it out"
export const SHOWN = 20; // the scene hears about it for this long
export const AGAIN = 180; // someone who noticed within this long notices a third as often
/** The chance someone notices: 12% for the oblivious, ~37% at an ordinary 50, ~62% for someone who misses nothing. */
export const noticeChance = (nosy, noticedLately) => (0.12 + Math.max(0, Math.min(100, nosy)) / 200) * (noticedLately ? 1 / 3 : 1);
const X = (g) => (g.phoneseen ??= { at: -999, last: -999, loc: '', saw: [], missed: [] });
/** You took the phone out (or are still on it). `to`: whom you just texted, if they are right here. */
export function usePhone(g, to = '') {
    if (!g)
        return;
    const w = getWorld(g.world);
    if (!w || !isScenario(w))
        return;
    const x = X(g);
    const now = nowAbs(g);
    const loc = g.player.loc;
    const here = presentAt(g, w, loc).filter((r) => !slotAt(g, w, r, now)?.asleep);
    if (now - x.last > SESSION || x.loc !== loc) {
        x.at = now;
        x.loc = loc;
        x.saw = [];
        x.missed = [];
        x.texted = [];
        const seen = (x.noticed ??= {});
        for (const r of here) {
            const p = noticeChance(nosyOf(profileOf(g, r.avatar)), now - (seen[r.avatar] ?? -9999) < AGAIN);
            if (H(`${g.world}|${now}|${r.avatar}|phone`) < p) {
                x.saw.push(r.avatar);
                seen[r.avatar] = now;
            }
            else
                x.missed.push(r.avatar);
        }
    }
    if (to && here.some(r => r.avatar === to)) {
        (x.texted ??= []).includes(to) || x.texted.push(to);
        x.missed = x.missed.filter(a => a !== to);
        if (!x.saw.includes(to))
            x.saw.push(to);
    }
    x.last = now;
    saveGame();
}
presentNotes.push((g, w, present) => {
    if (!isScenario(w))
        return [];
    const x = g.phoneseen;
    if (!x || x.loc !== g.player.loc || nowAbs(g) - x.last > SHOWN)
        return [];
    const ids = new Set(present.map(r => r.avatar));
    const nm = (a) => g.cast[a]?.name ?? a;
    const saw = x.saw.filter(a => ids.has(a)), missed = x.missed.filter(a => ids.has(a)), texted = (x.texted ?? []).filter(a => ids.has(a));
    if (!saw.length && !missed.length)
        return [];
    const out = [`{{user}} has been on the phone just now.`];
    if (texted.length)
        out.push(`${texted.map(nm).join(' and ')} got {{user}}'s text while sitting right here.`);
    const others = saw.filter(a => !texted.includes(a));
    if (others.length)
        out.push(`${others.map(nm).join(' and ')} noticed (they may remark on it, or let it go).`);
    if (missed.length)
        out.push(`${missed.map(nm).join(' and ')} did not notice and ${missed.length > 1 ? 'do' : 'does'} not react to it.`);
    return [out.join(' ')];
});
