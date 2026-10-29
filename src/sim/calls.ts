// [expanded] Phone calls (Mundi Expanded 0.2.0.10): now and then someone close to you who is not with you calls: a
// partner who misses you, a friend with news (gossip they have for you), someone wondering where you are when you are
// out, someone who needs to talk (unfinished business). It rings for a while: answer, decline, or let it ring out (a
// missed call). Answered, they are on the line in the scene: voice only (the scene is told so), until you hang up.
import { nowAbs, saveGame, type Save, type Resident } from '../core/store.js';
import { isScenario, type WorldDef } from '../core/world.js';
import { onHour } from './hooks.js';
import { presentNotes } from './lifehooks.js';
import { whereNow, OUT } from './people.js';
import { isSleeping } from './plans.js';
import { isOuting } from './places.js';
import { bondOf, isPartner, social } from './social.js';
import { feel } from './life.js';
import { bondsOf } from './bonds.js';

const H = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; return (h >>> 0) / 4294967296; };
export type CallFreq = 'off' | 'rare' | 'normal';
export interface CallX { freq?: CallFreq; ring?: { avatar: string; reason: string; at: number } | null; on?: { avatar: string; reason: string; since: number } | null; last?: number; missed?: { avatar: string; at: number }[] }
export const callsOf = (g: Save): CallX => ((g as any).callx ??= {}) as CallX;
const romance = (g: Save, a: string) => Number((g as any).romance?.[a]?.value ?? 0);

/** Why someone would call you now ('' : no reason). */
export function reasonFor(g: Save, w: WorldDef, r: Resident): string {
    const out = isOuting(g.player.loc) || g.player.loc === 'out';
    const news = (bondsOf(g as any).gossip as any)?.tell?.[r.avatar];
    const talk = (bondsOf(g as any).talk ?? []).find(t => (t.a === r.avatar && t.b === '__you') || (t.b === r.avatar && t.a === '__you'));
    if (talk) return `needs to talk about ${talk.about}`;
    if (news) return 'has news they are dying to tell you';
    if (out && (isPartner(g, r.avatar) || bondOf(g, r.avatar) >= 60)) return 'wonders where you are and when you will be back';
    if (isPartner(g, r.avatar) || romance(g, r.avatar) >= 50) return 'misses you and just wanted to hear your voice';
    if (bondOf(g, r.avatar) >= 70) return 'is bored and wants to chat';
    return '';
}
// each hour: maybe a call (at most one a day; never at night, never from someone with you)
onHour.push((g, w) => {
    if (!isScenario(w)) return [];
    const x = callsOf(g); const f = x.freq ?? 'rare'; if (f === 'off' || x.ring || x.on || (g as any).asleep) return [];
    const h = Math.floor(g.minutes / 60); if (h < 9 || h > 22 || (x.last ?? -1) === g.day) return [];
    const now = nowAbs(g);
    const cands = (Object.values(g.cast) as Resident[]).filter(r => r.met && !social(g).with.some(c => c.avatar === r.avatar) && !isSleeping(r, now) && whereNow(g, w, r) !== g.player.loc)
        .map(r => ({ r, why: reasonFor(g, w, r) })).filter(c => c.why);
    for (const c of cands) {
        const p = (f === 'normal' ? 0.05 : 0.025) * (isPartner(g, c.r.avatar) ? 1.6 : 1) * (whereNow(g, w, c.r) === OUT || isOuting(g.player.loc) ? 1.8 : 1);
        if (H(`${g.world}|${now}|${c.r.avatar}|call`) < p) { x.ring = { avatar: c.r.avatar, reason: c.why, at: now }; x.last = g.day; saveGame(); break; }
    }
    return [];
});

/** You answer: they are on the line, in the scene (voice only). */
export function answer(g: Save) {
    const x = callsOf(g); const k = x.ring; if (!k) return; x.ring = null;
    x.on = { avatar: k.avatar, reason: k.reason, since: nowAbs(g) };
    const s = social(g); if (!s.with.some(c => c.avatar === k.avatar)) s.with.push({ avatar: k.avatar, until: nowAbs(g) + 60 });
    saveGame();
}
export function hangUp(g: Save) {
    const x = callsOf(g); const k = x.on; if (!k) return; x.on = null;
    const s = social(g); s.with = s.with.filter(c => c.avatar !== k.avatar);
    saveGame();
}
/** Declined (or it rang out): a little hurt from someone who wanted you; a missed call either way. */
export function decline(g: Save, missed: boolean) {
    const x = callsOf(g); const k = x.ring; if (!k) return; x.ring = null;
    (x.missed ??= []).push({ avatar: k.avatar, at: nowAbs(g) }); x.missed = x.missed.slice(-10);
    if (!missed && (isPartner(g, k.avatar) || romance(g, k.avatar) >= 50)) feel(g, k.avatar, 'A little hurt: you declined their call', 1);
    saveGame();
}
export const onCall = (g: Save, avatar: string) => callsOf(g).on?.avatar === avatar;
presentNotes.push((g) => {
    const k = callsOf(g).on; const r = k && g.cast[k.avatar]; if (!k || !r) return [];
    return [`${r.name} is on a phone call with {{user}} (voice only: ${r.name} is not here in person and sees nothing of the room; anyone else here hears only {{user}}'s side). ${r.name} called because they ${k.reason}.`];
});
