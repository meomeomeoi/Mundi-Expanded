// [expanded] The "Me" app (Mundi Expanded 0.2.1-12): your skills, your stories and projects (and who has read them),
// the chores' rota and how messy the rooms are, the week ahead, and the settings of your own life. The week is also a
// tab of the Calendar.
import { esc, game, notify, saveGame, toast, cfg } from '../core/store.js';
import { getWorld, isScenario, type WorldDef } from '../core/world.js';
import { thumb, personaName } from '../st/bridge.js';
import { icon } from './icons.js';
import { ACT, INPUT } from './reg.js';
import { YOU } from '../sim/bonds.js';
import { weekday } from '../sim/time.js';
import * as R from '../sim/ownrun.js';
import * as O from '../sim/own.js';
import type { Save } from '../core/store.js';

export const ME = { tab: 'skills' as 'skills' | 'works' | 'chores' | 'week' | 'set', open: '' as string, setup: null as null | Partial<Record<O.Skill, number>>, busy: false };
const nm = (g: Save, a: string) => (a === YOU ? 'You' : g.cast[a]?.name ?? a);
const seg = (k: string, cur: string, opts: [string, string][]) => `<div class="mu-bd-seg">${opts.map(([v, l]) => `<button class="${cur === v ? 'is-on' : ''}" data-act="me-set" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
const bar = (p: number) => `<span class="mu-bond"><i style="width:${Math.round(Math.max(0, Math.min(1, p)) * 100)}%"></i></span>`;

export function meApp(g: Save, w: WorldDef, head: string): string {
    const tabs = ([['skills', 'Skills'], ['works', 'Works'], ['chores', 'Chores'], ['week', 'Week'], ['set', 'Settings']] as const)
        .map(([id, l]) => `<button class="mu-chip ${ME.tab === id ? 'is-on' : ''}" data-act="me-tab" data-v="${id}">${l}</button>`).join('');
    const body = ME.tab === 'skills' ? skillsHtml(g) : ME.tab === 'works' ? worksHtml(g) : ME.tab === 'chores' ? choresHtml(g, w) : ME.tab === 'week' ? weekHtml(g) : setHtml(g);
    return `${head}<div class="mu-ph-body mu-me"><div class="mu-chips mu-cal-tabs">${tabs}</div>${body}</div>`;
}

