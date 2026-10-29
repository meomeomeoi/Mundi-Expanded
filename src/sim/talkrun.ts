// [expanded] Their move (Mundi Expanded 0.2.0.11): the house talks without you, and comes to you.
//
// Walking into a room, one of four things (rolled; at most one card every half hour of game time):
//  1. a conversation is already going (two of them, three, or everyone): listen, join in, or walk past; they may pull
//     you in, or fall silent when it is about you or a secret;
//  2. someone comes up to you: they have something to talk about (mostly everyday things, now and then the house's
//     news): listen, or not now;
//  3. someone comes in from another room: the story says so, with what they are doing (they may have come for you);
//  4. everyone just does their own thing (what they are doing shows under their names).
// The topics come from talk.ts (chance in code, the words from the mechanics model, one short call, only when a
// conversation is going). Also here: the social battery (hidden; time with you tires them, they leave when they have
// had enough), initiative (apart, they come looking for you, knock, text, invite you to something that evening),
// threads (what was left open, from the night reader), and where you last saw everyone (the map's fog, an option).
import { nowAbs, saveGame, notify, game, settings, state, type Save, type Resident } from '../core/store.js';
import { isScenario, type WorldDef } from '../core/world.js';
import { onHour, onDay } from './hooks.js';
import { presentNotes, afterSync, roomMinutes, talkHooks } from './lifehooks.js';
import { presentAt, whereNow, OUT } from './people.js';
import { slotAt, ownRoom, commonRooms, cardText } from './lifeday.js';
import { catOf } from './furnish.js';
import { profileOf, lifexOf } from './profile.js';
import { social, bondOf, isPartner, isWith } from './social.js';
import { bondsOf, valueOf, factK, YOU } from './bonds.js';
import { knows } from './knows.js';
import { talksOf } from './consequences.js';
import { feelings, flirtOn } from './love.js';
import { isOuting, placeOf } from './places.js';
import { isSleeping } from './plans.js';
import { hm } from './time.js';
import * as T from './talk.js';
import { chat } from '../st/bridge.js';

/* ---------- the save ---------- */

export interface TalkCfg { talk?: T.Freq; come?: T.Freq; ask1?: boolean; ask2?: boolean; drama?: T.Drama; battery?: boolean; invites?: 'off' | 'rare' | 'normal'; doing?: boolean; move?: boolean; fog?: boolean }
export interface Cur { who: string[]; topic: string; tone: T.Tone; stage: T.Stage; src: T.Source; about: string; room: string; at: number; how: 'pending' | 'listened' | 'joined' | 'passed' | 'pulled' | 'silent'; private?: boolean }
export interface Invite { id: string; avatar: string; act: 'movie' | 'games' | 'cook'; place: string; from: number; text: string; state: 'open' | 'yes' | 'no' | 'gone'; appt?: string; reminded?: boolean; nudged?: boolean }
export interface TalkX {
    cfg: TalkCfg;
    bat: Record<string, number>; init: Record<string, number>; snub: Record<string, number>;
    threads: T.Thread[]; used: Record<string, string[]>;
    last?: number; lastSeek?: number; lastInv?: number; lastArrive?: number;
    cur?: Cur | null; sought?: Record<string, number>; leave?: Record<string, number>;
    seen: Record<string, { loc: string; at: number }>;
    inv: Invite[];
    prevLoc?: string; prevHere?: string[];
}
export const talkOf = (g: Save): TalkX => {
    const x = ((g as any).talkx ??= {}) as TalkX;
    x.cfg ??= {}; x.bat ??= {}; x.init ??= {}; x.snub ??= {}; x.threads ??= []; x.used ??= {}; x.seen ??= {}; x.inv ??= [];
    return x;
};
export const tcfg = (g: Save) => {
    const c = talkOf(g).cfg;
    return { talk: c.talk ?? 'normal', come: c.come ?? 'normal', ask1: c.ask1 !== false, ask2: c.ask2 !== false, drama: c.drama ?? 'normal', battery: c.battery !== false,
        invites: c.invites ?? 'rare', doing: c.doing !== false, move: c.move !== false, fog: c.fog === true } as Required<TalkCfg>;
};
/** The player's own topics and the built-in ones turned off (in SillyTavern's settings: every game). */
export const topicsCfg = (): { off: number[]; mine: string[] } => { const s = settings() as any; const t = (s.talkTopics ??= {}); t.off ??= []; t.mine ??= []; return t; };

