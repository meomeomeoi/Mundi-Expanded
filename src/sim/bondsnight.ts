// [expanded] The runtime side of the relationships between characters (see bonds.ts for the rules): the night's
// AI call, the daily drift, and what is sent with each scene. Only in Home (a scenario world).
import { threadText } from './talk.js';   // [expanded] 0.2.0.11
import { saveGame, type Save } from '../core/store.js';
import { isScenario, type WorldDef } from '../core/world.js';
import { chat, personaName, charOf } from '../st/bridge.js';
import { bgAsk } from './regulator.js';
import { onDay } from './hooks.js';
import { dayStart } from './diary.js';
import { isMinor } from './family.js';
import { placeOf } from './places.js';
import { profileOf, nosyOf, ORIENTS, STATUSES } from './profile.js';
import { tieK, learn, type Know, type Knowable } from './knows.js';
import { hearFight } from './secrets.js';
import { wallsK } from './listen.js';
const Hh = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; return (h >>> 0) / 4294967296; };
import { react, talksOf, closeTalk, loversOf } from './consequences.js';
import { nightLoveText, applyLove, mutualFor } from './lovenight.js';
import { flirtOn, loveOf, loveKnow, parseNights } from './love.js';
import { nightTogether } from './nights.js';
import { ownRoom } from './lifeday.js';
import { addBond } from './social.js';
import { LOVE } from './secrets.js';
import { bondsOf, YOU, factK, parseFound, parseTalked, parseShift, parseSmall, shiftOk, setStatus, statusOf, valueOf, type TieLike, syncTies, drift, bondsLines, nightPrompt, parseNight, applyChange, personalityOf, looksAnswered, NIGHT_SYSTEM, type Change, type GLike } from './bonds.js';

