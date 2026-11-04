// [expanded] Mundi Expanded 0.2.1-15.4: "Redo the night". When the night read a day badly (nothing came out, a part was
// refused, the memory missed what mattered), the part can be read again from the same lines of the chat, from the phone's
// Settings. Each part first takes back what the last reading of it wrote (that day's memory moments, the notes of what
// they learned, the housemates' moments with the numbers they moved), then reads again; if the model does not answer,
// the old result comes back as it was. Nothing is applied twice. Feelings, money, things, the diary and the bigger
// changes are not here (they cannot be taken back cleanly).
import { saveGame, type Save } from '../core/store.js';
import type { WorldDef } from '../core/world.js';
import { chat } from '../st/bridge.js';
import { bondsOf, pairsIn, pairOf, removeFact, syncTies, STEP, YOU, type GLike } from './bonds.js';

export interface NightRec { day: number; start: number; end: number }
export type RedoKind = 'memory' | 'learned' | 'interactions' | 'secrets';
export const REDO: [RedoKind, string, string][] = [
    ['memory', 'Memory', 'The moments worth remembering from that day, how much they weigh, and who has changed.'],
    ['learned', 'What they learned', 'What each person learned about someone else that day (the "knows" notes of the long memory).'],
    ['interactions', 'Between the housemates', "What happened between the others that day, with the numbers it moved (what the last reading did is taken back first)."],
    ['secrets', 'Secrets', 'Who found out which secret that day, and who promised to keep it.'],
];
const G = (g: Save) => g as unknown as GLike;
/** Called when you go to sleep into a new day: the day that ended and the chat lines it was made of. */
export function recordNight(g: Save, day: number, range: { start: number; end: number }) { (g as any).redonight = { day, start: range.start, end: range.end } as NightRec; }
export const nightRec = (g: Save): NightRec | null => { const r = (g as any).redonight as NightRec | undefined; return r && Number.isFinite(r.day) ? r : null; };

/** Takes back what the last reading of `kind` wrote for `day`. */
export function undoNight(g: Save, kind: RedoKind, day: number): void {
    const b = bondsOf(G(g));
    if (kind === 'memory') {
        // the moments between you and one of them (weighed), the weights of the housemates' moments, the steps of who they became
        b.facts = b.facts.filter(f => !(f.kind === 'episode' && f.day === day && f.src === 'scene' && f.who.includes(YOU) && f.w !== undefined && !f.delta));
        for (const f of b.facts) if (f.kind === 'episode' && f.day === day && !f.who.includes(YOU) && f.w !== undefined) delete f.w;
        const x = (g as any).memx; if (x?.arc) for (const a of Object.keys(x.arc)) x.arc[a] = x.arc[a].filter((s: any) => !(s.by === 'night' && s.day === day));
    } else if (kind === 'learned') {
        const x = (g as any).memx; if (x?.know) for (const k of Object.keys(x.know)) x.know[k] = x.know[k].filter((n: any) => n.day !== day);
    } else if (kind === 'interactions') {
        for (const f of [...b.facts]) {
            if (f.kind !== 'episode' || f.day !== day || f.src === 'user' || !f.delta || f.who.includes(YOU)) continue;
            for (const [a, c] of pairsIn(f.who)) { const p = pairOf(G(g), a, c); p.v = Math.max(-100, Math.min(100, p.v - f.delta * STEP)); }
            removeFact(G(g), f.id);
        }
        syncTies(G(g));
    }
}
const snap = (g: Save) => JSON.parse(JSON.stringify({ bonds: (g as any).bonds ?? null, memx: (g as any).memx ?? null }));
const restore = (g: Save, s: { bonds: any; memx: any }) => { if (s.bonds) (g as any).bonds = s.bonds; if (s.memx) (g as any).memx = s.memx; };

/** Reads the last night's `kind` again. Returns a short line for the player; throws when the model gave no usable answer
 *  (and the old result is back as it was). */
export async function redoNight(g: Save, w: WorldDef, kind: RedoKind): Promise<string> {
    const rec = nightRec(g); if (!rec) return 'There is no night to read again yet: it is kept from the next time you sleep.';
    const range = { start: Math.min(rec.start, chat().length), end: Math.min(rec.end, chat().length) };
    const before = snap(g);
    try {
        undoNight(g, kind, rec.day);
        let out = '';
        if (kind === 'memory' || kind === 'learned') {
            const { memNight } = await import('./memrun.js');
            const n = await memNight(g, w, rec.day, range, { force: true, only: kind === 'memory' ? 'moments' : 'learned' });
            out = n.length ? n.slice(0, 3).join(' · ') : kind === 'memory' ? 'nothing new worth remembering' : 'nothing new learned';
        } else {
            const { bondsNight, changesNote } = await import('./bondsnight.js');
            const c = await bondsNight(g, w, rec.day, range, { force: true, only: kind });
            out = changesNote(c, !!(g as any).bonds?.truth) || (kind === 'secrets' ? 'no secret came out' : 'nothing happened between them');
        }
        saveGame();
        return `Day ${rec.day} read again: ${out}.`;
    } catch (e) { restore(g, before); throw e; }
}
