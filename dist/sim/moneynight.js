// [expanded] The runtime side of money in a Home (rules in money.ts): the week, the scene's money line, your shift.
import { saveGame } from '../core/store.js';
import { isScenario } from '../core/world.js';
import { onDay } from './hooks.js';
import { homeJobOf } from './hometime.js';
import { money, addStatus, tooTired } from './needs.js';
import { difficultyOf } from './bills.js';
import { advance } from './time.js';
import * as M from './money.js';
const G = (g) => g;
export const moneyOnIn = (g, w) => !!g && isScenario(w) && M.moneyOn(G(g));
const hasJob = (g) => (a) => { const j = homeJobOf(g.cast[a]); return !!(j.name?.trim() || (j.shift && j.shift !== 'off')); };
// Each week: the housemates chip in, the bills are paid.
onDay.push((g, w) => (moneyOnIn(g, w) ? M.week(G(g), g.day, hasJob(g)) : []));
export function moneyPromptLines(g, w, present) {
    return moneyOnIn(g, w) ? M.moneyLines(G(g), present, v => money(w, v)) : [];
}
export function enableMoney(g, on) { M.enable(G(g), on, difficultyOf(g).start); saveGame(); }
export const hasJobOf = (g, a) => hasJob(g)(a);
// Your shift: off-screen, the hours pass, you come back tired and paid. Returns lines for the screen, or why not.
export function goToWork(g, w, mode) {
    const j = M.houseOf(G(g)).job;
    if (!j)
        return { ok: false, lines: ['You have no job yet.'] };
    if (M.workedToday(G(g)))
        return { ok: false, lines: ['You already worked today.'] };
    const m = M.WORK_MODES.find(x => x.id === mode) ?? M.WORK_MODES[0];
    const drain = { energy: Math.round(25 * m.energy * j.hours / 8), hunger: 15, thirst: 15, hygiene: 10 };
    const tired = tooTired(g, w, drain, 'work a shift');
    if (tired)
        return { ok: false, lines: [tired] };
    const r = M.work(G(g), m.id, difficultyOf(g).pay);
    if (!r)
        return { ok: false, lines: ['You cannot work now.'] };
    const lines = advance(g, w, j.hours * 60);
    for (const [id, v] of Object.entries(drain))
        addStatus(g, w, id, -v);
    if (m.mood)
        addStatus(g, w, 'mood', m.mood);
    lines.unshift(`You worked ${j.hours} hours and earned ${money(w, r.pay)}${r.bonus ? ` (a bonus of ${money(w, r.bonus)})` : ''}.`);
    if (r.raised)
        lines.push(`A raise! A shift now pays ${money(w, Math.round(M.shiftPay(j) * difficultyOf(g).pay))}.`);
    saveGame();
    return { ok: true, lines };
}