const G = (g: Save) => g as unknown as GLike;
const clean = (t: unknown) => String(t ?? '').replace(/<(think|thinking|reasoning)>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

// The daily drift back toward where each pair started (no AI; runs as the day turns, also while you sleep).
onDay.push((g, w) => { if (isScenario(w)) { syncTies(G(g)); drift(G(g)); } return []; });

// For the scene prompt: how the characters here get along with each other.
export function bondsPromptLines(g: Save, w: WorldDef, present: string[]): string[] {
    if (!isScenario(w)) return [];
    return bondsLines(G(g), present);
}

// The night: today's conversation is read for what changed between the characters in it, and (if turned on) a few
// small things happen between housemates without the player. One AI call; runs before the day's start mark moves.
// `range`: the day's lines in the chat, taken when you went to sleep (the call runs later, after the diary, and you
// may already be talking in the new day by then).
export async function bondsNight(g: Save, w: WorldDef, day: number, range?: { start: number; end: number }): Promise<Change[]> {
    if (!isScenario(w)) return [];
    const gl = G(g); const b = bondsOf(gl);
    if (b.lastNight === day) return [];
    syncTies(gl);
    // children stay out of it (their relationships are not simulated)
    const people = Object.values(g.cast).filter(r => !isMinor(g, r.avatar)).map(r => {
        const c = charOf(r.avatar) as any;
        // [expanded] 0.2.0.8: orientation, status and how they keep secrets (their profile), before the card
        const pr = profileOf(g as any, r.avatar);
        const traits = [pr?.orient ? ORIENTS.find(o => o[0] === pr.orient)?.[1].toLowerCase() : '', pr?.status ? STATUSES.find(o => o[0] === pr.status)?.[1].toLowerCase() : '', pr?.discreet !== undefined ? (pr.discreet >= 70 ? 'keeps secrets' : pr.discreet <= 30 ? 'a gossip' : '') : ''].filter(Boolean);
        return { avatar: r.avatar, name: r.name, personality: `${traits.length ? `(${traits.join('; ')}) ` : ''}${personalityOf(c?.description ?? c?.data?.description ?? '', c?.personality ?? c?.data?.personality ?? '')}` };
    });
    if (people.length < 2) return [];
    const me = personaName();
    const msgs = chat().slice(range?.start ?? dayStart(g), range?.end).filter((m: any) => clean(m.mes) && !m.extra?.mundi_diary);   // (not is_system: going to sleep /hides the scene, which marks its lines as system)
    const names = new Set(people.map(p => p.name));
    const spoke = [...new Set(msgs.filter((m: any) => !m.is_user && names.has(String(m.name ?? ''))).map((m: any) => String(m.name)))]
        .map(n => people.find(p => p.name === n)!.avatar);
    // [expanded] 0.2.0.8: who was in the room, before each stretch (the reader says who else saw a moment)
    let key = ''; const lines0: string[] = [];
    for (const m of msgs as any[]) {
        const x = m.extra; const k = x?.mundi_here ? `${x.mundi_loc}|${[...x.mundi_here].sort().join(',')}` : '';
        if (k && k !== key) { key = k; const room = placeOf(g, w, x.mundi_loc)?.name ?? (String(x.mundi_loc).startsWith('home:') ? 'a bedroom' : x.mundi_loc); lines0.push(`[In ${String(room).toLowerCase()}: ${[...x.mundi_here.map((a: string) => g.cast[a]?.name ?? '?'), me].join(', ')}]`); }
        lines0.push(`${m.is_user ? me : m.extra?.mundi_narrator ? 'Narrator' : m.name}: ${clean(m.mes).slice(0, 400)}`);
    }
    let convo = lines0.slice(-90).join('\n');
    // who was around when each of them spoke today (a moment's witnesses, unless the reader says otherwise)
    const around: Record<string, Set<string>> = {};
    for (const m of msgs as any[]) { const here: string[] = m.extra?.mundi_here ?? []; const sp = here.find(a => g.cast[a]?.name === m.name); if (sp) here.forEach(x => (around[sp] ??= new Set()).add(x)); }
    // the day's group chats count too (on their phones): what was written there can change how they get along
    { const { chatsOf, nameOf } = await import('./chatrun.js'); const { dayLines } = await import('./chats.js');
      const d = dayLines(chatsOf(g).chats, day * 1440, (day + 1) * 1440 + 12 * 60, (by) => (by === 'me' ? me : nameOf(g, by)));
      if (d.lines.length) { convo += `${convo ? '\n' : ''}[On their phones, in group chats today (not face to face):]\n${d.lines.join('\n')}`; for (const a of d.authors) if (!spoke.includes(a) && people.some(p => p.avatar === a)) spoke.push(a); } }
    if (convo.length > 12000) convo = convo.slice(-12000);
    if (spoke.length < 2 && b.life === 'off') { b.lastNight = day; return []; }
    // [expanded] 0.2.0.8: the secrets (secret ties, your secret relationships), for "who found out today"
    const nm = (a: string) => (a === YOU ? me : g.cast[a]?.name ?? a);
    const secrets: { text: string; known: string[]; k: Knowable; store: { know?: Record<string, Know> }; love?: boolean; parts: string[] }[] = [];
    for (const t of (gl.living?.ties ?? []) as TieLike[]) if (t.secret && (t.a === YOU || g.cast[t.a]) && (t.b === YOU || g.cast[t.b])) { const k = tieK(t); secrets.push({ text: `${nm(t.a)} and ${nm(t.b)}: ${t.type}`, known: [t.a, t.b, ...Object.keys(t.know ?? {}).filter(x => t.know![x].lvl === 'knows')].map(nm), k, store: t, love: LOVE.has(t.type), parts: [t.a, t.b] }); }
    // recent things not everyone knows (fights, secrets of the week), for who found out and who promised
    for (const f of b.facts.filter(x => x.kind === 'episode' && day - x.day <= 7 && factK(x).pub !== 'public').slice(-5)) secrets.push({ text: `${f.who.map(nm).join(' & ')}: ${f.text}`, known: [...f.who, ...Object.keys(f.know ?? {}).filter(x => f.know![x].lvl === 'knows')].map(nm), k: factK(f), store: f, parts: f.who });
    { const lx = loveOf(gl as any); for (const [k, v] of Object.entries(lx.v)) { const [a, c] = k.split('>'); if (v < 40 || lx.said?.[k] || !g.cast[a] || !(g.cast[c] || c === YOU)) continue; const h = loveKnow(gl as any, a, c); secrets.push({ text: `${nm(a)} has a crush on ${nm(c)}`, known: [nm(a), ...Object.keys(h.know ?? {}).filter(x => h.know![x].lvl === 'knows').map(nm)], k: { parts: [a], pub: 'private', know: h.know, day: 0 }, store: h, parts: [a] }); }
      for (const [c, m] of Object.entries(lx.mine ?? {})) if (m.secret && g.cast[c]) secrets.push({ text: `${me} ${m.lvl === 'love' ? 'is in love with' : 'likes'} ${nm(c)}`, known: [me, ...Object.keys(m.know ?? {}).filter(x => m.know![x].lvl === 'knows').map(nm)], k: { parts: [YOU], pub: 'private', know: m.know, day: m.day }, store: m, parts: [YOU] }); }
    for (const [a, h] of Object.entries(b.hide ?? {})) if (g.cast[a]) secrets.push({ text: `${me} and ${nm(a)} are together`, known: [me, nm(a), ...Object.keys(h.know ?? {}).filter(x => h.know![x].lvl === 'knows').map(nm)], k: { parts: [YOU, a], pub: 'private', know: h.know, day: h.day }, store: h, love: true, parts: [YOU, a] });
    // [expanded] unfinished business; a bigger change now and then (the setting), and small secrets
    const talks = talksOf(g).filter(t => (t.a === YOU || g.cast[t.a]) && (t.b === YOU || g.cast[t.b]));
    const every = ({ rare: 42, normal: 21, often: 10 } as Record<string, number>)[b.shifts ?? 'normal'] / (b.life === 'lively' ? 2 : 1);
    const shiftDue = b.life !== 'off' && day - ((b as any).shiftDay ?? -99) >= 7 && Hh(`${g.world}|${day}|shift`) < 1 / every;
    const smallDue = b.life !== 'off' && Hh(`${g.world}|${day}|small`) < 0.25;
    const prompt = nightPrompt(gl, { day, user: me, premise: String((g as any).cfg?.start?.text || (w as any).scenario?.premise || ''), people, convo, spoke, life: b.life, secrets: secrets.map(x => ({ text: x.text, known: x.known })),
        talks: talks.map(t => `${nm(t.a)} needs to talk with ${nm(t.b)} about ${t.about}.`), ...(shiftDue ? { shift: flirtOn(gl as any) ? b.romance ?? 'story' : 'off' } : {}), small: smallDue, extra: [...nightLoveText(g, me), ...threadText(me)] });
    const raw = await bgAsk(prompt, 2500, NIGHT_SYSTEM);   // the mechanics model when set, else the main one
    // a refusal (or anything that is not the asked form) is not "nothing happened": say so, and try again next night
    if (!looksAnswered(raw)) throw new Error(`the model did not answer in the asked form${raw ? ` (it said: "${raw.slice(0, 80).replace(/\s+/g, ' ')}…")` : ''}`);
    const changes: Change[] = [];
    for (const p of parseNight(raw, people, b.life)) {
        // scene moments are only between people who were in today's scenes
        if (p.src === 'scene' && p.who.some(a => !spoke.includes(a))) continue;
        // [expanded] 0.2.0.8: who else knows it
        const seen = p.seen === 'none' ? [] : p.seen ?? (p.src === 'scene' ? [...new Set(p.who.flatMap(a => [...(around[a] ?? [])]))].filter(a => p.who.every(x => around[x]?.has(a) || x === a)) : []);
        const c = applyChange(gl, p.who, p.delta, p.text, p.src, { pub: p.seen === 'none' ? 'private' : 'witnessed', seen: p.src === 'scene' ? [YOU, ...seen] : seen });
        if (c) changes.push(c);
    }
    // [expanded] 0.2.0.8: secrets found out in today's scenes
    const findName = (q: string) => { const t = q.trim().toLowerCase(); if (t === me.toLowerCase() || t === '{{user}}' || t === 'the player') return YOU; const hit = people.filter(p => p.name.toLowerCase() === t || p.name.toLowerCase().split(/\s+/)[0] === t.split(/\s+/)[0]); return hit.length === 1 ? hit[0].avatar : null; };
    for (const f of parseFound(raw, findName, secrets.length)) {
        const x = secrets[f.i];
        if (learn(x.k, f.who, { lvl: 'knows', how: f.by && f.by !== f.who ? 'told' : 'saw', day, ...(f.by && f.by !== f.who ? { from: f.by } : {}) }, x.store)) react(g, { id: `n${f.i}`, parts: x.parts, text: x.text, love: !!x.love, k: x.k }, f.who);
        // you told someone a secret that was not yours: the ones it is about trust you a little less
        if (f.by === YOU) for (const p of x.parts) if (g.cast[p]) addBond(g, p, -4);
    }
    for (const i of parseTalked(raw, talks.length)) closeTalk(g, talks[i].id);
    { const { addThreads } = await import('./talkrun.js'); addThreads(g, raw, findName, day); }   // [expanded] 0.2.0.11: what was left open
    // a bigger change, if the rules find it believable
    // [expanded] 0.2.0.9: feelings first (sparks, confessions), then a bigger change: dating needs two crushes
    { const n = applyLove(g, raw, findName, (a) => [...(around[a] ?? [])], day); if (n.length) console.info('[Mundi Expanded] feelings tonight:', n); }
    // nights together in today's scenes (neighbours may have heard)
    if (flirtOn(gl as any)) for (const nt of parseNights(raw, findName)) {
        const room = w.places.find(p => p.name.toLowerCase() === nt.where.toLowerCase())?.id ?? (nt.who.includes(YOU) ? 'home:player' : g.cast[nt.who[0]] ? ownRoom(g.cast[nt.who[0]]) : 'home:player');
        nightTogether(g, w, nt.who, room, nt.secret || nt.who.some(a => a !== YOU && !!b.hide?.[a]));
    }
    const sh = shiftDue ? parseShift(raw, findName) : null;
    if (sh && sh.a !== YOU && sh.b !== YOU && shiftOk(gl, sh, { romance: flirtOn(gl as any) ? b.romance ?? 'story' : 'off', lovers: (a) => loversOf(g, a), taken: (a) => ['taken', 'married'].includes(profileOf(g as any, a)?.status ?? ''),
        spark: mutualFor(g, sh.a, sh.b) })) {
        const v = valueOf(gl, sh.a, sh.b);
        const type = sh.kind === 'friends' ? (v >= 70 ? 'bestfriend' : 'friend') : sh.kind === 'enemies' ? (v > -60 ? 'rival' : 'enemy') : sh.kind;
        setStatus(gl, sh.a, sh.b, type);
        const t = statusOf(gl, sh.a, sh.b); if (t) { t.day = day; if (sh.secret && sh.kind === 'dating') t.secret = true; else { delete t.secret; delete t.know; } }
        const c = applyChange(gl, [sh.a, sh.b], sh.kind === 'friends' || sh.kind === 'dating' ? 1 : -1, sh.why || `${nm(sh.a)} and ${nm(sh.b)}: ${sh.kind}.`, 'offscreen', sh.secret && sh.kind === 'dating' ? { pub: 'private' } : sh.kind === 'dating' || sh.kind === 'ex' ? { pub: 'public' } : undefined);
        if (c) changes.push(c);
        (b as any).shiftDay = day;
    }
    // a small thing someone did and kept quiet
    const sm = smallDue ? parseSmall(raw, findName) : null;
    if (sm && sm.who !== YOU && g.cast[sm.who]) { const list = (b.small ??= []); list.push({ id: `s${day}${list.length}`, who: sm.who, ...(sm.about && sm.about !== YOU ? { about: sm.about } : {}), text: sm.text, day }); if (list.length > 20) list.splice(0, list.length - 20); }
    for (const f of parseFound(raw, findName, secrets.length, 'PROMISE')) { const k = secrets[f.i].store.know?.[f.who]; if (k) k.promised = true; }
    // loud fights without you are heard through the walls by whoever is nosy enough
    for (const c of changes.filter(x => x.src === 'offscreen' && x.delta <= -2)) {
        const fact = b.facts.filter(f => f.kind === 'episode' && f.text === c.text).at(-1); if (!fact || factK(fact).pub === 'private') continue;
        for (const r of Object.values(g.cast)) if (!fact.who.includes(r.avatar) && Hh(`${day}|${fact.id}|${r.avatar}|walls`) < hearFight(c.delta, nosyOf(profileOf(g as any, r.avatar))) * wallsK(g)) learn(factK(fact), r.avatar, { lvl: 'knows', how: 'saw', day, ver: 'heard it through the walls' }, fact);
    }
    b.lastNight = day;
    saveGame();
    return changes;
}

// A short line for a notice: "Relationships: A & B +1 · C & D −1".
export const changesNote = (list0: Change[], all = false) => { const list = all ? list0 : list0.filter(c => c.you); return list.length
    ? `Relationships: ${list.map(c => `${c.names.join(' & ')} ${c.delta > 0 ? `+${c.delta}` : c.delta < 0 ? `−${-c.delta}` : '·'}`).join(' · ')}`
    : ''; };
