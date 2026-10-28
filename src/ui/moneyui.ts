// [expanded] The Money app (Home): your wallet and the house fund, your job and its shift, the housemates' income,
// debts, and the two statements. Money itself is switched on in the phone's Settings. Rules in sim/money.ts.
import { saveGame, notify, esc, game, toast, type Save } from '../core/store.js';
import { getWorld, type WorldDef } from '../core/world.js';
import { thumb, personaName } from '../st/bridge.js';
import { icon } from './icons.js';
import { ACT, INPUT } from './reg.js';
import { refreshPrompt } from '../sim/prompt.js';
import { money } from '../sim/needs.js';
import { ledger } from '../sim/ledger.js';
import { hm } from '../sim/time.js';
import { difficultyOf } from '../sim/bills.js';
import { bondsOf } from '../sim/bonds.js';
import { goToWork, hasJobOf } from '../sim/moneynight.js';
import { runPlans } from './plans.js';
import { syncScene } from '../sim/game.js';
import { showTransition } from './lifeui.js';
import * as M from '../sim/money.js';
import { tr } from '../core/tr.js';
import { approveAll } from '../sim/living.js';
const fmt = (t: string, ...a: string[]) => tr(t).replace(/\{(\d)\}/g, (_, n) => a[Number(n)] ?? '');

const MV = { borrow: 0, amount: '', mode: 'normal', jobPick: '', jobName: '', jobPay: '', jobHours: '8', logs: 'wallet' as 'wallet' | 'fund' };
const G = (g: Save) => g as unknown as M.GLike;
const canEdit = (g: Save) => bondsOf(g as any).edit === true;
const who = (g: Save, a: string) => (a === M.PLAYER ? personaName() : g.cast[a]?.name ?? a);
const when = (g: Save, at: number) => { const d = Math.floor(at / 1440); return d === g.day ? hm(at % 1440) : `day ${d}`; };

function jobSection(g: Save, w: WorldDef): string {
    const h = M.houseOf(G(g)); const j = h.job; const mult = difficultyOf(g).pay;
    if (j) {
        const pay = Math.round(M.shiftPay(j) * mult);
        const done = M.workedToday(G(g));
        return `<section class="mu-bd-panel"><div class="mu-bd-title"><b data-notr>${esc(j.name)}</b>${canEdit(g) ? `<button class="mu-ghost mu-mn-small" data-act="mn-quit">Quit</button>` : ''}</div>
            <small class="mu-muted">${money(w, pay)} a shift of ${j.hours} h${j.rank ? ` · raise ${j.rank}/${M.MAX_RANK}` : ''}${j.rank < M.MAX_RANK ? ` · next raise in ${Math.max(0, Math.ceil(M.RAISE_EVERY - j.shifts))} shifts` : ''}</small>
            <div class="mu-bd-seg mu-mn-modes">${M.WORK_MODES.map(m => `<button class="${MV.mode === m.id ? 'is-on' : ''}" data-act="mn-mode" data-v="${m.id}" title="${esc(m.desc)}">${esc(m.name)}</button>`).join('')}</div>
            <small class="mu-muted">${esc(M.WORK_MODES.find(m => m.id === MV.mode)?.desc ?? '')}</small>
            <button class="mu-primary" data-act="mn-work" ${done ? 'aria-disabled="true"' : ''}>${icon('briefcase')}<span>${done ? 'You already worked today' : 'Go to work'}</span></button></section>`;
    }
    const jobs = w.occupations.map(o => ({ id: o.id, name: o.name, pay: (o.ranks?.[0]?.pay ?? 15) * (o.shift ?? 8), hours: o.shift ?? 8 }));
    const pick = jobs.find(x => x.id === MV.jobPick);
    return `<section class="mu-bd-panel"><b>Your job</b><small class="mu-muted">One shift a day, off-screen: the hours pass and you come back paid (and tired).</small>
        <label class="mu-field"><span>Work at</span><select data-input="mn-jobpick">${['', ...jobs.map(x => x.id), '__own'].map(id => { const x = jobs.find(y => y.id === id);
            return `<option value="${esc(id)}" ${MV.jobPick === id ? 'selected' : ''}>${id === '' ? 'Choose…' : id === '__own' ? 'A job in my own words…' : `${esc(x!.name)} · ${money(w, x!.pay)} a shift`}</option>`; }).join('')}</select></label>
        ${MV.jobPick === '__own' ? `<div class="mu-bd-row"><input type="text" maxlength="60" placeholder="What you do" data-input="mn-jobname" value="${esc(MV.jobName)}"><input type="number" min="1" placeholder="Pay a shift" class="mu-mn-n" data-input="mn-jobpay" value="${esc(MV.jobPay)}"><input type="number" min="1" max="12" class="mu-mn-n" title="Hours" data-input="mn-jobhours" value="${esc(MV.jobHours)}"></div>` : ''}
        <button data-act="mn-take" ${MV.jobPick ? '' : 'aria-disabled="true"'}>${icon('check')}<span>Take this job${pick ? ` (${money(w, pick.pay)} a shift)` : ''}</span></button></section>`;
}

