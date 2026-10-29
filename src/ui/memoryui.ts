// [expanded] 0.2.1-14: This Home › Memory. How much is kept (presets and each dial, with what it costs), and all of
// it, person by person, to read, fix, pin or delete: who they have become, the stories so far, the landmarks and
// the moments still fresh, and what they know about the others. You are the last word on what is remembered.
import { esc, game, notify, saveGame, toast, type Save, type Resident } from '../core/store.js';
import { getWorld, isScenario, type WorldDef } from '../core/world.js';
import { thumb, personaName } from '../st/bridge.js';
import { bondsOf, factById, removeFact, YOU, type BondFact, type GLike } from '../sim/bonds.js';
import { isMinor } from '../sim/family.js';
import { refreshPrompt } from '../sim/prompt.js';
import * as M from '../sim/memory.js';
import { memOf, memLines, memFold, newId, knowKey, type MemX } from '../sim/memrun.js';
import { icon } from './icons.js';
import { ACT, INPUT } from './reg.js';

export const MU = { who: '', busy: false };
const G = (g: Save) => g as unknown as GLike;
const people = (g: Save) => (Object.values(g.cast) as Resident[]).filter(r => r.met && !(r as any).guest && !isMinor(g, r.avatar));
const nm = (g: Save, a: string) => (a === YOU ? personaName() || 'You' : g.cast[a]?.name ?? a);
const area = (input: string, id: string, text: string, rows = 2, extra = '') => `<textarea rows="${rows}" data-input="${input}" data-id="${esc(id)}" data-focus="mem-${esc(input)}-${esc(id)}" ${extra}>${esc(text)}</textarea>`;
const del = (act: string, id: string, title = 'Delete') => `<button class="mu-ibtn mu-ghost" data-act="${act}" data-id="${esc(id)}" title="${title}" aria-label="${title}">${icon('trash')}</button>`;

function dials(g: Save, x: MemX): string {
    const c = x.cfg; const p = M.presetOf(c);
    const slider = (k: keyof M.MemCfg, label: string, min: number, max: number, unit: string, hint: string) =>
        `<label class="mu-field slider"><span>${label} · ${c[k]}${unit}</span><input type="range" min="${min}" max="${max}" step="1" value="${c[k]}" data-input="mem-cfg" data-k="${k}"><small class="mu-muted">${hint}</small></label>`;
    const all = people(g).map(r => r.avatar);
    const perScene = M.tokens(memLines(g, all).join('\n'));
    return `<section class="mu-wc-sec"><h4>How much is remembered</h4>
        <label class="mu-check"><input type="checkbox" data-input="mem-on" ${c.on ? 'checked' : ''}><span>Long memory at night<small>One AI call each night (after the relationships): moments with you and their weight, what they learned about each other, and now and then a step in who they become. Off: only what is already kept stays.</small></span></label>
        <div class="mu-bd-seg">${M.PRESETS.map(([id, label]) => `<button class="${p === id ? 'is-on' : ''}" data-act="mem-preset" data-v="${id}">${label}</button>`).join('')}${p === 'custom' ? '<button class="is-on" aria-disabled="true">Custom</button>' : ''}</div>
        <div class="mu-mem-dials">
            ${slider('diary', 'Diary days the AI reads', 1, 7, '', 'Your diary of the last days, as a story (about 150–300 tokens a day).')}
            ${slider('landmark', 'A landmark from weight', 3, 5, '', 'Moments this heavy are never forgotten (1 passing … 5 unforgettable). Lower: more landmarks.')}
            ${slider('half', 'Ordinary moments fade in', 2, 30, ' days', 'Half-life: a moment counts half as much after this; light ones go sooner, heavy ones later.')}
            ${slider('every', 'Stories so far rewritten every', 2, 14, ' days', 'Landmarks are folded into the stories (one AI call). Until then they are shown word for word.')}
            ${slider('story', 'A story so far, at most', 3, 12, ' sentences', 'Longer keeps more detail and costs more in every scene.')}
            ${slider('arc', 'A step of change at most every', 3, 30, ' days', 'Per person. A brake: people do not turn into someone else in a week.')}
        </div>
        <p class="mu-muted">Now: about <b>${perScene}</b> tokens of long memory in a scene with everyone at home (the relationships and the diary come on top). Nothing is ever dropped by itself except ordinary moments fading: what grows long, you prune below.</p>
        <div class="mu-row"><button data-act="mem-fold" ${MU.busy ? 'aria-disabled="true"' : ''}>${icon('redo')}<span>${MU.busy ? 'Writing…' : 'Bring the stories up to date now'}</span></button></div></section>`;
}

