// [expanded] Your own life (Mundi Expanded 0.2.1-12): your skills, the mini-games' place in the game, chores, the
// house's calendar, and "while you were away". The rules are in own.ts; the games on screen in ui/minigames.ts.
//
// Everything you do alone comes back to the others: the level you play at is told to the scene; a guitar is heard
// through the walls; a meal is eaten (and judged); a story can be read (or snooped); chores left undone make a mess
// and a quarrel; birthdays, exams and interviews are things to ask about.
import { nowAbs, saveGame, notify, game, state } from '../core/store.js';
import { isScenario, getWorld } from '../core/world.js';
import { onHour, onDay, onAction, actionMods } from './hooks.js';
import { presentNotes, afterSync, takeover, dayOff, talkHooks, chatNews, ringButtons } from './lifehooks.js';
import { presentAt, whereNow, OUT } from './people.js';
import { commonRooms, cardText, slotAt, asleepNow } from './lifeday.js';
import { profileOf } from './profile.js';
import { bondOf, bump, social } from './social.js';
import { applyChange, YOU } from './bonds.js';
import { feel } from './life.js';
import { isOuting } from './places.js';
import { chat, personaName } from '../st/bridge.js';
import * as O from './own.js';
export const ownOf = (g) => {
    const x = (g.ownx ??= {});
    x.cfg ??= {};
    x.skills ??= {};
    x.books ??= [];
    x.chores ??= { week: -1, rota: {}, done: {}, mess: {}, nudged: {}, skipped: [] };
    x.cal ??= { bday: {}, events: [], made: {}, cev: [], wished: {} };
    if (!x.cal.events.length && !x.cal.seeded) {
        x.cal.seeded = true;
        x.cal.events = [{ id: 'fri', name: 'Game night', act: 'games', wd: 4, hour: 20, on: true }, { id: 'sun', name: 'Sunday dinner', act: 'cook', wd: 6, hour: 19, on: true }];
    }
    return x;
};
export const ocfg = (g) => { const c = ownOf(g).cfg; return { games: c.games !== false, pace: c.pace ?? 'normal', chores: c.chores ?? 'gentle', calendar: c.calendar !== false, digest: c.digest !== false, sound: c.sound !== false }; };
const on = (g, w) => isScenario(w) && !g.tutorial;
const sd = (g) => Math.max(1, Math.round(g.cfg?.seasonDays ?? 14));
const H = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
} h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; return (h >>> 0) / 4294967296; };
const name = (g, a) => (a === YOU ? '{{user}}' : g.cast[a]?.name ?? a);
const housemates = (g) => Object.values(g.cast).filter(r => !r.guest && r.met);
/* ---------- skills ---------- */
export const xpOf = (g, s) => ownOf(g).skills[s] ?? 0;
export const levelOf = (g, s) => O.levelOf(xpOf(g, s));
/** Adds experience; the words for a new level, or ''. */
export function practise(g, s, score) {
    const x = ownOf(g);
    const before = O.levelOf(x.skills[s] ?? 0);
    x.skills[s] = (x.skills[s] ?? 0) + O.xpFor(score, ocfg(g).pace);
    const after = O.levelOf(x.skills[s]);
    return after > before ? `${O.SKILLS[s].name}: level ${after} (${O.LEVEL_WORDS[after]}).` : '';
}
/** Starting skills: the persona's traits from the new-game wizard; the rest from the card (one call, see ui). */
export function seedSkills(g, extra = {}) {
    const x = ownOf(g);
    const seed = { ...O.seedFromTraits(g.player.traits), ...extra };
    for (const [s, l] of Object.entries(seed))
        x.skills[s] = Math.max(x.skills[s] ?? 0, O.xpAt(Math.max(1, Math.min(10, l))));
    x.setup = 'done';
}
/** A character's level in a skill (their profile; 0: not good at it). */
export const theirLevel = (g, a, s) => Number(profileOf(g, a)?.skills?.[s] ?? 0);
/* ---------- the actions in the rooms ---------- */
/** The mini-game an action opens (the world's, the things', and ours). */
export const GAME_OF = {
    cook: { game: 'cook', skill: 'cooking', minutes: 45 },
    'x-fx-music': { game: 'guitar', skill: 'music', minutes: 30 }, 'x-own-guitar': { game: 'guitar', skill: 'music', minutes: 30 },
    'x-tidy': { game: 'clean', skill: null, minutes: 30 }, 'x-own-tidy': { game: 'clean', skill: null, minutes: 30 },
    'x-own-crossword': { game: 'crossword', skill: 'study', minutes: 20 },
    'x-freelance': { game: 'work', skill: 'work', minutes: 180 }, 'x-fx-work': { game: 'work', skill: 'work', minutes: 120 },
    'x-own-study': { game: 'study', skill: 'study', minutes: 90 },
    'x-own-code': { game: 'code', skill: 'coding', minutes: 90 }, 'x-own-write': { game: 'write', skill: 'writing', minutes: 60 },
    'x-own-chore-dishes': { game: 'clean', skill: null, minutes: 20 }, 'x-own-chore-trash': { game: 'clean', skill: null, minutes: 10 },
    'x-own-chore-clean': { game: 'clean', skill: null, minutes: 40 }, 'x-own-chore-bath': { game: 'clean', skill: null, minutes: 30 },
};
const AUTO_SKILL = { 'x-workout': 'fitness', 'x-treadmill': 'fitness', 'x-run': 'fitness', 'x-fx-exercise': 'fitness' };
const furnished = (g) => !!g.furnishx?.started;
const roomName = (g, w, id) => (id === 'home:player' ? 'your room' : w.places.find(p => p.id === id)?.name ?? '');
const kindRoom = (g, w, re) => commonRooms(g, w).find(r => re.test(r.name))?.id ?? '';
actionMods.push((g, w, list) => {
    if (!on(g, w) || isOuting(g.player.loc))
        return list;
    const room = g.player.loc;
    const ids = new Set(list.map(a => a.id));
    const add = [];
    const desk = !furnished(g) ? room === 'home:player' : list.some(a => a.id === 'x-fx-work' || a.id === 'x-freelance');
    const mk = (id, label, icon, minutes, effects = {}) => ({ id, name: label, label, icon, cost: 0, minutes, home: true, effects });
    if (!ids.has('x-fx-music') && room === 'home:player' && !furnished(g) && (levelOf(g, 'music') > 1 || g.player.traits?.proficiency?.includes('Musical')))
        add.push(mk('x-own-guitar', 'Play the guitar', '🎸', 30, { mood: 5 }));
    if (!/bath|shower|wash/i.test(roomName(g, w, room)))
        add.push(mk('x-own-crossword', 'Do a crossword', '🧩', 20, { mood: 2 }));
    if (desk)
        add.push(mk('x-own-study', 'Study', '📚', 90, { energy: -6 }), mk('x-own-code', 'Work on your coding project', '💻', 90, { energy: -6 }), mk('x-own-write', 'Write', '✍️', 60, { energy: -4, mood: 2 }));
    if (room === 'home:player' && !ids.has('x-tidy'))
        add.push(mk('x-own-tidy', 'Tidy up your room', '🧹', 30, { mood: 2 }));
    // chores whose room this is: yours (your turn) or anyone's (covering for them)
    if (ocfg(g).chores !== 'off')
        for (const c of O.CHORES) {
            if (!c.room.test(roomName(g, w, room)))
                continue;
            const who = ownOf(g).chores.rota[c.id];
            if (!who)
                continue;
            const mine = who === YOU;
            add.push(mk(`x-own-chore-${c.id}`, `${c.name}${mine ? ' (your turn)' : ` (${name(g, who)}'s turn)`}`, '🧽', GAME_OF[`x-own-chore-${c.id}`].minutes, { hygiene: -5 }));
        }
    return [...list, ...add];
});
/* ---------- a mini-game first ---------- */
/** What the screen shows now: the choice (play, or just do it, and with whom), then the game. */
export const OWN = { pending: null, bypass: '', result: null };
takeover.push((g, w, a) => {
    if (!on(g, w) || !GAME_OF[a.id] || state.generating || !ocfg(g).games)
        return false;
    if (OWN.bypass === a.id) {
        OWN.bypass = '';
        return false;
    }
    OWN.pending = { a, game: GAME_OF[a.id].game, skill: GAME_OF[a.id].skill, with: '' };
    notify();
    return true;
});
/** The action itself goes on (the time, its effects, the scene told), after the game or without it. */
export async function finish(score, text = '', extra) {
    const p = OWN.pending;
    OWN.pending = null;
    if (!p)
        return;
    OWN.result = { id: p.a.id, score: score ?? -1, text, ...(extra ? { extra } : {}) };
    if (text) {
        const { narratorLine } = await import('../st/bridge.js');
        await narratorLine(text);
    }
    OWN.bypass = p.a.id;
    const { ACT } = await import('../ui/reg.js');
    const el = document.createElement('button');
    el.dataset.id = p.a.id;
    await ACT.do(el);
    notify();
}
onAction.push((g, w, a) => {
    if (!on(g, w))
        return;
    const r = OWN.result && OWN.result.id === a.id ? OWN.result : null;
    OWN.result = null;
    const gm = GAME_OF[a.id];
    const s = gm?.skill ?? AUTO_SKILL[a.id];
    const msgs = [];
    if (s) {
        const m = practise(g, s, r && r.score >= 0 ? r.score : null);
        if (m)
            msgs.push(m);
    }
    if (r?.extra)
        r.extra();
    // just done (no mini-game): a story or a project still moves on, by your skill and luck
    if ((gm?.game === 'write' || gm?.game === 'code') && (!r || r.score < 0)) {
        const t = autoWork(g, gm.game === 'write' ? 'writing' : 'coding');
        if (t)
            msgs.push(t);
    }
    // a chore done (yours, or covering for someone)
    const ch = /^x-own-chore-(\w+)$/.exec(a.id)?.[1];
    if (ch)
        choreDone(g, w, ch, YOU);
    if (gm?.game === 'clean') {
        const room = g.player.loc;
        const x = ownOf(g);
        x.chores.mess[room] = Math.max(0, (x.chores.mess[room] ?? 0) - Math.round(40 + 40 * (r && r.score >= 0 ? r.score : 0.6)));
    }
    if (msgs.length)
        void import('../core/store.js').then(m => msgs.forEach(t => m.toast(t, 'success')));
    saveGame();
});
/** A session done without the mini-game: the best of three rolled ideas a step (you know good work when you see it). */
function autoWork(g, kind) {
    const b = ownOf(g).books.find(x => x.kind === kind && x.done < x.size);
    if (!b)
        return '';
    const L = levelOf(g, kind);
    const steps = kind === 'writing' ? 3 : 2;
    let pts = 0;
    for (let i = 0; i < steps; i++) {
        const t = Math.max(...[0, 1, 2].map(() => O.rollTier(L, Math.random())));
        pts += t;
        const ax = O.AXES[kind][i % 3];
        b.axes[ax] = (b.axes[ax] ?? 0) + t;
    }
    b.points += pts;
    b.done++;
    b.parts.push(kind === 'writing' ? '(a part written without notes)' : '(a session of work)');
    if (b.done >= b.size)
        b.verdict = O.verdict(b.points, b.size * steps, L, Math.random()).word;
    return b.verdict ? `"${b.title || 'Untitled'}" is finished: ${b.verdict}.` : `"${b.title || 'Untitled'}": ${b.done}/${b.size}.`;
}
/* ---------- chores ---------- */
function choreDone(g, w, c, by) {
    const x = ownOf(g).chores;
    x.done[c] = (x.done[c] ?? 0) + 1;
    const def = O.CHORES.find(z => z.id === c);
    const room = kindRoom(g, w, def.room) || (by === YOU ? g.player.loc : '');
    if (room)
        x.mess[room] = Math.max(0, (x.mess[room] ?? 0) - 60);
    const owner = x.rota[c];
    if (by === YOU && owner && owner !== YOU && g.cast[owner]) { // you covered for them
        bump(g, owner, 1);
        if (ocfg(g).chores === 'serious')
            applyChange(g, [YOU, owner], 1, `{{user}} did ${name(g, owner)}'s chore (${def.name.toLowerCase()}) for them.`, 'scene');
    }
}
const peopleForRota = (g) => [YOU, ...housemates(g).map(r => r.avatar)];
onDay.push((g, w) => {
    if (!on(g, w))
        return [];
    const x = ownOf(g);
    const c = ocfg(g);
    const day = g.day;
    const out = [];
    // a new week: a new rota
    const wk = O.weekOf(day);
    if (c.chores !== 'off' && x.chores.week !== wk) {
        // last week's weekly chores that were yours and not done
        if (x.chores.week >= 0)
            for (const ch of O.CHORES)
                if (x.chores.rota[ch.id] === YOU && ch.per < 7 && (x.chores.done[ch.id] ?? 0) < ch.per)
                    x.chores.skipped.push({ a: YOU, c: ch.id, day: day - 1 });
        x.chores.week = wk;
        x.chores.rota = O.rota(peopleForRota(g), wk);
        x.chores.done = {};
    }
    // a new week: what everyone has coming up
    if (c.calendar && x.cal.cevWeek !== wk) {
        x.cal.cevWeek = wk;
        for (const r of housemates(g))
            for (const [i, k] of O.weekEvents(cardText(r.avatar), [H(`${g.world}|${wk}|${r.avatar}|n`), H(`${wk}|${r.avatar}|a`), H(`${wk}|${r.avatar}|b`)], ['taken', 'married'].includes(profileOf(g, r.avatar)?.status ?? '')).entries())
                x.cal.cev.push({ a: r.avatar, kind: k, day: wk * 7 + 1 + Math.floor(H(`${wk}|${r.avatar}|${i}|day`) * 7) });
        x.cal.cev = x.cal.cev.filter(e => e.day >= day - 4);
    }
    // what happened at their events (yesterday's)
    for (const e of x.cal.cev)
        if (e.day === day - 1 && e.good === undefined)
            e.good = H(`${g.world}|${e.day}|${e.a}|${e.kind}|out`) < 0.6;
    // birthdays: everyone has one (from the card, else a day of the year)
    for (const r of housemates(g))
        if (x.cal.bday[r.avatar] === undefined) {
            const b = O.birthdayFromText(cardText(r.avatar), sd(g));
            x.cal.bday[r.avatar] = b >= 0 ? b : O.birthdayRandom(H(`${g.world}|${r.avatar}|bday`), sd(g));
        }
    // yesterday's birthday you said nothing about: someone close is hurt
    for (const r of housemates(g)) {
        const b = x.cal.bday[r.avatar];
        if (O.dayOfYear(day - 1, sd(g)) !== b)
            continue;
        if ((x.cal.wished[r.avatar] ?? -1) !== day - 1 && bondOf(g, r.avatar) >= 30) {
            feel(g, r.avatar, 'Hurt: you forgot their birthday', 2);
            bump(g, r.avatar, -3);
            out.push(`You forgot ${r.name}'s birthday.`);
        }
    }
    // chores: the others do theirs (or not), daily for the dishes, a few times a week for the rest
    if (c.chores !== 'off') {
        const dow = (day - 1) % 7;
        for (const ch of O.CHORES) {
            const who = x.chores.rota[ch.id];
            if (!who || who === YOU || !g.cast[who])
                continue;
            const due = ch.per >= 7 || (ch.per === 2 && (dow === 2 || dow === 5)) || (ch.per === 1 && dow === 5);
            if (!due)
                continue;
            const tidy = profileOf(g, who)?.tidy ?? 50;
            const nudged = (x.chores.nudged[who] ?? -1) > nowAbs(g);
            if (O.willDo(tidy, nudged, H(`${g.world}|${day}|${who}|${ch.id}`)))
                choreDone(g, w, ch.id, who);
            else
                x.chores.skipped.push({ a: who, c: ch.id, day: day - 1 });
        }
        // yours: undone ones count too
        for (const ch of O.CHORES)
            if (x.chores.rota[ch.id] === YOU && ch.per >= 7 && (x.chores.done[ch.id] ?? 0) < Math.min(7, dow + 1) - 1)
                x.chores.skipped.push({ a: YOU, c: ch.id, day: day - 1 });
        x.chores.skipped = x.chores.skipped.filter(s => s.day >= day - 7);
        // serious: someone tidy complains about whoever keeps skipping
        if (c.chores === 'serious') {
            const by = {};
            for (const s of x.chores.skipped)
                by[s.a] = (by[s.a] ?? 0) + 1;
            for (const [a, n] of Object.entries(by)) {
                if (n < 2 || H(`${g.world}|${day}|${a}|moan`) > 0.5)
                    continue;
                const moaner = housemates(g).filter(r => r.avatar !== a && (profileOf(g, r.avatar)?.tidy ?? 50) >= 55).sort((p, q) => (profileOf(g, q.avatar)?.tidy ?? 50) - (profileOf(g, p.avatar)?.tidy ?? 50))[0];
                if (!moaner)
                    continue;
                const what = O.CHORES.find(z => z.id === x.chores.skipped.find(s => s.a === a).c).name.toLowerCase();
                if (a === YOU) {
                    feel(g, moaner.avatar, `Annoyed: you keep skipping your chores (${what})`, 2);
                    bump(g, moaner.avatar, -2);
                }
                else
                    applyChange(g, [moaner.avatar, a], -1, `${moaner.name} complained that ${name(g, a)} keeps skipping their chores (${what}).`, 'offscreen');
                x.chores.skipped = x.chores.skipped.filter(s => s.a !== a);
            }
        }
    }
    // someone nosy reads your unfinished story (a page or two) without asking
    for (const b of x.books.filter(b => b.kind === 'writing' && b.parts.length))
        for (const r of housemates(g)) {
            if ((profileOf(g, r.avatar)?.nosy ?? 50) < 70 || (b.readers ?? {})[r.avatar] !== undefined)
                continue;
            if (H(`${g.world}|${day}|${r.avatar}|${b.id}|snoop`) < 0.08)
                (b.readers ??= {})[r.avatar] = -day; // negative: without asking
        }
    saveGame();
    return out;
});
/** Your reminder: once a day, the phone tells you whose turn it is (gentle and serious). */
onHour.push((g, w) => {
    if (!on(g, w) || g.asleep)
        return [];
    const x = ownOf(g);
    const h = Math.floor(g.minutes / 60);
    const now = nowAbs(g);
    // mess grows where people are (the kitchen most)
    // (only rooms a chore looks after: the kitchen, the living room, the bathroom)
    if (ocfg(g).chores !== 'off')
        for (const loc of new Set([g.player.loc, ...housemates(g).map(r => whereNow(g, w, r))])) {
            if (!loc || loc === OUT || loc.startsWith('home:') || isOuting(loc) || !O.CHORES.some(c => c.room.test(roomName(g, w, loc))))
                continue;
            const n = presentAt(g, w, loc).length + (loc === g.player.loc ? 1 : 0);
            if (!n)
                continue;
            x.chores.mess[loc] = Math.min(100, (x.chores.mess[loc] ?? 0) + n * (/kitchen/i.test(roomName(g, w, loc)) ? 1.5 : 0.8));
        }
    if (h === 9 && ocfg(g).chores !== 'off') {
        const mine = O.CHORES.filter(c => x.chores.rota[c.id] === YOU && (c.per >= 7 || ((g.day - 1) % 7 === 5)));
        if (mine.length)
            void import('../ui/peek.js').then(m => m.pushPeek({ title: 'Chores', text: `Your turn: ${mine.map(c => c.name.toLowerCase()).join(', ')}.`, app: 'me' })).catch(() => { });
    }
    // the house's own evenings: the plan is made in the morning, with someone to ask you along
    if (h === 10 && ocfg(g).calendar) {
        const dow = (g.day - 1) % 7;
        for (const e of x.cal.events.filter(e => e.on && e.wd === dow)) {
            if (x.cal.made[e.id] === g.day)
                continue;
            x.cal.made[e.id] = g.day;
            void makeHouseEvent(g, w, e);
        }
    }
    void now;
    return [];
});
async function makeHouseEvent(g, w, e) {
    const { cplansOf } = await import('./cplanrun.js');
    const { cactOf } = await import('./cplans.js');
    const act = cactOf(e.act);
    if (!act)
        return;
    const from = g.day * 1440 + e.hour * 60;
    const room = kindRoom(g, w, e.act === 'cook' ? /kitchen|dining/i : /living|lounge/i) || commonRooms(g, w)[0]?.id;
    if (!room)
        return;
    const who = housemates(g).filter(r => !(asleepNow(r, from) ?? false)).map(r => r.avatar);
    if (who.length < 2)
        return;
    const host = who.slice().sort((a, b) => bondOf(g, b) - bondOf(g, a))[0];
    cplansOf(g).push({ id: `h${e.id}${g.day}`, who, act: e.act, place: room, from, to: from + act.hours * 60, state: 'set', invite: host });
    saveGame();
}
/* ---------- the calendar ---------- */
dayOff.push((g, day) => { const x = g.ownx; return !!x && x.cfg.calendar !== false && O.isGolden(day, sd(g)); });
/** What is on today and the next days (for the calendar). */
export function upcoming(g, days = 7) {
    const x = ownOf(g);
    const out = [];
    for (let d = g.day; d < g.day + days; d++) {
        const doy = O.dayOfYear(d, sd(g));
        for (const [a, b] of Object.entries(x.cal.bday))
            if (b === doy && g.cast[a])
                out.push({ day: d, text: `${g.cast[a].name}'s birthday`, who: a });
        if (O.isNewYear(d, sd(g)))
            out.push({ day: d, text: 'New Year' });
        if (O.isGolden(d, sd(g)) && !O.isGolden(d - 1, sd(g)))
            out.push({ day: d, text: `The golden week begins (${O.goldenDays(sd(g))} days off: nobody works or studies)` });
        for (const e of x.cal.cev.filter(e => e.day === d && g.cast[e.a]))
            out.push({ day: d, text: `${g.cast[e.a].name}: ${O.EVENTS[e.kind].text}`, who: e.a });
        for (const e of x.cal.events.filter(e => e.on && e.wd === (d - 1) % 7))
            out.push({ day: d, text: `${e.name}, ${String(e.hour).padStart(2, '0')}:00` });
    }
    return out;
}
/* ---------- for the scene ---------- */
presentNotes.push((g, w, present) => {
    if (!on(g, w))
        return [];
    const x = ownOf(g);
    const out = [];
    const d = g.day;
    const doy = O.dayOfYear(d, sd(g));
    // you: your traits and what you are good at (the level the scene plays you at)
    const traits = O.traitsLine(g.player.traits);
    const good = O.SKILL_LIST.map(s => [s, levelOf(g, s)]).filter(([, l]) => l >= 3).map(([s, l]) => `${O.SKILLS[s].name.toLowerCase()} ${O.LEVEL_WORDS[l]}`);
    if (traits || good.length)
        out.push(`About {{user}}: ${[traits, good.length ? `skills: ${good.join(', ')}` : ''].filter(Boolean).join('; ')}.`);
    // the room's mess
    const m = O.messWord(x.chores.mess[g.player.loc] ?? 0);
    if (m && !g.player.loc.startsWith('home:')) {
        const what = O.CHORES.filter(c => c.room.test(roomName(g, w, g.player.loc))).map(c => c.mess)[0];
        out.push(`The ${roomName(g, w, g.player.loc).toLowerCase()} is ${m}${what ? ` (${what})` : ''}.`);
    }
    for (const r of present) {
        if (x.cal.bday[r.avatar] === doy)
            out.push(`Today is ${r.name}'s birthday (the house knows).`);
        for (const e of x.cal.cev.filter(e => e.a === r.avatar)) {
            if (e.day === d || e.day === d + 1)
                out.push(`${r.name} has ${O.EVENTS[e.kind].text} ${e.day === d ? 'today' : 'tomorrow'} and has it on their mind.`);
            else if (e.good !== undefined && d - e.day <= 2)
                out.push(`${r.name} ${e.good ? O.EVENTS[e.kind].good : O.EVENTS[e.kind].bad} (${d - e.day === 1 ? 'yesterday' : 'two days ago'}).`);
        }
        for (const b of x.books.filter(b => b.readers?.[r.avatar] !== undefined)) {
            const v = b.readers[r.avatar];
            if (Math.abs(v) < d - 2)
                continue;
            out.push(v < 0 ? `${r.name} secretly read a few pages of {{user}}'s unfinished ${b.kind === 'writing' ? 'story' : 'project'} "${b.title}" without asking (it is ${b.verdict ?? judgeSoFar(g, b)} so far); ${r.name} might let it slip.`
                : `${r.name} has read {{user}}'s ${b.kind === 'writing' ? 'story' : 'project'} "${b.title}" ({{user}} let them): it is ${b.verdict ?? judgeSoFar(g, b)}; ${r.name} reacts honestly, in character.`);
        }
    }
    {
        const m = x.music;
        const ago = m ? nowAbs(g) - m.at : 999;
        if (m && ago > 5 && ago <= 180 && present.length)
            out.push(`Earlier {{user}} played the guitar (in ${roomName(g, w, m.loc).toLowerCase() || 'the house'}): it sounded ${m.word}, and the house could hear it.`);
    }
    if (O.isGolden(d, sd(g)) && ocfg(g).calendar)
        out.push('It is the golden week: nobody in the house works or studies.');
    if (O.isNewYear(d, sd(g)) && ocfg(g).calendar)
        out.push('Today is New Year.');
    return out;
});
export const judgeSoFar = (g, b) => O.verdict(b.points, Math.max(1, b.parts.length * 3), levelOf(g, b.kind === 'writing' ? 'writing' : 'coding'), 0.5).word;
talkHooks.push((g, who) => {
    const x = g.ownx;
    if (!x)
        return [];
    const out = [];
    for (const e of x.cal.cev.filter(e => who.includes(e.a) && Math.abs(e.day - g.day) <= 2))
        out.push(e.good === undefined ? { t: `${name(g, e.a)}'s ${O.EVENTS[e.kind].text} coming up`, tone: 'heart' } : { t: `how ${name(g, e.a)}'s ${O.EVENTS[e.kind].text} went (${e.good ? O.EVENTS[e.kind].good : O.EVENTS[e.kind].bad})` });
    for (const s of x.chores.skipped.filter(s => !who.includes(s.a) && s.a !== YOU && g.day - s.day <= 2).slice(-1))
        out.push({ t: `${name(g, s.a)} skipping their chores again`, tone: 'complain' });
    return out;
});
chatNews.push((g) => {
    const x = g.ownx;
    if (!x || x.cfg.chores === 'off')
        return [];
    const s = x.chores.skipped.filter(z => g.day - z.day <= 1).at(-1);
    if (!s)
        return [];
    const c = O.CHORES.find(z => z.id === s.c);
    return [{ text: `${c.mess.charAt(0).toUpperCase()}${c.mess.slice(1)}: it was ${s.a === YOU ? personaName() : name(g, s.a)}'s turn.`, who: s.a === YOU ? [] : [s.a], weight: x.cfg.chores === 'serious' ? 2.5 : 1.2 }];
});
/** Remind someone about their chore (from their ring): they will likely do it; twice in a row is nagging. */
ringButtons.push((g, w, a) => {
    const x = g.ownx;
    if (!x || (x.cfg.chores ?? 'gentle') === 'off')
        return [];
    return Object.values(x.chores.rota).includes(a) ? [{ act: 'own-nudge', icon: 'bell', label: 'Remind about chores' }] : [];
});
export function nudge(g, a) {
    const x = ownOf(g);
    const now = nowAbs(g);
    const r = g.cast[a];
    if (!r)
        return '';
    if ((x.chores.nudged[a] ?? -1) > now) {
        bump(g, a, -1);
        feel(g, a, 'Annoyed: you keep nagging about chores', 1);
        saveGame();
        return `${r.name} rolls their eyes: you already said that.`;
    }
    x.chores.nudged[a] = now + 2 * 1440;
    saveGame();
    return `You remind ${r.name} about their chores. They will probably do them now.`;
}
/* ---------- birthdays: did you say something? ---------- */
afterSync.push((g, w, here) => {
    if (!on(g, w))
        return;
    const x = ownOf(g);
    const doy = O.dayOfYear(g.day, sd(g));
    const last = chat().slice(-3).filter((m) => m?.is_user && /birthday|b-?day|день рожд|поздравл|с др\b/i.test(String(m.mes ?? '')));
    if (last.length)
        for (const r of here)
            if (x.cal.bday[r.avatar] === doy)
                x.cal.wished[r.avatar] = g.day;
    if (x.sleptAt && !g.asleep)
        void morningDigest(g, w);
    if (!x.setup) {
        x.setup = 'asked';
        saveGame();
        void import('../ui/peek.js').then(m => m.pushPeek({ title: 'Me', text: 'New: your own skills, works and chores. Open "Me" in the phone to set what you are good at.', app: 'me' })).catch(() => { });
    }
    // away and back: what happened meanwhile
    const home = !isOuting(g.player.loc) && g.player.loc !== OUT;
    const now = nowAbs(g);
    if (!home) {
        x.away ??= { from: now };
        return;
    }
    if (x.away && ocfg(g).digest && O.digestDue(x.away.from, now, x.lastDigest ?? -9999, false)) {
        const since = x.away.from;
        x.away = null;
        void digest(g, w, since);
    }
    else if (x.away && home)
        x.away = null;
});
onDay.push((g) => { const x = g.ownx; if (x && g.asleep && !x.sleptAt)
    x.sleptAt = nowAbs(g) - 60; return []; });
/** In the morning (the first look after a night) and after a real absence: a few hints of what happened meanwhile. */
export async function morningDigest(g, w) {
    const x = ownOf(g);
    if (!ocfg(g).digest || !x.sleptAt)
        return;
    if (!O.digestDue(x.sleptAt, nowAbs(g), x.lastDigest ?? -9999, true))
        return;
    const since = x.sleptAt;
    x.sleptAt = 0;
    await digest(g, w, since);
}
async function digest(g, w, since) {
    const x = ownOf(g);
    x.lastDigest = nowAbs(g);
    const hints = [];
    const sinceDay = Math.floor(since / 1440);
    const { bondsOf } = await import('./bonds.js');
    for (const f of bondsOf(g).facts.filter(f => f.kind === 'episode' && f.day >= sinceDay && f.src === 'offscreen' && f.who.every(a => g.cast[a])).slice(-2))
        hints.push((f.delta ?? 0) < 0 ? `Something is off between ${f.who.map(a => g.cast[a].name).join(' and ')}: the air is tense.` : `${f.who.map(a => g.cast[a].name).join(' and ')} seem in a good mood with each other.`);
    const stock = g.stock?.items ?? [];
    if (stock.some((i) => /leftover/i.test(i.name) && i.qty > 0))
        hints.push('Someone cooked: there are leftovers in the fridge.');
    for (const [loc, v] of Object.entries(x.chores.mess))
        if (v >= 70 && !loc.startsWith('home:')) {
            hints.push(`The ${roomName(g, w, loc).toLowerCase()} is a mess.`);
            break;
        }
    for (const e of x.cal.cev.filter(e => e.good !== undefined && e.day === g.day - 1 && g.cast[e.a]))
        hints.push(`${g.cast[e.a].name} is back from ${O.EVENTS[e.kind].text}, looking ${e.good ? 'pleased' : 'down'}.`);
    const chats = (g.chatsx?.chats ?? []);
    const busy = chats.reduce((n, c) => n + (c.msgs ?? []).filter((m) => (m.at ?? 0) > since).length, 0);
    if (busy >= 6)
        hints.push('The house chat was busy while you were gone.');
    const list = hints.slice(0, O.DIGEST_MAX);
    if (!list.length)
        return;
    const { narratorLine } = await import('../st/bridge.js');
    const go = async () => { if (state.generating) {
        setTimeout(go, 800);
        return;
    } await narratorLine(`While {{user}} was away: ${list.join(' ')}`); };
    void go();
    saveGame();
    notify();
}
void slotAt;
void social;
void getWorld;
void game;
