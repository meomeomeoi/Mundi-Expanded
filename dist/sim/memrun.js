// [expanded] 0.2.1-14: Memory in the game (the rules are in memory.ts). One AI call each night (after the
// relationships): what happened between you and each of them today and how much it weighs, how much the house's own
// moments weigh, what they learned about each other, and (rarely, with brakes) a step in who they are becoming.
// Every few days a second call folds the landmarks into the stories so far. A refusal or a reply in the wrong form
// is never taken for "nothing happened": it throws, and the night shows "Try again".
import { saveGame } from '../core/store.js';
import { isScenario } from '../core/world.js';
import { chat, personaName, charOf } from '../st/bridge.js';
import { bgAsk } from './regulator.js';
import { dayStart } from './diary.js';
import { isMinor } from './family.js';
import { placeOf } from './places.js';
import { presentNotes } from './lifehooks.js';
import { bondsOf, addFact, personalityOf, YOU } from './bonds.js';
import * as M from './memory.js';
const G = (g) => g;
export function memOf(g) {
    const x = (g.memx ??= {});
    x.cfg = { ...M.DEFAULT, ...(x.cfg ?? {}) };
    x.arc ??= {};
    x.know ??= {};
    x.story ??= {};
    x.own ??= {};
    x.seq ??= 0;
    return x;
}
export const mcfg = (g) => ({ ...M.DEFAULT, ...(g.memx?.cfg ?? {}) });
export const newId = (x, p) => `${p}${++x.seq}`;
export const knowKey = (who, about) => `${who}>${about}`;
const clean = (t) => String(t ?? '').replace(/<(think|thinking|reasoning)>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const people = (g) => Object.values(g.cast).filter(r => r.met && !r.guest && !isMinor(g, r.avatar));
const cardOf = (a, max = 300) => { const c = charOf(a); return personalityOf(c?.description ?? c?.data?.description ?? '', c?.personality ?? c?.data?.personality ?? '', max).replace(/\s+/g, ' '); };
/** A fold subject: 'you|avatar' (you and them) or 'own|avatar' (their own story). */
const foldedIn = (f, subj) => f.foldedIn?.includes(subj) ?? false;
/* ---------- the day, for the reader ---------- */
function dayConvo(g, w, range) {
    const me = personaName();
    const msgs = chat().slice(range?.start ?? dayStart(g), range?.end).filter((m) => clean(m.mes) && !m.extra?.mundi_diary);
    let key = '';
    const lines = [];
    const spoke = new Set();
    const around = {};
    const byName = (n) => people(g).find(r => r.name === n)?.avatar;
    for (const m of msgs) {
        const x = m.extra;
        const k = x?.mundi_here ? `${x.mundi_loc}|${[...x.mundi_here].sort().join(',')}` : '';
        if (k && k !== key) {
            key = k;
            const loc = String(x.mundi_loc);
            const room = placeOf(g, w, loc)?.name ?? (loc.startsWith('home:') ? 'a bedroom' : loc.replace(/^out:/, ''));
            lines.push(`[In ${String(room).toLowerCase()}: ${[...x.mundi_here.map((a) => g.cast[a]?.name ?? a), me].join(', ')}]`);
        }
        lines.push(`${m.is_user ? me : m.extra?.mundi_narrator ? 'Narrator' : m.name}: ${clean(m.mes).slice(0, 400)}`);
        const a = !m.is_user ? byName(String(m.name ?? '')) : undefined;
        if (a) {
            spoke.add(a);
            for (const h of (x?.mundi_here ?? []))
                (around[a] ??= new Set()).add(h);
        }
    }
    let text = lines.slice(-90).join('\n');
    if (text.length > 12000)
        text = text.slice(-12000);
    return { text, spoke: [...spoke], around };
}
/* ---------- the night ---------- */
export const MEM_SYSTEM = 'You keep the long memory of an interactive fiction (a role-play story between consenting adults). You note plainly what happened and what it meant, without judging or softening it, and you never invent anything that is not in what you are given. You answer only in the requested line format.';
export async function memNight(g, w, day, range) {
    if (!isScenario(w))
        return [];
    const x = memOf(g);
    const c = x.cfg;
    if (!c.on || x.lastNight === day)
        return [];
    const me = personaName();
    const folk = people(g);
    if (!folk.length) {
        x.lastNight = day;
        return [];
    }
    const nm = (a) => (a === YOU ? me : g.cast[a]?.name ?? a);
    const find = (q) => {
        const t = q.trim().toLowerCase();
        if (!t)
            return null;
        if (t === me.toLowerCase() || t === '{{user}}' || t === 'the player' || t === 'you')
            return YOU;
        const hit = folk.filter(r => r.name.toLowerCase() === t || r.name.toLowerCase().split(/\s+/)[0] === t.split(/\s+/)[0]);
        return hit.length === 1 ? hit[0].avatar : null;
    };
    const d = dayConvo(g, w, range);
    const b = bondsOf(G(g));
    const tonight = b.facts.filter(f => f.kind === 'episode' && f.day === day && !f.who.includes(YOU) && f.w === undefined);
    const known = Object.entries(x.know).filter(([k]) => { const [a, o] = k.split('>'); return d.spoke.includes(a) || d.spoke.includes(o); })
        .flatMap(([k, ns]) => ns.map(n => ({ k, n }))).slice(-40);
    const lastStep = (a) => x.arc[a]?.at(-1)?.day;
    const firstDay = (a) => Math.min(...b.facts.filter(f => f.who.includes(a)).map(f => f.day), day);
    const may = folk.filter(r => d.spoke.includes(r.avatar) && M.mayChange(lastStep(r.avatar), day, c.arc, true) && (lastStep(r.avatar) !== undefined || day - firstDay(r.avatar) >= c.arc));
    if (!d.text.trim() && !tonight.length) {
        x.lastNight = day;
        return [];
    }
    const prompt = [
        `Day ${day} of the story has just ended. ${me} is the player.`,
        '', 'The people:', ...folk.map(r => `- ${r.name}: ${cardOf(r.avatar, 260) || '(no description)'}${x.arc[r.avatar]?.length ? ` Who they have become: ${x.arc[r.avatar].slice(-2).map(s => s.text).join(' ')}` : ''}`),
        '', d.text.trim() ? `What was said today (the [In …] notes say who was in the room):\n${d.text}` : 'No scenes with the player today.',
        '', '1) MOMENTS between ' + me + ' and one of them today that are worth remembering, each with a weight:',
        '1 a passing moment · 2 a nice or annoying moment · 3 it matters to them · 4 it changes something between them (a first, a promise, a real fight, a secret shared) · 5 unforgettable (a confession, a betrayal, a life event).',
        'Weigh honestly: most moments are 1–2; a 4 or 5 is rare. Only what really happened in the conversation.',
        `MOMENT | Name | weight | what happened, one short sentence in the past tense`,
        ...(tonight.length ? ['', '2) The house tonight (moments between the others). Give each a weight on the same scale:', ...tonight.map((f, i) => `${i + 1}. ${f.who.map(nm).join(' & ')}: ${f.text}`), 'RATE | number | weight'] : []),
        '', `3) What someone LEARNED today about someone else (a lasting fact: their job, a fear, a taste, their past, a plan; not a passing mood). ${me} counts both ways. If it updates something already known, say which one it replaces.`,
        ...(known.length ? ['Already known:', ...known.map(({ k, n }) => { const [a, o] = k.split('>'); return `${n.id}: ${nm(a)} knows about ${nm(o)}: ${n.text}`; })] : []),
        'KNOWS | who knows | about whom | the fact | replaces k12 (optional)',
        ...(may.length ? ['', `4) Rarely: has one of them CHANGED as a person because of what happened (lately, not just today)? Only ${may.map(r => r.name).join(', ')} may. A small, earned step that grows out of what happened; never against who they are at heart (their card). Most nights: none.`, 'CHANGE | Name | how they have changed, one sentence'] : []),
        '', 'Write each sentence in the language the conversation is written in (English if there was none). One item per line, exactly in these forms, nothing else. If there is nothing at all, write NONE.',
    ].join('\n');
    const raw = await bgAsk(prompt, 2500, MEM_SYSTEM);
    const o = M.parseMemNight(raw, find);
    if (!M.answered(o))
        throw new Error(`the model did not answer in the asked form${raw ? ` (it said: "${clean(raw).slice(0, 80)}…")` : ''}`);
    const out = [];
    for (const m of o.moments) {
        if (m.who === YOU || !g.cast[m.who])
            continue;
        const seen = [...(d.around[m.who] ?? [])].filter(a => a !== m.who);
        const f = addFact(G(g), [YOU, m.who], m.text, 'episode', 'scene', undefined, { seen: [YOU, ...seen] });
        if (f) {
            f.w = m.w;
            if (m.w >= c.landmark)
                out.push(`${nm(m.who)}: ${m.text}`);
        }
    }
    for (const r of o.rates) {
        const f = tonight[r.i];
        if (f)
            f.w = r.w;
    }
    for (const k of o.knows) {
        const key = knowKey(k.who, k.about);
        const list = (x.know[key] ??= []);
        const old = k.replaces ? list.find(n => n.id === k.replaces) : null;
        if (old) {
            old.text = k.text;
            old.day = day;
            continue;
        }
        if (!list.some(n => n.text.toLowerCase() === k.text.toLowerCase()))
            list.push({ id: newId(x, 'k'), day, text: k.text });
    }
    for (const ch of o.changes) {
        if (!may.some(r => r.avatar === ch.who))
            continue;
        // the brake: something that weighed (3+) since their last step
        const since = lastStep(ch.who) ?? -1;
        const evidence = b.facts.some(f => f.who.includes(ch.who) && f.day > since && M.weightOf(f) >= 3);
        // and a first step only once there is some history (as long as the brake between steps)
        if (!evidence)
            continue;
        (x.arc[ch.who] ??= []).push({ id: newId(x, 's'), day, text: ch.text, by: 'night' });
        out.push(`${nm(ch.who)} has changed a little.`);
    }
    x.lastNight = day;
    saveGame();
    return out;
}
/* ---------- folding the landmarks into the stories ---------- */
export const foldDue = (g, day) => { const x = memOf(g); return x.cfg.on && day - (x.lastFold ?? -999) >= x.cfg.every; };
/** What would go into each story now (subjects with new landmarks, or new steps for their own story). */
export function foldSubjects(g) {
    const x = memOf(g);
    const b = bondsOf(G(g));
    const out = [];
    for (const r of people(g)) {
        const a = r.avatar;
        const mine = b.facts.filter(f => f.who.includes(a) && f.who.includes(YOU) && f.who.length === 2);
        const nu = mine.filter(f => f.kind === 'episode' && M.isLandmark(f, x.cfg) && !foldedIn(f, `you|${a}`));
        if (nu.length)
            out.push({ subj: `you|${a}`, who: a, facts: nu, pinned: mine.filter(f => f.kind === 'standing') });
        const theirs = b.facts.filter(f => f.who.includes(a) && !f.who.includes(YOU));
        const nu2 = theirs.filter(f => f.kind === 'episode' && M.isLandmark(f, x.cfg) && !foldedIn(f, `own|${a}`));
        const steps = (x.arc[a] ?? []).filter(s => s.day > (x.own[a]?.day ?? -1));
        if (nu2.length || steps.length)
            out.push({ subj: `own|${a}`, who: a, facts: nu2, pinned: theirs.filter(f => f.kind === 'standing') });
    }
    return out;
}
export async function memFold(g, w, day, force = false) {
    if (!isScenario(w))
        return 0;
    const x = memOf(g);
    if (!force && !foldDue(g, day))
        return 0;
    const subs = foldSubjects(g);
    if (!subs.length) {
        x.lastFold = day;
        saveGame();
        return 0;
    }
    const me = personaName();
    const nm = (a) => (a === YOU ? me : g.cast[a]?.name ?? a);
    const fx = (f) => `(day ${f.day}) ${f.who.length > 2 || !f.who.includes(YOU) ? `${f.who.map(nm).join(' & ')}: ` : ''}${f.text}`;
    const prompt = [
        `The long memory of a story: ${me} (the player) and the people ${me} lives with. Today is day ${day}.`,
        `Write each "story so far" again in at most ${x.cfg.story} sentences: keep everything that matters from the previous version (nothing important may be lost), and fold in the new moments where they belong in time. Plain past tense, facts and what they meant to the people; no flourishes, no guesses, nothing that is not given.`,
        '',
        ...subs.map(s => {
            const prev = s.subj.startsWith('you|') ? x.story[s.who]?.text : x.own[s.who]?.text;
            const head = s.subj.startsWith('you|') ? `STORY ${nm(s.who)}: ${me} and ${nm(s.who)}` : `OWN ${nm(s.who)}: ${nm(s.who)}'s own story in the house (with the others, not with ${me})`;
            const steps = s.subj.startsWith('own|') ? (x.arc[s.who] ?? []).map(st => `(day ${st.day}) ${st.text}`) : [];
            return [`— ${head}`, `Who they are: ${cardOf(s.who, 200) || '(no description)'}`, `Previous version: ${prev || '(none yet)'}`,
                ...(s.facts.length ? [`New moments: ${s.facts.map(fx).join(' ')}`] : []),
                ...(s.pinned.length ? [`Kept word for word elsewhere (do not drop them, you may refer to them): ${s.pinned.map(f => f.text).join(' ')}`] : []),
                ...(steps.length ? [`How they have changed: ${steps.join(' ')}`] : [])].join('\n');
        }),
        '', 'Reply with one line per story, exactly:', 'STORY | Name | the story of the player and them', 'OWN | Name | their own story',
        'Write in the language the moments are written in.',
    ].join('\n');
    const raw = await bgAsk(prompt, 3000, MEM_SYSTEM);
    const find = (q) => { const t = q.trim().toLowerCase(); const hit = people(g).filter(r => r.name.toLowerCase() === t || r.name.toLowerCase().split(/\s+/)[0] === t.split(/\s+/)[0]); return hit.length === 1 ? hit[0].avatar : null; };
    const o = M.parseStories(raw, find);
    let n = 0;
    for (const s of subs) {
        const pair = s.subj.startsWith('you|');
        const text = (pair ? o.pair : o.own)[s.who];
        if (!text)
            continue;
        const book = pair ? x.story : x.own;
        const old = book[s.who];
        book[s.who] = { text, day, prev: [...(old?.prev ?? []), ...(old?.text ? [old.text] : [])].slice(-3) };
        for (const f of s.facts) {
            const fl = (f.foldedIn ??= []);
            if (!fl.includes(s.subj))
                fl.push(s.subj);
        }
        n++;
    }
    if (!n)
        throw new Error(`the model did not answer in the asked form${raw ? ` (it said: "${clean(raw).slice(0, 80)}…")` : ''}`);
    x.lastFold = day;
    saveGame();
    return n;
}
/* ---------- for the scene ---------- */
export function memLines(g, present) {
    const x = g.memx;
    if (!x)
        return [];
    const me = '{{user}}';
    const nm = (a) => (a === YOU ? me : g.cast[a]?.name ?? a);
    const out = [];
    for (const a of present) {
        const r = g.cast[a];
        if (!r)
            continue;
        const arc = x.arc?.[a] ?? [];
        if (arc.length)
            out.push(`Who ${r.name} has become in this story (on top of their card, oldest first): ${arc.map(s => `(day ${s.day}) ${s.text}`).join(' ')}`);
        if (x.story?.[a]?.text)
            out.push(`${r.name} and ${me}, the story so far: ${x.story[a].text}`);
        if (x.own?.[a]?.text)
            out.push(`${r.name}'s own story in the house so far: ${x.own[a].text}`);
        for (const o of [YOU, ...present.filter(b => b !== a)]) {
            const ns = x.know?.[knowKey(a, o)] ?? [];
            if (ns.length)
                out.push(`What ${r.name} knows about ${nm(o)}: ${ns.map(n => n.text).join('; ')}.`);
        }
        // what the others here know about you is above; what you know about them is yours (no line)
    }
    return out.length ? ['Long memory (what lasts):', ...out] : [];
}
presentNotes.push((g, w, present) => (isScenario(w) ? memLines(g, present.map(r => r.avatar)) : []));
