// [expanded] What people in the house talk about (Mundi Expanded 0.2.0.11), pure logic, tested on its own.
//
// A model asked for "a random topic" never picks one: it picks the likeliest (the weather, coffee, "how was your day";
// two gamers: "what are you playing"). So chance comes from here and the model only puts it into words. A topic comes
// from one of four sources, mixed by how dramatic the house is set to be:
//  - the house's own news (a secret, a fight, a new thing in the house: the mechanics), now and then;
//  - threads: what was really left open in earlier scenes (a bet, a promise to show an anime, an unfinished argument),
//    picked up by the night reader;
//  - an interest of someone taking part, from an angle (a funny story about it, an argument about it…);
//  - a list of everyday hooks ("the worst job you ever had"), which players can extend in the settings.
// Then a tone (lazy chatter, an argument, a heart-to-heart…), weighted by how they get along, and where the conversation
// is when you walk in (starting, in full swing, wrapping up).
// Also here: the social battery (time with you tires them; time apart recharges) and the initiative that brings them
// to you (it grows while you are apart).
export const TONES = {
    lazy: 'lazy, aimless chatter', joking: 'joking around, teasing, laughing', argue: 'a heated (but not serious) argument',
    heart: 'a quiet heart-to-heart', lecture: 'one of them enthusiastically explaining, the others listening (or not)',
    gossip: 'gossiping, voices lowered', complain: 'complaining together, venting', flirt: 'flirting, a little charged',
};
export const STAGES = {
    start: 'just starting (the first lines)', middle: 'in full swing', end: 'wrapping up (the last lines, about to split up)',
};
/* ---------- the list of everyday hooks ---------- */
// "#tone" marks a tone it suits; "@phone" smartphone years (now, the 2010s), "@now" only today, "@00s" only the 2000s.
const RAW = `the worst roommate anyone ever had #complain #joking
whose turn it is to take out the trash #argue
what to cook this week when nobody wants to cook #lazy
the weird noise the house makes at night #joking
the right way to load a dishwasher #argue
a dream from last night that made no sense #lazy #joking
how they each take their coffee or tea, and judging each other for it #joking
the most useless thing they own and refuse to throw away #joking
what they would change about the house if it were theirs #lazy
a neighbour who is clearly up to something #gossip #joking
the thermostat: too hot, too cold #argue
a delivery that went wrong #complain
plants that keep dying, and who is to blame #joking
the perfect lazy Sunday #lazy
tricks for falling asleep #lecture #lazy
morning people versus night people #argue
the one chore each of them does not mind #lazy
the mystery container at the back of the fridge #joking #complain
how to split the bills fairly #argue
the weather and what it does to their mood #lazy
food they loved as kids and still secretly eat #joking #heart
the most overrated food #argue
pineapple on pizza #argue #joking
a dish from their family they wish they could cook #heart
the worst meal they ever had at a restaurant #joking
one cuisine to eat for the rest of their life #argue
whether a hot dog is a sandwich #argue #joking
the best snack for a movie night #lazy
spicy food: brave or stupid #joking
a recipe someone swears by #lecture
the worst job they ever had #complain #joking
a teacher they still remember, for better or worse #heart
what they wanted to be as kids #heart #joking
a boss or a coworker who drives them crazy #complain
what they would do with a sudden pile of money #lazy
quitting everything and moving to the countryside #lazy #heart
the most embarrassing moment at school or work #joking
whether a degree is worth it #argue
side hustles and get-rich-quick ideas #joking #lecture
being broke at the end of the month #complain
who in the house would die first in a horror movie #joking
what they would take to a desert island #lazy
the plan for a zombie apocalypse #joking #argue
swapping lives with someone for a week #lazy
a completely useless superpower #joking
which animal would be the rudest if animals could talk #joking
time travel: the past or the future, and why #argue
the one rule they would make everyone follow #argue
if the house were a sitcom, who would play which role #joking
the last meal they would choose #lazy
being invisible for a day #joking
waking up famous one morning #lazy
which fictional world they would live in #lazy #argue
living forever: a gift or a curse #lecture #heart
what they would do if the world ended tomorrow #heart
the best trip they ever took #heart #lazy
a first concert, or a show that stuck with them #heart
a childhood friend they lost touch with #heart
getting lost somewhere as a kid #heart #joking
the stupidest thing they did as a teenager #joking
a birthday that went wrong #joking
a pet they had growing up #heart
a song that takes them back to a certain summer #heart
the worst haircut of their life #joking
a time they got caught lying #joking
grandparents and the things they used to say #heart
a family holiday tradition #heart
the first time they lived away from home #heart
a scar and the story behind it #joking #heart
something they were scared of as kids #joking #heart
a movie everyone loves that they cannot stand #argue
a show they are bingeing and cannot shut up about #lecture
a book that changed how they see things #lecture #heart
guilty-pleasure music #joking
the best and the worst sequels #argue
a video game that ruined their sleep #joking
a song stuck in their head all day #joking #complain
an anime to start with for someone who never watched any #lecture
a celebrity they would want as a neighbour #lazy #joking
a trend they never understood #complain #joking
cats versus dogs #argue
the best season of the year #argue #lazy
fashion from the past that should come back #joking
a hobby they gave up and miss #heart
a hobby they want to try but are scared to #heart
the worst date story they know #joking #gossip
how you know a friendship is real #heart
red flags in people #argue #joking
a compliment they still remember #heart
what annoys them most in other people #complain
the perfect gift, given or received #heart
how their parents met #heart
siblings versus being an only child #heart #argue
small talk with strangers: love it or hate it #argue
a stranger who was unexpectedly kind #heart
someone from their past they would like to apologise to #heart
what they would never forgive #heart #argue
love at first sight: real or nonsense #argue #flirt
their type, if they have one #flirt #joking
the most romantic thing they ever saw #heart #flirt
a weird fact they read somewhere #lecture
space, aliens and whether we are alone #lecture #lazy
whether the ocean is scarier than space #argue
conspiracy theories that are fun to believe #joking
how dreams work, or how they think they do #lecture
ghosts: does anyone believe in them #joking #argue
the best way to learn a language #lecture
a moment in history they would like to have seen #lecture
how something they use every day actually works #lecture
a documentary that blew their mind #lecture
whether people really change #heart #argue
what makes a good life #heart #lecture
luck or hard work #argue
being happy versus being right #heart
whether it is better to be loved or respected #argue
what they would tell their younger self #heart
what a perfect day looks like #heart #lazy
the most important invention ever #argue #lecture
white lies: fine or not #argue
regrets, and whether they are any use #heart
whether a straw has one hole or two #argue #joking
the correct way to eat a sandwich #argue #joking
ranking the rooms of the house #joking
a name for the spider that lives in the corner #joking
which of them would win a fight with a goose #joking
the most cursed food combination they have tried #joking
inventing a holiday of their own #joking
a crime they would commit if it were legal for one day #joking
the last thing they searched for online @phone #joking
a meme that lives in their head rent-free @now #joking
dating apps and their horror stories @phone #joking #gossip
screen time, and how bad theirs is @phone #complain #joking
a viral video they cannot stop thinking about @phone #joking
a group chat that got out of hand @phone #gossip #joking
quitting social media, or wanting to @phone #heart #argue
the best phone they ever had #lazy
whether AI will take their jobs @now #argue
shopping online at three in the morning @phone #joking
burning a mix CD for someone @00s #heart
messenger statuses they are ashamed of @00s #joking
flip phones and their ringtones @00s #joking
renting DVDs and returning them late @00s #complain
dial-up and the sound of the modem @00s #joking
sleeping badly lately #complain
whether anyone actually enjoys working out #argue
a cold that will not go away #complain
the crush everyone has at the gym #gossip #flirt
trying to drink more water #lazy
where they see themselves in five years #heart
a city they would move to #lazy
a skill they want to learn this year #lazy
a trip they keep planning and never take #lazy
kids: someday, or never #heart
what they would name a pet #lazy #joking
a small goal for this week #lazy
their dream house #lazy
retirement plans, half joking #joking
something on their bucket list that scares them #heart
celebrity drama in the news #gossip
a disaster at a friend of a friend's wedding #gossip #joking
an ex who keeps popping up #gossip #complain
two coworkers who are definitely dating #gossip
a relative's questionable life choices #gossip #complain
the best way to spend a rainy day #lazy
an argument they still think they won #argue #joking
lucky charms and superstitions #joking
star signs: nonsense or not #argue #joking
a movie that made them cry #heart
the scariest thing that ever happened to them #heart
the most expensive mistake they ever made #joking #complain
what they would do if the power went out for a week #lazy
a talent nobody knows they have #joking
which of them would last longest alone in the woods #argue #joking
the right way to spend a first paycheck #argue
tipping: how much, and when #argue
stories from public transport #complain #joking
the best smell in the world #lazy
an unpopular opinion they hold #argue`;
export function parseHook(line) {
    const tones = [...line.matchAll(/#(\w+)/g)].map(m => m[1]).filter(t => t in TONES);
    const era = line.match(/@(phone|now|00s)\b/)?.[1];
    const t = line.replace(/[#@]\w+/g, '').replace(/\s+/g, ' ').trim();
    if (!t)
        return null;
    return { t, tones, ...(era ? { eras: era === 'phone' ? ['now', '2010s'] : era === 'now' ? ['now'] : ['2000s'] } : {}) };
}
export const HOOKS = RAW.split('\n').map(parseHook).filter((h) => !!h);
/** The list as the player has it: the built-in hooks (minus the ones turned off) and their own (marked the same way). */
export function hooksFor(era, off = [], mine = []) {
    const own = mine.map(parseHook).map((h, i) => (h ? { h, id: `m${i}` } : null)).filter((x) => !!x);
    return [...HOOKS.map((h, i) => ({ h, id: `b${i}` })).filter(x => !off.includes(Number(x.id.slice(1)))), ...own].filter(x => !x.h.eras || x.h.eras.includes(era));
}
/** An interest of someone taking part, from an angle (so "games" is not always "what are you playing"). */
export const ANGLES = ['something new about it they are excited about', 'a disagreement about it', 'one of them trying to get the other into it',
    'a funny story connected to it', 'a frustration with it', 'an unpopular opinion about it', 'a memory connected to it', 'a plan involving it'];
// what is not an interest (the everyday things profiles list too)
const ORDINARY = /\b(phone|nap|napping|tidy|tidying|snack|call with|nothing|bed|scroll|shower|laundry|dishes|washing up|fridge|tea|coffee|window|chatting|hanging around)\b/i;
export const interestsOf = (acts) => acts.map(a => a.text).filter(t => t && !ORDINARY.test(t));
export const seeded = (s) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};
export function pickW(items, rng) {
    const sum = items.reduce((s, [, w]) => s + Math.max(0, w), 0);
    if (sum <= 0)
        return null;
    let r = rng() * sum;
    for (const [x, w] of items) {
        r -= Math.max(0, w);
        if (r <= 0)
            return x;
    }
    return items[items.length - 1][0];
}
/** How often the sources are used, by how dramatic the house is set to be. */
export const MIX = {
    calm: { house: 10, thread: 20, interest: 35, list: 35 },
    normal: { house: 18, thread: 27, interest: 27.5, list: 27.5 },
    spicy: { house: 30, thread: 30, interest: 20, list: 20 },
};
export const FREQ = { off: 0, rare: 0.5, normal: 1, often: 1.5 };
/** Is a conversation going on when you walk in (two or more free people here)? Rarer in the morning and the day; a
 *  little likelier with more people. */
export function talkChance(n, hour, freq) {
    if (n < 2)
        return 0;
    const time = hour >= 6 && hour < 12 ? 0.6 : hour >= 12 && hour < 17 ? 0.8 : hour >= 17 && hour < 23 ? 1 : 0.5;
    return Math.min(0.75, (0.4 + 0.05 * Math.min(4, n - 2)) * time * FREQ[freq]);
}
/** Who is talking: two of them, three, or everyone (pairs who get along talk more). */
export function groupOf(cands, value, rng) {
    if (cands.length <= 2)
        return [...cands];
    const size = pickW(cands.length === 3 ? [[2, 0.6], [3, 0.4]] : [[2, 0.45], [3, 0.3], [cands.length, 0.25]], rng) ?? 2;
    if (size >= cands.length)
        return [...cands];
    const pairs = [];
    for (let i = 0; i < cands.length; i++)
        for (let j = i + 1; j < cands.length; j++)
            pairs.push([[cands[i], cands[j]], Math.max(10, value(cands[i], cands[j]) + 100)]);
    const [a, b] = pickW(pairs, rng);
    const out = [a, b];
    while (out.length < size) {
        const rest = cands.filter(c => !out.includes(c));
        const c = pickW(rest.map(x => [x, Math.max(10, value(a, x) + value(b, x) + 200)]), rng);
        if (!c)
            break;
        out.push(c);
    }
    return out;
}
export function pickStage(rng) { return pickW([['start', 35], ['middle', 40], ['end', 25]], rng); }
/** The tone: weighted by how they get along (v: -100..100), what suits the topic, and whether flirting fits. */
export function pickTone(o, rng) {
    const w = { lazy: 20, joking: 18, argue: 10, heart: 8, lecture: 8, gossip: 10, complain: 12, flirt: o.flirt ? 6 : 0 };
    if (o.v <= -20) {
        w.argue *= 3;
        w.lazy *= 0.5;
        w.heart *= 0.3;
        w.joking *= 0.5;
        w.flirt *= 0.2;
    }
    else if (o.v >= 50) {
        w.heart *= 2;
        w.joking *= 1.3;
    }
    if ((o.nosy ?? 50) >= 65)
        w.gossip *= 1.5;
    if (o.interest)
        w.lecture *= 1.5;
    for (const t of o.hint ?? [])
        w[t] *= 2.5;
    return pickW(Object.entries(w), rng) ?? 'lazy';
}
/** A hook from the list, not one this group talked about lately. */
export function pickHook(list, used, rng) {
    const fresh = list.filter(x => !used.includes(x.id));
    const from = fresh.length ? fresh : list;
    return from.length ? from[Math.floor(rng() * from.length)] : null;
}
/* ---------- the call that puts it into words ---------- */
export const TALK_SYSTEM = 'You write short snatches of everyday conversation between housemates for an interactive fiction (a role-play between consenting adults). Natural, specific, in character; never a summary. Answer with JSON only.';
export function talkPrompt(t) {
    const n = t.lines ?? (t.stage === 'end' ? 2 : 3);
    return `In the ${t.room}, ${t.people.map(p => p.name).join(', ')} are talking${t.era ? ` (${t.era})` : ''}. ${t.user} walks in.
Who they are:
${t.people.map(p => `- ${p.name}: ${p.about}`).join('\n')}
What about: ${t.topic}.
How: ${TONES[t.tone]}.
Where the conversation is: ${STAGES[t.stage]}.
Write the ${n} lines ${t.user} hears coming in (each one line of speech, maybe a short action in asterisks; in character; specific, not generic; they do not notice ${t.user} yet${t.stage === 'end' ? '; the last line ends it' : ''}). Also say in a few words what the conversation is about, as it turned out.
JSON only: {"about": "...", "lines": [{"who": "Name", "say": "..."}]}`;
}
export function parseTalk(j, names) {
    if (!j || typeof j !== 'object')
        return null;
    const find = (s) => { const q = String(s ?? '').trim().toLowerCase(); return names.find(n => n.toLowerCase() === q) ?? names.find(n => q && (n.toLowerCase().startsWith(q) || q.startsWith(n.toLowerCase().split(' ')[0]))) ?? null; };
    const lines = (Array.isArray(j.lines) ? j.lines : []).map((l) => ({ who: find(l?.who), say: String(l?.say ?? '').replace(/\s+/g, ' ').trim().slice(0, 300) }))
        .filter((l) => l.who && l.say).slice(0, 5);
    if (!lines.length)
        return null;
    return { about: String(j.about ?? '').replace(/\s+/g, ' ').trim().slice(0, 120), lines };
}
export const THREAD_DAYS = 5, THREADS_PAIR = 3;
export const threadText = (user) => ['', `Open threads: if today's scenes left something open that they would come back to (a bet, a promise to show or lend something, an argument left unfinished, a plan to marathon a show, an inside joke, a recommendation to try), one line each, at most three in all: THREAD | Name & Name | what is left open, in a few words. ${user} counts. Only what really was said; most days none.`];
export function parseThreads(raw, find, day) {
    const out = [];
    for (const line of String(raw ?? '').split('\n')) {
        const p = line.trim().replace(/^[-*•]\s*/, '').split('|').map(x => x.trim());
        if ((p[0] ?? '').toUpperCase() !== 'THREAD' || p.length < 3 || !p[2])
            continue;
        const who = [...new Set(p[1].split(/&|,|\band\b/).map(s => find(s)).filter((x) => !!x))];
        if (who.length < 2)
            continue;
        out.push({ id: `t${day}-${out.length}`, who, text: p[2].slice(0, 140), day });
        if (out.length >= 3)
            break;
    }
    return out;
}
export const pairK = (who) => [...who].sort().join('|');
/** Adds new threads: old ones fade after a few days unless picked up again; at most a few for each pair. */
export function keepThreads(list, add, day) {
    const all = [...list.filter(t => day - Math.max(t.day, t.used ?? -99) <= THREAD_DAYS), ...add];
    const by = {};
    for (const t of all)
        (by[pairK(t.who)] ??= []).push(t);
    return Object.values(by).flatMap(l => l.slice(-THREADS_PAIR));
}
/** Threads that fit the people here (all of the thread's people among them, or two of them in it). */
export const threadsFor = (list, who) => list.filter(t => t.who.filter(a => who.includes(a)).length >= Math.min(2, t.who.length));
/* ---------- the social battery, and initiative ---------- */
export const TIRED = 40, DONE = 15;
/** How fast company tires them (points an hour, of 100): an introvert in two hours, an extrovert in about seven;
 *  closer people last longer, a partner longer still, someone upset with you sooner. With others (not you): half. */
export function drainPerHour(o) {
    let hours = 2 + Math.max(0, Math.min(100, o.social)) / 20;
    hours *= 1 + Math.max(0, Math.min(100, o.bond)) / 100;
    if (o.partner)
        hours *= 1.3;
    if (o.upset)
        hours *= 0.6;
    return (100 / hours) * (o.others ? 0.5 : 1);
}
export const RECHARGE = 30;
export const tierOf = (v) => (v > TIRED ? 'ok' : v > DONE ? 'tired' : 'done');
/** How much they want to come to you, an hour apart (of 100): closeness, feelings, and things they want to tell you. */
export const initGain = (o) => Math.max(0, o.bond) / 100 * 5 + Math.max(0, o.love) / 100 * 6 + Math.min(3, o.agenda) * 2;
export const SEEK = 60;
/** Busy with something that does not invite a chat (headphones on, at work, on a call, asleep…). */
export const busyAct = (act) => /headphones|working|work on|studying|on a call|call with|napping|asleep|sleeping|in the bath|shower|meditat|praying/i.test(act);