const on = (g: Save, w: WorldDef) => isScenario(w) && !(g as any).tutorial;
const name = (g: Save, a: string) => (a === YOU ? '{{user}}' : g.cast[a]?.name ?? a);
const names = (g: Save, l: string[]) => { const n = l.map(a => name(g, a)); return n.length <= 1 ? n.join('') : `${n.slice(0, -1).join(', ')} and ${n.at(-1)}`; };
const H = (s: string) => T.seeded(s)();
const rngFor = (g: Save, k: string) => T.seeded(`${g.world}|${nowAbs(g)}|${k}|${Math.random()}`);
const actOf = (g: Save, w: WorldDef, r: Resident) => { const s = slotAt(g, w, r, nowAbs(g)); return s?.asleep ? 'asleep' : s && whereNow(g, w, r) === s.loc ? s.act : ''; };
const asleep = (g: Save, w: WorldDef, r: Resident) => { const s = slotAt(g, w, r, nowAbs(g)); return s ? s.asleep && !(lifexOf(g as any).woke?.[r.avatar] ?? 0) : isSleeping(r, nowAbs(g)); };
const upsetWith = (g: Save, a: string) => talksOf(g).some(t => (t.a === a && t.b === YOU) || (t.b === a && t.a === YOU));
const romance = (g: Save, a: string) => Math.max(Number((g as any).romance?.[a]?.value ?? 0), feelings(g as any, a, YOU));
const roomName = (g: Save, w: WorldDef, loc: string) => (loc === 'home:player' ? "{{user}}'s room" : loc.startsWith('home:') ? `${g.cast[loc.slice(5)]?.name ?? 'someone'}'s room` : String(placeOf(g, w, loc)?.name ?? 'room').toLowerCase());
export const batteryOf = (g: Save, a: string) => talkOf(g).bat[a] ?? 100;
export const tierOf = (g: Save, a: string) => (tcfg(g).battery ? T.tierOf(batteryOf(g, a)) : 'ok');

/* ---------- topics ---------- */

const eraNow = (g: Save): T.Era => (String((g as any).erax?.era ?? 'now') as T.Era);
/** The house's own news the people talking all know: something that happened lately, a new thing, an open quarrel. */
function houseHooks(g: Save, who: string[]): { t: string; tone?: T.Tone; private?: boolean }[] {
    const out: { t: string; tone?: T.Tone; private?: boolean }[] = [];
    const b = bondsOf(g as any);
    for (const f of b.facts.filter(f => f.kind === 'episode' && g.day - f.day <= 4).slice(-12)) {
        const k = factK(f); if (!who.every(a => f.who.includes(a) || knows(k, a))) continue;
        const about = f.who.map(a => name(g, a)).join(' and ');
        out.push({ t: `what happened lately: ${about}: ${f.text}`, ...(k.pub === 'private' ? { private: true } : {}), ...(f.who.some(a => !who.includes(a)) ? { tone: 'gossip' as T.Tone } : {}) });
    }
    for (const x of ((g as any).furnishx?.items ?? []) as any[]) if (!x.decor && g.day - (x.day ?? -99) <= 2 && x.via !== 'start') out.push({ t: `the new ${String(x.name).toLowerCase()} in the house` });
    for (const t of talksOf(g)) if (who.includes(t.a) && who.includes(t.b)) out.push({ t: `${t.about} (they still have not talked it out)`, tone: 'argue' });
    for (const f of talkHooks) for (const h of f(g, who)) out.push({ t: h.t, ...(h.tone && h.tone in T.TONES ? { tone: h.tone as T.Tone } : {}) });   // 0.2.1-12: events, chores, your projects
    return out;
}
export interface Topic { topic: string; src: T.Source; tone?: T.Tone; hint?: T.Tone[]; id?: string; private?: boolean; thread?: string }
/** Rolls a topic for these people ('__you' among them: talking with you). */
export function rollTopic(g: Save, who: string[], rng: T.Rng): Topic {
    const x = talkOf(g); const c = tcfg(g); const mix = T.MIX[c.drama];
    const tried = new Set<T.Source>();
    for (let n = 0; n < 4; n++) {
        const src = T.pickW((Object.entries(mix) as [T.Source, number][]).filter(([s]) => !tried.has(s)), rng) ?? 'list'; tried.add(src);
        if (src === 'house') { const l = houseHooks(g, who.filter(a => a !== YOU)); if (!l.length) continue; const h = l[Math.floor(rng() * l.length)]; return { topic: h.t, src, ...(h.tone ? { tone: h.tone } : {}), ...(h.private ? { private: true } : {}) }; }
        if (src === 'thread') { const l = T.threadsFor(x.threads, who); if (!l.length) continue; const t = l[Math.floor(rng() * l.length)]; return { topic: `picking up something left open: ${t.text}`, src, thread: t.id }; }
        if (src === 'interest') {
            const people = who.filter(a => a !== YOU && profileOf(g as any, a));
            const pool = people.flatMap(a => T.interestsOf(profileOf(g as any, a)!.acts).map(i => ({ a, i })));
            if (!pool.length) continue;
            const p = pool[Math.floor(rng() * pool.length)];
            return { topic: `${name(g, p.a)}'s interest: ${p.i} (${T.ANGLES[Math.floor(rng() * T.ANGLES.length)]})`, src, hint: ['lecture'] };
        }
        const tc = topicsCfg(); const list = T.hooksFor(eraNow(g), tc.off, tc.mine);
        const k = T.pairK(who); const h = T.pickHook(list, x.used[k] ?? [], rng); if (!h) continue;
        x.used[k] = [...(x.used[k] ?? []), h.id].slice(-40);
        return { topic: h.h.t, src: 'list', hint: h.h.tones, id: h.id };
    }
    return { topic: 'nothing in particular, how the day is going', src: 'list' };
}
function toneFor(g: Save, who: string[], t: Topic, rng: T.Rng): T.Tone {
    if (t.tone) return t.tone;
    const ppl = who.filter(a => a !== YOU);
    const v = ppl.length >= 2 ? ppl.slice(1).reduce((s, a) => s + valueOf(g as any, ppl[0], a), 0) / (ppl.length - 1) : who.includes(YOU) && ppl[0] ? bondOf(g, ppl[0]) - 30 : 0;
    const flirt = flirtOn(g as any) && ppl.some(a => who.some(b => b !== a && (b === YOU ? romance(g, a) >= 15 : feelings(g as any, a, b) >= 15)));
    return T.pickTone({ v, hint: t.hint, flirt, nosy: Math.max(...ppl.map(a => profileOf(g as any, a)?.nosy ?? 50), 0), interest: t.src === 'interest' }, rng);
}