function landmarks(g: Save, x: MemX, a: string): string {
    const fs = bondsOf(G(g)).facts.filter(f => f.who.includes(a));
    const marks = fs.filter(f => M.isLandmark(f, x.cfg));
    const fresh = fs.filter(f => f.kind === 'episode' && !M.isLandmark(f, x.cfg)).slice(-12).reverse();
    const who = (f: BondFact) => f.who.filter(o => o !== a).map(o => nm(g, o)).join(' & ');
    const row = (f: BondFact, mark: boolean) => {
        const w = M.weightOf(f); const life = M.alive(w, g.day - f.day, x.cfg.half);
        return `<div class="mu-mem-item ${f.kind === 'standing' ? 'is-pin' : ''}"><small class="mu-mem-meta">day ${f.day} · with ${esc(who(f))} · ${f.kind === 'standing' ? 'pinned' : `weight ${w}`}${mark ? (f.foldedIn?.length ? ' · in a story' : '') : life >= M.SHOW ? ' · still fresh' : ' · faded'}</small>
            ${area('mem-fact', f.id, f.text)}
            <span class="mu-mem-tools">${f.kind === 'standing' ? `<button class="mu-ghost" data-act="mem-unpin" data-id="${esc(f.id)}" title="Let it be an ordinary landmark again">${icon('pin')}<span>Unpin</span></button>`
                : `<button class="mu-ghost" data-act="mem-pin" data-id="${esc(f.id)}" title="Never forgotten, always word for word">${icon('pin')}<span>Pin</span></button>${mark ? '' : `<button class="mu-ghost" data-act="mem-mark" data-id="${esc(f.id)}" title="Keep it as a landmark">${icon('star')}<span>Landmark</span></button>`}`}${del('mem-fact-del', f.id)}</span></div>`;
    };
    return `<h5>Landmarks · never forgotten (${marks.length})</h5>${marks.map(f => row(f, true)).join('') || '<p class="mu-muted">None yet. The night marks heavy moments (weight ' + x.cfg.landmark + '+); you can pin anything.</p>'}
        <details class="mu-mem-more"><summary>Ordinary moments (${fresh.length} latest)</summary>${fresh.map(f => row(f, false)).join('') || '<p class="mu-muted">None.</p>'}</details>`;
}