function housemates(g: Save, w: WorldDef): string {
    const edit = canEdit(g);
    return `<section class="mu-bd-panel"><b>Housemates' income</b><small class="mu-muted">What each one chips into the fund every week (bills: ${money(w, M.BILL_PER_PERSON)} a person a week).</small>
        <div class="mu-ph-list">${Object.values(g.cast).map(r => { const t = M.tierOf(G(g), r.avatar, hasJobOf(g, r.avatar));
            return `<div class="mu-ph-row"><img src="${esc(thumb(r.avatar))}" alt=""><span><b data-notr>${esc(r.name)}</b><small>${esc(M.TIERS.find(x => x[0] === t)![1])} · ${money(w, M.tierAmount(t))} a week</small></span>
            ${edit ? `<select data-input="mn-tier" data-who="${esc(r.avatar)}">${M.TIERS.map(([id, name]) => `<option value="${id}" ${t === id ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select>` : ''}</div>`; }).join('')}</div></section>`;
}

function logs(g: Save, w: WorldDef): string {
    const list = (MV.logs === 'wallet' ? ledger(g) : M.houseOf(G(g)).flog).slice(0, 12);
    return `<section class="mu-bd-panel"><div class="mu-bd-seg mu-mn-tabs"><button class="${MV.logs === 'wallet' ? 'is-on' : ''}" data-act="mn-logs" data-v="wallet">Your wallet</button><button class="${MV.logs === 'fund' ? 'is-on' : ''}" data-act="mn-logs" data-v="fund">House fund</button></div>
        ${list.map(e => `<div class="mu-st-item"><span data-notr>${esc(e.text)}</span><small class="mu-muted">${when(g, e.at)}</small><b class="${e.amount >= 0 ? 'mu-mn-up' : 'mu-mn-down'}">${e.amount >= 0 ? '+' : '−'}${money(w, Math.abs(e.amount))}</b></div>`).join('') || '<p class="mu-muted">Nothing yet.</p>'}</section>`;
}

export function moneyApp(g: Save, w: WorldDef, header: string): string {
    if (!M.moneyOn(G(g))) return `${header}<div class="mu-ph-body"><section class="mu-bd-panel"><b>Money is off in this house</b>
        <small class="mu-muted">Turn it on in the phone's Settings: a wallet for you, a house fund the housemates chip into, groceries that cost, and a job for you.</small></section></div>`;
    const h = M.houseOf(G(g));
    const debts = h.debts;
    return `${header}<div class="mu-ph-body mu-mn">
        <div class="mu-mn-cards"><div class="mu-mn-card"><small>Your wallet</small><b>${money(w, g.player.money)}</b></div><div class="mu-mn-card${h.tight ? ' is-tight' : ''}"><small>House fund</small><b>${money(w, h.fund)}</b>${h.tight ? '<small>money is tight</small>' : ''}</div></div>
        <section class="mu-bd-panel"><small class="mu-muted">${esc(fmt('Yours in the fund: {0}', money(w, M.mineOf(G(g)))))}${M.owedToFund(G(g)) ? ` · ${esc(fmt('you owe the house {0}', money(w, M.owedToFund(G(g)))))}` : ''}</small>
            <input type="number" min="1" inputmode="decimal" placeholder="${esc(tr('Amount'))}" data-input="mn-amount" data-focus="mnamount" value="${esc(MV.amount)}" class="mu-mn-amount" aria-label="Amount">
            <div class="mu-mn-move"><button data-act="mn-in">${icon('up')}<span>Into the fund</span></button><button class="mu-ghost" data-act="mn-out">${icon('down')}<span>Take</span></button></div>
            ${MV.borrow ? `<div class="mu-mn-borrow"><small>${esc(fmt('Only {0} of it is yours. The other {1} would be a loan from the house: the others will know, and putting money back pays it off first.', money(w, M.takeSplit(G(g), MV.borrow).own), money(w, M.takeSplit(G(g), MV.borrow).loan)))}</small>
                <div class="mu-mn-move"><button class="mu-ghost" data-act="mn-borrow-no">Cancel</button><button class="mu-primary" data-act="mn-borrow-yes">${esc(fmt('Borrow {0}', money(w, M.takeSplit(G(g), MV.borrow).loan)))}</button></div></div>` : ''}
            <label class="mu-field"><span>Your grocery runs are paid from</span><select data-input="mn-payfrom"><option value="fund" ${h.payFrom === 'fund' ? 'selected' : ''}>The house fund</option><option value="wallet" ${h.payFrom === 'wallet' ? 'selected' : ''}>Your wallet</option></select></label></section>
        ${jobSection(g, w)}
        ${debts.length ? `<section class="mu-bd-panel"><b>Debts</b>${debts.map(d => `<div class="mu-st-item"><span data-notr>${esc(who(g, d.from))} owes ${esc(who(g, d.to))}${d.why ? ` · ${esc(d.why)}` : ''}</span><b>${money(w, d.amount)}</b>${canEdit(g) ? `<button class="mu-ibtn mu-ghost" data-act="mn-debtdel" data-id="${esc(d.id)}" aria-label="Forget" title="Forget">${icon('x')}</button>` : ''}</div>`).join('')}</section>` : ''}
        ${housemates(g, w)}
        ${logs(g, w)}</div>`;
}