/* ---------- what is on screen now (not saved: a card waits for you) ---------- */

export interface Card { kind: 'talk' | 'come'; who: string[]; cur: Cur; lines: { who: string; say: string }[] | null; failed?: boolean; noticed?: boolean; heard?: boolean }
export const TK: { card: Card | null } = { card: null };
const card = (c: Card | null) => { TK.card = c; notify(); };

/** A conversation is going on here: rolls who, what, how; the words come from the mechanics model in the background. */
function startTalk(g: Save, w: WorldDef, who: string[]) {
    const rng = rngFor(g, 'talk'); const t = rollTopic(g, who, rng); const tone = toneFor(g, who, t, rng); const stage = T.pickStage(rng);
    const cur: Cur = { who, topic: t.topic, tone, stage, src: t.src, about: '', room: g.player.loc, at: nowAbs(g), how: 'pending', ...(t.private ? { private: true } : {}) };
    const x = talkOf(g); x.cur = cur; x.last = nowAbs(g); if (t.thread) { const th = x.threads.find(z => z.id === t.thread); if (th) th.used = g.day; }
    const c: Card = { kind: 'talk', who, cur, lines: null }; card(c);
    void words(g, w, c);
}
async function words(g: Save, w: WorldDef, c: Card) {
    const cur = c.cur;
    const people = cur.who.map(a => ({ name: name(g, a), about: aboutOf(a) }));
    const era = eraNow(g) !== 'now' ? `the ${eraNow(g)}` : '';
    const prompt = T.talkPrompt({ people, topic: cur.topic, tone: cur.tone, stage: cur.stage, room: roomName(g, w, cur.room).replace('{{user}}', 'the player'), era, user: 'the player' });
    let parsed: ReturnType<typeof T.parseTalk> = null;
    try {
        const { bgAsk } = await import('./regulator.js'); const { looseJson } = await import('./jsonfix.js');
        parsed = T.parseTalk(looseJson(await bgAsk(prompt, 700, T.TALK_SYSTEM)), people.map(p => p.name));
    } catch { parsed = null; }
    if (TK.card !== c) return;
    if (parsed) { c.lines = parsed.lines; cur.about = parsed.about || cur.topic; } else { c.lines = []; c.failed = true; cur.about = cur.topic; }
    saveGame(); notify();
    if (!tcfg(g).ask1) void listen();
}
const aboutOf = (a: string) => { try { return String(cardText(a)).replace(/\s+/g, ' ').slice(0, 220) || '(no description)'; } catch { return ''; } };

/** Someone comes up to you with something to talk about. */
function startCome(g: Save, a: string, why = '') {
    const rng = rngFor(g, 'come'); const who = [a, YOU];
    // what they want to tell you most (a thread with you, an open quarrel, news) comes first now and then
    const t: Topic = why ? { topic: why, src: 'house' } : rollTopic(g, who, rng);
    const tone = toneFor(g, who, t, rng);
    const cur: Cur = { who: [a], topic: t.topic, tone, stage: 'start', src: t.src, about: t.topic, room: g.player.loc, at: nowAbs(g), how: 'pending' };
    const x = talkOf(g); x.cur = cur; x.last = nowAbs(g); if (t.thread) { const th = x.threads.find(z => z.id === t.thread); if (th) th.used = g.day; }
    const c: Card = { kind: 'come', who: [a], cur, lines: [] }; card(c);
    if (!tcfg(g).ask2) void listen();
}

