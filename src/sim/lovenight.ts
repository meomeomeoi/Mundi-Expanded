// [expanded] Feelings at runtime (Mundi Expanded 0.2.0.9; rules in love.ts): what the scene is told (who has feelings
// for whom here, yours, how someone would take flirting from you, how open a couple is), the night's sparks and
// confessions, flirting in front of a partner, the daily fading.
import type { Save } from '../core/store.js';
import { isScenario, type WorldDef } from '../core/world.js';
import { personaName } from '../st/bridge.js';
import { onDay } from './hooks.js';
import { romValue, partnersOf, addRomance } from './romance.js';
import { activeFeelings } from './life.js';
import { bump } from './social.js';
import { profileOf } from './profile.js';
import { GRUDGE } from './doors.js';
import { applyChange, setStatus, statusOf, YOU, type GLike, type TieLike } from './bonds.js';
import { knowOf, type Knowable } from './knows.js';
import { loversOf, openTalk } from './consequences.js';
import * as L from './love.js';
import { polyHouseOn } from './romance.js';   // [expanded] 0.2.1-14.3

const G = (g: Save) => g as unknown as GLike;
const N = (g: Save, a: string) => (a === YOU ? personaName() : g.cast[a]?.name ?? a);
const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
const P_ = (g: Save, a: string) => profileOf(g as any, a);
export const taken = (g: Save, a: string) => ['taken', 'married'].includes(P_(g, a)?.status ?? '');
export const canFallFor = (g: Save, a: string, b: string) => b === YOU || L.canFall((P_(g, a)?.orient ?? '') as L.Orient, (P_(g, a)?.gender ?? '') as L.Gender, (P_(g, b)?.gender ?? '') as L.Gender);
const loveK = (g: Save, a: string, b: string): Knowable => ({ parts: [a], pub: 'private', know: L.loveKnow(G(g) as any, a, b).know, day: 0 });

/** For the scene's "Who knows what": feelings here, yours, how flirting would land, couples and affection. */
export function loveLines(g: Save, present: string[]): string[] {
    if (!L.flirtOn(G(g) as any)) return [];
    const out: string[] = []; const x = L.loveOf(G(g) as any);
    for (const a of present) for (const b of [...present, ...Object.keys(g.cast).filter(c => !present.includes(c))]) {
        if (a === b) continue; const v = L.feelings(G(g) as any, a, b); if (v < 15) continue;
        if (loversOf(g, a).includes(b)) continue;   // a couple: their status says it
        const said = x.said?.[L.lk(a, b)]; const here = present.includes(b);
        const others = present.filter(c => c !== a && c !== b);
        const knowers = others.filter(c => knowOf(loveK(g, a, b), c)?.lvl === 'knows');
        out.push(`${N(g, a)}'s feelings for ${N(g, b)}${here ? '' : ' (not here)'}: ${L.loveWord(v)}${said ? `, and ${N(g, a)} has told ${N(g, b)}` : `, unspoken${here ? ` (${N(g, b)} does not know)` : ''}`}.${knowers.length ? ` ${list(knowers.map(c => N(g, c)))} ${knowers.length > 1 ? 'know' : 'knows'}.` : ''}`);
    }
    // yours (set by you)
    for (const [b, m] of Object.entries(x.mine ?? {})) {
        if (!g.cast[b]) continue; const here = present.includes(b);
        const k: Knowable = { parts: [YOU], pub: m.secret ? 'private' : 'public', know: m.know, day: m.day };
        const knowers = present.filter(c => c !== b && knowOf(k, c)?.lvl === 'knows');
        if (!here && !knowers.length) continue;
        out.push(`{{user}} ${m.lvl === 'love' ? 'is in love with' : 'likes'} ${N(g, b)}${here ? '' : ' (not here)'}${m.secret ? ', and keeps it to themself' : ''}.${here && m.secret ? ` ${N(g, b)} does not know unless {{user}} shows it.` : ''}${knowers.length && m.secret ? ` ${list(knowers.map(c => N(g, c)))} ${knowers.length > 1 ? 'have' : 'has'} noticed.` : ''}`);
    }
    // a crush on you, unspoken: alone with you, they may say it
    if (present.length === 1) { const a = present[0]; if (g.cast[a] && romValue(g, a) >= 60 && !partnersOf(g).includes(a) && !x.said?.[L.lk(a, YOU)]) out.push(`${N(g, a)} has a crush on {{user}} and has never said it. Alone like this, if the moment feels right, ${N(g, a)} might, or might lose their nerve.`); }
    // how flirting from you would land
    const moods = present.filter(a => g.cast[a]).map(a => {
        const partner = loversOf(g, a).find(p => p !== YOU && present.includes(p));
        const m = L.flirtMood({ romance: romValue(g, a), partnerHere: !!partner, taken: taken(g, a) || (!polyHouseOn(g) && loversOf(g, a).some(p => p !== YOU)), grudge: activeFeelings(g, a).some(f => GRUDGE.test(f.tag)) });
        return `${N(g, a)} would be ${m === 'welcome' ? 'glad of it' : m === 'flustered' ? 'flustered (not unhappy)' : `uncomfortable${partner ? ` (${N(g, partner)}, their partner, is right here)` : ''}`}`;
    });
    if (moods.length && !present.every(a => partnersOf(g).includes(a))) out.push(`If {{user}} flirts: ${moods.join('; ')}. Someone not interested says so kindly or changes the subject.`);
    // couples here and affection in front of others
    for (const t of (G(g).living?.ties ?? []) as TieLike[]) {
        if (!['dating', 'partner', 'spouse'].includes(t.type) || t.secret || !present.includes(t.a) || !present.includes(t.b)) continue;
        const shy = [t.a, t.b].filter(a => P_(g, a)?.pda === 'shy'), open = [t.a, t.b].filter(a => P_(g, a)?.pda === 'open');
        if (present.length > 2 && (shy.length || open.length)) out.push(`${N(g, t.a)} and ${N(g, t.b)} are a couple: ${shy.length ? `${list(shy.map(a => N(g, a)))} ${shy.length > 1 ? 'are' : 'is'} shy about affection in front of others` : `${list(open.map(a => N(g, a)))} ${open.length > 1 ? 'do' : 'does'} not care who sees`}.`);
    }
    return out.slice(0, 7);
}

