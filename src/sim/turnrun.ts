// [expanded] Mundi Expanded 15: who speaks, on SillyTavern (rules in sim/turnplan.ts and sim/ensemble.ts).
//
// A line you send in a scene with two or more people is read first (turnplan): one person answers alone, or the room
// answers together in one reply. The room's reply is written by the director, a muted member of the group (SillyTavern
// never picks it; Mundi asks for it with force_chid, as for "@Name"). Its answer arrives as one message "[Mira] … [Finn] …";
// before anyone else sees it (translation, voices, the journal) it is cut into people's lines: the first part takes the
// director's own line in place, the others are added when SillyTavern is done with the turn.
//
// Each line of a beat carries extra.mundi_beat {id, k, n}; the first also the raw text of every version (for swiping
// the whole beat), the plan (for asking again) and, until the rest is added, the parts still to come.
import { game, state, notify, toast, nowAbs, type Save } from '../core/store.js';
import { getWorld, isScenario, type WorldDef } from '../core/world.js';
import * as B from '../st/bridge.js';
import { presentAt, whereNow } from './people.js';
import { regCfg, regOn, bgAsk } from './regulator.js';
import { cardText, slotAt } from './lifeday.js';
import { looseJson } from './jsonfix.js';
import { tierOf } from './talkrun.js';
import { cleanReply } from './cleanreply.js';   // [expanded] 0.2.1-15.2
import * as E from './ensemble.js';
import * as TP from './turnplan.js';

const ctxG = () => { const g = game(); const w = g && getWorld(g.world); return g && w ? { g, w } : null; };
export const sceneMode = () => regCfg().scene;
export const beatMax = () => regCfg().beatMax;

/** A Home game (not the tour, not a plain chat): the only place a reply for the room is used. */
export const eligible = (g: Save, w: WorldDef) => isScenario(w) && !(g as any).tutorial && !B.scenarioOpen() && !!B.selectedGroup();

/* ---------- who is here, who is in the talk ---------- */

const talkOf = (a: string) => { const c: any = B.charOf(a); const v = Number(c?.data?.extensions?.talkativeness ?? c?.talkativeness ?? 0.5); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.5; };
/** Who spoke in the last two exchanges (the talk going on). */
function recentSpeakers(): Set<string> {
    const out = new Set<string>(); const list = B.chat(); let users = 0;
    for (let i = list.length - 1; i >= 0 && users < 2; i--) {
        const m = list[i]; if (!m || m.is_system && !m.extra?.mundi_narrator) continue;
        if (m.is_user) { if (!B.isFiller(m)) users++; continue; }
        const a = B.speakerOf(m); if (a) out.add(a);
    }
    return out;
}
const doingOf = (g: Save, w: WorldDef, r: any) => { const s = slotAt(g, w, r, nowAbs(g)); return !s || whereNow(g, w, r) !== s.loc ? '' : s.asleep ? 'asleep' : String(s.act ?? ''); };
/** Everyone in the scene (talking alone with one person: only them). */
export function herePeople(g: Save, w: WorldDef): TP.Person[] {
    const solo = String((g as any).social?.solo ?? '');
    const recent = recentSpeakers();
    return presentAt(g, w, g.player.loc).filter(r => !solo || r.avatar === solo).map(r => ({
        avatar: r.avatar, name: r.name, talk: talkOf(r.avatar), inThread: recent.has(r.avatar),
        tired: tierOf(g, r.avatar) === 'tired', done: tierOf(g, r.avatar) === 'done', about: E.aboutText(cardText(r.avatar), 110),
    }));
}
/** The names a reply for the room may be cut by (the people here). */
export function liveCast(): E.Who[] {
    const x = ctxG(); if (!x) return [];
    const solo = String((x.g as any).social?.solo ?? '');
    return presentAt(x.g, x.w, x.g.player.loc).filter(r => !solo || r.avatar === solo).map(r => ({ avatar: r.avatar, name: r.name }));
}

/* ---------- the director card ---------- */

