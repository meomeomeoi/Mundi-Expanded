# Changelog

## Mundi Expanded 0.2.0.8 · 2026-10-29

Relationships 2.0: who knows what. Rules decide everything; the AI only words it, and no new calls are made (the
night call grows a little).

- **Knowledge.** Every fact and status has a publicity (public, witnessed, private) and the people who know it: in it,
  the house, saw it, told by someone, heard it second- or third-hand (maybe garbled), or only suspects. Family,
  couples, exes and standing facts are known to the house; what happened between two, to whoever saw it.
- **In the scene**: a "Who knows what" block: how private the moment is (alone behind a closed door, a crowd), what
  the house knows about couples and family who are not here, secrets and who here does not know them (kept in front of
  them), what someone here knows about people who are not here, your own secret relationships, earlier conversations
  today the people here were not at (each line now keeps who was in the room), news someone has for you, unfinished
  business, small secrets. "Between them" says who here does not know a fact, and the last thing between someone here
  and someone who is not.
- **The night reader** sees who was in the room before each stretch of the day and says who else saw a moment (or
  that it was kept between them), who found out a secret in a scene and who told them, who promised to keep one, who
  talked it out.
- **Secrets come out**: secret couples meet late in one of their rooms (in their plans, at the quietest hour); whoever
  is at home may notice by how close they are, how nosy, and how careful the two are. One clue is a suspicion, a second
  is knowing; you notice things too. A bedroom with both of them in it is seeing it; bad fights are heard through the
  walls. Closed bedrooms on the map are dimmed with only "someone is inside".
- **News travels** each night to the ones they spent the day with or share a group chat with: juiciness, freshness,
  discretion, loyalty to the people it is about, trust in the listener, the house's mood (discreet / usual /
  gossips); never to the ones it is about; promises nearly stop it; only the juiciest few at once (3 / 6 / 10). You
  hear it in a scene from someone close to you, when the people it is about are not there. Out in town with a secret
  partner, now and then someone sees you. Trust as its own value between characters.
- **Consequences**: finding out a partner is seeing someone: a big drop with both and unfinished business that does
  not drift away until it is talked out. Your new romance while you are with someone starts as a secret, and
  upstream's jealousy fires when a partner finds out (or when you stop keeping it). "You knew and said nothing"; less
  trust in whoever talked, and in you if you told; a small thing done to someone, found out. A steady secret couple
  may tell the house.
- **Bigger changes without you** (friends, enemies, dating, breaking up): on their night only (rare / every few weeks /
  often), only with a reason, checked by the rules (how they get along, partners in and outside the house); romance
  off / from the story / may grow. **Small secrets** (borrowed, broke, ate it, lost the job) go around once.
- **Profiles**: keeps a secret, notices and pries, orientation, relationship status.
- **Relationships app**: what you know, and where from; secrets you keep (and theirs, when editing); Show the truth.
  Night notices only tell what you know.
- **Limits**: news going around at once, facts kept per pair, things a room takes.
- Tests: bonds 24, secrets 5, profile 14.

## Mundi Expanded 0.2.0.7 · 2026-10-29

Rooms and their things: what stands in each room, what it lets people do, and how the house gets more.

- **Fixtures**, a layer of their own beside the house's consumables: things that stand in a room, belong to the house,
  to a character or to you, and afford something (watch, play, play together, work, music, read, work out, cook,
  coffee, bath…). A catalog of about forty with names per era (a CRT TV, a flat-screen, a smart TV), and free-text
  decor. Common rooms start from a template; bedrooms are furnished by the mechanics model from cards and profiles
  (a guess from the profile without one). Storage → Furniture shows and edits them; "Furnish the bedrooms" again.
- **What they do**: the scene gets "This room's things"; activities need their thing (movie night needs a TV, the
  workout something to work out with), plans and calls pick a room that has it, and your own actions here follow the
  room (play the console, practise the guitar, make coffee). Profiles say what each activity needs. Someone who likes
  something goes where the thing is, more often the more social they are; homebodies still stay in sometimes.
- **Ordering online**: the phone's shop (Web shop, Online store, Marketplace by era). Small things come the next day,
  big ones in two, between 10:00 and 17:00; the box waits in the hallway to be unpacked (or someone sets it up after
  two days). Paid from your wallet with money on, free without.
- **In person and found**: an electronics store, a furniture store and a flea market in Go out (today's assortment,
  flea prices 40–70%); big things carried home with whoever came along, otherwise delivered. Now and then something
  left on the curb; the storage room can be rummaged once a week.