/* ---------- your answers ---------- */

const bridge = () => import('../st/bridge.js');
/** After the reply being written now (a line in the middle of it would break it). */
function whenIdle(f: () => void | Promise<void>, tries = 0) { if (state.generating && tries < 240) { setTimeout(() => whenIdle(f, tries + 1), 500); return; } void f(); }
async function sync() { const { syncScene } = await import('./game.js'); await syncScene(); const { refreshPrompt } = await import('./prompt.js'); refreshPrompt(); }
/** Listen: their lines go into the story (as said in the scene); they may notice you. For "come": they start talking. */
export async function listen() {
    const g = game(); const c = TK.card; if (!g || !c) return;
    if (state.generating) { setTimeout(() => void listen(), 800); return; }
    const b = await bridge();
    if (c.kind === 'come') {
        const a = c.who[0]; card(null); c.cur.how = 'joined';
        talkOf(g).init[a] = Math.max(0, (talkOf(g).init[a] ?? 0) - 40); delete talkOf(g).sought?.[a];
        b.setAsk(`[${name(g, a)} comes up to {{user}}: ${name(g, a)} has something to talk about: ${c.cur.topic}. The mood: ${T.TONES[c.cur.tone]}. ${name(g, a)} starts the conversation, in their own words; one reply, then let {{user}} answer.]`);
        saveGame(); await b.replyAs(a); return;
    }
    if (!c.lines) return;   // still coming (the button waits)
    c.heard = true; c.cur.how = 'listened';
    if (c.lines.length) for (const l of c.lines) { await b.sendAs(l.who, l.say); await new Promise(r => setTimeout(r, 250)); }
    else await b.narratorLine(`${names(g, c.who)} are talking (${T.TONES[c.cur.tone]}) about ${c.cur.topic}.`);
    // the end of it: they split up; about you or a secret: they fall silent; otherwise they may pull you in
    if (c.cur.stage === 'end') { await b.narratorLine(`${names(g, c.who)} wrap it up.`); card(null); saveGame(); return; }
    const nosy = Math.max(...c.who.map(a => profileOf(g as any, a)?.nosy ?? 50));
    const notice = H(`${c.cur.at}|${c.who.join()}|notice`) < 0.35 + nosy / 250;
    if (notice && (c.cur.private || /\{\{user\}\}|the player/i.test(c.cur.about))) { c.cur.how = 'silent'; await b.narratorLine(`${names(g, c.who)} notice {{user}} and fall silent.`); card(null); saveGame(); return; }
    if (notice) {
        c.cur.how = 'pulled'; card(null); saveGame();
        const a = c.who[Math.floor(H(`${c.cur.at}|pull`) * c.who.length)];
        b.setAsk(`[${name(g, a)} notices {{user}} and pulls {{user}} into the conversation (${c.cur.about}): asks what {{user}} thinks, or makes {{user}} take a side. One reply.]`);
        await b.replyAs(a); return;
    }
    c.noticed = false; notify(); saveGame();
}
/** Join in: what they said goes into the story (if it has not), and you speak next. */
export async function join() {
    const g = game(); const c = TK.card; if (!g || !c || c.kind !== 'talk') return;
    if (state.generating) { setTimeout(() => void join(), 800); return; }
    const b = await bridge();
    if (!c.heard && c.lines?.length) for (const l of c.lines) { await b.sendAs(l.who, l.say); await new Promise(r => setTimeout(r, 200)); }
    c.cur.how = 'joined'; card(null); saveGame();
    b.setAsk(`[{{user}} joins ${names(g, c.who)}'s conversation (${c.cur.about || c.cur.topic}); they let {{user}} in, as fits how they get along.]`, 15 * 60000);
    setTimeout(() => document.querySelector<HTMLTextAreaElement>('#mundi-root [data-focus="composer"]')?.focus(), 50);
}
/** Walk past / not now. */
export function pass() {
    const g = game(); const c = TK.card; if (!g || !c) return;
    if (c.kind === 'come') { const a = c.who[0]; const x = talkOf(g); x.init[a] = Math.max(0, (x.init[a] ?? 0) - 30); x.snub[a] = (x.snub[a] ?? 0) + 1; delete x.sought?.[a]; c.cur.how = 'passed'; }
    else if (c.cur.how === 'pending') c.cur.how = 'passed';
    card(null); saveGame(); void sync();
}

/* ---------- walking in, people coming in ---------- */