const DIRECTOR_TEXT = 'This card is the director of the group scenes of Mundi Expanded. It is not a person. When a scene beat is asked for, it writes what happens next as the people named in that instruction, in the format the instruction gives. Do not chat with it directly.';
let making: Promise<string | null> | null = null;
/** The director's avatar: the card is made once, for every game. */
export function ensureDirector(): Promise<string | null> {
    const have = B.sceneChar(); if (have) return Promise.resolve(have.avatar);
    if (!making) making = (async () => {
        try {
            const { initialsAvatar } = await import('./game.js');
            await B.createCharacter({ name: E.SCENE_NAME, description: DIRECTOR_TEXT, tags: ['Mundi'], file: E.SCENE_FILE, extensions: { talkativeness: '0', mundi_expanded: { scene: true } } }, await initialsAvatar(E.SCENE_NAME, ['#64748b', '#1e293b']));
            return B.sceneChar()?.avatar ?? null;
        } catch (e) { console.warn('[Mundi Expanded] the director card could not be made', e); return null; }
        finally { making = null; }
    })();
    return making;
}
/** The director is a member of this game's group, always muted (setPresent keeps it so). */
async function ensureMember(dir: string) {
    const gid = B.selectedGroup(); const grp = gid && B.groupOf(gid); if (!grp) return;
    if ((grp.members ?? []).includes(dir) && (grp.disabled_members ?? []).includes(dir)) return;
    const { syncScene } = await import('./game.js'); await syncScene();
}

/* ---------- a beat ---------- */

interface Pending { id: string; blocks: E.Block[]; n: number }
const RUN: { plan: E.BeatPlan | null; carry: string[] | null; pending: Pending | null; flushing: Promise<void> | null; cancel: boolean } = { plan: null, carry: null, pending: null, flushing: null, cancel: false };
const whoOf = (g: Save, b: E.Block): { avatar: string; name: string } | 'narration' => b.who === E.NARRATION ? 'narration' : { avatar: b.who, name: g.cast[b.who]?.name ?? B.nameOf(b.who) };

/** The people's own cards, for a prompt whose card is the director's: description and personality whole, and the example
 *  messages (how they talk). Not cut: one call with everyone's card costs less than one call each with a card each. */
function castFor(g: Save, w: WorldDef, people: TP.Person[]): E.BeatAsk['cast'] {
    if (regCfg().joinCards) return undefined;   // joined cards: everyone's own card is in the prompt already
    return people.map(p => {
        const c: any = B.charOf(p.avatar);
        const voice = E.aboutText(String(c?.mes_example ?? c?.data?.mes_example ?? '').replace(/<START>/gi, ' ').replace(/\{\{char\}\}/gi, p.name), E.VOICE_CAP);
        return { name: p.name, about: E.aboutText(cardText(p.avatar)) || '(no description)', doing: doingOf(g, w, g.cast[p.avatar]) || undefined, ...(voice ? { voice } : {}) };
    });
}
/** Asks the director for one beat and cuts it into lines. false: no director (the caller answers some other way). */
export async function runBeat(plan: E.BeatPlan, carry: string[] | null = null): Promise<boolean> {
    const x = ctxG(); if (!x) return false;
    const dir = await ensureDirector(); if (!dir) return false;
    await ensureMember(dir);
    const people = herePeople(x.g, x.w); if (!people.length) return false;
    const nm = (a: string) => people.find(p => p.avatar === a)?.name ?? '';
    const ask: E.BeatAsk = {
        names: people.map(p => p.name), speakers: plan.speakers.map(nm).filter(Boolean), to: plan.to, toNames: plan.toNames, max: beatMax(), cast: castFor(x.g, x.w, people),
    };
    RUN.plan = plan; RUN.carry = carry;
    B.setPrompt('mundi_beat', E.beatPrompt(ask), 0);
    try { await B.replyAs(dir); }
    finally { B.setPrompt('mundi_beat', ''); RUN.plan = null; RUN.carry = null; }
    await flush();
    return true;
}