function skillsHtml(g: Save): string {
    const x = R.ownOf(g);
    if (x.setup !== 'done') {
        ME.setup ??= Object.fromEntries(O.SKILL_LIST.map(s => [s, Math.max(1, O.seedFromTraits((g.player as any).traits)[s] ?? 1)]));
        return `<section><h4>What ${esc(personaName())} is good at</h4><small class="mu-muted">Start where your persona would be (1 = a beginner, 10 = a master). The traits picked when the persona was made are already in; "Read my persona" asks the mechanics model once.</small>
            ${O.SKILL_LIST.map(s => `<div class="mu-me-skill"><span>${O.SKILLS[s].icon} ${O.SKILLS[s].name}</span><input type="range" min="1" max="10" step="1" value="${ME.setup![s] ?? 1}" data-input="me-lv" data-k="${s}"><b>${ME.setup![s] ?? 1}</b></div>`).join('')}
            <div class="mu-row"><button data-act="me-read" ${ME.busy ? 'aria-disabled="true"' : ''}>${icon('sparkles')}<span>${ME.busy ? 'Reading…' : 'Read my persona'}</span></button><button class="mu-primary" data-act="me-save">${icon('check')}<span>Save</span></button></div></section>`;
    }
    return `<section><h4>Skills</h4>${O.SKILL_LIST.map(s => { const xp = R.xpOf(g, s); const l = O.levelOf(xp);
        const boost = O.xpBoost((g.player as any).traits, s);
        return `<div class="mu-me-skill"><span>${O.SKILLS[s].icon} ${O.SKILLS[s].name}</span>${bar(O.toNext(xp))}<b>${l}</b><small class="mu-muted">${O.LEVEL_WORDS[l]}${boost > 1 ? ` · +${Math.round((boost - 1) * 100)}% (interests)` : ''}</small></div>`; }).join('')}
        <small class="mu-muted">They grow with what you do: a mini-game played well gives more than just doing it. The scene is told how good you are. Pace: Settings.</small></section>`;
}
function worksHtml(g: Save): string {
    const list = R.ownOf(g).books.slice().reverse();
    if (!list.length) return '<p class="mu-muted">Nothing yet. Sit down at a desk or a computer: Write, or Work on your coding project.</p>';
    const mates = (Object.values(g.cast) as any[]).filter(r => r.met && !r.guest);
    return list.map(b => `<section class="mu-me-work"><h4>${b.kind === 'writing' ? '✍️' : '💻'} <span data-notr>${esc(b.title || 'Untitled')}</span></h4>
        <small class="mu-muted" data-notr>${esc(b.idea)}${b.genre ? ` · ${esc(b.genre)}` : ''}</small>
        <div class="mu-me-skill"><span>${b.done}/${b.size}</span>${bar(b.done / b.size)}<b>${esc(b.verdict ?? (b.done ? R.judgeSoFar(g, b) : ''))}</b></div>
        ${b.parts.length ? `<button class="mu-ghost" data-act="me-open" data-id="${esc(b.id)}">${ME.open === b.id ? 'Hide' : b.kind === 'writing' ? 'Read it' : 'The work so far'}</button>${ME.open === b.id ? `<div class="mu-me-text" data-notr>${b.parts.map(p => `<p>${esc(p)}</p>`).join('')}</div>` : ''}` : ''}
        ${b.parts.length && mates.length ? `<div class="mu-chips"><span class="mu-muted">Let them read it:</span>${mates.map(r => `<button class="mu-chip ${(b.readers?.[r.avatar] ?? 0) > 0 ? 'is-on' : ''}" data-act="me-lend" data-id="${esc(b.id)}" data-who="${esc(r.avatar)}"><img src="${esc(thumb(r.avatar))}" alt="">${esc(r.name)}</button>`).join('')}</div>` : ''}
        ${Object.entries(b.readers ?? {}).some(([, v]) => v < 0) ? `<small class="mu-muted">Someone has been reading it without asking…</small>` : ''}</section>`).join('');
}
function choresHtml(g: Save, w: WorldDef): string {
    const x = R.ownOf(g); const c = R.ocfg(g);
    if (c.chores === 'off') return '<p class="mu-muted">Chores are off (Settings).</p>';
    const room = (id: string) => (w.places.find(p => p.id === id)?.name ?? '');
    const messy = Object.entries(x.chores.mess).filter(([id, v]) => v >= 20 && !id.startsWith('home:') && room(id)).sort((a, b) => b[1] - a[1]);
    return `<section><h4>This week</h4>${O.CHORES.map(ch => { const who = x.chores.rota[ch.id]; const n = x.chores.done[ch.id] ?? 0;
        return `<div class="mu-me-chore ${who === YOU ? 'is-you' : ''}">${who && who !== YOU ? `<img src="${esc(thumb(who))}" alt="">` : '<span>🫵</span>'}<span><b>${ch.name}</b><small>${who ? esc(nm(g, who)) : '—'} · done ${n}${ch.per >= 7 ? ' (daily)' : `/${ch.per} this week`}</small></span></div>`; }).join('')}
        <small class="mu-muted">The rota changes every week. Do yours in the room it belongs to (an action there); doing someone else's is a favour. ${c.chores === 'serious' ? 'Skipping is noticed, and someone tidy will complain.' : 'Gentle: a reminder in the morning, and the mess shows.'}</small></section>
        ${messy.length ? `<section><h4>The mess</h4>${messy.map(([id, v]) => `<div class="mu-me-skill"><span data-notr>${esc(room(id))}</span>${bar(v / 100)}<b>${O.messWord(v)}</b></div>`).join('')}</section>` : ''}`;
}
export function weekHtml(g: Save): string {
    const up = R.upcoming(g, 8); const x = R.ownOf(g);
    const days = [...new Set(up.map(u => u.day))];
    return `<section><h4>The week ahead</h4>${days.length ? days.map(d => `<div class="mu-me-day"><b>${d === g.day ? 'Today' : d === g.day + 1 ? 'Tomorrow' : weekday(d)}</b>${up.filter(u => u.day === d).map(u => `<span>${u.who ? `<img src="${esc(thumb(u.who))}" alt="">` : ''}<span data-notr>${esc(u.text)}</span></span>`).join('')}</div>`).join('') : '<p class="mu-muted">Nothing special this week.</p>'}</section>
        <section><h4>The house's evenings</h4>${x.cal.events.map(e => `<label class="mu-check"><input type="checkbox" data-act="me-ev" data-id="${esc(e.id)}" ${e.on ? 'checked' : ''}><span>${esc(e.name)}<small>${weekday(e.wd + 1)}s at ${String(e.hour).padStart(2, '0')}:00: the house makes a plan of it, and someone asks you along.</small></span></label>`).join('')}</section>`;
}
function setHtml(g: Save): string {
    const c = R.ocfg(g); const sd = Math.round((g as any).cfg?.seasonDays ?? 14);
    return `<section class="mu-bd-set"><h4>Your own life</h4>
        <label class="mu-check"><input type="checkbox" data-act="me-tog" data-k="games" ${c.games ? 'checked' : ''}><span>Mini-games<small>${c.games ? 'Cooking, the guitar, cleaning, crosswords, work and study, coding, writing: play them, or just do it.' : 'Off: things are just done (by your skill and a little luck).'}</small></span></label>
        <b>How fast skills grow</b>${seg('pace', c.pace, [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast']])}
        <b>Chores</b>${seg('chores', c.chores, [['off', 'Off'], ['gentle', 'Gentle'], ['serious', 'Serious']])}
        <small class="mu-muted">Gentle: a rota, a reminder, the mess shows. Serious: skipping is noticed and complained about (yours too).</small>
        <label class="mu-check"><input type="checkbox" data-act="me-tog" data-k="calendar" ${c.calendar ? 'checked' : ''}><span>The house's calendar<small>Birthdays, exams and interviews, New Year, the golden week (the first days of summer: nobody works), the house's evenings.</small></span></label>
        <b>A season lasts</b>${seg('season', String(sd === 30 ? 30 : sd === 14 ? 14 : sd), [['14', '14 days (Mundi)'], ['30', 'A month']])}
        <label class="mu-check"><input type="checkbox" data-act="me-tog" data-k="digest" ${c.digest ? 'checked' : ''}><span>While you were away<small>Coming home after a while, or in the morning: up to three hints of what happened (not more often than every few hours).</small></span></label>
        <label class="mu-check"><input type="checkbox" data-act="me-tog" data-k="sound" ${c.sound ? 'checked' : ''}><span>Sound in the mini-games<small>The guitar's strings.</small></span></label></section>`;
}
void isScenario; void getWorld;

