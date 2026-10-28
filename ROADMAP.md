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
  - **Who knows what.** Today the AI hears about a pair only when one of the two is in the scene (the others never
    learn that Masha and Leah are dating, nor that you are with Masha, unless she is there). Ties by how public they
    are: known to the whole house (family, couples, exes, roommates, your partner), known to whoever saw it or was
    told (fights, enmities, a crush), private (secrets). Sent for the people here, absent pairs included; the cards
    only say what their own author wrote, and an absent character's card is not in the prompt at all.
  - **Witnesses of the day.** In a Home the day's lines stay in the chat until you sleep (walking room to room is one
    scene), so the model has read conversations the people here never heard. Each stretch keeps who was there, and
    the prompt says "earlier today, in Masha's room, only Masha and {{user}} were there: the others do not know what
    was said unless told".
  - **Privacy in the scene**: "alone in her room, the door closed: nobody can overhear" against "five people here: side
    conversations, not everyone hears everything".
- **Cooking**: recipes, ingredients from the inventory.

Each of these gets discussed and designed before any code.
