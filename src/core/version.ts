// The version of Mundi (the same as manifest.json: a test checks it) and what each version brought.
// [expanded] Mundi Expanded numbers its releases on top of the upstream version: 0.2.0.N is the Nth release of this
// fork based on Mundi 0.2.0 (after merging upstream 0.3.0 it becomes 0.3.0.1). `newer` compares any number of parts.
export const VERSION = '0.2.0.5';
/** The upstream Mundi version this fork is based on. */
export const BASE = VERSION.split('.').slice(0, 3).join('.');

export interface Release { v: string; title: string; items: [string, string][]; /** [expanded] a release of this fork (no upstream tour for it) */ fork?: boolean }
// Newest first. The first one is what the window shows after an update.
export const CHANGELOG: Release[] = [
    // [expanded] this fork's releases
    { v: '0.2.0.5', fork: true, title: 'The phone and the chats', items: [
        ['phone', 'Three phones: the smartphone, a keypad phone and a PDA, with working keys. And an era for the house (today, the early 2010s, the 2000s): written into the game\'s lorebook, and texting follows it.'],
        ['chat', 'The house group chat: write to everyone, and whoever feels like it answers. Make your own groups of two to four.'],
        ['users', 'They talk without you: about the film they saw, a fight, the empty fridge… (Off, Quiet, Calm, Lively). Sometimes it is "movie night at 9, who\'s in?", and you can answer.'],
        ['heart', 'Texts remember what was said face to face a few minutes ago (only by those who were there), and the scene knows what was texted.'],
        ['moon', 'Close friends may start a chat of their own without you. You never read it, but they talk there, and it shows.'],
    ] },
    { v: '0.2.0.4', fork: true, title: 'Life in the house', items: [
        ['calendar', 'Each person can have a profile: when they sleep, how much they keep to their room, the rooms they like and what they do. Made from their card (you are asked once at the start), edited in This world → People on a 24-hour strip.'],
        ['users', 'People are drawn to the friends they like and keep away from the ones they cannot stand; dinner together is a house rule (phone Settings). The scene knows what everyone in the house is doing right now.'],
        ['home', 'Bedroom doors: knock, and they let you in, come out to talk or say not now. People sleep, and you can wake someone you are close to. Going into an empty room is possible, at a risk.'],
        ['moon', 'Night visits: late at night someone may knock at your door, for a reason (Off, Rare, Sometimes, Often).'],
        ['heart', 'They make plans with each other, at home and out, and sometimes ask you along. They can also say no to you: busy with someone else, upset, or just not in the mood.'],
        ['map', 'The menu on a character is a ring around them that stays on screen.'],
    ] },
    { v: '0.2.0.3', fork: true, title: 'Money and plans', items: [
        ['wallet', 'Money in a Home, off by default (phone Settings): your wallet and the house fund, weekly shares and bills, paid groceries, and a job of yours with a "Go to work" button. A Money app shows it all.'],
        ['heart', 'Gifts: the 🎁 next to the message box gives a thing of yours or money to someone here. How it lands depends on how they react; gifts help friendship a little, never love, and not without limit.'],
        ['moon', 'Slow burn, a new Home difficulty: closeness takes weeks, love grows only out of friendship, and someone you just met is too soon to ask out.'],
        ['calendar', 'Plans with a purpose: movie night, cooking together, drinks out… each one does something when it happens. Ask several people to the same plan.'],
        ['map', 'Go out remembers where you went, with its picture, and starts you off with a dozen places with Mundi\'s pictures.'],
    ] },
    { v: '0.2.0.2', fork: true, title: 'The house\'s things', items: [
        ['utensils', 'A Storage app in the phone: the fridge, the pantry and everyone\'s room, with labelled things (Kathie\'s pudding is Kathie\'s).'],
        ['home', 'Snacks, meals, cooking and coffee use what is in the kitchen; cooking leaves leftovers. When it runs out, they cannot be done until someone shops.'],
        ['users', 'The house eats every day. When food runs low, a housemate does the grocery run at night; coming back home from a shop, you bring the staples.'],
        ['send', 'Errands: when someone asks someone to bring something, it is noted, and brought (or, now and then, forgotten).'],
        ['gear', 'A mechanics model (Settings → Game): a cheap model from your Connection Profiles reads each exchange for what happened to things; without one, the day is read at night.'],
    ] },
    { v: '0.2.0.1', fork: true, title: 'Relationships between characters', items: [
        ['heart', 'In a Home, the characters\' relationships with each other change by themselves: every pair has a value, and every change has a reason written down.'],
        ['moon', 'At night the day\'s scenes are read for what changed between the people in them, and small things happen between housemates without you (Off, Calm or Lively, in the phone\'s Settings).'],
        ['users', 'A Relationships app in the phone: the house as a graph with you in the middle, statuses (sister, rival, ex…), and what is known about each pair.'],
        ['lock', 'The app only shows by default; turn on editing in the phone\'s Settings to write facts, set statuses and move values by hand.'],
    ] },
    { v: '0.2.0', title: 'Homes', items: [
        ['home', 'Home: a new way to play. One house, the characters you choose, and no work, money or bills: just the people and the story.'],
        ['users', 'A ready Home, The Shared House, or your own one made in the Home creator.'],
        ['map', 'Houses with floors and a floor plan, Go out to take the story anywhere, Who lives here to move people in and out, and a dress code for each room.'],
        ['skip', 'In a Home, the clock moves a little with each message. Click it to let time pass.'],
        ['folder', 'Library: drag cards into folders, rename folders and sort them.'],
        ['image', 'Sprites overlap like a stage, and whoever spoke last stands in front.'],
        ['image', 'Porto Alto has a picture for every place, three kinds of apartments and houses, a gym and a cinema.'],
        ['lock', 'The RPG mode and the medieval style are coming soon: they are locked while they get finished.'],
    ] },
];
// "0.2.0" > "0.1.3"
export function newer(a: string, b: string): boolean {
    const pa = a.split('.').map(n => parseInt(n, 10) || 0), pb = b.split('.').map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) { const d = (pa[i] ?? 0) - (pb[i] ?? 0); if (d) return d > 0; }
    return false;
}