/** The director's line, cut: the first part takes its place on the chat, the rest wait for `flush`. */
export function convertAt(id: number): boolean {
    const list = B.chat(); const m = list[id];
    if (!E.isSceneMessage(m) || m.extra?.mundi_beat) return false;
    const x = ctxG(); if (!x) return false;
    const raw = String(m.mes ?? '');
    const parsed = E.parseEnsemble(raw, liveCast(), B.personaName(), beatMax(), false);
    if (parsed.dropped.length) console.info('[Mundi Expanded] the reply also wrote for the player; those parts were left out');
    const blocks = parsed.blocks;
    if (!blocks.length) { if (raw.trim()) m.mes = ''; return false; }   // an empty reply is the usual "empty reply" warning
    const bid = E.beatId();
    const raws = [...(RUN.carry ?? []), raw];
    const rest = blocks.slice(1);
    B.setLineAs(id, whoOf(x.g, blocks[0]), blocks[0].text, {
        mundi_beat: { id: bid, k: 0, n: blocks.length } satisfies E.BeatMark, mundi_beat_raw: raws, mundi_beat_sw: raws.length - 1,
        mundi_beat_plan: RUN.plan ?? { speakers: [], to: 'room' }, ...(rest.length ? { mundi_beat_pending: rest } : {}),
    });
    if (rest.length) RUN.pending = { id: bid, blocks: rest, n: blocks.length };
    return true;
}
/** Adds the parts still to come (after SillyTavern is done with the turn: each goes through its normal path, so
 *  translation, voices and the scene's own readers see each one as a person's line). */
export function flush(): Promise<void> {
    if (RUN.flushing) return RUN.flushing;
    const p = RUN.pending; if (!p) return Promise.resolve();
    RUN.pending = null;
    RUN.flushing = (async () => {
        const x = ctxG(); state.generating = true; notify();
        try {
            for (let i = 0; i < p.blocks.length; i++) {
                if (!x) break;
                await B.addBeatLine(whoOf(x.g, p.blocks[i]), p.blocks[i].text, { mundi_beat: { id: p.id, k: i + 1, n: p.n } satisfies E.BeatMark });
            }
        } catch (e) { console.warn('[Mundi Expanded] adding the parts of a beat', e); }
        finally {
            const first = B.chat().find((m: any) => m?.extra?.mundi_beat?.id === p.id && m.extra.mundi_beat.k === 0);
            if (first?.extra) delete first.extra.mundi_beat_pending;
            RUN.flushing = null; state.generating = false; B.saveChat(); notify();
        }
    })();
    return RUN.flushing;
}
/** Parts still to come that nobody is adding (the page was closed in between): picked up from the chat. */
function repairPending() {
    const list = B.chat();
    for (let i = Math.max(0, list.length - 8); i < list.length; i++) {
        const x = list[i]?.extra; const rest = x?.mundi_beat_pending as E.Block[] | undefined;
        if (Array.isArray(rest) && rest.length && x.mundi_beat) { RUN.pending = { id: x.mundi_beat.id, blocks: rest, n: x.mundi_beat.n }; return; }
    }
}
/** Cuts any director's line that is still whole (a stopped or interrupted reply) and adds what waits. */
export function sweep() {
    const list = B.chat();
    for (let i = Math.max(0, list.length - 3); i < list.length; i++) { try { convertAt(i); } catch (e) { console.warn('[Mundi Expanded] beat', e); } }
    if (!RUN.pending && !RUN.flushing) repairPending();
    void flush();
}
/** [expanded] 0.2.1-15.2: a reply that came with a "[Group Chat: …]" header or its speaker's own label: taken off its start. */
export function cleanAt(id: number): boolean {
    const m = B.chat()[id]; if (!m || m.is_user || m.is_system || !B.selectedGroup()) return false;
    const was = String(m.mes ?? ''); const now = cleanReply(was, String(m.name ?? ''));
    if (now === was || !now.trim()) return false;
    B.editMessage(id, now);
    return true;
}
let installed = false;
export function installBeats() {
    if (installed) return; installed = true;
    B.onFirst('MESSAGE_RECEIVED', (id: number) => { try { cleanAt(id); convertAt(id); } catch (e) { console.warn('[Mundi Expanded] beat', e); } });
    for (const ev of ['GROUP_WRAPPER_FINISHED', 'GENERATION_STOPPED', 'GENERATION_ENDED']) B.on(ev, sweep);
    B.on('CHAT_CHANGED', () => { RUN.pending = null; setTimeout(sweep, 600); });
}