const free = (g: Save, w: WorldDef, r: Resident) => r.met && !asleep(g, w, r) && !T.busyAct(actOf(g, w, r)) && tierOf(g, r.avatar) !== 'done';
afterSync.push((g, w, here) => {
    if (!on(g, w)) return;
    const x = talkOf(g); const now = nowAbs(g); const loc = g.player.loc;
    for (const r of here) x.seen[r.avatar] = { loc, at: now };
    if (x.prevLoc === undefined) { x.prevLoc = loc; x.prevHere = here.map(r => r.avatar); return; }   // a game just loaded: nothing happens on its own
    const moved = x.prevLoc !== loc; const before = new Set(x.prevHere ?? []);
    x.prevLoc = loc; x.prevHere = here.map(r => r.avatar);
    if (moved) { if (TK.card) TK.card = null; if (x.cur && x.cur.room !== loc) x.cur = null; }
    // someone who has had enough leaves (after a little while to wrap it up)
    const lv = (x.leave ??= {});
    for (const r of here) {
        if (tierOf(g, r.avatar) !== 'done') { delete lv[r.avatar]; continue; }
        lv[r.avatar] ??= now;
        if (now - lv[r.avatar] >= 20 && !state.generating) { leave(g, w, r); delete lv[r.avatar]; }
    }
    if ((g as any).asleep || isOuting(loc) || loc === OUT || TK.card) return;
    const c = tcfg(g); const recent = now - (x.last ?? -999) < 30;
    if (moved) {
        if (recent) return;
        const cands = here.filter(r => free(g, w, r) && !isWith(g, r.avatar));
        const h = Math.floor(g.minutes / 60);
        if (c.talk !== 'off' && Math.random() < T.talkChance(cands.length, h, c.talk)) {
            const who = T.groupOf(cands.map(r => r.avatar), (a, b) => valueOf(g as any, a, b), rngFor(g, 'group'));
            if (who.length >= 2) { startTalk(g, w, who); return; }
        }
        if (c.come === 'off') return;
        for (const r of cands) {
            const p = (0.12 + (x.init[r.avatar] ?? 0) / 300) * T.FREQ[c.come] * (bondOf(g, r.avatar) >= 10 ? 1 : 0.3);
            if (Math.random() < p) { startCome(g, r.avatar); return; }
        }
        return;
    }
    // people who came in while you are here: the story says so (with what they do); someone who came for you comes up
    const came = here.filter(r => !before.has(r.avatar) && !isWith(g, r.avatar));
    if (!came.length) return;
    const seeker = came.find(r => (x.sought?.[r.avatar] ?? -999) > now - 90);
    if (seeker && c.come !== 'off' && !recent) { startCome(g, seeker.avatar, agendaFor(g, seeker.avatar, true)); return; }
    if (now - (x.lastArrive ?? -999) < 15) return;
    x.lastArrive = now;
    const acts = came.map(r => { const a = actOf(g, w, r); return a && a !== 'asleep' ? `${r.name} (${a})` : r.name; });
    whenIdle(() => bridge().then(b => b.narratorLine(`${acts.length > 1 ? `${acts.slice(0, -1).join(', ')} and ${acts.at(-1)} come in` : `${acts[0]} comes in`}.`)));
});
/** They go to their room (had enough company): for an hour, and the story says so. */
function leave(g: Save, w: WorldDef, r: Resident) {
    if ((r as any).guest) return;   // a visitor has no room of their own to go to (Mundi 0.2.1)
    const s: any = social(g); const now = nowAbs(g); const to = ownRoom(r); if (to === g.player.loc) return;
    (s.went ??= {})[r.avatar] = { loc: to, until: now + 60, line: -1 };
    s.with = (s.with ?? []).filter((c: any) => c.avatar !== r.avatar);
    if (s.lock?.who) s.lock.who = s.lock.who.filter((a: string) => a !== r.avatar);
    saveGame();
    whenIdle(() => bridge().then(b => b.narratorLine(`${r.name} goes to their room.`)).then(() => sync()));
}
/** What someone wants to talk to you about most ('' : nothing in particular). */
function agendaFor(g: Save, a: string, use = false): string {
    const t = talksOf(g).find(t => (t.a === a && t.b === YOU) || (t.b === a && t.a === YOU)); if (t) return `${t.about} (it still is not talked out)`;
    const th = talkOf(g).threads.find(t => t.who.includes(a) && t.who.includes(YOU)); if (th) { if (use) th.used = g.day; return `picking up something left open: ${th.text}`; }
    const news = (bondsOf(g as any).gossip as any)?.tell?.[a]; if (news) return 'some news they are dying to tell {{user}}';
    return '';
}

/* ---------- each hour: the battery, initiative, coming to you, invitations ---------- */

