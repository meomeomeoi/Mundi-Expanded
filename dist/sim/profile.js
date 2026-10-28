// [expanded] A character's day in a Home (Mundi Expanded): a profile instead of an hour-by-hour routine.
//
//  - The profile: when they sleep (and how much later at the weekend), how much of their free time they spend in
//    their own room, the rooms they like, a handful of things they do (in words), and notes for the AI.
//  - Each day is built from it, a little differently every day (a hash of the day): meals, free time in their room or
//    in the common rooms, what they are doing. Their favourite things come up often but not always: about 40% of the
//    time it is something ordinary (the phone, a nap, tidying up), and the same thing never three hours running.
//  - Hours can be set by hand (an override: asleep, in their room, out in the house) on the editor's strip.
//  - Dinner together is a rule of the house (on by default): whoever is home and awake eats with the others.
//
// Pure logic (no SillyTavern), tested on its own; the hook into upstream's routine in life.ts, the editor in lifeui.ts.
import { looseJson } from './jsonfix.js';
import { guessAfford, isAfford } from './furnish.js'; // [expanded] 0.2.0.7
export const lifexOf = (g) => {
    const l = (g.lifex ??= { profiles: {}, dinner: true, dinnerAt: 20 });
    l.profiles ??= {};
    l.dinner ??= true;
    l.dinnerAt ??= 20;
    return l;
};
export const profileOf = (g, avatar) => lifexOf(g).profiles[avatar] ?? null;
// FNV-1a with MurmurHash's final mix (similar strings, like one hour and the next, give unrelated numbers)
const H = (s) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
};
const clampH = (v, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? ((n % 24) + 24) % 24 : d; };
const clamp = (v, lo, hi, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
/** A profile from anything (a model's JSON, an old save): sane values, known rooms only. */
export function cleanProfile(x, rooms = [], src = 'hand') {
    const known = new Set(rooms);
    const where = (v) => { const s = String(v ?? '').trim(); return s === 'room' || s === 'common' ? s : known.has(s) ? s : 'common'; };
    const acts = (Array.isArray(x?.acts) ? x.acts : []).map((a) => (typeof a === 'string' ? { text: a, where: 'room' } : { text: String(a?.text ?? ''), where: where(a?.where), ...(isAfford(a?.needs) ? { needs: a.needs } : {}) }))
        .map((a) => ({ ...a, text: a.text.replace(/\s+/g, ' ').trim().slice(0, 60) })).filter((a) => a.text).slice(0, 8);
    return {
        bed: clampH(x?.bed, 23), wake: clampH(x?.wake, 8), weekend: clamp(x?.weekend, 0, 3, 1), social: clamp(x?.social, 0, 100, 50),
        rooms: (Array.isArray(x?.rooms) ? x.rooms : []).map(String).filter((r) => known.has(r)).slice(0, 4),
        acts, ooc: String(x?.ooc ?? '').trim().slice(0, 400), src: x?.src ?? src, ...(x?.ov ? { ov: x.ov } : {}),
    };
}
/* ---------- a guess from the card, with no model ---------- */
const KEY = [
    [/\b(gam(er|ing)|video ?games?|streamer|геймер|игр)/i, { add: [{ text: 'playing video games', where: 'room' }] }],
    [/\b(night owl|nocturnal|insomnia|stays up|hikikomori|neet|ночн|сова|бессонн|хикк)/i, { bed: 3, wake: 11 }],
    [/\b(early riser|morning person|disciplined|athlete|runner|nurse|жаворон|спортсмен)/i, { bed: 22, wake: 6 }],
    [/\b(shy|introvert|quiet|reserved|loner|withdrawn|hikikomori|застенчив|интроверт|тих|замкнут)/i, { social: 20 }],
    [/\b(outgoing|extrovert|cheerful|energetic|bubbly|social butterfly|party|общительн|экстраверт|весел|энергичн)/i, { social: 78 }],
    [/\b(gym|fitness|sport|athlet|work ?out|спорт|качал|фитнес)/i, { rooms: ['gym'], add: [{ text: 'working out', where: 'gym' }] }],
    [/\b(swim|beach|pool|плава|бассейн)/i, { rooms: ['pool'], add: [{ text: 'swimming', where: 'pool' }] }],
    [/\b(cook|bak(e|ing)|chef|готов|повар|выпечк)/i, { rooms: ['kitchen'], add: [{ text: 'cooking something', where: 'kitchen' }] }],
    [/\b(read(s|ing|er)?|books?|novel|manga|чита|книг|манг)/i, { add: [{ text: 'reading', where: 'room' }] }],
    [/\b(music|guitar|piano|sing|музык|гитар|пиани|поёт|пени)/i, { add: [{ text: 'playing music', where: 'room' }] }],
    [/\b(draw|paint|art(ist)?|sketch|рису|художн)/i, { add: [{ text: 'drawing', where: 'room' }] }],
    [/\b(tv|series|anime|movies?|сериал|аниме|фильм)/i, { add: [{ text: 'watching something on TV', where: 'living' }] }],
    [/\b(study|student|university|college|учёб|студент|универ)/i, { add: [{ text: 'studying', where: 'room' }] }],
];
/** A rough profile from the card's description (when there is no model, or it failed). */
export function guessProfile(text, rooms) {
    const p = { bed: 23, wake: 8, weekend: 1, social: 50, rooms: [], acts: [], ooc: '' };
    for (const [re, v] of KEY)
        if (re.test(text)) {
            const { add, rooms: rs, ...rest } = v;
            Object.assign(p, rest);
            if (rs)
                p.rooms.push(...rs);
            if (add)
                p.acts.push(...add);
        }
    p.acts.push({ text: 'scrolling on the phone', where: 'room' }, { text: 'listening to music', where: 'room' });
    p.rooms = [...new Set(p.rooms)];
    return cleanProfile(p, rooms, 'rules');
}
/* ---------- asking a model ---------- */
export const PROFILE_SYSTEM = 'You design daily habits for characters of a slice-of-life story set in a shared house. Fiction; answer with JSON only.';
export function profilePrompt(name, card, rooms) {
    return `Character: ${name}
${card.replace(/\s+/g, ' ').trim().slice(0, 1800)}

Rooms of the house they can spend time in: ${rooms.map(r => `${r.id} (${r.name})`).join(', ')}. Everyone also has their own bedroom ("room").

Write ${name}'s habits at home as JSON:
{"bed": hour 0-23 they go to sleep (after midnight is fine, e.g. 2), "wake": hour they get up, "weekend": how many hours later at the weekend (0-3),
 "social": 0-100 (0 = keeps to their room, 100 = always where the others are), "rooms": [up to 3 room ids they like],
 "acts": [4 to 6 things they do at home: {"text": "a few words", "where": "room" | "common" | a room id, "needs": only when it needs a thing, one of watch (a TV), game (a console or a computer), game2 (playing with someone), work (a computer or a desk), music (an instrument), read (books), exercise, craft, bath}]}
Rules for "acts": at most two may be about their main hobby or trait; the rest must be ordinary, varied things anyone does (on the phone, a nap, tidying up, a call with family, a snack, doing nothing in particular). Do not make every habit about one interest. Use the card for the times: a night owl goes to bed late, an early riser early. JSON only.`;
}
/** The model's answer → a profile (null when it is not usable). */
export function parseProfile(text, rooms) {
    const x = looseJson(text);
    if (typeof x !== 'object' || !x)
        return null;
    const p = cleanProfile(x, rooms, 'gen');
    return p.acts.length ? p : null;
}
const OUT_LOC = 'out';
const POOL = {
    room: ['scrolling on the phone', 'napping', 'listening to music with headphones', 'tidying up the room', 'on a call with family', 'doing nothing in particular', 'watching videos', 'lying on the bed, thinking'],
    common: ['hanging around', 'scrolling on the phone', 'having a snack', 'just sitting with a drink', 'looking out of the window', 'chatting with whoever is around'],
    kitchen: ['making tea', 'looking in the fridge', 'having a snack', 'washing up'],
    dining: ['sitting at the table with a drink', 'having a snack'],
    living: ['watching TV', 'lying on the couch', 'scrolling on the phone'],
    pool: ['swimming', 'lying by the pool'],
    gym: ['working out', 'stretching'],
    frontyard: ['getting some fresh air'],
};
export function asleepAt(p, h, weekend, late = 0) {
    const s = weekend ? p.weekend : 0;
    const bed = (p.bed + s + late) % 24, wake = (p.wake + s) % 24;
    if (bed === wake)
        return false;
    return bed < wake ? h >= bed && h < wake : h >= bed || h < wake;
}
/** The 24 hours of one day. */
export function dayPlan(p, c) {
    const r = (k) => H(`${c.avatar}|${c.day}|${k}`);
    const late = r('late') < 0.3 ? 1 : 0; // now and then they stay up an hour longer
    const ov = (c.weekend ? p.ov?.we : p.ov?.wd) ?? {};
    const wake = (p.wake + (c.weekend ? p.weekend : 0)) % 24;
    const out = [];
    let prev = null, runs = 0;
    const rooms = c.common.length ? c.common : [];
    const pickRoom = (h) => {
        if (!rooms.length)
            return c.own;
        const weights = rooms.map(id => (p.rooms.includes(id) ? 3 : 1));
        let x = r(`room${h}`) * weights.reduce((a, b) => a + b, 0);
        for (let i = 0; i < rooms.length; i++) {
            x -= weights[i];
            if (x < 0)
                return rooms[i];
        }
        return rooms[rooms.length - 1];
    };
    // [expanded] 0.2.0.7: things they like doing that need a thing (a console, the PC, a TV) are done where that thing
    // is: here if it is here, else they go there (their own room first). Homebodies do not always go: the less social,
    // the more often they stay and do something they can do here instead.
    const need = (a) => a.needs ?? guessAfford(a.text);
    const doable = (loc, n) => !n || !c.has || c.has(loc, n);
    const pickAct = (h, loc, inRoom, last) => {
        const fits = p.acts.filter(a => (inRoom ? a.where === 'room' : a.where === 'common' || a.where === loc) && a.text !== last);
        if (r(`own${h}`) < 0.6) {
            const here = fits.filter(a => doable(loc, need(a)));
            const moves = c.can && r(`mv${h}`) < 0.35 + 0.6 * p.social / 100
                ? p.acts.filter(a => a.text !== last && !here.includes(a) && need(a) && !doable(loc, need(a)) && c.can(need(a)).length) : [];
            const cands = [...here, ...moves];
            if (cands.length) {
                const a = cands[Math.floor(r(`act${h}`) * cands.length)];
                return here.includes(a) ? { text: a.text } : { text: a.text, loc: c.can(need(a))[0] };
            }
        }
        const pool = (inRoom ? POOL.room : POOL[loc] ?? POOL.common).filter(t => t !== last && (inRoom || doable(loc, guessAfford(t))));
        return { text: pool[Math.floor(r(`gen${h}`) * pool.length)] ?? 'hanging around' };
    };
    for (let h = 0; h < 24; h++) {
        const forced = ov[String(h)];
        let s;
        if (forced === 'sleep' || (!forced && asleepAt(p, h, c.weekend, late)))
            s = { kind: 'sleep', loc: c.own, act: 'asleep', asleep: true };
        else if (forced !== 'room' && forced !== 'common' && c.out?.(h))
            s = { kind: 'out', loc: OUT_LOC, act: 'out of the house', asleep: false };
        else if (!forced && c.dinner && h === c.dinnerAt && (c.dining || c.kitchen))
            s = { kind: 'meal', loc: (c.dining || c.kitchen), act: 'having dinner with the house', asleep: false };
        else if (!forced && h === wake && c.kitchen && r('bf') < 0.6)
            s = { kind: 'meal', loc: c.kitchen, act: 'having breakfast', asleep: false };
        else if (!forced && h === 13 && c.kitchen && r('lunch') < 0.4)
            s = { kind: 'meal', loc: c.kitchen, act: 'having lunch', asleep: false };
        else if (!forced && !c.dinner && (h === 19 || h === 20) && c.kitchen && r(`din${h}`) < 0.35)
            s = { kind: 'meal', loc: c.kitchen, act: 'making dinner', asleep: false };
        else {
            // free time: often they stay where they were; else their room or a common room, by how social they are
            const stay = prev && (prev.kind === 'room' || prev.kind === 'common') && !forced && r(`stay${h}`) < 0.45;
            const inRoom = forced === 'room' ? true : forced === 'common' ? false : stay ? prev.kind === 'room' : r(`where${h}`) < 0.15 + 0.7 * (1 - p.social / 100);
            let loc = stay ? prev.loc : inRoom ? c.own : pickRoom(h);
            const keep = stay && runs < 2 && r(`same${h}`) < 0.5; // the same thing at most two hours running
            let act = prev?.act ?? '';
            if (!keep) {
                const pa = pickAct(h, loc, inRoom, prev?.act ?? '');
                act = pa.text;
                if (pa.loc)
                    loc = pa.loc;
            } // [expanded] gone where the thing is
            s = { kind: loc === c.own ? 'room' : 'common', loc, act, asleep: false };
        }
        runs = prev && s.act === prev.act ? runs + 1 : 1;
        out.push(s);
        prev = s;
    }
    return out;
}
/* ---------- the whole house: drawn to friends, away from enemies ---------- */
export const PULL = 45, PUSH = -30; // pair values: close friends draw each other, tense ones keep apart
export function adjustHouse(plans, profiles, value, c) {
    const out = Object.fromEntries(Object.entries(plans).map(([a, d]) => [a, d.map(x => ({ ...x }))]));
    const who = Object.keys(out).sort();
    const r = (a, k) => H(`${a}|${c.day}|${k}`);
    const byHand = (a, h) => !!(c.weekend ? profiles[a]?.ov?.we : profiles[a]?.ov?.wd)?.[String(h)];
    const free = (a, h) => { const s = out[a][h]; return !s.asleep && (s.kind === 'room' || s.kind === 'common') && !byHand(a, h); };
    const awakeIn = (b, h, loc) => out[b][h].loc === loc && !out[b][h].asleep;
    for (let h = 0; h < 24; h++) {
        // away from people they cannot stand
        for (const a of who) {
            const s = out[a][h];
            if (s.kind !== 'common' || !free(a, h))
                continue;
            const foe = who.find(b => b !== a && awakeIn(b, h, s.loc) && value(a, b) <= PUSH);
            if (!foe)
                continue;
            const aWas = h > 0 && out[a][h - 1].loc === s.loc, bWas = h > 0 && out[foe][h - 1].loc === s.loc;
            let leaves = aWas && !bWas ? foe : !aWas && bWas ? a : (profiles[a]?.social ?? 50) <= (profiles[foe]?.social ?? 50) ? a : foe;
            if (!free(leaves, h))
                leaves = leaves === a ? foe : a;
            if (!free(leaves, h))
                continue;
            const was = out[leaves][h];
            const elsewhere = c.common.filter(x => x !== was.loc && !who.some(b => b !== leaves && awakeIn(b, h, x) && value(leaves, b) <= PUSH));
            out[leaves][h] = !elsewhere.length || r(leaves, `flee${h}`) < 0.6
                ? { kind: 'room', loc: c.own[leaves], act: 'keeping to their room', asleep: false }
                : { kind: 'common', loc: elsewhere[Math.floor(r(leaves, `alt${h}`) * elsewhere.length)], act: was.act, asleep: false };
        }
        // drawn to close friends who are out in the house (unless someone they cannot stand is there)
        for (const a of who) {
            const s = out[a][h];
            if (s.kind !== 'room' || !free(a, h))
                continue;
            const friend = who.find(b => b !== a && (out[b][h].kind === 'common' || out[b][h].kind === 'meal') && value(a, b) >= PULL
                && !who.some(x => x !== a && awakeIn(x, h, out[b][h].loc) && value(a, x) <= PUSH));
            if (!friend || r(a, `pull${h}`) >= 0.2 + 0.4 * (profiles[a]?.social ?? 50) / 100)
                continue;
            out[a][h] = { kind: 'common', loc: out[friend][h].loc, act: c.names[friend] ? `keeping ${c.names[friend]} company` : 'with a friend', asleep: false };
        }
    }
    return out;
}
/** Sets one hour by hand (null: back to the profile). */
export function setHour(p, weekend, h, k) {
    const ov = (p.ov ??= {});
    const m = (weekend ? (ov.we ??= {}) : (ov.wd ??= {}));
    if (k)
        m[String(h)] = k;
    else
        delete m[String(h)];
    p.src = 'hand';
}
export const CYCLE = [null, 'sleep', 'room', 'common'];
