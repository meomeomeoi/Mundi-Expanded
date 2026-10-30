// The version of Mundi (the same as manifest.json: a test checks it) and what each version brought.
// [expanded] Mundi Expanded's versions: the upstream Mundi version it is built on, a dash, and this fork's own release
// number, which goes on across upstream versions: 0.2.1-11.1 is Expanded 11.1 on Mundi 0.2.1 (until 0.2.0.11 the
// two were glued together as a fourth part). `newer` compares the numbers in order, so both forms compare right.
export const VERSION = '0.2.1-14.5';
/** The upstream Mundi version this fork is based on. */
export const BASE = VERSION.split('-')[0];
/** This fork's own release number (11.1). */
export const EXPANDED = VERSION.split('-').slice(1).join('-');

export interface Release { v: string; title: string; items: [string, string][]; /** [expanded] a release of this fork (no upstream tour for it) */ fork?: boolean }
// Newest first. The first one is what the window shows after an update.
export const CHANGELOG: Release[] = [
    // [expanded] this fork's releases
    { v: '0.2.1-14.5', fork: true, title: 'Upkeep is not a scene', items: [
        ['chat', 'Eating, drinking and washing no longer make the AI write a reply of their own each time (needs make you do them every day). The scene is told in a line; cooking, music, sport, games and the like are narrated as before.'],
        ['gear', 'Narrate what you do right away: Everything, What matters (default) or Nothing (AI context). Your old on/off choice carries over.'],
    ] },
    { v: '0.2.1-14.4', fork: true, title: 'Walk past means walk past', items: [
        ['chat', 'Walking past a conversation and staying in the room (to eat, say): the next replies are about what you do; their talk goes on in the background instead of being written out.'],
    ] },
    { v: '0.2.1-14.3', fork: true, title: 'Out of the house', items: [
        ['map', 'Profiles have "What they do in life" and their times out of the house (classes, work, the gym, nights out: days and hours, past midnight too). "The housemates leave the house" now follows them; before, with no shift set, nobody ever left.'],
        ['user', 'This Home\'s job and shift table is gone (the profile does it); a job and shift from an older save move into the profile by themselves.'],
        ['heart', 'Open relationships: two switches, in People → Settings with the rest of romance: for you (as before), and in the house (no cheating between housemates, more than one partner).'],
        ['gear', 'Minutes per message: 2, 5, 10 or 15 (This Home → World).'],
    ] },
    { v: '0.2.1-14.2', fork: true, title: 'Room for memory', items: [
        ['gear', 'The token budget (This Home → AI context) goes up to 8000, and "no limit" is now at the right end of the slider. A month into a Home, the long memory alone can be 2000–3000 tokens with everyone at home.'],
        ['book', 'Long memory is its own block ("Long memory"): you see its size, can switch it off, and it is dropped late when over the budget (it was inside "What they are doing").'],
    ] },
    { v: '0.2.1-14.1', fork: true, title: 'Not everyone looks', items: [
        ['phone', 'Taking the phone out: instead of "someone may notice" told to everyone every time (0.2.0.10), each person here rolls to notice (more often the nosier they are, a third as often if they noticed lately); the scene is told who noticed and who did not. Someone you text while they sit right here always knows.'],
        ['users', 'Fixed: the Relationships graph slid under the list when a person was open (every phone skin).'],
        ['gear', 'Fixed: the "Keeps a secret", "Notices and pries" and "How social" sliders did not update their number when let go.'],
    ] },
    { v: '0.2.1-14', fork: true, title: 'Memory', items: [
        ['star', 'Landmarks: the night weighs every moment (1 passing … 5 unforgettable). Heavy ones, and anything you pin, are never forgotten; every few days they are folded into "the story so far" (you and each person, and each person\'s own).'],
        ['moon', 'Ordinary moments fade with time by how much they weighed (a half-life you set), instead of only the last two being kept.'],
        ['users', 'What they know about each other (and about you): small lasting facts the night notes down, updated when they change.'],
        ['heart', 'Who they have become: steps of change, only ever added, with brakes (something weighty behind it, some history first, at most one step every few days per person).'],
        ['book', 'This Home → Memory: presets and every dial (diary days, landmark weight, fading, how often stories are rewritten and how long, the brake), a token estimate, and all of it to read, edit, pin or delete.'],
    ] },
    { v: '0.2.1-13', fork: true, title: 'Scenes', items: [
        ['chat', 'The dialogue log in scenes: a new place, an hour\'s pause or an almost new company starts one; someone coming in or leaving is a mark inside; a word next door is an aside, not a new scene. The earlier scenes of the day fold to one line (where, when, who): a click opens one.'],
        ['book', 'Previously (the book in the log\'s corner): the days before, scene by scene. They stay hidden from the AI; this is for you.'],
        ['lock', 'What the AI reads of today: the scenes none of the people here were in are left out of the prompt (the chat itself is untouched; they come back when one of those people is with you). People, Settings: "What they were there for" (new), Strict, or Everything (as before).'],
        ['eye', 'Someone listening at your door now knows the scraps they caught, and the scene says so (no more "did not hear" for them).'],
    ] },
    { v: '0.2.1-12.4', fork: true, title: 'Standing still', items: [
        ['image', 'Fixed: whoever spoke slid half a place sideways onto the next person (the step-up lost the centring). Now only the picture lifts a few pixels; the places stay put.'],
        ['moon', 'Go out goes by each person\'s own bedtime, not 23:00: someone going to bed within two hours says no unless close to you (a night owl still comes at 1 a.m.).'],
    ] },
    { v: '0.2.1-12.3', fork: true, title: 'Movie nights for everyone', items: [
        ['users', 'An invitation to a movie night (or games, or cooking) at home is a get-together in that room, not a date: the panel shows the host and everyone there, nobody follows you around, and leaving the room or "Call it a night" ends it.'],
        ['map', 'Go out: someone asleep or a stranger will not come along; the picker says why.'],
        ['phone', 'The phone battery runs down through the day (about a fifth left by 23:00) and charges while you sleep; never below 5%.'],
        ['eye', 'Listening at a door: the model knows who is inside and how they get along, has room to answer, and a cut-off answer ends at a whole sentence.'],
        ['star', 'Crossword themes come from a list of 50 and do not repeat for a while.'],
        ['skip', 'Stopping the goodbye at the end of a meet-up ends it all the same (they no longer stay "saying goodbye" in every room).'],
        ['image', 'A sprite whose figure is off to one side of its picture is trimmed so the figure stands in the middle of its place. Your portrait steps up above the dialog when the phone is open. The keypad phone\'s settings fit again.'],
    ] },
    { v: '0.2.1-12.2', fork: true, title: 'Traits that add up', items: [
        ['star', 'Two traits on the same skill (Strong and Athletic) now add up a little: the higher one, +1 for each other one, up to level 5.'],
        ['user', 'Interests make skills grow faster instead: +20% experience in the skills they are about (Cooking, Music, Books, Technology, Sports, Art; two on one skill, +40%). The tooltips and Me show it.'],
    ] },
    { v: '0.2.1-12.1', fork: true, title: 'What the traits do', items: [
        ['star', 'Picking your persona\'s traits for a Home: a dot marks the ones that change the rules, and hovering one shows what it does (a skill it starts you at, more time in the cleaning games for Handy).'],
        ['user', 'Your traits give you your starting skills right away (no need to open Me first); Me still lets you adjust them.'],
    ] },
    { v: '0.2.1-12', fork: true, title: 'Your own life', items: [
        ['star', 'Mini-games for what you do on your own: cooking (a dish from what is in the fridge, its choices and the heat), the guitar (a rhythm game you can hear), cleaning (scrub and put away), a crossword, work and study (focus, while the house is noisy), programming (find the bug, choose the design), writing (pick or write the lines). Or just do it.'],
        ['user', 'Skills that grow (slowly, Settings), told to the scene: the guitar is heard through the walls, the meal is judged, the story can be read (or snooped). The traits picked for your persona now count in Home. A new app: Me.'],
        ['users', 'Do it together: cook, play, clean or study with someone here; in a crossword they may know the answer (or not want to help).'],
        ['home', 'Chores: a weekly rota for the dishes, the trash, the common rooms and the bathroom (you too). Undone, the mess shows; on Serious, someone tidy complains. Remind someone (their menu), but do not nag.'],
        ['calendar', 'The house\'s calendar (Calendar → Week): birthdays (forget one, and it hurts), exams and interviews they talk about before and after, game night and Sunday dinner, New Year, a golden week off in early summer. Coming home or waking up: a few hints of what happened.'],
    ] },
    { v: '0.2.1-11.1', fork: true, title: 'Mundi 0.2.1 inside', items: [
        ['bell', 'Everything from Mundi 0.2.1: visitors and the doorbell, guests from outside at parties, going out with anyone and on to another place, things to do that fit the room, needs if you want them, rain sounds, the dialog box on the left, sprites on either side.'],
        ['lock', 'Mundi 0.2.1\'s safety fixes: world files, cards and messages can no longer run code or press Mundi\'s buttons.'],
        ['chat', 'This world → AI context lists everything that calls the AI, each with its own switch.'],
        ['gear', 'New version numbers: the upstream Mundi version, then Expanded\'s own (0.2.1-11.1: Expanded 11.1 on Mundi 0.2.1).'],
    ] },
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
