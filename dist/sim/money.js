// [expanded] Money in a Home (Mundi Expanded): your wallet and the house fund.
//
//  - Off by default (a switch per save): a Home without money plays as before.
//  - Your wallet is upstream's (`player.money`, with upstream's statement); the house fund is the household's. The
//    housemates have no wallets of their own (to keep things light): their pockets are off-screen.
//  - Each week the housemates with an income chip into the fund and the house's bills are paid from it; short of
//    money, the house is "tight" (said in the scene), nothing is cut off.
//  - Groceries cost what the catalog says: the housemates' grocery runs are paid from the fund, yours from the fund
//    or your wallet (your choice); a thin fund buys what it can.
//  - Your job: one of the world's jobs (or one in your own words), a shift a day from the phone, a raise every few
//    shifts.
//  - Debts: who owes whom, from the story (a loan) or by hand.
//
// Pure logic (no SillyTavern), tested on its own; runtime in moneynight.ts, the app in moneyui.ts.
import { CATALOG, stockOf, addItem } from './stock.js';
// what a housemate chips into the fund each week
export const TIERS = [['none', 'No income', 0], ['low', 'Small income', 50], ['mid', 'Steady income', 90], ['high', 'Good income', 140]];
export const BILL_PER_PERSON = 15; // the house's bills each week, per person (you included)
export const START = { fund: 250, wallet: 150 };
export const RAISE_EVERY = 6, MAX_RANK = 3, RAISE = 0.15;
export const PLAYER = 'player';
export function houseOf(g) {
    const h = (g.house ??= { on: false, fund: 0, flog: [], tiers: {}, job: null, payFrom: 'fund', debts: [], gifts: [], seq: 0 });
    h.flog ??= [];
    h.tiers ??= {};
    h.job ??= null;
    h.payFrom ??= 'fund';
    h.debts ??= [];
    h.gifts ??= [];
    h.seq ??= 0;
    return h;
}
export const moneyOn = (g) => !!g.house?.on;
const at = (g) => g.day * 1440 + (g.minutes ?? 0);
const r2 = (v) => Math.round(v * 100) / 100;
// Turns money on (the first time: a fund and a wallet to start with, after the difficulty's `start`).
export function enable(g, on, start = 1) {
    const h = houseOf(g);
    h.on = on;
    if (on && !h.started) {
        h.started = true;
        fundAdd(g, Math.round(START.fund * start), 'What the house had put aside');
        if (!(g.player.money > 0))
            walletAdd(g, Math.round(START.wallet * start), 'Your savings');
        h.week = g.day;
    }
}
export function walletAdd(g, amount, text) {
    const v = r2(amount);
    if (!v)
        return;
    g.player.money = r2((g.player.money ?? 0) + v);
    const l = (g.ledger ??= []);
    l.unshift({ at: at(g), text, amount: v });
    if (l.length > 40)
        l.length = 40;
}
export function fundAdd(g, amount, text) {
    const h = houseOf(g);
    const v = r2(amount);
    if (!v)
        return;
    h.fund = r2(h.fund + v);
    h.flog.unshift({ at: at(g), text, amount: v });
    if (h.flog.length > 40)
        h.flog.length = 40;
}
// From your wallet into the fund (or back). Returns '' or why not.
export function contribute(g, amount) {
    const n = r2(Math.abs(amount));
    if (!n)
        return 'Write an amount.';
    if (g.player.money < n)
        return 'You do not have that much.';
    walletAdd(g, -n, 'Into the house fund');
    fundAdd(g, n, 'From you');
    return '';
}
export function withdraw(g, amount) {
    const n = r2(Math.abs(amount));
    if (!n)
        return 'Write an amount.';
    if (houseOf(g).fund < n)
        return 'The fund does not have that much.';
    fundAdd(g, -n, 'Taken by you');
    walletAdd(g, n, 'From the house fund');
    return '';
}
/* ---------- the week ---------- */
// A housemate's income: set in the Money app, or (unset) steady when they have a job with a shift, none otherwise.
export const tierOf = (g, avatar, hasJob = false) => houseOf(g).tiers[avatar] ?? (hasJob ? 'mid' : 'none');
export const tierAmount = (t) => TIERS.find(x => x[0] === t)?.[2] ?? 0;
// Once a week (day 1, 8, 15…): the housemates chip in, then the bills are paid. Returns notes for the screen.
export function week(g, day, hasJob = () => false, people = Object.keys(g.cast)) {
    const h = houseOf(g);
    if (!h.on || h.week === day || (day - 1) % 7 !== 0)
        return [];
    h.week = day;
    const notes = [];
    const paid = [];
    for (const a of people) {
        const v = tierAmount(tierOf(g, a, hasJob(a)));
        if (v) {
            fundAdd(g, v, `${g.cast[a]?.name ?? a}'s share`);
            paid.push(g.cast[a]?.name ?? a);
        }
    }
    if (paid.length)
        notes.push(`${paid.join(', ')} chipped into the house fund.`);
    const bills = BILL_PER_PERSON * (Object.keys(g.cast).length + 1);
    const pay = Math.min(bills, Math.max(0, h.fund));
    if (pay)
        fundAdd(g, -pay, 'The week\'s bills');
    h.tight = pay < bills;
    if (h.tight)
        notes.push('The house fund could not cover the bills: money is tight.');
    return notes;
}
/* ---------- groceries ---------- */
// Buys the staples the house is short of, food first, within a budget. Returns what was bought and spent.
export function buyStaples(g, budget) {
    const short = CATALOG.filter(c => c.basket).map(c => {
        const have = stockOf(g).items.filter(i => i.cat === c.id && !i.owner && (i.store === 'fridge' || i.store === 'pantry')).reduce((a, i) => a + i.qty, 0);
        return { c, need: Math.max(0, c.basket - have) };
    }).filter(x => x.need > 0);
    const rank = (k) => (['food', 'ingredient', 'snack'].includes(k) ? 0 : k === 'drink' || k === 'coffee' ? 1 : 2);
    short.sort((a, b) => rank(a.c.kind) - rank(b.c.kind));
    let left = budget, n = 0, spent = 0;
    // round-robin, one unit at a time, so a thin budget buys a bit of everything rather than all of one thing
    let progress = true;
    while (progress) {
        progress = false;
        for (const x of short) {
            if (!x.need || x.c.price > left)
                continue;
            addItem(g, x.c.store, x.c.name, 1);
            x.need--;
            left -= x.c.price;
            spent += x.c.price;
            n++;
            progress = true;
        }
    }
    return { n, spent: r2(spent) };
}
// A grocery run paid from the fund (housemates) or your pool of choice (you). Returns what was bought.
export function payShop(g, who) {
    const h = houseOf(g);
    const from = who === 'house' ? 'fund' : h.payFrom;
    const pool = from === 'fund' ? h.fund : g.player.money;
    const r = buyStaples(g, Math.max(0, pool));
    if (r.spent) {
        if (from === 'fund')
            fundAdd(g, -r.spent, who === 'house' ? 'Groceries (a housemate shopped)' : 'Groceries (you shopped)');
        else
            walletAdd(g, -r.spent, 'Groceries');
    }
    return { ...r, from };
}
// What a thing costs (catalog price, or a small default for anything else).
export const priceOfThing = (name) => CATALOG.find(c => c.name.toLowerCase() === String(name).toLowerCase() || c.id === String(name).toLowerCase())?.price ?? 5;
export const WORK_MODES = [
    { id: 'normal', name: 'Do the job', desc: 'A normal shift.', pay: 1, progress: 1, energy: 1, mood: 0 },
    { id: 'hard', name: 'Work hard', desc: 'Faster raise, maybe a bonus. More tiring.', pay: 1, progress: 1.5, energy: 1.35, mood: -5 },
    { id: 'social', name: 'Chat with coworkers', desc: 'A better mood, a slower raise.', pay: 1, progress: 0.75, energy: 0.9, mood: 8 },
    { id: 'easy', name: 'Take it easy', desc: 'Less tiring; the raise barely moves.', pay: 1, progress: 0.4, energy: 0.6, mood: 2 },
];
export function setJob(g, name, pay, hours) {
    const n = String(name ?? '').trim().slice(0, 60);
    houseOf(g).job = n && pay > 0 && hours > 0 ? { name: n, pay: r2(pay), hours: Math.max(1, Math.min(12, Math.round(hours))), shifts: 0, rank: 0 } : null;
}
export const shiftPay = (j) => r2(j.pay * (1 + RAISE * j.rank));
export const workedToday = (g) => houseOf(g).job?.lastDay === g.day;
// One shift (time and tiredness are the runtime's): pay into the wallet, progress toward a raise. `mult`: the
// difficulty's pay; `roll`: a number in [0,1) for the bonus.
export function work(g, modeId, mult = 1, roll = Math.random()) {
    const j = houseOf(g).job;
    if (!j || j.lastDay === g.day)
        return null;
    const mode = WORK_MODES.find(m => m.id === modeId) ?? WORK_MODES[0];
    let pay = Math.round(shiftPay(j) * mult * mode.pay);
    const bonus = mode.id === 'hard' && roll < 0.3 ? Math.round(pay * 0.25) : 0;
    pay += bonus;
    walletAdd(g, pay, `${j.name}: a shift${bonus ? ' (+ bonus)' : ''}`);
    j.lastDay = g.day;
    j.shifts = r2(j.shifts + mode.progress);
    let raised = false;
    if (j.rank < MAX_RANK && j.shifts >= RAISE_EVERY) {
        j.rank++;
        j.shifts = r2(j.shifts - RAISE_EVERY);
        raised = true;
    }
    return { pay, bonus, raised, mode };
}
/* ---------- debts ---------- */
const newId = (h, p) => `${p}${(++h.seq).toString(36)}`;
// `from` owes `to` (people are avatars or 'player'); a debt the other way round is paid off first.
export function addDebt(g, from, to, amount, why = '') {
    const h = houseOf(g);
    let n = r2(Math.abs(amount));
    if (!n || from === to)
        return null;
    for (const d of h.debts.filter(x => x.from === to && x.to === from)) {
        const off = Math.min(d.amount, n);
        d.amount = r2(d.amount - off);
        n = r2(n - off);
    }
    h.debts = h.debts.filter(d => d.amount > 0);
    if (!n)
        return null;
    const have = h.debts.find(d => d.from === from && d.to === to);
    if (have) {
        have.amount = r2(have.amount + n);
        return have;
    }
    const d = { id: newId(h, 'd'), from, to, amount: n, day: g.day, ...(why ? { why: why.slice(0, 80) } : {}) };
    h.debts.push(d);
    return d;
}
// `from` pays `to` back (as much as is owed); returns what was repaid.
export function repay(g, from, to, amount) {
    const h = houseOf(g);
    let n = r2(Math.abs(amount)), paid = 0;
    for (const d of h.debts.filter(x => x.from === from && x.to === to)) {
        const off = Math.min(d.amount, n);
        d.amount = r2(d.amount - off);
        n = r2(n - off);
        paid = r2(paid + off);
    }
    h.debts = h.debts.filter(d => d.amount > 0);
    return paid;
}
export const debtsOf = (g, who) => houseOf(g).debts.filter(d => d.from === who || d.to === who);
/* ---------- what the AI is told ---------- */
const nameOf = (g, a, you) => (a === PLAYER ? you : g.cast[a]?.name ?? a);
export function moneyLines(g, present, fmt, you = '{{user}}') {
    if (!moneyOn(g))
        return [];
    const h = houseOf(g);
    const out = [`Money: ${you} has ${fmt(g.player.money)}; the house fund has ${fmt(h.fund)}.${h.tight ? ' Money is tight in the house: the bills were not fully paid this week.' : ''}`];
    const who = new Set([PLAYER, ...present]);
    const debts = h.debts.filter(d => who.has(d.from) && who.has(d.to));
    if (debts.length)
        out.push(`Debts: ${debts.map(d => `${nameOf(g, d.from, you)} owes ${nameOf(g, d.to, you)} ${fmt(d.amount)}`).join('; ')}.`);
    return out;
}
