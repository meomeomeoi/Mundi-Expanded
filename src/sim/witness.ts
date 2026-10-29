// [expanded] Who was there (Relationships 2.0, Mundi Expanded 0.2.0.8). In a Home the day's lines stay in the chat
// until you sleep (walking from room to room is one long scene), so the story model has read conversations the people
// here never heard. Each line keeps who was in the room with you, where and when; the scene prompt then says which
// earlier conversations the people here were not at, how private this moment is, and what the house knows (or does
// not know) about your own relationships. Also the night reader's day, with who was there before each stretch.
import { game, nowAbs, type Save } from '../core/store.js';
import { getWorld, isScenario, type WorldDef } from '../core/world.js';
import { chat, isFiller } from '../st/bridge.js';
import { presentAt } from './people.js';
import { placeOf } from './places.js';
import { dayStart } from './diary.js';
import { partnersOf, romanceTier } from './romance.js';
import { bondsOf, tieKnowLines, YOU, type GLike } from './bonds.js';
import { knowOf, knows, howText, type Knowable } from './knows.js';
import { sawTogether } from './secretsrun.js';
import { tellLines, hearNews } from './gossiprun.js';

const G = (g: Save) => g as unknown as GLike;
const hm = (m: number) => `${String(Math.floor((m % 1440) / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);

/** A line just added to the chat: who was there with you, where, when (a Home only). */
export function stamp(id: number) {
    const g = game(); const w = g && getWorld(g.world); if (!g || !w || !isScenario(w)) return;
    const m: any = chat()[id]; if (!m || m.is_system || isFiller(m) || m.extra?.mundi_here) return;
    const here = presentAt(g, w, g.player.loc).map(r => r.avatar);
    m.extra = { ...(m.extra ?? {}), mundi_here: here, mundi_loc: g.player.loc, mundi_at: nowAbs(g) };
    sawTogether(g, here, g.player.loc);   // a secret couple together in a bedroom, in front of you
    if (m.is_user) hearNews(g, here);   // someone with news for you, now that you are together
}

export interface Stretch { loc: string; here: string[]; from: number; to: number; spoke: string[]; start: number; end: number }
/** Today's lines in stretches of the same place and the same people (lines from before stamps belong to none). */
export function stretches(from: number, to = chat().length): Stretch[] {
    const out: Stretch[] = []; const list0 = chat();
    for (let i = Math.max(0, from); i < to; i++) {
        const m: any = list0[i]; const x = m?.extra; if (!x?.mundi_here || isFiller(m)) continue;
        const key = `${x.mundi_loc}|${[...x.mundi_here].sort().join(',')}`;
        const last = out.at(-1);
        if (last && `${last.loc}|${[...last.here].sort().join(',')}` === key) { last.to = x.mundi_at ?? last.to; last.end = i; if (!m.is_user && m.name) last.spoke.push(String(m.name)); continue; }
        out.push({ loc: x.mundi_loc, here: [...x.mundi_here], from: x.mundi_at ?? 0, to: x.mundi_at ?? 0, spoke: !m.is_user && m.name ? [String(m.name)] : [], start: i, end: i });
    }
    return out;
}

/** Conversations earlier today that some of the people here were not at. */
export function witnessLines(g: Save, w: WorldDef, present: string[]): string[] {
    if (!present.length) return [];
    const st = stretches(dayStart(g)).filter(s => s.spoke.length || s.here.length);
    const out: string[] = [];
    const name = (a: string) => g.cast[a]?.name ?? a;
    for (const s of st.slice(0, -1).slice(-6)) {   // the stretch going on now is this scene
        const missing = present.filter(a => !s.here.includes(a)); if (!missing.length) continue;
        const room = placeOf(g, w, s.loc)?.name ?? (s.loc.startsWith('home:') ? 'a bedroom' : s.loc);
        const there = s.here.length ? `only ${list([...s.here.map(name), '{{user}}'])} were there` : '{{user}} was there alone';
        out.push(`Earlier today (${hm(s.from)}${s.to > s.from ? `–${hm(s.to)}` : ''}, ${room.toLowerCase()}): ${there}. ${list(missing.map(name))} did not hear that and ${missing.length > 1 ? 'know' : 'knows'} nothing of it unless told.`);
    }
    return out.slice(-4);
}

/** How private this moment is: alone behind a closed door, alone in a common room, or a crowd. */
export function privacyLine(g: Save, w: WorldDef, present: string[]): string {
    if (!present.length) return '';
    const loc = g.player.loc; const bed = loc.startsWith('home:');
    const name = (a: string) => g.cast[a]?.name ?? a;
    if (present.length === 1) return bed
        ? `Privacy: {{user}} and ${name(present[0])} are alone in a bedroom with the door closed; nobody else can overhear.`
        : `{{user}} and ${name(present[0])} are alone in the ${(placeOf(g, w, loc)?.name ?? 'room').toLowerCase()} for now; someone could walk in, and raised voices carry.`;
    if (bed) return 'The bedroom door is closed: nobody outside hears what is said here.';
    if (present.length >= 4) return `A crowd: ${present.length + 1} people here. Not everyone hears everything: side conversations happen, and a quiet word to one person stays between the two.`;
    return '';
}

/** Your own relationships: known to the house (a partner who is not here), or a secret (who here does not know). */
export function youLines(g: Save, present: string[]): string[] {
    const b = bondsOf(G(g)); const hide = b.hide ?? {};
    const name = (a: string) => (a === YOU ? '{{user}}' : g.cast[a]?.name ?? a);
    const out: string[] = []; const open: string[] = [];
    for (const a of partnersOf(g).filter(x => g.cast[x])) {
        const what = romanceTier(g, a).name.toLowerCase();
        const h = hide[a];
        if (!h) { if (!present.includes(a)) open.push(`{{user}} and ${name(a)} (${what})`); continue; }
        const k: Knowable = { parts: [YOU, a], pub: 'private', know: h.know, day: h.day };
        const others = present.filter(x => x !== a);
        if (present.includes(a)) {
            const un = others.filter(x => !knows(k, x));
            out.push(`A secret: {{user}} and ${name(a)} (${what}).${un.length ? ` ${list(un.map(name))} ${un.length > 1 ? 'do' : 'does'} not know: in front of them they act as just housemates.` : others.length ? ' Everyone here knows.' : ''}`);
        } else for (const x of others) {
            const kx = knowOf(k, x); if (!kx) continue;
            out.push(kx.lvl === 'suspects' ? `${name(x)} suspects something between {{user}} and ${name(a)} (a hunch: hints, never stated).` : `${name(x)} knows a secret (${howText(kx, name)}): {{user}} and ${name(a)} (${what}).`);
        }
    }
    return [...(open.length ? [`Known to everyone in the house: ${open.join('; ')}.`] : []), ...out];
}

/** The scene prompt's "Who knows what" block. */
export function knowsBlock(g: Save, w: WorldDef, present: string[]): string[] {
    if (!isScenario(w)) return [];
    const lines = [privacyLine(g, w, present), ...tieKnowLines(G(g), present), ...youLines(g, present), ...tellLines(g, present), ...witnessLines(g, w, present)].filter(Boolean);
    return lines.length ? ['Who knows what (people act on what they know; what they do not know, they do not bring up):', ...lines] : [];
}
