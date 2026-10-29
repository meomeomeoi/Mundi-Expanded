// [expanded] The runtime side of the relationships between characters (see bonds.ts for the rules): the night's
// AI call, the daily drift, and what is sent with each scene. Only in Home (a scenario world).
import { saveGame } from '../core/store.js';
import { isScenario } from '../core/world.js';
import { chat, personaName, charOf } from '../st/bridge.js';
import { bgAsk } from './regulator.js';
import { onDay } from './hooks.js';
import { dayStart } from './diary.js';
import { isMinor } from './family.js';
import { placeOf } from './places.js';
import { profileOf, ORIENTS, STATUSES } from './profile.js';
import { bondsOf, YOU, syncTies, drift, bondsLines, nightPrompt, parseNight, applyChange, personalityOf, looksAnswered, NIGHT_SYSTEM } from './bonds.js';
const G = (g) => g;
const clean = (t) => String(t ?? '').replace(/<(think|thinking|reasoning)>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
// The daily drift back toward where each pair started (no AI; runs as the day turns, also while you sleep).
onDay.push((g, w) => { if (isScenario(w)) {
    syncTies(G(g));
    drift(G(g));
} return []; });
// For the scene prompt: how the characters here get along with each other.
export function bondsPromptLines(g, w, present) {
    if (!isScenario(w))
        return [];
    return bondsLines(G(g), present);
}
// The night: today's conversation is read for what changed between the characters in it, and (if turned on) a few
// small things happen between housemates without the player. One AI call; runs before the day's start mark moves.
// `range`: the day's lines in the chat, taken when you went to sleep (the call runs later, after the diary, and you
// may already be talking in the new day by then).
export async function bondsNight(g, w, day, range) {
    if (!isScenario(w))
        return [];
    const gl = G(g);
    const b = bondsOf(gl);
    if (b.lastNight === day)
        return [];
    syncTies(gl);
    // children stay out of it (their relationships are not simulated)
    const people = Object.values(g.cast).filter(r => !isMinor(g, r.avatar)).map(r => {
        const c = charOf(r.avatar);
        // [expanded] 0.2.0.8: orientation, status and how they keep secrets (their profile), before the card
        const pr = profileOf(g, r.avatar);
        const traits = [pr?.orient ? ORIENTS.find(o => o[0] === pr.orient)?.[1].toLowerCase() : '', pr?.status ? STATUSES.find(o => o[0] === pr.status)?.[1].toLowerCase() : '', pr?.discreet !== undefined ? (pr.discreet >= 70 ? 'keeps secrets' : pr.discreet <= 30 ? 'a gossip' : '') : ''].filter(Boolean);
        return { avatar: r.avatar, name: r.name, personality: `${traits.length ? `(${traits.join('; ')}) ` : ''}${personalityOf(c?.description ?? c?.data?.description ?? '', c?.personality ?? c?.data?.personality ?? '')}` };
    });
    if (people.length < 2)
        return [];
    const me = personaName();
    const msgs = chat().slice(range?.start ?? dayStart(g), range?.end).filter((m) => clean(m.mes) && !m.extra?.mundi_diary); // (not is_system: going to sleep /hides the scene, which marks its lines as system)
    const names = new Set(people.map(p => p.name));
    const spoke = [...new Set(msgs.filter((m) => !m.is_user && names.has(String(m.name ?? ''))).map((m) => String(m.name)))]
        .map(n => people.find(p => p.name === n).avatar);
    // [expanded] 0.2.0.8: who was in the room, before each stretch (the reader says who else saw a moment)
    let key = '';
    const lines0 = [];
    for (const m of msgs) {
        const x = m.extra;
        const k = x?.mundi_here ? `${x.mundi_loc}|${[...x.mundi_here].sort().join(',')}` : '';
        if (k && k !== key) {
            key = k;
            const room = placeOf(g, w, x.mundi_loc)?.name ?? (String(x.mundi_loc).startsWith('home:') ? 'a bedroom' : x.mundi_loc);
            lines0.push(`[In ${String(room).toLowerCase()}: ${[...x.mundi_here.map((a) => g.cast[a]?.name ?? '?'), me].join(', ')}]`);
        }
        lines0.push(`${m.is_user ? me : m.extra?.mundi_narrator ? 'Narrator' : m.name}: ${clean(m.mes).slice(0, 400)}`);
    }
    let convo = lines0.slice(-90).join('\n');
    // who was around when each of them spoke today (a moment's witnesses, unless the reader says otherwise)
    const around = {};
    for (const m of msgs) {
        const here = m.extra?.mundi_here ?? [];
        const sp = here.find(a => g.cast[a]?.name === m.name);
        if (sp)
            here.forEach(x => (around[sp] ??= new Set()).add(x));
    }
    // the day's group chats count too (on their phones): what was written there can change how they get along
    {
        const { chatsOf, nameOf } = await import('./chatrun.js');
        const { dayLines } = await import('./chats.js');
        const d = dayLines(chatsOf(g).chats, day * 1440, (day + 1) * 1440 + 12 * 60, (by) => (by === 'me' ? me : nameOf(g, by)));
        if (d.lines.length) {
            convo += `${convo ? '\n' : ''}[On their phones, in group chats today (not face to face):]\n${d.lines.join('\n')}`;
            for (const a of d.authors)
                if (!spoke.includes(a) && people.some(p => p.avatar === a))
                    spoke.push(a);
        }
    }
    if (convo.length > 12000)
        convo = convo.slice(-12000);
    if (spoke.length < 2 && b.life === 'off') {
        b.lastNight = day;
        return [];
    }
    const prompt = nightPrompt(gl, { day, user: me, premise: String(g.cfg?.start?.text || w.scenario?.premise || ''), people, convo, spoke, life: b.life });
    const raw = await bgAsk(prompt, 2500, NIGHT_SYSTEM); // the mechanics model when set, else the main one
    // a refusal (or anything that is not the asked form) is not "nothing happened": say so, and try again next night
    if (!looksAnswered(raw))
        throw new Error(`the model did not answer in the asked form${raw ? ` (it said: "${raw.slice(0, 80).replace(/\s+/g, ' ')}…")` : ''}`);
    const changes = [];
    for (const p of parseNight(raw, people, b.life)) {
        // scene moments are only between people who were in today's scenes
        if (p.src === 'scene' && p.who.some(a => !spoke.includes(a)))
            continue;
        // [expanded] 0.2.0.8: who else knows it
        const seen = p.seen === 'none' ? [] : p.seen ?? (p.src === 'scene' ? [...new Set(p.who.flatMap(a => [...(around[a] ?? [])]))].filter(a => p.who.every(x => around[x]?.has(a) || x === a)) : []);
        const c = applyChange(gl, p.who, p.delta, p.text, p.src, { pub: p.seen === 'none' ? 'private' : 'witnessed', seen: p.src === 'scene' ? [YOU, ...seen] : seen });
        if (c)
            changes.push(c);
    }
    b.lastNight = day;
    saveGame();
    return changes;
}
// A short line for a notice: "Relationships: A & B +1 · C & D −1".
export const changesNote = (list0, all = false) => {
    const list = all ? list0 : list0.filter(c => c.you);
    return list.length
        ? `Relationships: ${list.map(c => `${c.names.join(' & ')} ${c.delta > 0 ? `+${c.delta}` : c.delta < 0 ? `−${-c.delta}` : '·'}`).join(' · ')}`
        : '';
};
