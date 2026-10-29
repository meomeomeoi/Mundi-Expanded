# Mundi Expanded: roadmap

A Home-focused fork of [Mundi](https://github.com/tjalis/Mundi). The upstream author develops the city, life-sim and
RPG modes; this fork grows **Home mode**: one house, a group of characters, and the life between them.

Fork rules (to keep pulling upstream fixes cheap):

- New features live in new files (`src/sim/bonds.ts`, `src/ui/bondsui.ts`, …).
- Upstream files get short hook-ups only, each marked with a `// [expanded]` comment.
- Saves stay compatible with upstream Mundi: new data goes under new keys, nothing upstream is renamed.
- Upstream is a git remote (`upstream`); merge its releases when they bring something useful.

## Versions

`0.2.0.N`: the first three numbers are the upstream Mundi version the fork is based on, the last one counts this
fork's releases on top of it (after merging upstream 0.3.0 the next release is `0.3.0.1`). A release changes three
places together (the build checks they agree):

- `manifest.json` → `version` (what SillyTavern shows);
- `src/core/version.ts` → `VERSION`, and a new entry at the top of `CHANGELOG` (shown once in the game after updating);
- `CHANGELOG.md` (the full notes).

Not every commit is a release: fixes can pile up under the current number, and the number goes up when something
is worth telling players about.

## 1. Relationships between characters (first version: v0.2.0-x.1)

Upstream tracks friendship and romance between **you** and each character. Ties between characters (sister of,
friend of…) are fixed labels with a tone. This fork lets the characters' relationships change on their own.

- **A value per pair** (−100…100, symmetric). It starts from the tie's tone set when the Home was created
  (close 60, good 30, neutral 0, tense −30, hostile −60); pairs with no tie start at 0.
- **Numbers move only with a fact.** Every change has a reason written down; the only change without one is a slow
  drift back toward the starting tone.
- **Two kinds of relationship facts:**
  - *standing*: what a relationship is ("A always beats B at fighting games and B hates it"); written by the player,
    never ages;
  - *episodes*: what happened ("day 12: B lost again and slammed the door"); written by the engine, only the latest
    reach the AI. An episode can be pinned to become a standing fact.
  - A fact can be about two or three characters.
- **On screen:** at night, the day's conversation is read for what changed between the characters who were in it.
- **Off screen:** at night, a few small things happen between housemates without you. Setting: off / calm
  (default: 0–1 a night, mostly everyday life) / lively (up to 3, rare bigger moments).
- **Upstream ties stay in step:** when a value crosses a threshold the tie's tone is updated, so upstream's
  "Family and ties" line never contradicts this one; a tone changed by upstream (or by hand) re-anchors the value.
- **For the AI:** standing facts and the latest episodes of the pairs in the scene, the value in words, within a
  token budget.
- **On screen for you:** a Relationships app in the phone: a graph of the house (you in the middle, the characters
  around, relationships as edges), statuses (sister, rival, ex… upstream's ties), and the facts of a pair or a person
  as blocks. View only by default; editing (facts, statuses, values) is unlocked in the phone's Settings, per save.
- **You are in it too:** your closeness with each character stays upstream's (shown as it is), but you can write facts
  about you and them, and set statuses.

## 2. The house's things (first version: 0.2.0.2)

- Storages: fridge, pantry, a room per person. Items: name, count, optional owner, kind (catalog of ~30 groceries,
  anything else as free text), a price kept for later.
- Mechanics: Snack / Meal / Cook / Coffee / Drink take from the house (refused when there is nothing); the house eats
  daily; a housemate shops at night when food is low; coming back from a shop restocks.
- Errands from the story ("bring me a pudding"), run at night by housemates, by you at a shop.
- The regulator (a mechanics model from Connection Profiles) reads each exchange once the next message is sent;
  without it, the day is read at night.
- Not in this version: money and prices, recipes, spoilage, things in hand.

## 3. Money and plans (0.2.0.3)

- Money, off by default per save: wallet (upstream's) and a house fund; weekly shares and bills; paid groceries;
  your job with a shift button; debts. Housemates have no wallets of their own.
- Gifts: an attachment in the composer, plus GIFT / PAY / LEND / REPAY lines from the mechanics reader. Gifts move
  friendship within limits and never romance.
- Slow burn difficulty (Home only).
- Plan activities with effects, and group plans (one upstream plan per person, linked).
- Go out: saved places and a starter set with Mundi's pictures.

## 4. Life in the house (0.2.0.4)

What was wrong (checked in the code): routines were one of four templates, picked at random for your cards; free
time picked one of four leisure rooms by a hash, so everyone ended up together, and nobody spent the afternoon in
their room; doors ignored the time, and nobody was ever asleep.

- Profiles instead of routines (sleep, sociability, rooms, things they do, OOC notes), made from the card; a day built
  from them with variation; a 24-hour strip to edit; dinner together as a house rule.
- The whole house at once: drawn to friends, away from enemies; the scene knows what everyone is doing.
- Doors: knocking, sleep, waking, keys; breaking in at a risk, judged by the owner's personality and what you did.
- Night visits to you, for reasons from the story.
- The characters' own plans with each other (home and out), invitations to you, and refusals of your plans (busy,
  outranked, sometimes just no, with another time suggested).
- The sprite menu as a ring that stays on screen; money: your share of the house fund.

## 5. The phone and the chats (0.2.0.5)

- Era (lorebook entry, texting voice, a suggested phone) and phone skins (keypad, PDA).
- The bridge between the live scene and the phone, both ways, by who was there.
- Group chats: the house's, your own groups, and the characters' own (summaries only).
- Conversations without you from the simulation's events, and calls for everyone with rule-decided answers.
- Later: computer skins for the era, an app renaming per era, private messages starting on their own.

## 6. Stabilization (0.2.0.6)

Found in play and fixed: group chat answers (SillyTavern's group clean-up, timestamps, one by one), conversations
without you while you sleep, expressions (classifier not ready, swipes, once per turn), a preset's "Send if empty"
lines in group turns. And what they led to: expressions by a model for everyone in the scene, people who walk off in
the story really go, characters above the dialogue box, the mechanics model's thinking level, the scene prompt's
blocks for the house, notes and texts, the phone skins redrawn.

## 7. Rooms and their things (0.2.0.7, done)

- **Fixtures**, a layer of its own (not the consumables of `stock`): things that stand in a room, have an owner (the
  house, a character, you) and can do something. A catalog with what each one affords (watch, play, play together,
  work, music, read, exercise, cook, bath…), the room it belongs in, a size (small / big) and its name per era; free
  text for decor (posters, plants, photos) that only describes the room.
- **What they do**: the scene is told what is in this room; they open actions here (yours and the characters'
  activities: the gamer stays in with the PC); plans that need one (movie night needs a TV); someone else's things
  are theirs.
- **At the start**: common rooms from the house's template, bedrooms by the mechanics model from cards and profiles
  (catalog only, plus decor), editable in the phone.
- **Getting things**: ordering online (delivery in days, a courier at the door, a box in the hallway), buying in
  person in Go out (shop kinds; big things delivered or carried with someone's help), finds (flea market, the curb,
  the storage room), the story (the mechanics reader), gifts.
- **House purchases** through the fund: proposals in the house chat (by the characters, for the house or their own
  room, and by you), answers decided by rules and written by the AI, you vote with buttons; approved and paid from
  the fund, then ordered.
- **Your portrait**: your sprite in the lower left corner, emotions picked by you (or always neutral, or by the
  expressions call), outfits like the characters', a frame in the era's style.

## 8. Relationships 2.0: who knows what (0.2.0.8, done)

Today the AI hears about a pair only when one of the two is in the scene, and in a Home the day's lines stay in the
chat until you sleep, so the model has read conversations the people here never heard. This release gives every fact
the people who know it, and makes secrets, discovery and gossip out of the story. Rules decide everything; the AI
only words it, and no new calls are made (the night call grows by about a third).

- **Knowledge.** Each fact has a publicity (public / witnessed / private) and who knows it: suspects or knows, how
  (saw it, was told, heard it second- or third-hand), and a version (a story garbled by retelling can be wrong:
  "Masha is seeing Kathie" when it is Leah). Nobody lies on purpose yet. Defaults by kind: family, couples, exes,
  roommates and partners are known to the house; fights and enmities to whoever saw them; secrets to the ones in them.
  The night reader decides from the scene what was secret (whispering, a closed door, "don't tell anyone"); by
  default, a bedroom alone is private and the kitchen with everyone is public. Facts do not get forgotten, they cool:
  old news is not retold and is not sent. No migration of old saves.
- **You too**: your romances and enmities can be secret, and upstream's jealousy fires only when they find out.
- **In the scene**: what the people here know, absent pairs included, and how they know it, with the instruction to
  let it show in how they act rather than announce it. Each line of the day keeps who was in the room ("earlier today,
  in Masha's room, only Masha and {{user}} were there: the others do not know what was said unless told"), and a
  privacy line ("alone in her room, the door closed: nobody can overhear" / "five people here: side conversations").
  A block of its own in the prompt, cut early.
- **Discovery** from the day plans (who is awake, who is in the same or the next room): per occurrence, the chance
  that someone notices is 1 - Π(1 - visibility · access · (1 - care)). A five-minute meeting at night in a bedroom is
  about 0.5%; a kiss in the kitchen is seen by everyone there. Loud things (a fight) are heard through walls. One clue
  makes a suspicion, a second one knowledge. A secret meeting is in the plans; a room with its door closed is shaded
  on the floor map with only "someone is inside". What the AI writes in a scene counts: a slip in front of others is
  them seeing it.
- **Gossip**, each night, between people who spent time together (the plans, and their own group chats, where it
  spreads within the chat at once): juiciness · (1 - discretion) · loyalty to the people it is about · trust in the
  listener · opportunity. A promise to keep it (caught by the reader) nearly stops it, but slips happen (parties).
  Nobody tells the person it is about; a jealous ex may be told on purpose. A house setting: discreet / usual /
  gossips. **They gossip with you** too, in a scene or a text, by how close you are: your main way to learn things.
  Nothing leaves the house; out of it (a cinema, a café) only housemates who are there see it, and there is a tiny
  chance that "someone saw you" reaches the house as a vague story.
- **Limits**: at most a few rumors alive in the house (a setting); a new big one pushes out the oldest small one;
  at most one or two new ones a night. Small secrets mostly stop after one telling.
- **Consequences** by rules (the AI words them): jealousy, "you knew and said nothing", anger at whoever talked.
  Whoever found out "wants to talk about it": it pushes the topic into the chat and the scene and does not drift away
  until it is talked about. **Trust**, a second axis next to liking, between them and toward you: it decides what is
  told to whom, and drops when a secret is spilled. A long, steady secret couple may come out on their own, which
  ends the rumor.
- **Off-screen shifts** come from the story only (the night's small events count): about once every two to four
  weeks of game time on calm (a setting), and only with a reason (a high value, past episodes, time together). Romance
  between housemates: off / only from the story (default: there was flirting or a hint before) / may grow on its own,
  always checked against the cards. Small secrets too, more often and lighter: borrowed without asking, broke it and
  said nothing, lost the job, a debt.
- **Profiles** get discretion, nosiness, orientation and relationship status (single, with someone outside the house,
  married…), from the card, editable in People.
- **Relationships app**: what you know, with where from ("saw it yourself", "from Kathie, second-hand",
  "you suspect"); who else knows only if you know it; your suspicions. Toasts only for your own discoveries; hints in
  the morning diary ("Kathie kept glancing at Masha all evening"). **Show the truth** (off by default, per save, next
  to the edit unlock): everything, with what you do not know marked.
- **Settings for limits**: rumors alive at once, things in a room, thoughts kept per pair.
- Children stay out of all of it.

## 9. Behind closed doors (0.2.0.9, done)

Listening (at a door, keeping an eye on someone, someone at your door, the walls, asking around) and flirting and
closeness (one-way feelings between characters, your own feelings, how flirting lands, confessions, nights together,
staying over, moving in, a date at home), with a switch. Decided: romance is always one way (a character's feelings for
someone); yours are set by you, not a number; Mundi never writes intimate scenes itself, only the state around them.

## 10. The house in 3D (alpha since 0.2.0.9; about three or four releases to finish)

An extra way to see the house in a Home with a floor plan: walk through it in the first person, or see it as a
dollhouse. Characters stay 2D sprites (on a plinth when drawn to the knees); the conversations stay the VN scene.
Done in the alpha: the house built from the plan (walls, doors, the hall, windows, stairs), a toon look with ink lines
and drawn textures, Kenney's Furniture Kit (CC0) by the kind of room and from the house's things, light by the time of
day, people where their day puts them, shut bedrooms with "someone is inside", "Go to them" and knocking from 3D.

To finish:
- **Walking is real**: stopping in another room for a moment moves you there in the game (time, doors, knocking, as
  on the map); hallways and landings belong to the nearest real place (or a "hallway" place the house can have).
- **Within earshot**: rooms joined without doors (an open kitchen and living room) hear each other; the scene says who
  is within earshot ("Leah is in the kitchen: she hears if you raise your voice"); called by name, they come over (the
  same as following). Shut doors stop it; thin walls let only loud things through.
- **Call them over** from 3D next to "Go to them": they come if they are free, awake and not upset with you.
- **Furniture, better**: pieces checked against each other and against open sides (no wardrobe in the middle of an
  open plan), models for what the kit lacks (a car, a treadmill, a guitar, a console, an easel), people by their things
  (the gamer at the PC, someone on the sofa), lamps that light up at night.
- **Stairs** from the kit's models, joined to the floors; walking up and down instead of a click.
- **Phones**: touch controls (a stick to walk, drag to look), lighter rendering.
- **Backgrounds from the house**: render each room's view (day, evening, night) from the same camera, for img2img and
  ControlNet in ComfyUI: room pictures that match each other and the furniture, and door hotspots taken from 3D.
- **Your own house**: the same from any floor plan made in the World creator; an editor for doors and stairs.

## 11. Live in the scene (0.2.0.10, done)

On-screen immersion in the 2D scene. Done: quick reactions on light beats only (rare, written for the persona's card,
never replacing typing), timers on the few moments that cannot wait, knocks and calls answered in time, the phone
buzzing with an unread count (and others noticing), a film and a match together with live reactions,
rock-paper-scissors and a coin, breathing and hopping sprites, the speaker in front. Decided: a quick reaction only
starts your line, it does not answer for you; the timers stay rare.

Later, for sprites drawn as one picture per emotion: blinking and talking mouths need layered sprites (eyes and mouth
apart), so they wait for a sprite tool that cuts them.

## Later (discussed, not designed yet)

- **Better and worse things**: quality and condition (an old CRT or a big screen, a sagging couch, a good bed for
  better sleep), wear and repairs (upstream's breakables), upgrading what you have. Not decided whether it is worth it.
- **Housemates' own money**: wallets of their own, so they buy things for themselves (today they ask the house fund in
  the chat), lend, owe and save up.

- **Traits in Home** (Proficiency, Personality, Interests): today they only reach the prompt when the persona is
  created by the new-game wizard (an existing persona keeps them in its sheet, never in the prompt), and the d20 rolls
  and the dating app they feed are off in Home. Send them in the scene, and give a few light effects (Good cook →
  better cooking, Charming → a little more friendship from plans, Athletic → less tired from workouts…).
- **Off-screen lives**: a daily agenda for each character, so they really leave (the grocery run is an absence of an
  hour, and the food arrives when they come back), meet people outside, and make plans with each other from their
  relationships (the same machinery as upstream's plans, without you).
- **Errands from the chat**: "buy me milk" in a chat becoming an errand (the mechanics reader does it for scenes).
- **Computers for the era**: a CRT computer with an ICQ-like window, as a thing in a room.
- **Rooms, more**: the room's style and mess (a lazy owner's room gets messy), a lock, moving rooms, photos from the
  Gallery on the wall.
- **Relationships, more**: trust as its own axis next to liking; secrets and gossip (a fact has the people who know
  it, and it travels along the ties, sometimes distorted); jealousy (romance with one hurts the pair of the two who
  care); couples between characters growing out of their value; unresolved fights that do not drift away until they
  are talked about in a scene; opinions about your partner.
- **Cooking**: recipes, ingredients from the inventory.
- **Finding things out on purpose**: following someone, asking around, listening at a door (after 0.2.0.8, where you
  only learn things as they come: through walls, by stumbling on them, from gossip).

Each of these gets discussed and designed before any code.
