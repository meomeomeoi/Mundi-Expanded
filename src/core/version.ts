// The version of Mundi (the same as manifest.json: a test checks it) and what each version brought.
// [expanded] Mundi Expanded's versions: the upstream Mundi version it is built on, a dash, and this fork's own release
// number, which goes on across upstream versions: 0.2.1-11.1 is Expanded 11.1 on Mundi 0.2.1 (until 0.2.0.11 the
// two were glued together as a fourth part). `newer` compares the numbers in order, so both forms compare right.
export const VERSION = '0.2.1-11.1';
/** The upstream Mundi version this fork is based on. */
export const BASE = VERSION.split('-')[0];
/** This fork's own release number (11.1). */
export const EXPANDED = VERSION.split('-').slice(1).join('-');

export interface Release { v: string; title: string; items: [string, string][]; /** [expanded] a release of this fork (no upstream tour for it) */ fork?: boolean }
// Newest first. The first one is what the window shows after an update.
export const CHANGELOG: Release[] = [
    { v: '0.2.1-11.1', fork: true, title: 'Mundi 0.2.1 inside', items: [
        ['bell', 'Everything from Mundi 0.2.1: visitors and the doorbell, guests from outside at parties, going out with anyone and on to another place, things to do that fit the room, needs if you want them, rain sounds, the dialog box on the left, sprites on either side.'],
        ['lock', 'Mundi 0.2.1\'s safety fixes: world files, cards and messages can no longer run code or press Mundi\'s buttons.'],
        ['chat', 'This world → AI context lists everything that calls the AI, each with its own switch.'],
        ['gear', 'New version numbers: the upstream Mundi version, then Expanded\'s own (0.2.1-11.1: Expanded 11.1 on Mundi 0.2.1).'],
    ] },
    // [expanded] this fork's releases
    { v: '0.2.0.11', fork: true, title: 'Their move', items: [
        ['chat', 'Walk into a room and a conversation may already be going: two of them, three, or everyone, mostly about nothing in particular (their interests, the worst job they ever had, who would die first in a horror movie), now and then about the house\'s news. Listen, join in or walk past; they may pull you in, or fall silent when it is about you.'],
        ['users', 'They come to you: someone comes up with something on their mind (listen, or not now), comes looking for you, knocks on your door, texts when you are out, or invites you to a movie night this evening (the phone reminds you, and they notice if you do not show).'],
        ['moon', 'A hidden social battery: company tires them (introverts sooner, close people later), and when they have had enough, they go to their room. Show the truth says where it stands.'],
        ['eye', 'What everyone is doing shows under their name (headphones on, making tea). Walking to another room takes a minute. Fog on the map (Settings): only your room, and where you last saw everyone.'],
        ['list', 'The night reader keeps what was left open (a bet, a promise to show an anime) for them to pick up later. The everyday topics are a list you can edit (Settings → Their move).'],
    ] },
    { v: '0.2.0.10', fork: true, title: 'Live in the scene', items: [
        ['sparkles', 'Quick reactions, now and then: when a character teases you, asks something small or does something sudden, two or three ways to react appear by the message box, in your persona\'s voice (a quiet one is never offered a rude one). Tap to put it in the box and add your own words. Never on serious moments; rarely by default (Settings).'],
        ['bolt', 'Some moments cannot wait: a short timer, and if you hesitate, the story says so. Knocks are anonymous until you ask "Who is it?", and give up after a while. Calls ring in the scene: answer (voice only), decline or miss them.'],
        ['phone', 'The phone buzzes: messages pop up over the phone button while it is closed, with an unread count; whoever is here notices when you keep looking at it.'],
        ['star', 'Do something together (the ✦ by the message box): watch a film on the TV with everyone\'s reactions popping up over their heads; play a match on the console, five rounds of timing against their trash talk; rock-paper-scissors or a coin to settle who does the dishes. It all goes into the story.'],
        ['happy', 'Sprites live a little: a slow breath, a small hop when someone new comes in, the one speaking in front and the others dimmed.'],
    ] },
    { v: '0.2.0.9', fork: true, title: 'Behind closed doors', items: [
        ['heart', 'Feelings between them, one way: Kathie may have a crush on Leah that Leah knows nothing about. Crushes grow from flirting (as their orientation allows), are confessed or not, and two of them make a couple. Your romance line now says it is their feelings for you; you can mark your own (and keep them to yourself).'],
        ['speaker', 'Listen at a closed door: mostly muffled sounds and scraps of words. You may be caught. Someone may listen at yours, rarely. The walls are thin, ordinary or thick (Settings).'],
        ['eye', 'Keep an eye on someone for a few hours (their menu): where they go, and with whom. Ask the people here about a secret: they tell, hint or cover, by whom they trust.'],
        ['moon', 'Nights: couples stay over now and then (your partner with you too), a secret one slips out early, neighbours may hear; the morning after is easy or awkward. Your partner can move into your room; ask the house for a room for a date tonight.'],
        ['gear', 'A failed mechanics call (the night, the story reader, listening) now shows a notice with Try again. One switch turns flirting and romance off.'],
    ] },
    { v: '0.2.0.8', fork: true, title: 'Who knows what', items: [
        ['eye', 'Everything between the people in the house now has the ones who know it. The story is told who here does not know (they keep a secret in front of them), what someone here knows about people who are not, and which earlier conversations they were not at. Alone behind a closed door, nobody overhears.'],
        ['heart', 'Secrets: a couple may keep it to themselves (and so can you). They meet late in one of their rooms; whoever is up may notice: a suspicion first, then knowing. Closed bedrooms on the map only show that someone is inside.'],
        ['chat', 'News travels: from those who know to the ones they spent the day with, by how juicy it is, how well they keep secrets and whom they are loyal to. A promise nearly stops it; third-hand, the story comes out wrong. Those close to you bring it to you.'],
        ['users', 'Finding out has consequences: jealousy (yours too, when your partner finds out), "you knew and said nothing", less trust in whoever talked, unfinished business that does not fade until it is talked out. Now and then, with a reason, they become friends, fall out, break up or start seeing each other.'],
        ['user', 'Relationships shows what you know, and how ("you saw it", "Kathie told you", "you suspect"); Show the truth for everything. Profiles: keeps a secret, notices things, orientation, status.'],
    ] },
    { v: '0.2.0.7', fork: true, title: 'Rooms and their things', items: [
        ['home', 'Every room has its things now: a TV in the living room, a guitar and a PC in someone\'s bedroom, a coffee machine in the kitchen. The scene knows what is in the room, and what you can do here follows (no TV, no movie night). Bedrooms are furnished from who lives there; edit anything in Storage → Furniture.'],
        ['users', 'They do what they like where the thing is: the gamer stays in with the PC, the social ones take the console to the living room. Homebodies still keep to their room now and then.'],
        ['download', 'Getting things: order online from the phone (it comes in a day or two, a box in the hallway to unpack), buy in person at the electronics store, the furniture store or the flea market, find something left on the curb, rummage in the storage room. What happens in the story counts too, and a big gift stands in its new owner\'s room.'],
        ['chat', 'House purchases: someone proposes in the house chat to buy something from the fund, for everyone or for their own room (harder). The house votes, you can too; you propose from the shop. How often: the chat settings.'],
        ['user', 'Your portrait: your own sprites in the corner of the scene, in a frame of the house\'s era. The face you pick, always neutral, or read from the story with everyone else\'s. Click it to add sprites (a .zip or images), outfits follow the dress code.'],
    ] },
    { v: '0.2.0.6', fork: true, title: 'Faces, footsteps and fixes', items: [
        ['users', 'Faces for everyone in the scene: once a turn is over, the mechanics model gives every person here an expression from their sprites, listeners too (teased, praised, ignored). Settings → Game → Facial expressions. A swipe is read again.'],
        ['map', 'People who walk off in the story really go: "I\'m heading out to the patio" takes them there for a while, and whoever agrees to come along follows you from room to room.'],
        ['chat', 'Group chats, fixed: the answers arrive, one by one as if typed, at the right time; conversations without you happen even while you sleep. Conversation now / Call now in the chat settings.'],
        ['eye', 'Characters above the dialogue box, whole (Settings → Layout), and H (or the eye on the box) hides it for a full look.'],
        ['phone', 'The keypad phone and the PDA, redrawn: brushed metal and graphite, a glass screen, keys you want to press.'],
        ['gear', 'Cheaper and steadier: the mechanics model thinks only as much as needed, group turns can share one prompt (for caching), a preset\'s "Send if empty" lines no longer move the clock or clutter the story, and the scene prompt keeps the house, your notes and the texts in blocks of their own.'],
    ] },
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
    { v: '0.2.1', title: 'Fixes and improvements for Home mode', items: [
        ['bell', "Visitors: invite people over from the Calendar. They arrive about an hour later, ring the doorbell and stay until you say goodbye. You choose where each one sleeps."],
        ['users', "Parties can have guests from outside, or happen somewhere out. Edit the guests on the party card, and ask someone to stay after the party."],
        ['home', "What you can do fits the room: eating in the kitchen and the dining room, washing up in the bathrooms, the TV and video games in the living room, swimming at the pool… Your own Homes too."],
        ['utensils', "Needs, if you want them: hunger, thirst, mood and hygiene, shown under the clock (This Home → Needs)."],
        ['moon', "Sleeping through a party or a date asks first, and Sleep until wakes you up just in time."],
        ['chat', "The AI narrates what you do right away. Everything that calls the AI can be turned off in This world → AI context."],
        ['image', "Rain sounds, sprites on the left or the right in Cards, and the dialog box on the left in Visual novel."],
        ['lock', "Safety fixes (thanks, coldasblues). A spouse added later shows as Married, and playful slaps no longer cost bond."],
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
    const pa = a.split(/[.-]/).map(n => parseInt(n, 10) || 0), pb = b.split(/[.-]/).map(n => parseInt(n, 10) || 0);   // [expanded] "0.2.1-11.1" too
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) { const d = (pa[i] ?? 0) - (pb[i] ?? 0); if (d) return d > 0; }
    return false;
}