/* ---------- actions ---------- */

const done = () => { saveGame(); refreshPrompt(); notify(); };
const ctxW = () => { const g = game(); const w = g && getWorld(g.world); return g && w ? { g, w } : null; };
Object.assign(ACT, {
    'mn-in': () => { const c = ctxW(); if (!c) return; const why = M.contribute(G(c.g), Number(MV.amount)); if (why) { toast(why, 'info'); return; } MV.amount = ''; done(); },
    'mn-out': () => {
        const c = ctxW(); if (!c) return; const why = M.withdraw(G(c.g), Number(MV.amount));
        if (why === 'borrow') { MV.borrow = Number(MV.amount); notify(); return; }
        if (why) { toast(why, 'info'); return; } MV.amount = ''; MV.borrow = 0; done();
    },
    'mn-borrow-no': () => { MV.borrow = 0; notify(); },
    'mn-borrow-yes': () => {
        const c = ctxW(); if (!c || !MV.borrow) return;
        const why = M.withdraw(G(c.g), MV.borrow, true); if (why) { toast(why, 'info'); return; }
        approveAll(c.g, -2);   // the house notices
        MV.amount = ''; MV.borrow = 0; done();
    },
    'mn-mode': (el) => { MV.mode = el.dataset.v || 'normal'; notify(); },
    'mn-logs': (el) => { MV.logs = (el.dataset.v as any) || 'wallet'; notify(); },
    'mn-take': () => {
        const c = ctxW(); if (!c) return;
        if (MV.jobPick === '__own') { if (!MV.jobName.trim() || !(Number(MV.jobPay) > 0)) { toast('Write what you do and what a shift pays.', 'info'); return; } M.setJob(G(c.g), MV.jobName, Number(MV.jobPay), Number(MV.jobHours) || 8); }
        else { const o = c.w.occupations.find(x => x.id === MV.jobPick); if (!o) return; M.setJob(G(c.g), o.name, (o.ranks?.[0]?.pay ?? 15) * (o.shift ?? 8), o.shift ?? 8); }
        MV.jobPick = ''; done();
    },
    'mn-quit': () => { const c = ctxW(); if (!c || !canEdit(c.g)) return; M.houseOf(G(c.g)).job = null; done(); },
    'mn-work': async () => {
        const c = ctxW(); if (!c) return;
        const r = goToWork(c.g, c.w, MV.mode);
        if (!r.ok) { toast(r.lines[0], 'info'); return; }
        r.lines.forEach((l, i) => toast(l, i ? 'warn' : 'success'));
        runPlans(); saveGame(); await syncScene(); refreshPrompt();
        showTransition('Back from work', `${M.houseOf(G(c.g)).job?.name ?? ''} · ${hm(c.g.minutes)}`, 'work');
        notify();
    },
    'mn-debtdel': (el) => { const c = ctxW(); if (!c || !canEdit(c.g)) return; const h = M.houseOf(G(c.g)); h.debts = h.debts.filter(d => d.id !== el.dataset.id); done(); },
});
Object.assign(INPUT, {
    'mn-amount': (el) => { MV.amount = el.value; if (MV.borrow) { MV.borrow = 0; notify(); } },
    'mn-jobpick': (el) => { MV.jobPick = String(el.value); notify(); },
    'mn-jobname': (el) => { MV.jobName = el.value; },
    'mn-jobpay': (el) => { MV.jobPay = el.value; },
    'mn-jobhours': (el) => { MV.jobHours = el.value; },
    'mn-payfrom': (el) => { const g = game(); if (!g) return; M.houseOf(G(g)).payFrom = el.value === 'wallet' ? 'wallet' : 'fund'; saveGame(); notify(); },
    'mn-tier': (el) => { const g = game(); if (!g || !canEdit(g)) return; M.houseOf(G(g)).tiers[el.dataset.who!] = String(el.value) as M.Tier; saveGame(); notify(); },
});