/** The night prompt's part about feelings (sparks, confessions), and the crushes it may say were found out. */
export function nightLoveText(g: Save, user: string): string[] {
    if (!L.flirtOn(G(g) as any)) return [];
    const x = L.loveOf(G(g) as any);
    const crush = Object.entries(x.v).filter(([k, v]) => v >= 60 && !x.said?.[k]).map(([k]) => k.split('>')).filter(([a, b]) => g.cast[a] && (g.cast[b] || b === YOU));
    return ['', `Feelings (romantic, not friendship), for the scenes and for life without ${user}: SPARK | A > B | +1 to +3 or -1 to -3 | what happened (A's feelings for B grew: flirting, a look held too long, blushing, a kiss; they cooled: negative). A <> B when it went both ways. ${user} can be B (a character's feelings for ${user}); when ${user} flirted with someone, write ${user} > Name. Most days: none.`,
        `If two people (${user} may be one) clearly spent the night together or were intimate in today's scenes: NIGHT | A & B | where | secret (if they hide it).`,
        ...(crush.length ? [`Unspoken crushes: ${crush.map(([a, b]) => `${N(g, a)} > ${N(g, b)}`).join('; ')}. If one was confessed in today's scenes, or (rarely, without ${user}) one is confessed tonight: CONFESS | A > B.`] : [])];
}
/** Applies the night's sparks and confessions. `seen(a)`: who else was in the room when `a` spoke today. Notes. */
export function applyLove(g: Save, raw: string, find: (n: string) => string | null, seen: (a: string) => string[], day: number): string[] {
    if (!L.flirtOn(G(g) as any)) return [];
    const out: string[] = [];
    for (const s of L.parseSparks(raw, find)) {
        if (s.a === YOU) {   // you flirted: a partner of theirs who saw it minds
            for (const p of loversOf(g, s.b).filter(p => p !== YOU && seen(s.b).includes(p))) { bump(g, p, -3); applyChange(G(g), [p, s.b], -1, `${N(g, p)} saw ${N(g, YOU)} flirting with ${N(g, s.b)}.`, 'offscreen', { pub: 'witnessed', seen: seen(s.b) }); }
            continue;
        }
        if (!g.cast[s.a]) continue;
        if (s.b === YOU) { if (s.d > 0) addRomance(g, s.a, Math.min(6, s.d * 2)); else addRomance(g, s.a, Math.max(-6, s.d * 2)); continue; }
        if (!g.cast[s.b]) continue;
        const d = L.grow(G(g) as any, s.a, s.b, s.d, day, { can: canFallFor(g, s.a, s.b), taken: taken(g, s.a) });
        if (d) out.push(`${N(g, s.a)} → ${N(g, s.b)} ${d > 0 ? '+' : ''}${d}`);
        // flirting in front of a partner
        if (s.d > 0) for (const p of loversOf(g, s.a).filter(p => p !== s.b && p !== YOU && seen(s.a).includes(p))) applyChange(G(g), [p, s.a, s.b].slice(0, 3), -1, `${N(g, p)} saw ${N(g, s.a)} flirting with ${N(g, s.b)}.`, 'offscreen', { pub: 'witnessed' });
    }
    for (const line of String(raw ?? '').split('\n')) {
        const m = line.trim().replace(/^[-*•]\s*/, '').match(/^CONFESS\s*\|\s*(.+?)\s*(?:>|→|->)\s*(.+?)\s*$/i); if (!m) continue;
        const a = find(m[1]), b = find(m[2].split('|')[0]); if (!a || !b || a === b || !g.cast[a]) continue;
        const x = L.loveOf(G(g) as any); (x.said ??= {})[L.lk(a, b)] = day;
        if (b === YOU) { out.push(`${N(g, a)} confessed to you`); continue; }
        if (!g.cast[b]) continue;
        if (L.feelings(G(g) as any, b, a) >= L.CRUSH && !loversOf(g, a).length && !loversOf(g, b).length) {
            setStatus(G(g), a, b, 'dating'); const t = statusOf(G(g), a, b); if (t) t.day = day;
            applyChange(G(g), [a, b], 2, `${N(g, a)} told ${N(g, b)} how they feel, and ${N(g, b)} feels the same: they are together now.`, 'offscreen', { pub: 'public' });
            out.push(`${N(g, a)} and ${N(g, b)} are together`);
        } else {
            applyChange(G(g), [a, b], -1, `${N(g, a)} told ${N(g, b)} how they feel; ${N(g, b)} does not feel the same.`, 'offscreen', { pub: 'witnessed' });
            openTalk(g, a, b, `${N(g, a)}'s confession`); L.grow(G(g) as any, a, b, -1, day, { can: true, taken: false });
        }
    }
    return out;
}
/** A couple may form from two crushes: the night's bigger change asks this instead of looking for a spark. */
export const mutualFor = (g: Save, a: string, b: string) => L.mutual(G(g) as any, a, b);

// each day: feelings nobody fed fade a little (a couple's stay)
onDay.push((g, w: WorldDef) => { if (isScenario(w)) { L.fade(G(g) as any, g.day, (a, b) => loversOf(g, a).includes(b)); } return []; });