function person(g: Save, x: MemX, a: string): string {
    const r = g.cast[a]; if (!r) return '';
    const arc = x.arc[a] ?? []; const st = x.story[a]; const own = x.own[a];
    const knows = Object.entries(x.know).filter(([k]) => k.startsWith(`${a}>`));
    const others = [YOU, ...people(g).map(p => p.avatar).filter(o => o !== a)];
    return `<section class="mu-wc-sec mu-mem-person">
        <h4>${esc(r.name)}</h4>
        <h5>Who ${esc(r.name)} has become</h5>
        <p class="mu-muted">Steps of change, oldest first. Only added (never rewritten by the AI); the AI reads them all, on top of the card.</p>
        ${arc.map(s => `<div class="mu-mem-item"><small class="mu-mem-meta">day ${s.day}${s.by === 'you' ? ' · yours' : ''}</small>${area('mem-step', s.id, s.text)}<span class="mu-mem-tools">${del('mem-step-del', s.id)}</span></div>`).join('') || '<p class="mu-muted">No change yet.</p>'}
        <div class="mu-row"><input type="text" maxlength="300" placeholder="Add a step yourself: how they have changed" data-input="mem-step-new" data-focus="mem-step-new"><button data-act="mem-step-add">${icon('plus')}<span>Add</span></button></div>
        <h5>${esc(r.name)} and you, the story so far</h5>
        ${area('mem-story', a, st?.text ?? '', 4, 'placeholder="Written from the landmarks every few days. You can write or fix it yourself."')}
        ${st?.prev?.length ? `<small class="mu-muted">Rewritten on day ${st.day}. <button class="mu-ghost" data-act="mem-story-undo" data-id="${esc(a)}" data-v="story">${icon('undo')}<span>Back to the version before</span></button></small>` : ''}
        <h5>${esc(r.name)}'s own story in the house</h5>
        ${area('mem-own', a, own?.text ?? '', 4, 'placeholder="With the others, not with you."')}
        ${own?.prev?.length ? `<small class="mu-muted">Rewritten on day ${own.day}. <button class="mu-ghost" data-act="mem-story-undo" data-id="${esc(a)}" data-v="own">${icon('undo')}<span>Back to the version before</span></button></small>` : ''}
        ${landmarks(g, x, a)}
        <h5>What ${esc(r.name)} knows about others</h5>
        ${knows.map(([k, ns]) => `<div class="mu-mem-know"><b>About ${esc(nm(g, k.split('>')[1]))}</b>${ns.map(n => `<div class="mu-mem-item is-small">${area('mem-know', `${k}#${n.id}`, n.text, 1)}<span class="mu-mem-tools">${del('mem-know-del', `${k}#${n.id}`)}</span></div>`).join('')}</div>`).join('') || '<p class="mu-muted">Nothing yet: the night notes what they learn (a job, a fear, a plan…).</p>'}
        <div class="mu-row"><select data-input="mem-know-about">${others.map(o => `<option value="${esc(o)}" ${MK.about === o ? 'selected' : ''}>About ${esc(nm(g, o))}</option>`).join('')}</select><input type="text" maxlength="200" placeholder="Something they know" data-input="mem-know-new" data-focus="mem-know-new"><button data-act="mem-know-add">${icon('plus')}<span>Add</span></button></div>
    </section>`;
}
const MK = { about: YOU, text: '', step: '' };

export function memoryTabHtml(g: Save, w: WorldDef): string {
    if (!isScenario(w)) return '';
    const x = memOf(g); const folk = people(g);
    if (!MU.who || !folk.some(r => r.avatar === MU.who)) MU.who = folk[0]?.avatar ?? '';
    return `${dials(g, x)}
        <section class="mu-wc-sec"><h4>Everything that is kept</h4>
            <div class="mu-mem-people">${folk.map(r => `<button class="mu-chip ${MU.who === r.avatar ? 'is-on' : ''}" data-act="mem-who" data-who="${esc(r.avatar)}"><img src="${esc(thumb(r.avatar))}" alt=""><span data-notr>${esc(r.name)}</span></button>`).join('') || '<p class="mu-muted">Nobody met yet.</p>'}</div></section>
        ${MU.who ? person(g, x, MU.who) : ''}`;
}

const touch = () => { saveGame(); refreshPrompt(); };
const splitKnow = (id: string) => { const [k, n] = id.split('#'); return { k, n }; };
Object.assign(INPUT, {
    'mem-on': (el) => { const g = game(); if (!g) return; memOf(g).cfg.on = (el as HTMLInputElement).checked; touch(); notify(); },
    'mem-cfg': (el) => { const g = game(); if (!g) return; (memOf(g).cfg as any)[el.dataset.k!] = Number((el as HTMLInputElement).value); touch(); notify(); },
    'mem-fact': (el) => { const g = game(); const f = g && factById(G(g), el.dataset.id!); if (!f) return; const t = (el as HTMLTextAreaElement).value.trim(); if (t) { f.text = t; touch(); } },
    'mem-step': (el) => { const g = game(); if (!g) return; const s = Object.values(memOf(g).arc).flat().find(z => z.id === el.dataset.id); const t = (el as HTMLTextAreaElement).value.trim(); if (s && t) { s.text = t; touch(); } },
    'mem-story': (el) => { const g = game(); if (!g) return; const x = memOf(g); const a = el.dataset.id!; const t = (el as HTMLTextAreaElement).value; x.story[a] = { ...(x.story[a] ?? { day: g.day }), text: t }; touch(); },
    'mem-own': (el) => { const g = game(); if (!g) return; const x = memOf(g); const a = el.dataset.id!; const t = (el as HTMLTextAreaElement).value; x.own[a] = { ...(x.own[a] ?? { day: g.day }), text: t }; touch(); },
    'mem-know': (el) => { const g = game(); if (!g) return; const { k, n } = splitKnow(el.dataset.id!); const it = memOf(g).know[k]?.find(z => z.id === n); const t = (el as HTMLTextAreaElement).value.trim(); if (it && t) { it.text = t; touch(); } },
    'mem-step-new': (el) => { MK.step = (el as HTMLInputElement).value; },
    'mem-know-new': (el) => { MK.text = (el as HTMLInputElement).value; },
    'mem-know-about': (el) => { MK.about = (el as HTMLSelectElement).value; },
});
Object.assign(ACT, {
    'mem-who': (el) => { MU.who = el.dataset.who ?? ''; notify(); },
    'mem-preset': (el) => { const g = game(); if (!g) return; const p = M.PRESETS.find(x => x[0] === el.dataset.v); if (p) { memOf(g).cfg = { ...p[2], on: memOf(g).cfg.on }; touch(); notify(); } },
    'mem-fold': async () => {
        const g = game(); const w = g && getWorld(g.world); if (!g || !w || MU.busy) return;
        MU.busy = true; notify();
        try { const n = await memFold(g, w, g.day, true); refreshPrompt(); toast(n ? `${n} ${n === 1 ? 'story' : 'stories'} brought up to date.` : 'Nothing new to fold in: the stories are up to date.', n ? 'success' : 'info'); }
        catch (e: any) { toast(`The stories could not be rewritten (${String(e?.message ?? e).slice(0, 120)}). Nothing was changed.`, 'warn'); }
        finally { MU.busy = false; notify(); }
    },
    'mem-pin': (el) => { const g = game(); const f = g && factById(G(g), el.dataset.id!); if (!f) return; f.kind = 'standing'; touch(); notify(); },
    'mem-unpin': (el) => { const g = game(); const f = g && factById(G(g), el.dataset.id!); if (!f) return; f.kind = 'episode'; f.w = Math.max(f.w ?? 0, memOf(g).cfg.landmark); touch(); notify(); },
    'mem-mark': (el) => { const g = game(); const f = g && factById(G(g), el.dataset.id!); if (!f) return; f.w = Math.max(f.w ?? 0, memOf(g).cfg.landmark); touch(); notify(); },
    'mem-fact-del': (el) => { const g = game(); if (!g) return; removeFact(G(g), el.dataset.id!); touch(); notify(); },
    'mem-step-del': (el) => { const g = game(); if (!g) return; const x = memOf(g); for (const k of Object.keys(x.arc)) x.arc[k] = x.arc[k].filter(s => s.id !== el.dataset.id); touch(); notify(); },
    'mem-step-add': () => { const g = game(); if (!g || !MU.who || !MK.step.trim()) return; const x = memOf(g); (x.arc[MU.who] ??= []).push({ id: newId(x, 's'), day: g.day, text: MK.step.trim().slice(0, 300), by: 'you' }); MK.step = ''; touch(); notify(); },
    'mem-know-del': (el) => { const g = game(); if (!g) return; const { k, n } = splitKnow(el.dataset.id!); const x = memOf(g); x.know[k] = (x.know[k] ?? []).filter(z => z.id !== n); if (!x.know[k].length) delete x.know[k]; touch(); notify(); },
    'mem-know-add': () => { const g = game(); if (!g || !MU.who || !MK.text.trim()) return; const x = memOf(g); (x.know[knowKey(MU.who, MK.about)] ??= []).push({ id: newId(x, 'k'), day: g.day, text: MK.text.trim().slice(0, 200) }); MK.text = ''; touch(); notify(); },
    'mem-story-undo': (el) => { const g = game(); if (!g) return; const x = memOf(g); const book = el.dataset.v === 'own' ? x.own : x.story; const s = book[el.dataset.id!]; const prev = s?.prev?.pop(); if (s && prev !== undefined) { s.text = prev; touch(); notify(); } },
});