onHour.push((g, w) => {
    if (!on(g, w)) return [];
    const x = talkOf(g); const c = tcfg(g);
    const mine = new Set(presentAt(g, w, g.player.loc).map(r => r.avatar));
    // who you really talked with this last hour (the lines' stamps): sitting in the same room in silence tires less
    const now = nowAbs(g); const spoke = new Set<string>();
    for (const m of chat().slice(-60) as any[]) if (!m?.is_system && m?.is_user && (m.extra?.mundi_at ?? -1) > now - 60) for (const a of m.extra?.mundi_here ?? []) spoke.add(a);
    for (const r of Object.values(g.cast) as Resident[]) {
        const a = r.avatar; const loc = whereNow(g, w, r);
        // the battery
        if (asleep(g, w, r)) x.bat[a] = Math.min(100, (x.bat[a] ?? 100) + 50);
        else if (mine.has(a) && spoke.has(a) && !(g as any).asleep) x.bat[a] = Math.max(0, (x.bat[a] ?? 100) - T.drainPerHour({ social: profileOf(g as any, a)?.social ?? 50, bond: bondOf(g, a), partner: isPartner(g, a), upset: upsetWith(g, a) }));
        else if (mine.has(a) || (loc !== OUT && presentAt(g, w, loc).length >= 2)) x.bat[a] = Math.max(0, (x.bat[a] ?? 100) - T.drainPerHour({ social: profileOf(g as any, a)?.social ?? 50, bond: 50, others: true }));
        else x.bat[a] = Math.min(100, (x.bat[a] ?? 100) + T.RECHARGE);
        // initiative: apart, it grows (less for whoever you keep sending away)
        if (mine.has(a)) x.init[a] = Math.max(0, (x.init[a] ?? 0) - 15);
        else if (r.met && !asleep(g, w, r)) x.init[a] = Math.min(100, (x.init[a] ?? 0) + T.initGain({ bond: bondOf(g, a), love: romance(g, a), agenda: agendaFor(g, a) ? 1 : 0 }) / (1 + (x.snub[a] ?? 0) * 0.5));
    }
    if ((g as any).asleep) return [];
    const out: string[] = [];
    seek(g, w, x, c, mine);
    out.push(...invites(g, w, x, c));
    return out;
});
onDay.push((g) => { const x = talkOf(g); for (const a of Object.keys(x.snub)) { x.snub[a] = Math.max(0, x.snub[a] - 1); if (!x.snub[a]) delete x.snub[a]; } return []; });

/** Someone who wants to see you comes looking: to the room you are in, a knock on your door, or a text when you are out. */
function seek(g: Save, w: WorldDef, x: TalkX, c: Required<TalkCfg>, mine: Set<string>) {
    if (c.come === 'off') return;
    const now = nowAbs(g); const h = Math.floor(g.minutes / 60);
    if (now - (x.lastSeek ?? -999) < 90 || h < 8 || h >= 23) return;
    const lx = lifexOf(g as any); if (lx.knock || lx.visit && lx.visit.until > now) return;
    const cands = (Object.values(g.cast) as Resident[]).filter(r => !mine.has(r.avatar) && free(g, w, r) && (x.init[r.avatar] ?? 0) >= T.SEEK && bondOf(g, r.avatar) >= 15 && whereNow(g, w, r) !== OUT && !isOuting(whereNow(g, w, r)));
    for (const r of cands) {
        if (H(`${g.world}|${now}|${r.avatar}|seek`) >= 0.35 * T.FREQ[c.come]) continue;
        const out = isOuting(g.player.loc) || g.player.loc === OUT;
        if (!out && g.player.loc !== 'home:player' && g.player.loc.startsWith('home:')) return;   // someone else's room: they do not barge in
        x.lastSeek = now; (x.sought ??= {})[r.avatar] = now;
        if (out) { void texted(g, w, r, `${r.name} wonders where {{user}} is and wants to hang out when {{user}} is back`); x.init[r.avatar] = 30; }
        else if (g.player.loc === 'home:player') { lx.knock = { avatar: r.avatar, reason: agendaFor(g, r.avatar) ? `wants to talk: ${agendaFor(g, r.avatar, true)}` : 'just wants to hang out with {{user}} for a bit', at: now, day: true } as any; x.init[r.avatar] = 20; }
        else { ((social(g) as any).went ??= {})[r.avatar] = { loc: g.player.loc, until: now + 60, line: -1 }; }
        saveGame(); notify(); void sync(); return;
    }
}
async function texted(g: Save, w: WorldDef, r: Resident, note: string) {
    const { textFrom } = await import('./social.js'); const t = await textFrom(g, w, r.avatar, `${note}. One short message.`, 'Hey, where are you?');
    const s = social(g); s.unread[r.avatar] = (s.unread[r.avatar] ?? 0) + 1;
    try { const { pushPeek } = await import('../ui/peek.js'); pushPeek({ title: r.name, text: t, who: r.avatar, app: 'thread' }); } catch { /* no screen */ }
    saveGame(); notify();
}

/* ---------- invitations (for this evening) ---------- */