Object.assign(ACT, {
    'me-tab': (el) => { ME.tab = el.dataset.v as any; notify(); },
    'me-open': (el) => { ME.open = ME.open === el.dataset.id ? '' : el.dataset.id!; notify(); },
    'me-lend': (el) => { const g = game(); if (!g) return; const b = R.ownOf(g).books.find(x => x.id === el.dataset.id); if (!b) return; const a = el.dataset.who!;
        (b.readers ??= {})[a] = (b.readers[a] ?? 0) > 0 ? 0 : g.day; if (!b.readers[a]) delete b.readers[a]; else toast(`${g.cast[a]?.name} has your ${b.kind === 'writing' ? 'story' : 'project'}: the scene will know what they think.`, 'success');
        saveGame(); void import('../sim/prompt.js').then(m => m.refreshPrompt()); notify(); },
    'me-ev': (el) => { const g = game(); if (!g) return; const e = R.ownOf(g).cal.events.find(x => x.id === el.dataset.id); if (e) { e.on = !e.on; saveGame(); notify(); } },
    'me-tog': (el) => { const g = game(); if (!g) return; const k = el.dataset.k as keyof R.OwnCfg; const c = R.ownOf(g).cfg as any; c[k] = !(R.ocfg(g) as any)[k]; saveGame(); notify(); },
    'me-set': (el) => { const g = game(); if (!g) return; const k = el.dataset.k!; if (k === 'season') { cfg(g).seasonDays = Number(el.dataset.v) as any; } else (R.ownOf(g).cfg as any)[k] = el.dataset.v; saveGame(); notify(); },
    'me-read': async () => { const g = game(); if (!g || ME.busy) return; ME.busy = true; notify();
        try {
            const { personaText } = await import('./beats.js'); const { bgAsk } = await import('../sim/regulator.js'); const { looseJson } = await import('../sim/jsonfix.js');
            const raw = await bgAsk(`${personaName()}: ${personaText().replace(/\s+/g, ' ').slice(0, 1500)}\nTraits: ${O.traitsLine((g.player as any).traits) || 'none given'}.\nHow good is ${personaName()} at each, 1-10 (1 = never does it; most people are 1-3 at most things, a hobby 4-6, a profession 6-8)? cooking, music (the guitar), writing, coding, study, work, fitness. JSON only: {"cooking": 1, ...}`, 300, 'You read a character description and rate skills. JSON only.');
            const j = looseJson(raw) as any; if (j && typeof j === 'object') for (const s of O.SKILL_LIST) { const v = Math.round(Number(j[s])); if (v >= 1 && v <= 10) (ME.setup ??= {})[s] = v; }
            else toast('The mechanics model gave nothing usable: set them by hand.', 'warn');
        } catch { toast('Could not read the persona: set them by hand.', 'warn'); }
        ME.busy = false; notify(); },
    'me-save': () => { const g = game(); if (!g) return; R.seedSkills(g, ME.setup ?? {}); ME.setup = null; saveGame(); void import('../sim/prompt.js').then(m => m.refreshPrompt()); notify(); },
});
Object.assign(INPUT, { 'me-lv': (el: HTMLInputElement) => { (ME.setup ??= {})[el.dataset.k as O.Skill] = Number(el.value); const b = el.nextElementSibling; if (b) b.textContent = el.value; } });
