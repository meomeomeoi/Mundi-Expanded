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

## Later (ideas, not designed yet)

- **Deliveries**: ordering things home.
- **Cooking**: recipes, ingredients from the inventory.
- **Housemates' own wallets**, if the light version feels too thin.

Each of these gets discussed and designed before any code.
