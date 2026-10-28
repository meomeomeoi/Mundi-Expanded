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

## 4. Life in the house (0.2.0.4, in discussion)

What is wrong now (checked in the code):

- **Routines are random.** The Shared House has four routine templates (home, outworker, nightowl, early); a card that
  is not one of the world's people gets one at random (`pick`), or `office`/`early` with a job, and `office` does not
  exist in the house, so it silently falls back to `home`. A gamer can be an early bird in bed at 21:00.
- **Everyone ends up together.** Free time picks one of the house's leisure rooms each hour by a hash, and the house
  has only four (living room, dining room, entrance, pool); the templates also gather everyone for lunch at 13 and
  dinner at 20. A bedroom is only ever used at night: nobody spends the afternoon alone in their room.
- **Doors ignore the time.** Friendship 50+ walks into any bedroom at any hour, even when its owner is out ("you know
  where the key is"); 15–49 when they are in; below 15 not at all. Nobody is ever asleep: at 3 a.m. the scene plays
  them awake. Bedtimes are close together because the templates are.

Planned (details being discussed):

- Own routines per character: an editor in the Home setup (chronotype, bedtime, time in their room, favourite rooms,
  weekends), and an optional generation from the card by the mechanics model at the start.
- Time alone: "their room" as a step of the day, weighted by temperament; things in the room keep people there.
- Sleep and doors: asleep is a state (the scene knows it), knocking instead of walking in, waking someone up, a key
  only for a partner or someone who gave it.
- Done ahead of it: the sprite menu as a ring around the face that stays on screen (0.2.0.3+).

## Later (discussed, not designed yet)

- **Traits in Home** (Proficiency, Personality, Interests): today they only reach the prompt when the persona is
  created by the new-game wizard (an existing persona keeps them in its sheet, never in the prompt), and the d20 rolls
  and the dating app they feed are off in Home. Send them in the scene, and give a few light effects (Good cook →
  better cooking, Charming → a little more friendship from plans, Athletic → less tired from workouts…).
- **Off-screen lives**: a daily agenda for each character, so they really leave (the grocery run is an absence of an
  hour, and the food arrives when they come back), meet people outside, and make plans with each other from their
  relationships (the same machinery as upstream's plans, without you).
- **The house chat** instead of Chirp (Chirp is a Twitter feed written from the card alone, off in Home, and never
  grounded in what happened): a group chat written from the simulation's events (the night's episodes, shopping,
  errands, plans), the last lines sent to the scene; you can answer, and "buy me milk" becomes an errand.
- **Eras and device skins**: upstream already switches the whole device (`deviceLook`: phone / journal). An era
  package for a 2000s–2010s Home: a flip phone, a PDA or a CRT computer with an ICQ-like window, text messages without
  emoji, app names of the time, and a line telling the AI the year and that there are no smartphones. A computer as a
  thing in a room rather than a phone skin.
- **Rooms and their things**: things per room (yours and each character's) that unlock actions there (a PC: games,
  freelance, the chat; a guitar, an easel), change the owner's routine (the gamer stays in with the PC) and describe
  the room to the AI. Set up front in the Home setup, bought with money, and bought by characters themselves at
  night. Also: the room's style and mess (a lazy owner's room gets messy), a lock, gifts that stand on a shelf,
  shared things for the whole house (a bigger TV, a coffee machine, a grill as a new plan activity), moving rooms,
  photos from the Gallery on the wall.
- **Relationships, more**: trust as its own axis next to liking; secrets and gossip (a fact has the people who know
  it, and it travels along the ties, sometimes distorted); jealousy (romance with one hurts the pair of the two who
  care); couples between characters growing out of their value; unresolved fights that do not drift away until they
  are talked about in a scene; opinions about your partner.
- **Deliveries**: ordering things home.
- **Cooking**: recipes, ingredients from the inventory.
- **Housemates' own wallets**, if the light version feels too thin.

Each of these gets discussed and designed before any code.
