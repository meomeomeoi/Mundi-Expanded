// [expanded] Breaking into an empty bedroom at runtime (rules in doors.ts): watching for the owner's return each
// hour, and their reaction.
import { nowAbs, saveGame, toast, type Save } from '../core/store.js';
import { isScenario, type WorldDef } from '../core/world.js';
import { onHour } from './hooks.js';
import { whereNow } from './people.js';
import { bump, bondOf, isPartner, bondLabel } from './social.js';
import { feel } from './life.js';
import { note } from './facts.js';
import { chat, charOf, personaName } from '../st/bridge.js';
import { personalityOf } from './bonds.js';
import * as P from './profile.js';
import * as D from './doors.js';

const G = (g: Save) => g as unknown as P.GLike;
const H = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; return (h >>> 0) / 4294967296; };

export function startIntrusion(g: Save, loc: string, owners: string[]) {
    P.lifexOf(G(g)).intr = { loc, owners, at: nowAbs(g), from: chat().length };
}
const linesSince = (from: number) => chat().slice(from).filter((m: any) => !m.is_system || m.mes).map((m: any) => `${m.name}: ${String(m.mes ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}`).join('\n').slice(-2500);

async function react(g: Save, w: WorldDef, it: D.Intrusion, avatar: string, caught: boolean) {
    const r = g.cast[avatar]; if (!r) return;
    const minutes = Math.max(5, (it.left ?? nowAbs(g)) - it.at);
    let re = D.roughReaction(bondOf(g, avatar), isPartner(g, avatar), caught);
    try {
        const { bgAsk } = await import('./regulator.js');
        const c: any = charOf(avatar);
        const ans = await bgAsk(D.reactPrompt({ name: r.name, persona: personalityOf(c?.description ?? '', c?.personality ?? '', 600), you: personaName(), bond: bondLabel(g, avatar).toLowerCase(), partner: isPartner(g, avatar), caught, minutes, lines: linesSince(it.from) }), 200, D.REACT_SYSTEM);
        re = D.parseReaction(ans) ?? re;
    } catch (e) { console.warn('[Mundi Expanded] intrusion', e); }
    const delta = caught ? re.delta : Math.min(0, Math.round(re.delta / 2));
    if (delta) bump(g, avatar, delta);
    if (re.severity > 0 || delta < 0) feel(g, avatar, re.feeling, caught ? 3 : 2);
    note(g, caught ? '{u} went into {0}\'s room without asking, and {0} came back and found {u} there.' : '{0} suspects {u} went into their room without asking.', [r.name], [avatar], it.loc, 'event');
    if (caught) P.lifexOf(G(g)).caught = { avatar, until: nowAbs(g) + 60, text: re.reaction };
    toast(caught ? `${r.name} found you in their room${delta ? ` (closeness ${delta > 0 ? '+' : ''}${delta})` : ''}.` : `${r.name} seems to have noticed someone was in their room${delta ? ` (closeness ${delta})` : ''}.`, delta < -5 ? 'error' : 'warn');
    saveGame();
    const { refreshPrompt } = await import('./prompt.js'); refreshPrompt();
}

// Each hour: are you still inside, and did one of them come back?
onHour.push((g, w) => {
    if (!isScenario(w)) return [];
    const lx = P.lifexOf(G(g)); const it = lx.intr; if (!it || it.done) return [];
    const now = nowAbs(g);
    if (!it.left && g.player.loc !== it.loc) it.left = now;
    const back = it.owners.find(a => g.cast[a] && whereNow(g, w, g.cast[a]) === it.loc);
    if (back && !it.left) { it.done = true; react(g, w, it, back, true); return [`${g.cast[back].name} came back to their room — and found you there.`]; }
    if (back && it.left) {
        it.done = true;
        if (H(`${it.at}|${back}|notice`) < D.noticeChance(it.left - it.at)) react(g, w, it, back, false);
        return [];
    }
    if (it.left && now - it.left > 2 * 1440) it.done = true;
    return [];
});
