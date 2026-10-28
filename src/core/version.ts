// The version of Mundi (the same as manifest.json: a test checks it) and what each version brought.
// [expanded] Mundi Expanded numbers its releases on top of the upstream version: 0.2.0.N is the Nth release of this
// fork based on Mundi 0.2.0 (after merging upstream 0.3.0 it becomes 0.3.0.1). `newer` compares any number of parts.
export const VERSION = '0.2.0.2';
/** The upstream Mundi version this fork is based on. */
export const BASE = VERSION.split('.').slice(0, 3).join('.');

export interface Release { v: string; title: string; items: [string, string][]; /** [expanded] a release of this fork (no upstream tour for it) */ fork?: boolean }
// Newest first. The first one is what the window shows after an update.
export const CHANGELOG: Release[] = [
    // [expanded] this fork's releases
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