const ACTS: Record<Invite['act'], { name: string; afford: string; kind: RegExp }> = {
    movie: { name: 'Movie night', afford: 'watch', kind: /living|lounge|den|tv|media/i },
    games: { name: 'Game night', afford: 'game2', kind: /living|lounge|game|den/i },
    cook: { name: 'Cook together', afford: 'cook', kind: /kitchen/i },
};
function placeFor(g: Save, w: WorldDef, act: Invite['act']): string {
    const rooms = commonRooms(g, w); if (!rooms.length) return '';
    const items: any[] = (g as any).furnishx?.items ?? [];
    if ((g as any).furnishx?.started) { const r = rooms.find(r => items.some(i => i.room === r.id && !i.decor && (catOf(i.cat)?.affords ?? [] as string[]).includes(ACTS[act].afford as any))); if (r) return r.id; if (act !== 'cook') return ''; }
    return (rooms.find(r => ACTS[act].kind.test(r.name)) ?? rooms[0]).id;
}
function invites(g: Save, w: WorldDef, x: TalkX, c: Required<TalkCfg>): string[] {
    const now = nowAbs(g); const h = Math.floor(g.minutes / 60);
    // reminders: the phone buzzes before something you said yes to, and when it is starting without you
    for (const i of x.inv) {
        if (i.state !== 'yes') continue;
        const r = g.cast[i.avatar]; if (!r) continue;
        if (!i.reminded && i.from - now <= 75 && i.from > now) { i.reminded = true; peek('Reminder', `${ACTS[i.act].name} with ${r.name} at ${hm(i.from % 1440)}, ${roomName(g, w, i.place)}.`, i.avatar); }
        if (!i.nudged && now >= i.from + 10 && now < i.from + 50 && g.player.loc !== i.place) { i.nudged = true; peek(r.name, ['Where are you? We\'re starting!', 'It\'s starting… you coming?', 'Hey, we said ' + hm(i.from % 1440) + '!'][Math.floor(H(i.id) * 3)], i.avatar); }
    }
    for (const i of x.inv) if (i.state === 'open' && now >= i.from) i.state = 'gone';
    x.inv = x.inv.filter(i => now - i.from < 1440);
    if (c.invites === 'off' || h < 10 || h > 18 || x.inv.some(i => i.state === 'open')) return [];
    if ((x.lastInv ?? -9999) > now - (c.invites === 'rare' ? 2 : 1) * 1440 + 120) return [];
    const cands = (Object.values(g.cast) as Resident[]).filter(r => r.met && !asleep(g, w, r) && bondOf(g, r.avatar) >= 20 && (x.init[r.avatar] ?? 0) >= 35);
    for (const r of cands) {
        if (H(`${g.world}|${now}|${r.avatar}|inv`) >= 0.2) continue;
        const act = (['movie', 'games', 'cook'] as const)[Math.floor(H(`${now}|${r.avatar}|what`) * 3)];
        const place = placeFor(g, w, act); if (!place) continue;
        const from = g.day * 1440 + (19 + Math.floor(H(`${now}|${r.avatar}|at`) * 3)) * 60 + (H(`${now}|half`) < 0.5 ? 0 : 30);
        x.lastInv = now;
        const inv: Invite = { id: `i${now}${r.avatar.slice(0, 4)}`, avatar: r.avatar, act, place, from, text: '', state: 'open' };
        x.inv.push(inv); saveGame();
        void (async () => {
            const { textFrom } = await import('./social.js');
            inv.text = await textFrom(g, w, r.avatar, `${r.name} invites {{user}} to ${ACTS[act].name.toLowerCase()} in the ${roomName(g, w, place)} today at ${hm(from % 1440)}. One short message, in character.`, `${ACTS[act].name} at ${hm(from % 1440)}? You in?`);
            peek(r.name, inv.text, r.avatar); saveGame(); notify();
        })();
        return [];
    }
    return [];
}
function peek(title: string, text: string, who?: string) { void import('../ui/peek.js').then(m => m.pushPeek({ title, text, ...(who ? { who, app: 'thread' } : { app: 'plans' }) })).catch(() => { /* tests */ }); }
/** You answer an invitation: yes makes it a plan (with the activity); no is fine, once in a while. */
export async function answerInvite(g: Save, w: WorldDef, id: string, yes: boolean): Promise<string> {
    const x = talkOf(g); const i = x.inv.find(z => z.id === id); const r = i && g.cast[i.avatar]; if (!i || !r || i.state !== 'open') return '';
    const { add, check, HANGOUT_BOND } = await import('./plans.js');
    if (yes) {
        const ok = check(g, w, i.avatar, i.place, i.from, i.from + 120, 'hangout', HANGOUT_BOND);
        if (!ok.ok && !/already have plans/i.test(ok.why)) { i.state = 'gone'; saveGame(); return `${r.name} cannot after all: ${ok.why}`; }
        const a = add(g, i.avatar, i.place, i.from, 'hangout', false, ACTS[i.act].name);
        try { const { setMeta } = await import('./activities.js'); setMeta(g as any, a.id, { act: i.act }); } catch { /* fine */ }
        i.state = 'yes'; i.appt = a.id; x.init[i.avatar] = 0;
        const s = social(g); (s.threads[i.avatar] ??= []).push({ me: true, text: 'Yes! See you then.', at: nowAbs(g) });
        saveGame(); return `${ACTS[i.act].name} with ${r.name} at ${hm(i.from % 1440)}, ${roomName(g, w, i.place).replace('{{user}}', 'your')}.`;
    }
    i.state = 'no'; x.init[i.avatar] = Math.max(0, (x.init[i.avatar] ?? 0) - 20);
    const s = social(g); (s.threads[i.avatar] ??= []).push({ me: true, text: 'Sorry, not tonight.', at: nowAbs(g) });
    saveGame(); return `You said no to ${r.name}.`;
}
export const openInvites = (g: Save) => talkOf(g).inv.filter(i => i.state === 'open' && g.cast[i.avatar] && i.text);

