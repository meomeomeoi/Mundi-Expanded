// [expanded] 0.2.1-13: the day's scenes in the game, and what the story model may read of them.
// In a Home the whole day stays in the chat until you sleep (upstream's choice: walking between rooms is one long
// conversation). Before each reply, SillyTavern hands this extension the lines it is about to send (its
// "generate interceptor"); the scenes none of the people here were in are taken out of that copy (the chat itself is
// untouched, so they come back the moment one of those people is here again). The scene prompt still says what
// happened there and who was there (witness.ts), and the night reader still reads the whole day.
import { game, type Save } from '../core/store.js';
import { getWorld, isScenario } from '../core/world.js';
import { chat, isFiller } from '../st/bridge.js';
import { presentAt } from './people.js';
import { dayStart } from './diary.js';
import { cutScenes, unheard, type Entry, type Scene, type CtxMode } from './scenes.js';

export const CTX_MODES: [CtxMode, string, string][] = [
    ['shared', 'What they were there for', 'Earlier scenes today that none of the people here were in are left out of what the AI reads (it still knows they happened, and who was there). Your scenes alone stay.'],
    ['strict', 'Strict', 'Your scenes alone are left out too, while someone is with you.'],
    ['all', 'Everything', 'The AI reads the whole day, as upstream does; the scene prompt only tells it who did not hear what.'],
];
export const ctxMode = (g: Save): CtxMode => ((g as any).scenex?.mode ?? 'shared');
export const setCtxMode = (g: Save, m: CtxMode) => { ((g as any).scenex ??= {}).mode = m; };

/** A chat line → an entry (lines that are not part of the conversation: null). */
export function entryOf(m: any, i: number): Entry | null {
    if (!m || isFiller(m)) return null;
    if (m.is_system && !m.extra?.mundi_narrator) return m.extra?.image || m.extra?.media?.length ? { i, loc: null, here: [], at: 0 } : null;   // a picture: in the scene it was made in
    const x = m.extra ?? {};
    return x.mundi_loc ? { i, loc: String(x.mundi_loc), here: Array.isArray(x.mundi_here) ? x.mundi_here.map(String) : [], at: Number(x.mundi_at) || 0 } : { i, loc: null, here: [], at: 0 };
}
/** The scenes in chat lines [from, to). Hidden lines (a past day) count too: the "Previously" view reads them. */
export function scenesIn(from: number, to = chat().length, hidden = false): Scene[] {
    const list = chat(); const es: Entry[] = [];
    for (let i = Math.max(0, from); i < to; i++) {
        const m = list[i]; if (!m) continue;
        const e = hidden && m.is_system && !m.extra?.mundi_narrator ? hiddenEntry(m, i) : entryOf(m, i); if (e) es.push(e);
    }
    return cutScenes(es);
}
// a line SillyTavern's "hide" turned into a system line (an earlier day): still a line of the story
const hiddenEntry = (m: any, i: number): Entry | null => (String(m.mes ?? '').trim() && !isFiller(m) && (m.name || m.is_user) && !/^(system|SillyTavern System)$/i.test(String(m.name ?? '')) ? entryOf({ ...m, is_system: false }, i) : null);

/** The chat lines the people here could not have heard (none of them was in that scene earlier today). */
export function unheardNow(g: Save): Set<number> {
    const w = getWorld(g.world); if (!w || !isScenario(w)) return new Set();
    const present = presentAt(g, w, g.player.loc).map(r => r.avatar);
    return unheard(scenesIn(dayStart(g)), present, ctxMode(g));
}

// SillyTavern calls this before each generation with the lines it will send (a copy of the list: taking lines out
// of it changes only this prompt). Quiet calls (the extension's own background questions) are left alone.
export function interceptor(list: any[], _size?: number, _abort?: unknown, type?: string) {
    try {
        if (type === 'quiet' || !Array.isArray(list)) return;
        const g = game(); if (!g) return;
        const drop = unheardNow(g); if (!drop.size) return;
        // SillyTavern may hand over copies of the lines ({...line, mes: after its regex}): matched by the line itself,
        // its extra (a copy keeps the same one), or its send date and speaker
        const all = chat(); const gone = [...drop].map(i => all[i]).filter(Boolean);
        const objs = new Set<any>(gone), extras = new Set<any>(gone.map((m: any) => m.extra).filter(Boolean));
        const keys = new Set(gone.filter((m: any) => m.send_date).map((m: any) => `${m.send_date}|${m.name}|${!!m.is_user}`));
        for (let k = list.length - 1; k >= 0; k--) {
            const m = list[k];
            if (objs.has(m) || (m?.extra && extras.has(m.extra)) || (m?.send_date && keys.has(`${m.send_date}|${m.name}|${!!m.is_user}`))) list.splice(k, 1);
        }
    } catch (e) { console.warn('[Mundi] scene filter', e); }
}
(globalThis as any).mundiExpandedInterceptor = interceptor;