- **House purchases**: someone proposes in the house chat to buy something from the fund, for the house or their own
  room. Who is awake and home answers by rules (how they get along with who asks, whether they would use it, the
  price against the fund, a room of one's own is harder); the AI only words it. You answer with the buttons or in
  your own words; you propose from the shop. Approved: ordered from the fund. Turned down for someone's own room: a
  little sourness. Never / now and then / often, and "Proposal now", in the chat settings.
- **The story**: the reader that notes food, gifts and money also notes big things brought in, carried to another
  room or thrown out; a big gift (a guitar, a console) stands in its new owner's room.
- **Your portrait**: your persona's sprites bottom left (a sprites folder "<persona> (Mundi)", uploaded from the
  portrait as a .zip or images named by label). The face you pick, always neutral, or read from the story by the
  expressions call (or SillyTavern's classifier on your line). Outfits by the room's dress code, a frame by era
  (2000s glossy chrome, 2010s flat card, today a soft glow), hidden on phones unless you want it.
- Tests: furnish 11.

## Mundi Expanded 0.2.0.6 · 2026-10-29

A release of fixes found in play, and the things they led to.

- **Expressions by a model** (Settings → Game → Mechanics model → Facial expressions): once a turn is over, one short
  call gives every person in the scene an expression from their own sprites' labels, speakers and listeners alike.
  SillyTavern's classifier stays the default and the fallback. Expressions belong to the text they were read from (a
  swipe is read again), are written only when nothing is being generated, and move the bond once per message.
- **Walking off**: the same call says who walks off in the story (to any room of the house, someone's bedroom, their
  own room or out of the house) and who goes along with you. Where they went wins over the routine and the scene lock
  for an hour of game time; a swipe undoes it.
- **Group chats, fixed**: answers were thrown away by SillyTavern's group clean-up (now read raw: `generateRawData`),
  came from the future, appeared all at once (now one by one, as if typed); conversations without you were lost while
  you slept, on the first day, or when two fell in one jump. The prompt knows the part of the day and who is asleep;
  writing in a chat you are in is meeting you. Conversation now / Call now buttons.
- **Group turns**: a preset's "Send if empty" line before each member is recognised (it no longer moves the clock or
  starts a read) and hidden from the story once the turn is over. An option joins everyone here's cards into one
  prompt, so prompt caching can work for the whole turn.
- **Mechanics model**: how much it may think (least by default; OpenRouter and Google); the exchange reader says in the
  console when and why it skips.
- **Scene**: characters over the dialogue box or above it (whole); H or the eye hides the box. The floor buttons show
  strangers too. The scene prompt has blocks of its own for the house (dropped last), what they are doing, your notes
  (always sent) and the texts.
- **Phone skins** redrawn with materials: grain and sheen on the body, a glass frame, an LCD with its pixel grid, domed
  keys, engraved hardware buttons.
- Faster: the house's plan of the day is worked out once per drawing.
- Tests: chats 12, exprs 4.

## Mundi Expanded 0.2.0.5 · 2026-10-28

- **Era** (Home, phone Settings): today, the early 2010s or the 2000s. One entry of its own in the game's lorebook
  (nothing else there is touched; without a lorebook the scene gets the line); texts follow it (the 2000s: short SMS,
  abbreviations, no emoji); it suggests a phone.
- **Phone skins**: a keypad phone (colour LCD, 3x3 menu, SMS lines, a keypad with working Menu / Back / up-down / green
  / red keys) and a PDA (Pocket-PC screen, Start taskbar, the Today list, ICQ-like messages, hardware buttons). Every
  app works the same in each.
- **The bridge**: texts (private and group) know the last lines said face to face in scenes that person was in (where,
  when, who was there); the scene knows what the people here texted and wrote in chats lately.
- **Group chats**: the house's chat (everyone and you) and your own groups (two to four people). Who answers is
  decided by rules (asked by name, how social and close, a question to all; nobody asleep, nobody next to the
  author), then one AI call writes their messages. Written by the main model (default) or the mechanics model.