/* ---------- threads from the night reader ---------- */

export function addThreads(g: Save, raw: string, find: (n: string) => string | null, day: number) {
    const x = talkOf(g); x.threads = T.keepThreads(x.threads, T.parseThreads(raw, find, day), day);
}

/* ---------- for the scene ---------- */

presentNotes.push((g, w, present) => {
    if (!on(g, w)) return [];
    const x = talkOf(g); const now = nowAbs(g); const out: string[] = [];
    const ids = present.map(r => r.avatar);
    const cur = x.cur;
    if (cur && cur.room === g.player.loc && now - cur.at <= 40 && cur.how !== 'pending') {
        const what = cur.about || cur.topic;
        if (cur.who.length === 1) { if (cur.how === 'joined') out.push(`${name(g, cur.who[0])} came up to {{user}} to talk about ${what}.`); }
        else out.push(`When {{user}} came in, ${names(g, cur.who)} were talking about ${what} (${T.TONES[cur.tone]}). ${({ listened: '{{user}} stood listening.', joined: '{{user}} joined in.', passed: '{{user}} did not join them.', pulled: 'They pulled {{user}} in.', silent: 'They fell silent when they noticed {{user}}.' } as Record<string, string>)[cur.how] ?? ''}`);
    }
    if (tcfg(g).battery) for (const r of present) {
        const t = tierOf(g, r.avatar);
        if (t === 'tired') out.push(`${r.name} is getting tired of company (a social battery running low, not upset): shorter answers, a little distracted.`);
        if (t === 'done') out.push(`${r.name} has had enough company for now and wants to be alone: ${r.name} wraps it up (politely or not, as fits them) and goes to their room soon.`);
    }
    for (const r of present) { const a = actOf(g, w, r); if (/headphones/i.test(a)) out.push(`${r.name} has headphones on: they do not hear what is said unless {{user}} gets their attention.`); }
    for (const r of present) if ((x.sought?.[r.avatar] ?? -999) > now - 60) out.push(`${r.name} came looking for {{user}}.`);
    const th = T.threadsFor(x.threads, [...ids, YOU]).slice(-3);
    if (th.length) out.push(`Left open from earlier (bring it up only if it fits): ${th.map(t => `${t.who.map(a => name(g, a)).join(' & ')}: ${t.text}`).join('; ')}.`);
    return out;
});

/* ---------- moving from room to room ---------- */

roomMinutes.push((g, w, from, to) => {
    if (!tcfg(g).move) return null;
    const fl = (id: string) => w.plan?.rooms?.find(r => r.id === id)?.floor ?? '';
    const a = fl(from), b = fl(to);
    return a && b && a !== b ? 2 : 1;
});

/* ---------- the fog on the map ---------- */

/** Who the map shows in a room: with the fog, only the room you are in; elsewhere, where you last saw them (for 3 hours). */
export function mapPeople(g: Save, w: WorldDef, loc: string): { here: Resident[]; ghosts: { r: Resident; ago: number }[] } {
    const here = presentAt(g, w, loc);
    if (!tcfg(g).fog || loc === g.player.loc) return { here, ghosts: [] };
    const x = talkOf(g); const now = nowAbs(g); const mine = new Set(presentAt(g, w, g.player.loc).map(r => r.avatar));
    const ghosts = (Object.values(g.cast) as Resident[]).filter(r => !mine.has(r.avatar) && x.seen[r.avatar]?.loc === loc && now - x.seen[r.avatar].at <= 180).map(r => ({ r, ago: now - x.seen[r.avatar].at }));
    return { here: [], ghosts };
}