/* ---------- the line you send ---------- */

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
/** One line to the room: by name, by the mechanics model (a short call), or by the score; at most four seconds. */
async function decide(g: Save, text: string, people: TP.Person[], story: boolean, mode: 'auto' | 'scene'): Promise<TP.Plan> {
    const inp: TP.PlanIn = { text, people, max: beatMax(), story, seed: `${g.world}|${nowAbs(g)}|${text.length}` };
    const quick = TP.quickPlan(inp); if (quick) return quick;
    if (mode === 'auto' && regOn()) {
        try {
            const list = B.chat().slice(-8, -1).filter((m: any) => !m.is_system || m.extra?.mundi_narrator);
            const lines = list.slice(-6).map((m: any) => ({ name: m.is_user ? B.personaName() : m.name, text: String(m.mes ?? '') }));
            const raw = await Promise.race([bgAsk(TP.planPrompt({ ...inp, user: B.personaName(), lines }), 160, TP.PLAN_SYSTEM, false), sleep(4000).then(() => '')]);
            const p = raw ? TP.parsePlan(looseJson(raw), people, inp.max) : null;
            if (p) return p;
        } catch (e) { console.warn('[Mundi Expanded] who answers: the model failed', e); }
    }
    return TP.scorePlan(inp);
}
async function execute(plan: TP.Plan, people: TP.Person[]) {
    if (plan.mode === 'ensemble' && await runBeat({ speakers: plan.speakers, to: plan.to, toNames: plan.toNames })) return;
    const a = plan.speakers[0] ?? people[0]?.avatar; if (!a) return;
    if (plan.private) B.setAsk(`[{{user}} wants a word with ${people.find(p => p.avatar === a)?.name ?? 'them'}; the others here leave them to it.]`, 60000);
    await B.replyAs(a);
}
async function runTurn(g: Save, text: string, people: TP.Person[], mode: 'auto' | 'scene', story: boolean) {
    RUN.cancel = false; state.generating = true; notify();
    try {
        const plan0 = await decide(g, text, people, story, mode);
        if (RUN.cancel) return;
        await execute(mode === 'scene' ? TP.asEnsemble(plan0) : plan0, people);
    } catch (e: any) { toast(String(e?.message ?? e), 'error'); }
    finally { state.generating = false; notify(); }
}
/** Stop pressed while it is still being decided who answers. */
export const cancelPlanning = () => { RUN.cancel = true; };
/** Your line in a scene with two or more: false = not here (SillyTavern's own order sends it as before). */
export async function sendTurn(text: string, story = false): Promise<boolean> {
    const x = ctxG(); if (!x || !eligible(x.g, x.w)) return false;
    const mode = sceneMode(); if (mode === 'each') return false;
    const people = herePeople(x.g, x.w); if (people.length < 2) return false;
    await B.addUserLine(text);
    void runTurn(x.g, text, people, mode, story);
    return true;
}

/* ---------- the last beat: swipe, again, go on ---------- */