- **Conversations without you**: Off / Quiet (0-1 a day) / Calm (1-2, default) / Lively (2-3), about what happened
  (a plan that is over, a fight, the fridge, money, something light). **Calls for everyone** ("movie night at 9,
  who's in?"): answers decided first, then written; you answer with buttons or by writing it.
- **Their own chats**: three close friends may start a chat without you; you never read it, but conversations happen
  there (a line of what about, a little closeness) and the scene can refer to it.
- The night's reading of the day includes the group chats.
- Tests: era 4, chats 11.


## Mundi Expanded 0.2.0.4 · 2026-10-28

- **Profiles** (Home): when a character sleeps (later at the weekend), how much of their free time they spend with
  others, favourite rooms, things they do, and OOC notes for the AI (sent only when they are in the scene). Each day
  is built from it, a little differently every day; favourites come up often but not always, never the same thing
  three hours running. Made from the card by the mechanics model (or the main one, or a keyword guess); asked once at
  the start of a Home (make them / later / I'll write them). This world → People → Day and habits: a 24-hour strip
  for a weekday and a weekend, click an hour to set it by hand.
- **Where they spend time**: drawn to close friends, away from people they cannot stand; dinner together is a house
  rule (on by default, phone Settings). The scene is told what the people here are doing, and where everyone else in
  the house is right now.
- **Doors and sleep**: knocking (let in, come out to talk, not now: closeness, temperament, the hour, grudges);
  people asleep (dimmed on the map), knocking may wake them, waking them on purpose for someone close; a key (a
  checkbox on their page) or a partner lets you into an empty room. **Going in anyway**: if they come back you are
  found, later they may notice; the reaction comes from their personality, how close you are and what you did there.
- **Night visits**: while you are awake in your room at night someone may knock, for a reason that follows from the
  story (romance, closeness, a fight that day, a grudge). Off / Rare (default) / Sometimes / Often; Lock my door.
- **Their own plans**: pairs that get along make plans for the day (home or out; homebodies stay in), and may ask you
  along (a text, and the Calendar). Your plans with them can be refused: busy with someone else (with another time
  suggested, unless you clearly matter more, and then they cancel on the other), or sometimes just no.
- **The sprite menu** is a ring around the face that stays on screen (it ran under the text box).
- **Money**: what is yours in the house fund; taking more is a loan the house knows about.
- Tests: profile 12, doors 8, knocks 5, cplans 7, money 14.


## Mundi Expanded 0.2.0.3 · 2026-10-28

- **Money in a Home** (off by default; phone Settings → "Money in this house"): your wallet (upstream's) and the
  house fund. Housemates with an income chip in weekly, bills are paid from the fund, and a short fund makes money
  "tight" in the scene (nothing is cut off). Groceries cost catalog prices: housemates' runs from the fund, yours
  from the fund or your wallet. Your job: one of the world's or your own, a shift a day from the Money app (upstream's
  four ways to work), a raise every few shifts; freelance actions come back at home. Debts between people.
- **Gifts and money in the scene**: a 🎁 in the composer gives a thing of yours, money, or money for the house fund;
  the line carries a note the scene reacts to. The mechanics reader judges the reaction as played and also notices
  gifts, payments, loans and repayments in the story. A gift from you moves friendship within limits (half for each
  earlier gift that week, +8 a week at most, nothing above 80, a bad gift in full) and never romance.
- **Slow burn** (a Home difficulty): friendship gains halved; romance halved, at most 2 a day and always at least 25
  below friendship; someone met during play is too soon to ask out for two weeks (people known at the start are not).
  About 3 to 5 weeks of play from friends to a couple.
- **Plan activities**: movie night, cook together, game night, a workout, a walk, coffee, dinner, drinks, a grocery
  run. Each fills in the place and has an effect when it happens (how you feel, a little closeness, ingredients or a
  snack from the house, money out of the house; "I'll pay for everyone"). **Group plans**: ask others to the same
  plan; each answers on their own, the activity happens once, and the scene knows who is part of it.
- **Go out places**: the places you went to (with the picture you chose) and a starter set with Mundi's pictures, as
  picture chips; picking one fills in where and the background. Edit forgets or hides them.
- Tests: money 13, slow burn 4, activities 5, places 6.


## Mundi Expanded 0.2.0.2 · 2026-10-28

- **The house's things** (Home): the fridge, the pantry and a room per person (you too). Things have a count and
  can be labelled as someone's; a small catalog of groceries plus anything else as free text.
- **Actions use them**: Snack, Meal, Cook and Coffee take from the kitchen (never someone else's labelled food);
  cooking leaves leftovers; with nothing left the action is refused with a reason.
- **The house lives**: housemates eat every day; household things wear out; when food is low a housemate does the
  grocery run at night; coming back home from a shop (Go out → "supermarket", "магазин"…) brings the staples.
- **Errands**: "Finn, bring me a pudding" becomes an errand; housemates run theirs at night (now and then they
  forget); yours are done when you come back from a shop. Done errands become facts the characters remember.
- **Mechanics model** (Settings → Game): a Connection Profile for the mechanics; it reads each exchange once you send
  the next message (short prompts, no chat preset). Without one, things are read at night with the main model.
- **Storage app** in the phone, and a scene block with what is in the kitchen or the room you are in.
- Relationships: a refusal at night is reported instead of counting as a quiet night.
- Tests: 22 for relationships, 13 for the house's things.


## Mundi Expanded 0.2.0.1 · 2026-10-28

The first release of the fork, based on Mundi 0.2.0.

- **Relationships between characters** (Home): every pair of housemates has a value that changes, and every change
  has a reason kept as a fact. At night the day's scenes are read for what changed, and (Off / Calm / Lively) small
  things happen between housemates without you.
- **Relationships app** in the phone: the house as a graph with you in the middle, statuses (upstream's ties), and
  facts about two or three people. View only by default; editing is unlocked in the phone's Settings.
- **A "Between them" block** in the scene prompt (can be turned off like the others).
- Renamed to Mundi Expanded; the update notice follows this fork.
- Fix: the chosen option of an open list was unreadable.


## 0.2.0 · 2026-10-25

Everything since 0.1.0 (the last version on GitHub, commit `33837e1`).

### Highlights

- **Home**, a new way to play: one house, the characters you choose, and pure role-play.
- **Porto Alto**:
  - a picture for every place;
  - three kinds of apartments and houses;
  - a new gym and a new cinema.
- **A living world**: people with full days, places that get busy and quiet, day and night, and news from the
  lives of the people you know.
- **The interface in Português (Brasil) and Español.**
- **Save safety**: migrations, automatic backups and branches.
- **The RPG mode and the medieval style** are built but locked ("Soon") while they get finished.

### Home mode (new)

- **What a Home is:** a house and the characters who live in it, with no work, money or bills. Life outside
  happens off-screen.
- **Two ready Homes:**
  - The Shared House (modern, three floors, ten bedrooms, a new Entrance);
  - The Old Manor (medieval, locked for now).
- **The Home creator:**
  - premise;
  - rooms;
  - bedrooms;
  - cover picture, which can also be one of the room pictures.
- **New game in a Home:**
  - choose the rooms the house has;
  - choose what can be done in each room;
  - add rooms of your own;
  - write your situation, or let your AI write the premise from lorebooks.
- **Floor plan (optional):**
  - one picture per floor, with day, afternoon and night versions;
  - each room drawn as a box: drag to move, drag the corner to resize;
  - floor buttons with the faces of who is on each floor;
  - a red "!" marks rooms not on the plan;
  - without a plan picture, the room pictures are grouped by floor.
- **Time:**
  - the clock moves a few minutes with each message (can be turned off);
  - click the clock to let time pass;
  - sleeping brings you back to where you went to bed.
- **Go out:**
  - write where you are going, pick who comes and a background;
  - the scene out there is free, like a chat;
  - **Back home** asks first.
- **Who lives here:**
  - change bedrooms (two people in one bedroom share it, and the AI knows);
  - someone can move in or move out during the game, with a confirmation.
- **Dress code per room:** an outfit folder from the character's Expressions (swimsuit at the pool, pajamas in
  the bedrooms…). The AI is told what people wear.
- **Housemates:**
  - can go out for a while, or stay in;
  - each can have a job written in your own words, with a shift.
- **House party:** free; everyone leaves their rooms for the common areas.
- **This Home settings:**
  - Bedrooms, Home and Dress code;
  - a new **The house** tab: rooms on or off, what can be done in each, your own rooms, and the floor plan (for
    Homes you made).
- **Difficulty** in a Home changes how fast bonds grow.
- **One long conversation:** moving between rooms or going out no longer hides what was just said from the AI.
  Only sleeping starts a new day.
- **Bathrooms and shower rooms** no longer offer snacks or drinks.
- **Liquid-glass windows:** Let time pass, Go out, Back home, Who lives here and the pickers.

### Porto Alto

- **Pictures:** a background for every place (45) and for six kinds of home:
  - small apartment, apartment, penthouse;
  - small house, house, villa.
- **New places:**
  - **Palm Coast Gym**, apart from the **Stadium**;
  - **Cineplex** in Midtown ("Watch a movie" moved there).
- **The elevator ride** when arriving at an apartment was removed.
- **Map cards:** a place with a long card (many jobs) now shows it beside the pin, so the pin can still be clicked.
- **The HUD on maps:** the clock, the place name and the map tabs never overlap, at any HUD size.

### Life in the world

- **Day and night:**
  - opening hours;
  - prices and the mood of the streets by part of the day;
  - a picture per part of the day for places, homes and maps.
- **Regions:** each has a crowd level, a public mood, tension, weather and prices that drift day by day.
- **People's days:**
  - routines get interrupted (sick at home, errands, working late);
  - places remember regulars;
  - over the weeks, couples get engaged, marry or break up, and people get promoted.
- **Things that come to you:**
  - neighbors knocking;
  - friends asking your advice;
  - news of birthdays, promotions and weddings.
- **City events** (shows, matches, fairs, open mic) and **festivals**, in the calendar.
- **Hobbies** that level up: some jobs ask for a level, and it raises what they pay.
- **Habits that become traits** (Early riser…), and fade when you stop.
- **Other systems** (each can be turned on or off per world in the World creator):
  - reputation per town and secret identities;
  - pets;
  - apprentices;
  - letters from friends in other towns;
  - schools with exams and clubs;
  - factions and guilds;
  - the realm and its gods;
  - trade and smuggling;
  - property, businesses, a garden and loans;
  - taxes;
  - crime and prison;
  - celestial events.
- **The AI context:** a token budget, with the least important blocks dropped first. Each block's text can be
  edited, and you can add your own instructions.

### Characters, scene and chat

- **Sprites:**
  - overlap like a stage, and whoever spoke last stands in front;
  - click a sprite for a radial menu with actions and outfits.
- **Outfits:** subfolders of a character's Expressions (pajamas, swimsuit…).
- **Persona:**
  - switch persona in a chat or a Home, optionally renaming your earlier lines;
  - **Play as** in a World now has **Use another persona** too.
- **Chat look:**
  - visual novel, Classic or Cards;
  - sizes and colors with transparency;
  - colors from a SillyTavern theme;
  - presets (Midnight Glass, Rose Dusk, Forest Calm, and your own, saved as SillyTavern themes).
- **Images:**
  - pictures in messages, with a lightbox;
  - an Image Generation button;
  - TTS and Speech Recognition support (Settings → Add-ons).
- **Background pickers:** two sources, **My backgrounds** (SillyTavern's) and **Mundi** (the pictures of Mundi's
  worlds).

### Library

- **Folders** for characters, personas and lorebooks:
  - drag cards into folders (they move, nothing is copied);
  - rename, color, sort and export a folder as a zip.
- **Sorting:** by name, date, last chat, tokens or entries. Folders follow the same order.
- **Characters:**
  - alternate greetings;
  - tags;
  - expressions and outfits;
  - export as PNG or JSON;
  - the saves they are in.
- **People presets:** a group of characters with their households and relations, usable in any world.

### World creator

- **More tabs:**
  - Words (lexicon);
  - Character creation;
  - Customs & calendar;
  - Realm & factions;
  - Economy & skies;
  - RPG (locked).
- **Setup:** systems on or off, game modes, style and skin.
- **Maps:** per-period pictures, opening hours, crowd and region mood.
- **Homes:**
  - expenses (water, power, firewood…);
  - things that break at home;
  - the house maps editor for Homes.
- **New world:** start from a ready world or from nothing; the name field is highlighted if it is missing.

### Saves

- **Migrations** keep old saves working.
- **Automatic backups** (the last 3) before a migration or a repair; restore them in Settings → Game.
- **Make a branch:** a copy of the save as it is now.
- **A save from a newer Mundi** opens read-only.
- **A room added to a Home after the game started** is turned on by itself.

### Languages

- **Português (Brasil) and Español**, in Settings → Interface → Language. Only Mundi's own screens are
  translated: the worlds' places and people and the story keep their own language.

### Updates and onboarding

- **What's new:** after an update, a window with what's new, and a short tour by Stella of only the new things.
- **Update notice:** on the main menu, a small note when a newer Mundi is on GitHub, with an Update button.
- **Stella's tour** has a **Home** part. Settings → Game can replay any part, or only what's new.
- **Help** has its own topics in a Home: time and sleep, the house, going out.

### Look and settings

- **Settings tabs:** Game, Sound, Interface, Add-ons.
- **Look:**
  - date and time formats;
  - fonts;
  - theme and secondary colors;
  - skins;
  - separate scales for phones.
- **Background music:** menu, world and home, with crossfades.
- **Main menu:** a map behind it, and the real version in the footer.
- **World cards** show only the cover (no slideshow).

### Locked for a later update

- **The RPG mode:**
  - character sheet, classes, magic, quests;
  - combat (tactical or narrative), party and sellswords;
  - journeys, towers, contracts, crafting, artifacts, legends.

  Worlds made for it, like **Nova Vega**, show "Soon".
- **The medieval style:**
  - **Valdoria** in Life-Sim, with the journal in place of a phone: letters, a market of pinned notes, a medieval
    almanac, lodgings by town;
  - **The Old Manor** Home.

  They show "Soon · Medieval".
