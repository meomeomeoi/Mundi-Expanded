// [expanded] The house's things (Mundi Expanded): what is in the fridge, the pantry and everyone's room.
//
//  - Storages: the fridge and the pantry (the house's), and a room per person ('room:player' is the player's).
//  - Items: a name and a count; optionally whose it is (labelled food in the fridge, a console in a room) and what
//    kind of thing it is. A small catalog of groceries gives the everyday things their kind and where they go; any
//    other thing is free text. A price field is kept for later (money), unused for now.
//  - What changes them: what you do (a snack, cooking, coffee…), what the house eats each day, grocery runs (yours,
//    and the housemates' when food runs low), errands ("Finn, bring me a pudding"), and what the story says happened
//    (read by the mechanics model, after each message or at night).
//
// Pure logic (no SillyTavern, no DOM), tested on its own; the runtime is in stocknight.ts, the app in stockui.ts.
// basket: how many a grocery run brings the house up to (0: not a staple, only bought on purpose)
export const CATALOG = [
    { id: 'milk', name: 'Milk', kind: 'drink', store: 'fridge', basket: 2, price: 2 },
    { id: 'eggs', name: 'Eggs', kind: 'ingredient', store: 'fridge', basket: 10, price: 0.3 },
    { id: 'butter', name: 'Butter', kind: 'ingredient', store: 'fridge', basket: 1, price: 3 },
    { id: 'cheese', name: 'Cheese', kind: 'food', store: 'fridge', basket: 2, price: 4 },
    { id: 'yogurt', name: 'Yogurt', kind: 'snack', store: 'fridge', basket: 4, price: 1 },
    { id: 'chicken', name: 'Chicken', kind: 'ingredient', store: 'fridge', basket: 2, price: 6 },
    { id: 'meat', name: 'Minced meat', kind: 'ingredient', store: 'fridge', basket: 1, price: 6 },
    { id: 'vegetables', name: 'Vegetables', kind: 'ingredient', store: 'fridge', basket: 6, price: 1 },
    { id: 'fruit', name: 'Fruit', kind: 'snack', store: 'fridge', basket: 6, price: 1 },
    { id: 'ham', name: 'Ham', kind: 'food', store: 'fridge', basket: 1, price: 4 },
    { id: 'juice', name: 'Juice', kind: 'drink', store: 'fridge', basket: 2, price: 2 },
    { id: 'soda', name: 'Soda', kind: 'drink', store: 'fridge', basket: 4, price: 1 },
    { id: 'beer', name: 'Beer', kind: 'drink', store: 'fridge', basket: 0, price: 2 },
    { id: 'pudding', name: 'Pudding', kind: 'snack', store: 'fridge', basket: 0, price: 1.5 },
    { id: 'leftovers', name: 'Leftovers', kind: 'food', store: 'fridge', basket: 0, price: 0 },
    { id: 'bread', name: 'Bread', kind: 'food', store: 'pantry', basket: 2, price: 2 },
    { id: 'pasta', name: 'Pasta', kind: 'ingredient', store: 'pantry', basket: 3, price: 1.5 },
    { id: 'rice', name: 'Rice', kind: 'ingredient', store: 'pantry', basket: 2, price: 2 },
    { id: 'cereal', name: 'Cereal', kind: 'food', store: 'pantry', basket: 1, price: 3 },
    { id: 'noodles', name: 'Instant noodles', kind: 'food', store: 'pantry', basket: 6, price: 0.8 },
    { id: 'soup', name: 'Canned soup', kind: 'food', store: 'pantry', basket: 3, price: 1.5 },
    { id: 'chips', name: 'Chips', kind: 'snack', store: 'pantry', basket: 3, price: 2 },
    { id: 'cookies', name: 'Cookies', kind: 'snack', store: 'pantry', basket: 2, price: 2 },
    { id: 'chocolate', name: 'Chocolate', kind: 'snack', store: 'pantry', basket: 2, price: 1.5 },
    { id: 'coffee', name: 'Coffee', kind: 'coffee', store: 'pantry', basket: 12, price: 0.4 },
    { id: 'tea', name: 'Tea', kind: 'drink', store: 'pantry', basket: 10, price: 0.2 },
    { id: 'water', name: 'Bottled water', kind: 'drink', store: 'pantry', basket: 6, price: 0.5 },
    { id: 'toiletpaper', name: 'Toilet paper', kind: 'household', store: 'pantry', basket: 8, price: 0.5 },
    { id: 'dishsoap', name: 'Dish soap', kind: 'household', store: 'pantry', basket: 1, price: 2 },
    { id: 'detergent', name: 'Laundry detergent', kind: 'household', store: 'pantry', basket: 1, price: 6 },
];
export const KINDS = ['food', 'ingredient', 'snack', 'drink', 'coffee', 'household', 'thing'];
const EDIBLE = ['food', 'ingredient', 'snack'];
export const PLAYER = 'player'; // a room or an owner that is the player
export const FRIDGE = 'fridge', PANTRY = 'pantry';
export const roomOf = (who) => `room:${who}`;
export const isRoom = (s) => s.startsWith('room:');
export const roomWho = (s) => s.slice(5);
const norm = (s) => String(s ?? '').toLowerCase().replace(/[.,!?"'«»“”]/g, '').replace(/\s+/g, ' ').trim();
const sing = (s) => s.replace(/(ies)$/, 'y').replace(/(es|s)$/, '');
export function stockOf(g) {
    const s = (g.stock ??= { items: [], errands: [], seq: 0 });
    s.items ??= [];
    s.errands ??= [];
    s.seq ??= 0;
    return s;
}
const newId = (s, p) => `${p}${(++s.seq).toString(36)}`;
export const catalogOf = (name) => {
    const q = norm(name);
    if (!q)
        return null;
    return CATALOG.find(c => c.id === q || norm(c.name) === q || sing(norm(c.name)) === sing(q)) ?? null;
};
// The house's storages, then a room for the player and each person.
export const storesOf = (g) => [FRIDGE, PANTRY, roomOf(PLAYER), ...Object.keys(g.cast).map(roomOf)];
export function storeName(g, s, you = 'you') {
    if (s === FRIDGE)
        return 'fridge';
    if (s === PANTRY)
        return 'pantry';
    const w = roomWho(s);
    return w === PLAYER ? `${you}'s room` : `${g.cast[w]?.name ?? w}'s room`;
}
export const ownerName = (g, o, you = 'you') => (!o ? '' : o === PLAYER ? you : g.cast[o]?.name ?? o);
const validOwner = (g, o) => !!o && (o === PLAYER || !!g.cast[o]);
const validStore = (g, s) => s === FRIDGE || s === PANTRY || (isRoom(s) && (roomWho(s) === PLAYER || !!g.cast[roomWho(s)]));
export const itemsIn = (g, store) => stockOf(g).items.filter(i => i.store === store && i.qty > 0);
const same = (a, name, owner) => (norm(a.name) === norm(name) || sing(norm(a.name)) === sing(norm(name))) && (a.owner ?? '') === (owner ?? '');
// Adds things to a storage (merges with the same thing, same owner, already there).
export function addItem(g, store, name, qty = 1, owner, kind) {
    const n = String(name ?? '').trim().slice(0, 60);
    const q = Math.max(0, Math.round(qty));
    if (!n || !q || !validStore(g, store))
        return null;
    const s = stockOf(g);
    const o = validOwner(g, owner) ? owner : undefined;
    const have = s.items.find(i => i.store === store && same(i, n, o));
    if (have) {
        have.qty += q;
        return have;
    }
    const c = catalogOf(n);
    const it = { id: newId(s, 'i'), name: c?.name ?? n, qty: q, store, kind: kind ?? c?.kind ?? 'thing', ...(c ? { cat: c.id, price: c.price } : {}), ...(o ? { owner: o } : {}) };
    s.items.push(it);
    return it;
}
// Finds a thing by name: in that storage first, then anywhere (the story often says "the fridge" for the pantry).
export function findItem(g, name, store, owner) {
    const q = norm(name);
    if (!q)
        return null;
    const list = stockOf(g).items.filter(i => i.qty > 0 && (owner === undefined || (i.owner ?? '') === owner));
    const pick = (l) => l.find(i => norm(i.name) === q) ?? l.find(i => sing(norm(i.name)) === sing(q))
        ?? l.find(i => norm(i.name).includes(q) || q.includes(norm(i.name)));
    return (store ? pick(list.filter(i => i.store === store)) : null) ?? pick(list) ?? null;
}
export function useItem(g, it, qty = 1) {
    const n = Math.min(it.qty, Math.max(0, Math.round(qty)));
    it.qty -= n;
    if (it.qty <= 0)
        stockOf(g).items = stockOf(g).items.filter(x => x !== it);
    return n;
}
export function moveItem(g, it, to, qty = it.qty, owner) {
    if (!validStore(g, to))
        return null;
    const n = Math.min(it.qty, Math.max(1, Math.round(qty)));
    const o = owner === null ? undefined : owner !== undefined && validOwner(g, owner) ? owner : it.owner;
    const name = it.name, kind = it.kind;
    useItem(g, it, n);
    return addItem(g, to, name, n, o, kind);
}
export function removeItem(g, id) { const s = stockOf(g); s.items = s.items.filter(i => i.id !== id); }
// The house's food (fridge and pantry, not labelled as someone's): 'ok', 'low' or 'empty'.
export function foodLevel(g) {
    const units = stockOf(g).items.filter(i => (i.store === FRIDGE || i.store === PANTRY) && !i.owner && EDIBLE.includes(i.kind))
        .reduce((a, i) => a + (i.kind === 'ingredient' ? i.qty / 2 : i.qty), 0);
    const people = Object.keys(g.cast).length + 1;
    return units < 1 ? 'empty' : units < people * 2 ? 'low' : 'ok';
}
// The first fill of a new Home: the basics a lived-in kitchen has.
export function seed(g) {
    const s = stockOf(g);
    if (s.seeded)
        return;
    s.seeded = true;
    if (s.items.length)
        return;
    for (const c of CATALOG)
        if (c.basket)
            addItem(g, c.store, c.name, c.basket);
}
// A grocery run: the staples back up to the basket.
export function restock(g) {
    let n = 0;
    for (const c of CATALOG) {
        if (!c.basket)
            continue;
        const have = stockOf(g).items.filter(i => i.cat === c.id && !i.owner && (i.store === FRIDGE || i.store === PANTRY)).reduce((a, i) => a + i.qty, 0);
        if (have < c.basket) {
            addItem(g, c.store, c.name, c.basket - have);
            n += c.basket - have;
        }
    }
    return n;
}
/* ---------- what you do (the house's actions) ---------- */
// What each action needs from the house: [kinds it takes from, how many]. Water from the tap is free.
const NEEDS = {
    snack: { kinds: ['snack', 'food'], n: 1, what: 'a snack' },
    meal: { kinds: ['food', 'snack'], n: 1, what: 'a meal' },
    cook: { kinds: ['ingredient'], n: 2, what: 'cooking' },
    coffee: { kinds: ['coffee'], n: 1, what: 'coffee' },
    drink: { kinds: ['drink'], n: 1, what: 'a drink' },
};
export const actionNeeds = (id) => NEEDS[id] ?? null;
// The things an action would take (the house's or yours, never someone else's), or null when there is not enough.
function takeFor(g, kinds, n, eater = PLAYER) {
    const pool = stockOf(g).items.filter(i => i.qty > 0 && (i.store === FRIDGE || i.store === PANTRY || i.store === roomOf(eater)) && (!i.owner || i.owner === eater) && kinds.includes(i.kind));
    // leftovers first, then by the order of the kinds, then the biggest piles (variety: one of each where possible)
    pool.sort((a, b) => (a.cat === 'leftovers' ? -1 : b.cat === 'leftovers' ? 1 : 0) || kinds.indexOf(a.kind) - kinds.indexOf(b.kind) || b.qty - a.qty);
    const out = [];
    let left = n;
    for (const it of pool) {
        if (!left)
            break;
        out.push(it);
        left--;
    }
    for (const it of pool) {
        if (!left)
            break;
        const used = out.filter(x => x === it).length;
        if (it.qty > used) {
            out.push(it);
            left--;
        }
    }
    return left ? null : out;
}
// Why an action cannot be done now ('' when it can).
export function blockedBy(g, actionId) {
    const need = NEEDS[actionId];
    if (!need)
        return '';
    if (takeFor(g, need.kinds, need.n))
        return '';
    return actionId === 'cook' ? 'Nothing to cook with: the fridge and pantry are out of ingredients. Someone has to go shopping.'
        : actionId === 'coffee' ? 'The coffee has run out. Someone has to buy more.'
            : `There is nothing for ${need.what}: the fridge and pantry are empty. Someone has to go shopping.`;
}
// Does it: takes what the action needs (cooking leaves leftovers in the fridge). Returns what was used.
export function doAction(g, actionId) {
    const need = NEEDS[actionId];
    if (!need)
        return [];
    const take = takeFor(g, need.kinds, need.n);
    if (!take)
        return [];
    const names = take.map(it => it.name);
    for (const it of take)
        useItem(g, it, 1);
    if (actionId === 'cook')
        addItem(g, FRIDGE, 'Leftovers', 1);
    return names;
}
/* ---------- days ---------- */
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
} return (h >>> 0) / 4294967296; };
// Each day the housemates eat from the house (one thing each), and every few days the household things go down.
// Labelled things are only eaten by whose they are. Runs once a day.
export function eatDay(g, day = g.day, people = Object.keys(g.cast)) {
    const s = stockOf(g);
    if (s.eatDay === day)
        return [];
    s.eatDay = day;
    const out = [];
    for (const who of people) {
        const take = takeFor(g, ['food', 'ingredient', 'snack'], 1, who);
        if (take) {
            useItem(g, take[0], 1);
        }
    }
    if (day % 4 === 0)
        for (const it of s.items.filter(i => i.kind === 'household' && !i.owner && i.qty > 0))
            useItem(g, it, 1);
    if (foodLevel(g) === 'empty')
        out.push({ kind: 'eat', text: 'The fridge and pantry are empty.' });
    return out;
}
// At night, when food is low and nobody went shopping lately, one housemate does the grocery run.
export function houseShop(g, day = g.day, shoppers = Object.keys(g.cast)) {
    const s = stockOf(g);
    if (foodLevel(g) === 'ok' || !shoppers.length || (s.lastShop !== undefined && day - s.lastShop < 2))
        return null;
    const who = shoppers[Math.floor(hash(`shop|${day}`) * shoppers.length)];
    const n = restock(g);
    s.lastShop = day;
    return n ? { who, n } : null;
}
/* ---------- errands ---------- */
export function addErrand(g, forWho, by, item, qty = 1) {
    const t = String(item ?? '').trim();
    if (!t || forWho === by || !validOwner(g, forWho) || !validOwner(g, by))
        return null;
    const s = stockOf(g);
    if (s.errands.some(e => e.forWho === forWho && e.by === by && norm(e.item) === norm(t)))
        return null;
    const e = { id: newId(s, 'e'), forWho, by, item: t.slice(0, 60), qty: Math.max(1, Math.round(qty)), day: g.day };
    s.errands.push(e);
    return e;
}
export function closeErrand(g, id) { const s = stockOf(g); s.errands = s.errands.filter(e => e.id !== id); }
// Where a brought thing goes: food to the fridge or pantry, other things to whose room it is for.
const placeFor = (g, item, forWho) => { const c = catalogOf(item); return c ? c.store : roomOf(forWho); };
// Brings what was asked: the thing lands where it belongs, labelled as theirs.
export function fulfil(g, e) {
    const it = addItem(g, placeFor(g, e.item, e.forWho), e.item, e.qty, e.forWho);
    closeErrand(g, e.id);
    return it;
}
// At night: errands for housemates to run are done (most of the time; now and then forgotten for a day, and dropped
// after three tries). The player's own errands wait for the player.
export function runErrands(g, day = g.day) {
    const s = stockOf(g);
    const done = [], forgot = [], dropped = [];
    for (const e of [...s.errands]) {
        if (e.by === PLAYER || !g.cast[e.by])
            continue;
        if (hash(`errand|${e.id}|${day}`) < 0.85) {
            fulfil(g, e);
            done.push(e);
            continue;
        }
        e.tries = (e.tries ?? 0) + 1;
        if (e.tries >= 3) {
            closeErrand(g, e.id);
            dropped.push(e);
        }
        else
            forgot.push(e);
    }
    return { done, forgot, dropped };
}
// You came back from a shop: the staples, and the errands you were asked to run.
export function playerShopped(g) {
    const n = restock(g);
    stockOf(g).lastShop = g.day;
    const errands = stockOf(g).errands.filter(e => e.by === PLAYER);
    for (const e of errands)
        fulfil(g, e);
    return { n, errands };
}
export const SHOP_PLACE = /shop|store|market|grocer|supermarket|mall|deli|bakery|butcher|pharmacy|магаз|супермаркет|рынок|лавк|продукт|пекарн|аптек/i;
/* ---------- what the AI is told in a scene ---------- */
const list = (g, items, you, max = 40) => {
    const shown = items.slice(0, max).map(i => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ''}${i.owner ? ` (${ownerName(g, i.owner, you)}'s)` : ''}`);
    return `${shown.join(', ')}${items.length > max ? `, and ${items.length - max} more things` : ''}`;
};
// `here`: what is around: 'kitchen', and/or rooms ('room:<who>'; a shared bedroom is several); [] elsewhere.
export function stockLines(g, here, present, you = '{{user}}') {
    const out = [];
    if (here.includes('kitchen')) {
        const f = itemsIn(g, FRIDGE), p = itemsIn(g, PANTRY);
        out.push(`In the kitchen. Fridge: ${f.length ? list(g, f, you) : 'empty'}. Pantry: ${p.length ? list(g, p, you) : 'empty'}. Labelled things belong to that person.`);
    }
    for (const r of here.filter(isRoom)) {
        const items = itemsIn(g, r);
        if (items.length)
            out.push(`In ${storeName(g, r, you)}: ${list(g, items, you)}.`);
    }
    const lvl = foodLevel(g);
    if (lvl !== 'ok')
        out.push(lvl === 'empty' ? 'The house is out of food: the fridge and pantry are empty.' : 'Food at home is running low.');
    const who = new Set([PLAYER, ...present]);
    const errs = stockOf(g).errands.filter(e => who.has(e.by) || who.has(e.forWho));
    if (errs.length)
        out.push(`Errands: ${errs.map(e => `${ownerName(g, e.by, you)} is to bring ${e.qty > 1 ? `${e.qty} ` : ''}${e.item} for ${ownerName(g, e.forWho, you)}`).join('; ')}.`);
    return out;
}
/* ---------- reading the story (the mechanics model) ---------- */
export const READ_SYSTEM = 'You keep the inventory of a house in an interactive fiction (a role-play story between consenting adults). You note only what clearly happened to things in the lines you are given, in a strict format. You never invent. Most exchanges change nothing: then you answer NONE.';
export function readPrompt(g, lines, you) {
    const stores = storesOf(g).filter(s => !isRoom(s) || itemsIn(g, s).length || roomWho(s) === PLAYER || g.cast[roomWho(s)]);
    const inv = stores.map(s => { const items = itemsIn(g, s); return `- ${storeName(g, s, you)}: ${items.length ? list(g, items, you, 30) : 'empty'}`; }).join('\n');
    const errs = stockOf(g).errands.map(e => `- ${ownerName(g, e.by, you)} is to bring ${e.item} for ${ownerName(g, e.forWho, you)}`).join('\n');
    return [
        `The people in the house: ${you} (the player), ${Object.values(g.cast).map(r => r.name).join(', ')}.`,
        '',
        'What is in the house now:',
        inv,
        ...(errs ? ['', 'Open errands:', errs] : []),
        '',
        'The latest lines of the story:',
        lines,
        '',
        'Write one line for each thing that clearly happened in these lines (nothing that was only talked about):',
        'USE | where | thing | how many        (eaten, drunk, used up or thrown away at home)',
        'ADD | where | thing | how many | whose (optional)   (brought into the house: bought, received, made)',
        'MOVE | from | to | thing | how many | whose (optional)   (taken to another place, or given to someone: whose = the new owner)',
        'ASK | who wants it | who is to bring it | thing   (someone asked someone to buy or bring something, and they agreed)',
        'DONE | who brought it | thing   (an open errand was done in these lines)',
        `"where" is one of: ${stores.map(s => storeName(g, s, you)).join(', ')}. Use the names of things as written above when they are there.`,
        'If nothing happened to any thing, answer only: NONE',
    ].join('\n');
}
// Reads the reply into operations (names of storages and people resolved; anything unknown is dropped).
export function parseRead(g, raw, you) {
    const text = String(raw ?? '').replace(/<(think|thinking|reasoning)>[\s\S]*?<\/\1>/gi, '');
    const person = (s) => {
        const q = norm(s).replace(/^(the player|player)$/, norm(you));
        if (!q)
            return null;
        if (q === norm(you) || q === 'you' || q === 'я')
            return PLAYER;
        const all = Object.values(g.cast);
        const hit = all.filter(r => norm(r.name) === q);
        if (hit.length === 1)
            return hit[0].avatar;
        const loose = all.filter(r => norm(r.name).split(' ')[0] === q.split(' ')[0]);
        return loose.length === 1 ? loose[0].avatar : null;
    };
    const store = (s) => {
        const q = norm(s);
        if (!q)
            return null;
        if (/fridge|refrigerator|холодильник/.test(q))
            return FRIDGE;
        if (/pantry|cupboard|кладов|шкаф/.test(q))
            return PANTRY;
        if (/^(your|my) room$|^моя комната$|^твоя комната$/.test(q))
            return roomOf(PLAYER);
        const m = q.match(/^(.+?)(?:'s|s)? room$/) ?? q.match(/^room of (.+)$/) ?? q.match(/^комната (.+)$/);
        if (m) {
            const p = person(m[1]);
            return p ? roomOf(p) : null;
        }
        return null;
    };
    const num = (s) => { const n = parseInt(String(s ?? '1').replace(/[^\d-]/g, ''), 10); return Number.isFinite(n) && n > 0 ? Math.min(n, 99) : 1; };
    const out = [];
    for (const line of text.split('\n')) {
        const p = line.trim().replace(/^[-*•]\s*/, '').split('|').map(x => x.trim());
        const op = (p[0] ?? '').toUpperCase();
        if (op === 'USE' && p.length >= 3) {
            const a = store(p[1]);
            if (a && p[2])
                out.push({ op: 'use', a, thing: p[2], n: num(p[3]) });
        }
        else if (op === 'ADD' && p.length >= 3) {
            const a = store(p[1]);
            if (a && p[2])
                out.push({ op: 'add', a, thing: p[2], n: num(p[3]), ...(p[4] && person(p[4]) ? { who: person(p[4]) } : {}) });
        }
        else if (op === 'MOVE' && p.length >= 4) {
            const a = store(p[1]), b = store(p[2]);
            if (a && b && a !== b && p[3])
                out.push({ op: 'move', a, b, thing: p[3], n: num(p[4]), ...(p[5] && person(p[5]) ? { who: person(p[5]) } : {}) });
        }
        else if (op === 'ASK' && p.length >= 4) {
            const a = person(p[1]), b = person(p[2]);
            if (a && b && a !== b && p[3])
                out.push({ op: 'ask', a, b, thing: p[3], n: 1 });
        }
        else if (op === 'DONE' && p.length >= 3) {
            const b = person(p[1]);
            if (b && p[2])
                out.push({ op: 'done', b, thing: p[2], n: 1 });
        }
    }
    return out.slice(0, 12); // a runaway reply cannot empty the house
}
// Applies what was read. Returns short notes of what changed.
export function applyRead(g, ops, you) {
    const out = [];
    for (const o of ops) {
        if (o.op === 'use') {
            const it = findItem(g, o.thing, o.a);
            if (!it)
                continue;
            const n = useItem(g, it, o.n);
            if (n)
                out.push({ kind: 'use', text: `${it.name}${n > 1 ? ` ×${n}` : ''} used` });
        }
        else if (o.op === 'add') {
            const it = addItem(g, o.a, o.thing, o.n, o.who);
            if (!it)
                continue;
            out.push({ kind: 'add', text: `${it.name}${o.n > 1 ? ` ×${o.n}` : ''} → ${storeName(g, o.a, you)}` });
            // an open errand for this thing, for this person, is done by it arriving
            const e = stockOf(g).errands.find(x => norm(x.item) === norm(o.thing) && (!o.who || x.forWho === o.who));
            if (e)
                closeErrand(g, e.id);
        }
        else if (o.op === 'move') {
            const it = findItem(g, o.thing, o.a);
            if (!it)
                continue;
            const moved = moveItem(g, it, o.b, o.n, o.who);
            if (moved)
                out.push({ kind: 'move', text: `${moved.name} → ${storeName(g, o.b, you)}` });
        }
        else if (o.op === 'ask') {
            const e = addErrand(g, o.a, o.b, o.thing);
            if (e)
                out.push({ kind: 'ask', text: `${ownerName(g, e.by, you)} will bring ${e.item} for ${ownerName(g, e.forWho, you)}` });
        }
        else if (o.op === 'done') {
            const e = stockOf(g).errands.find(x => x.by === o.b && (norm(x.item).includes(norm(o.thing)) || norm(o.thing).includes(norm(x.item))));
            if (e) {
                const it = fulfil(g, e);
                if (it)
                    out.push({ kind: 'done', text: `${e.item} brought for ${ownerName(g, e.forWho, you)}` });
            }
        }
    }
    return out;
}
