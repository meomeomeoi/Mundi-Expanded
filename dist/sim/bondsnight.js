// [expanded] The runtime side of the relationships between characters (see bonds.ts for the rules): the night's
// AI call, the daily drift, and what is sent with each scene. Only in Home (a scenario world).
import { saveGame } from '../core/store.js';
import { isScenario } from '../core/world.js';
import { chat, quiet, personaName, charOf } from '../st/bridge.js';
import { onDay } from './hooks.js';
import { dayStart } from './diary.js';
import { isMinor } from './family.js';
import { bondsOf, syncTies, drift, bondsLines, nightPrompt, parseNight, applyChange, personalityOf, NIGHT_SYSTEM } from './bonds.js';
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
        return { avatar: r.avatar, name: r.name, personality: personalityOf(c?.description ?? c?.data?.description ?? '', c?.personality ?? c?.data?.personality ?? '') };
    });
    if (people.length < 2)
        return [];
    const me = personaName();
    const msgs = chat().slice(range?.start ?? dayStart(g), range?.end).filter((m) => clean(m.mes) && !m.extra?.mundi_diary); // (not is_system: going to sleep /hides the scene, which marks its lines as system)
    const names = new Set(people.map(p => p.name));
    const spoke = [...new Set(msgs.filter((m) => !m.is_user && names.has(String(m.name ?? ''))).map((m) => String(m.name)))]
        .map(n => people.find(p => p.name === n).avatar);
    let convo = msgs.map((m) => `${m.is_user ? me : m.extra?.mundi_narrator ? 'Narrator' : m.name}: ${clean(m.mes).slice(0, 400)}`).slice(-80).join('\n');
    if (convo.length > 12000)
        convo = convo.slice(-12000);
    if (spoke.length < 2 && b.life === 'off') {
        b.lastNight = day;
        return [];
    }
    const prompt = nightPrompt(gl, { day, user: me, premise: String(g.cfg?.start?.text || w.scenario?.premise || ''), people, convo, spoke, life: b.life });
    const raw = await quiet(prompt, 700, NIGHT_SYSTEM);
    const changes = [];
    for (const p of parseNight(raw, people, b.life)) {
        // scene moments are only between people who were in today's scenes
        if (p.src === 'scene' && p.who.some(a => !spoke.includes(a)))
            continue;
        const c = applyChange(gl, p.who, p.delta, p.text, p.src);
        if (c)
            changes.push(c);
    }
    b.lastNight = day;
    saveGame();
    return changes;
}
// A short line for a notice: "Relationships: A & B +1 · C & D −1".
export const changesNote = (list) => list.length
    ? `Relationships: ${list.map(c => `${c.names.join(' & ')} ${c.delta > 0 ? `+${c.delta}` : c.delta < 0 ? `−${-c.delta}` : '·'}`).join(' · ')}`
    : '';