export interface BeatRef { id: string; idx: number[]; first: number }
/** The beat the chat ends with (its lines, first to last), or null. */
export function lastBeat(): BeatRef | null {
    const list = B.chat(); let i = list.length - 1;
    while (i >= 0 && (list[i].is_system && !list[i].extra?.mundi_narrator || B.isFiller(list[i]))) i--;
    const mark = list[i]?.extra?.mundi_beat as E.BeatMark | undefined; if (!mark) return null;
    const idx: number[] = []; list.forEach((m: any, j: number) => { if (m?.extra?.mundi_beat?.id === mark.id) idx.push(j); });
    return { id: mark.id, idx, first: idx[0] };
}
export const lastIsBeat = () => !!lastBeat();
/** Which version of the beat a line belongs to (for the ‹ 2/3 › on its last line). */
export function beatSwipeState(m: any): { sw: number; total: number } | null {
    const mark = m?.extra?.mundi_beat as E.BeatMark | undefined; if (!mark) return null;
    const list = B.chat();
    const first = list.find((x: any) => x?.extra?.mundi_beat?.id === mark.id && x.extra.mundi_beat.k === 0) ?? list.find((x: any) => x?.extra?.mundi_beat?.id === mark.id);
    const raws = first?.extra?.mundi_beat_raw;
    return Array.isArray(raws) && raws.length ? { sw: Number(first.extra.mundi_beat_sw ?? raws.length - 1), total: raws.length } : null;
}
/** Another version the beat already had: its lines are laid out again, no new call. */
async function showVariant(b: BeatRef, sw: number) {
    const x = ctxG(); if (!x) return;
    const first = B.chat()[b.first]; const raw = String(first?.extra?.mundi_beat_raw?.[sw] ?? ''); if (!raw) return;
    for (const i of [...b.idx.slice(1)].reverse()) await B.deleteMessageAt(i);
    const blocks = E.parseEnsemble(raw, liveCast(), B.personaName(), beatMax(), false).blocks; if (!blocks.length) return;
    const rest = blocks.slice(1);
    B.setLineAs(b.first, whoOf(x.g, blocks[0]), blocks[0].text, { mundi_beat: { id: b.id, k: 0, n: blocks.length } satisfies E.BeatMark, mundi_beat_sw: sw, ...(rest.length ? { mundi_beat_pending: rest } : {}) });
    if (!rest.length) delete B.chat()[b.first].extra.mundi_beat_pending;
    else RUN.pending = { id: b.id, blocks: rest, n: blocks.length };
    await flush(); notify();
}
/** The beat again, from the same plan: its lines go, a new version is added to the first line's versions. */
export async function regenBeat(): Promise<boolean> {
    const b = lastBeat(); const x = ctxG(); if (!b || !x) return false;
    const first = B.chat()[b.first]; const raws: string[] = [...(first.extra?.mundi_beat_raw ?? [])]; const plan: E.BeatPlan = first.extra?.mundi_beat_plan ?? { speakers: [], to: 'room' };
    state.generating = true; notify();
    try {
        for (const i of [...b.idx].reverse()) await B.deleteMessageAt(i);
        return await runBeat(plan, raws);
    } catch (e: any) { toast(String(e?.message ?? e), 'error'); return false; }
    finally { state.generating = false; notify(); }
}
/** ‹ and › on the last beat: another version (a new one when there is none after). */
export async function beatSwipe(d: number) {
    const b = lastBeat(); if (!b) return;
    const first = B.chat()[b.first]; const raws: string[] = first.extra?.mundi_beat_raw ?? [];
    const sw = Number(first.extra?.mundi_beat_sw ?? raws.length - 1);
    if (d < 0) { if (sw > 0) await showVariant(b, sw - 1); return; }
    if (sw < raws.length - 1) await showVariant(b, sw + 1); else await regenBeat();
}
/** "Let them go on": the next beat, with nothing from you (a little time passes). */
export async function goOn(): Promise<boolean> {
    const x = ctxG(); if (!x || !eligible(x.g, x.w)) return false;
    state.generating = true; notify();
    try {
        const { homeTick } = await import('./hometime.js'); await homeTick();
        return await runBeat({ speakers: [], to: 'none' });
    } catch (e: any) { toast(String(e?.message ?? e), 'error'); return false; }
    finally { state.generating = false; notify(); }
}
