# Changelog

## Mundi Expanded 15.1.1 (0.2.1-15.1.1) · Quick reactions look right again

- The quick-reaction buttons over the message box were drawn as one line of bare text, the options run together: the
  CSS class of the new streaming reply (0.2.1-15) was the one the buttons use, and it said "display: contents". Renamed;
  a test keeps the two apart.

## Mundi Expanded 15.1 (0.2.1-15.1) · Chores from the first day

- **The rota exists from the start.** The week's chores went round the people only at midnight, so in a new game (or
  with chores just turned on) nobody had a turn until the first night: no "Wash the dishes" in the kitchen, no "Take
  out the trash", and the Chores page showed "—" against every chore. Now the rota is made the first time it is asked
  for (opening the room's actions, or the Chores page), and again each new week.

## Mundi Expanded 15 (0.2.1-15) · Who speaks

SillyTavern's group turn rolls a die per person against the talkativeness on their card, and each one who is picked
answers once, in a call of their own, seeing those before them but never answered by them. This release changes who
speaks and how, without leaving group chats (saves, who said what, sprites, voices and memory all depend on them).

- **One reply for the room.** In a scene with two or more people (Home games), the line you send is read first: who is
  spoken to, who is in the middle of the talk, who is worn out. A call by name ("Finn, did you eat my yogurt?")
  is answered by Finn alone; two or more named, or a direction for the story, by the room; anything else is decided by
  the mechanics model (one short call, four seconds at most) or, without one, by a score (spoken to, in the talk,
  talkative, worn out). A private word gets one person, the others left out.
- **The room answers together**: one call writes a beat of two to three parts (settings: two to five) as several
  people, who answer, interrupt and tease each other, with a short narrator line when the moment needs one. The reply is
  cut into ordinary lines, each with its own author, before translation, voices or the journal see it. It ends at the
  first natural pause. Cheaper and faster than one call each (the scene's prompt and the people's cards go once).
- **Let them go on**: the forward button after such a reply writes the next beat with nothing from you (a little time
  passes). Swipe and regenerate redo the whole beat from the same plan, and every version is kept (‹ 2/3 ›). Streaming
  shows the people's lines as they come.
- **Overheard conversations in beats**: a conversation you walk in on has a length (a light chat two or three beats, an
  argument or a heart-to-heart three to five), a plan and an ending (settles, splits, patches up, drifts, or someone
  storms off to their room), and is heard a beat of two to four lines at a time: **Keep listening** writes the next (two
  game minutes later), or, if you turn it on, it goes on by itself, slowly, while you stand there with an empty box. It
  may turn on the way (rarely; more in a spicy house). From the second beat each beat has a chance that they notice you
  (more if they are nosy): they fall silent (when it is about you or private), pull you in, or lower their voices once.
  Someone leaving the room ends it. Passing by: the AI knows where it was going.
- **Joining by writing**: writing in the message box while you stand by a conversation joins it. No fixed penalty for
  cutting in: the AI is told it is a private talk, if it is, and they react as they would.
- **Settings**: Settings → Game → Group scenes (Auto, Scene reply, or One reply each: SillyTavern's own order, as before)
  and the most parts in a reply. People → Settings: overheard conversations by themselves (off, slowly, normally) and who
  writes their words (the mechanics or the main model).
- **Fix**: the three buttons "Narrate what you do right away" (Everything / What matters / Nothing, from 0.2.1-14.5)
  did nothing when pressed: their handler was registered for typing, not for clicks.
- A card "Mundi Scene" is made in SillyTavern the first time (a muted member of each game's group, never picked by
  SillyTavern itself); no list of Mundi shows it. Known limit: in SillyTavern's own chat (not Mundi's), swiping one line
  of a beat writes just that person's answer again.

## Unreleased · The house in 3D (alpha)

An early, extra view of the house; the game itself does not depend on it. Marked "alpha" in the game.

- **3D** on the map of a Home with a floor plan: walk through the house in the first person (drag to look, click the
  floor to walk, WASD) or see it as a dollhouse from above, the walls cut low.
- Built from the floor plan's rooms: walls, doors to the open space, the hall between rooms, windows, stairs; a toon
  look with ink lines, drawn textures (planks, tiles, carpet), soft shadows, a garden; light by the time of day.
- Furniture from Kenney's Furniture Kit (CC0, bundled) by the kind of room, plus what the house's things say stands
  there (a PC, a bookshelf, a double bed…).
- People where their day puts them, as their 2D sprites (on a plinth when drawn to the knees); shut bedrooms show only
  "someone is inside". Clicking someone offers "Go to them"; a shut door knocks, as on the map.
- Not yet: walking in 3D does not move you in the game; open rooms do not hear each other; no touch controls. See the
  roadmap (section 10).

## Mundi Expanded 14.5 (0.2.1-14.5) · 2026-10-30

- **Upkeep is not a scene**: upstream sends every action from the menu into the chat as your line, so each meal,
  glass of water or shower got its own reply (several a day with needs on). Now an action that only restores hunger,
  thirst or being clean, with no roll, skill, mini-game or outing, goes into the scene as one line ("a moment ago you
  had a meal: nothing to narrate, mention it only if it comes up") and the AI does not answer it by itself.
- **The setting is three-way** (AI context): Everything (as before), What matters (default), Nothing. Your old
  on/off choice carries over (off became Nothing). Cooking, music, sport, games, outings and anything with a roll are
  narrated as before.

## Mundi Expanded 14.4 (0.2.1-14.4) · 2026-10-30

- **Walk past**: the scene used to be told only "{{user}} did not join them", so the next reply (to eating, to anything
  you did in that room) went on writing their conversation. Now it says they carry on quietly in the background and
  leave you alone unless you speak to them, and for a few minutes each reply is told it is about what you do.

## Mundi Expanded 14.3 (0.2.1-14.3) · 2026-10-30

- **Out of the house, in the profile**: "What they do in life" (told to the AI) and up to four times out of the house:
  what for, which days (any of Mon–Sun), from and to (past midnight is fine). Made from the card with the rest of the
  profile (or the quick guess: a student is at classes on weekdays, a worker at work, a party lover out on Friday
  and Saturday nights), editable in People → their Day and habits. A time out comes before their usual bedtime (a
  night shift, a night out); hours set by hand still win.
- **"The housemates leave the house" works again**: before, the profiles had no "out" at all and only a shift from
  This Home's table sent someone out, so with "Their own routine" (the default) nobody ever left. That table is gone;
  a job and shift from an older save move into the profile on their own. Someone with no profile still follows
  upstream's routine and line.
- **Open relationships, two switches** (People → Settings, with flirting and partners staying the night; gone from
  This Home): for you (upstream's, as before) and in the house: someone with a partner may start dating someone else
  too, and finding out is not cheating. "Taken" or "married" in a profile (someone outside the house) still holds.
- **Minutes per message**: 2, 5, 10 or 15 (This Home → World); upstream had 5, fixed.

## Mundi Expanded 14.2 (0.2.1-14.2) · 2026-10-30

- **Token budget**: upstream's slider stopped at 2000 tokens; now 500 to 8000, with "no limit" at the far right
  (more to the right is more). A saved budget not on the new scale is shown at the nearest step.
- **"Long memory" is a block of its own** in AI context (it was inside "What they are doing"): its size is shown,
  it can be turned off, and it is among the last to go over the budget. Measured: six people at home a month in,
  with three steps each, a story with you and their own, and five facts about you: about 2800 tokens.

## Mundi Expanded 14.1 (0.2.1-14.1) · 2026-10-30

- **Who notices your phone**: replaces 0.2.0.10's line, which told every scene "someone may notice, and mind" each
  time (the AI read it as everyone noticing). Now each time you take the phone out (after 15 game minutes without it), everyone here who
  is awake rolls: 12% for the oblivious, about 37% at an ordinary "Notices and pries" of 50, about 62% for someone who
  misses nothing; a third as often for someone who noticed in the last three hours. For 20 minutes the scene is told
  who noticed (they may remark on it, or let it go) and who did not (no reaction). Whoever you text while they sit
  right here gets it and knows.
- **Fixed**: the Relationships graph slid under the person's list (all phone skins). 12.3's keypad fix made the phone's
  body a scroll box of its own (overflow-x: hidden); now it clips instead (overflow-x: clip), and the graph keeps its
  proportions.
- **Fixed**: the profile sliders (how social, keeps a secret, notices and pries) saved the value but kept the old
  number on screen: a slider let go now redraws (its "change" event was never passed on).

## Mundi Expanded 14 (0.2.1-14) · 2026-10-30 · Memory

- **Landmarks**: a new night pass (one AI call, after the relationships) weighs today's moments between you and each
  person and the house's moments tonight: 1 passing, 2 nice or annoying, 3 it matters, 4 it changes something, 5
  unforgettable. From the landmark weight (4 by default), or pinned by you, a moment is never forgotten and never
  trimmed. Every few days (5 by default) a second call folds the new landmarks into "the story so far": you and each
  person, and each person's own story in the house; the three previous versions are kept (undo). Pinned moments are
  always sent word for word.
- **Fading**: ordinary moments last by weight and a half-life (7 days by default; people here remember a bit longer)
  instead of "the last two per pair". The relationships' lines use it for every pair.
- **What they know**: small lasting facts the night notes ("studies computer security", "afraid of heights"); a new
  fact may replace an old one. The scene gets what the people here know about you and about each other.
- **Who they have become**: a step of change ("has started to trust you a little") is only ever added, never
  rewritten. Brakes: only for someone who was in today's scenes, with something of weight 3+ since their last step,
  some history first, and at most one step per person every 7 days (a dial).
- **This Home → Memory**: presets (Light, Normal, Rich) and every dial: diary days the AI reads (1–7, was 2), the
  landmark weight, the half-life, how often and how long the stories are, the brake; a token estimate; "Bring the
  stories up to date now". Then, person by person, everything that is kept, to read, edit, pin, unpin, make a
  landmark or delete, and to add your own steps and facts.
- **Robust**: a refusal, an empty answer or a reply in the wrong form is never taken for "nothing happened": the
  night shows "Try again" (memory and the stories separately); a story the reply leaves out is kept as it was. Names
  the reply gets wrong, weights out of range and facts about oneself are dropped line by line.

## Mundi Expanded 13 (0.2.1-13) · 2026-10-30 · Scenes

- **The log in scenes** (a Home): the day is still one chat (upstream: walking between rooms is one conversation),
  but the log shows it in scenes. A new scene: another place, an hour without a word in the same place, or an almost
  new company (fewer than half stayed). Someone coming in or leaving is a small mark inside the scene; a line or two
  said next door before coming straight back (within 15 minutes) is an aside. Earlier scenes of the day fold to one
  line ("20:00–20:40 · Your room · Maya · 12 lines"); a click opens one. Uses the stamps every line has carried since
  0.2.0.8 (who was there, where, when).
- **Previously**: a book button in the log's corner opens the days before, day by day and scene by scene. The lines
  are SillyTavern's hidden ones (upstream hides each day from the AI when you sleep): shown, never sent.
- **What the AI reads of today**: before each reply SillyTavern hands the extension the lines it will send (its
  generate interceptor, declared in the manifest); the scenes none of the people here were in are taken out of that
  copy. The chat is untouched, so they come back as soon as one of those people is with you; the prompt still says
  that the scene happened and who was there, and the night reader still reads the whole day. People → Settings:
  "What they were there for" (default), "Strict" (your scenes alone too), "Everything" (as before).
- **Listening at your door**: whoever listened keeps the scraps they caught; the scene says what they heard instead
  of "did not hear that".

## Mundi Expanded 12.4 (0.2.1-12.4) · 2026-10-29

- **Sprites stay in their places**: since 12.2 the one speaking lost upstream's centring (-50%) when it stepped up, so
  it slid half a place to the right, onto the next person, and back when someone else spoke. The lift (and the hop
  on a new face, and the phone-call look) now moves the picture inside, never the place.
- **Go out by their own bedtime**: instead of a fixed 23:00, someone who would be asleep within two hours (by their
  own schedule) says no unless they are your partner or close to you (50+). A night owl still comes out at 1 a.m.

## Mundi Expanded 12.3 (0.2.1-12.3) · 2026-10-29

- **Get-togethers at home**: saying yes to a housemate's movie night (games, cooking together, or a plan of theirs at
  home) makes a get-together in that room, not a one-to-one meet-up. The panel names the host and everyone in the
  room; nobody joins your party or follows you; it ends when you leave the room, when its time is up, or with
  "Call it a night" (everyone wraps up; any of them may answer).
- **Go out asks first**: someone asleep, or someone you have not met or barely know, will not come along. Their chip
  is greyed with the reason.
- **Phone battery**: full in the morning, about 5% an hour while you are awake (some 20% left at 23:00), charges while
  you sleep, never under 5%. Orange at 30%, red at 15%.
- **Listening at a door**: the prompt now has who is inside (from their cards) and how they get along; more room for
  the answer (thinking models used it all up), and a cut-off answer ends at its last whole sentence.
- **Crossword themes** are picked from 50 built-in ones, never one of your last 15.
- **A stopped goodbye** (Stop pressed on "it is time to say goodbye") ends the meet-up anyway; before, the person
  stayed "saying goodbye" and showed up in every room until you did something else.
- **Scene**: a sprite whose figure stands off-centre in its picture is trimmed on the wider side, so it stands in the
  middle of its place (Chrome). Your portrait moves up above the dialog while the phone is open (wide screens, centred
  dialog). The keypad phone's settings no longer overflow sideways.

## Mundi Expanded 12.2 (0.2.1-12.2) · 2026-10-29

- **Traits that add up**: two traits on the same skill no longer count only the higher one: the higher, +1 for each
  other one, up to level 5 (Strong 3 and Athletic 4: fitness 5). The tooltip says which traits stack.
- **Interests make skills grow faster** instead of setting a starting level: +20% experience in the skills they are
  about (Cooking: cooking; Music: the guitar; Books: writing and studying; Technology: programming; Sports: fitness;
  Art: writing), +40% at most for two on one skill. Shown in the tooltips and in Me (Skills). Saves keep the levels
  they already have.
- **Steadier sprites**: a new face shows once its picture has loaded (no sideways jump), the one speaking steps up a
  few pixels instead of growing (no blur), and the breath is off by default (Settings → Interface → Scene →
  Characters breathe).

## Mundi Expanded 12.1 (0.2.1-12.1) · 2026-10-29

- **What the traits do**: when you pick your persona's traits for a Home, a dot marks the ones that change the rules,
  and hovering one shows what it does (a small window by the cursor): the skill it starts you at, or, for Handy, more
  time in the cleaning games. Every trait is also told to the scene.
- **Starting skills from the traits right away**: the first time a Home opens with this version, the traits set your
  starting skills; the Me app still lets you adjust them (before, nothing happened until you saved them there).
- **Fixed what some traits meant**: Handy no longer counts as cooking (it gives more time when cleaning); Charming no
  longer counts as work (it only reaches the scene for now); traits that gave a skill level of 1 (no change) give 2.
- Roadmap: Personality and the traits without effects are a reminder there.



Your own life: time spent alone that comes back to the others. Settings are in the new Me app (Settings tab).

- **Mini-games.** The things you do on your own ask first: play it, or just do it (by your skill and a little luck),
  and with whom. The game is code; the mechanics model only writes the content, one call a session, with a built-in
  set when the call fails.
  - **Cooking** (the kitchen's Cook): a dish invented from what is in the fridge and pantry, three choices with one right
    answer and two moments on the heat; the leftovers get the dish's name; whoever cooks with you says what they think.
  - **The guitar** (with a guitar in the room): a three-string rhythm game (A S D or tap), with plucked strings you hear;
    the house hears it too ("it sounded rough", "beautiful").
  - **Cleaning** (Tidy up, and the chores): scrub the dirt, put things away, against the clock; a helper is faster.
  - **A crossword** (anywhere at home): six words on a theme; with someone, they know some answers (or are not in the
    mood to help), and when you are stuck they may say "Oh, I know this one!". All decided in the one call.
  - **Work and study** (at a desk or a computer): quick tasks against the clock while the house distracts you (more when
    it is loud: streaming, music, people in the room).
  - **Programming**: find the line with the bug, then pick the design for the next part. **Writing**: three candidate
    lines a moment, or write your own. Both are works that grow session by session (a short story or a small tool in 3,
    a novella or an app in 6, a novel or a big project in 10). How good the offered ideas are is rolled from your skill
    (better and, rarely, brilliant ones come with skill); what you pick adds up, and the finished work gets its verdict
    (a masterpiece is rare even at level 7–9). Let someone read it (the scene is told what they think); a nosy one may
    read it without asking.
- **Skills**: cooking, guitar, writing, programming, studying, work, fitness; 1–10, slowly (Settings: slow, normal,
  fast), more for a game played well, an average amount for just doing it. Set where you start in the Me app (the
  persona's traits are already in; "Read my persona" asks the model once). The scene is told what you are good at,
  and your traits (Mundi's Proficiency, Personality, Interests: in Home they reached nothing before).
- **Characters' skills and tidiness** are now part of their profiles (made with the profile, guessed from the card
  otherwise; the guess now also reads Russian cards: `\b` in JavaScript only knew Latin letters).
- **Chores** (Gentle by default; Off; Serious): a weekly rota of the dishes, the trash, the common rooms and the
  bathroom, round everyone (you too); the others do theirs by how tidy they are (more likely after a reminder from
  their menu; twice is nagging). The kitchen, the living room and the bathroom get messy with use, and the scene sees
  it. Doing someone's chore is a favour. Serious: someone tidy complains (a quarrel at night, or annoyed with you), and
  the group chat talks about it.
- **The calendar** (Calendar → Week, and the Me app): birthdays (from the card, or a day of the year; the house knows on
  the day; forget a close one's and they are hurt), what each one has coming up this week (an exam, an interview, a
  date, a trip: nervous before, and the outcome after, to ask about), the house's evenings (Game night on Fridays,
  Sunday dinner: the house plans them and someone asks you along; each can be turned off), New Year in the middle of
  winter, and the golden week (the first days of summer: nobody works or studies). A season lasts 14 days or a month.
- **While you were away**: coming home after an hour and a half or more, or in the morning, up to three hints of what
  happened (a tense pair, leftovers in the fridge, the mess, someone back from their interview, a busy house chat), not
  more often than every four hours.

## Mundi Expanded 11.1 (0.2.1-11.1) · 2026-10-29

Mundi 0.2.1 merged in (its notes are below, under Mundi 0.2.1), and new version numbers.

- **Versions** are now the upstream Mundi version, a dash, and Expanded's own release number, which goes on across
  upstream versions: `0.2.1-11.1` is Expanded 11.1 on Mundi 0.2.1. The old ones glued the two together
  (`0.2.0.11` was Expanded 11 on Mundi 0.2.0). The game compares both forms right (the "what's new" window, the update
  note on the main menu).
- **From Mundi 0.2.1**: visitors and the doorbell, guests from outside at parties, going out with anyone and on to
  another place, actions that fit the room, needs if you want them, rain sounds, the dialog box on the left, sprites on
  either side in Cards, the background fading when you move, the language picker, This world → AI context, and its
  safety fixes (world files, cards and messages can no longer run code or press Mundi's buttons).
- **How they fit with Expanded**: the house's things still decide what a room offers, on top of Mundi's new room
  actions (Play video games needs a console or a PC in the room; Read in bed takes the place of Expanded's "Read for a
  while"); visitors take part like anyone while they stay (conversations in the house, the social battery), but one who has
  had enough company is not sent to a room of their own; the playful-slap fix (a harsh line counts only if they take it
  badly) also reads Expanded's faces from the mechanics model; activities of plans still run next to the visitors.

## Mundi Expanded 0.2.0.11 · 2026-10-29

Their move: until now every conversation began with you. Now the house talks without you, and comes to you; most of
it is ordinary talk, the drama stays rare. Settings → Their move (in the phone's Settings).

- **Walking in.** Coming into a room with two or more people who are free (awake, no headphones, not at work), a
  conversation may already be going (about 40% in the evening, less in the morning and the day, a little more with more
  people): two of them, three, or everyone. A card: **Listen** (their lines go into the story, then join in or leave
  them to it), **Join in**, or **Walk past**. Listening, they may notice you: pull you in ("what do you think?"), or fall
  silent if it was about you or a secret. Wrapping up when you came in: you catch the last lines and they split up.
- **What they talk about** is rolled in code, not left to the model (asked for "a random topic", a model always picks
  the likeliest one): the house's own news they all know (a fight, a new thing, a quarrel not talked out); threads,
  what was really left open in earlier scenes (a bet, a promise to show an anime: the night reader now notes them, and
  they fade after five days); an interest of someone there, from an angle (a funny story about it, an argument about
  it…); or one of about 180 everyday topics, with the era and the tones it suits ("the worst job you ever had", "which
  of us would win a fight with a goose"). A group never gets the same topic twice in a row. The tone (lazy chatter,
  joking, an argument, a heart-to-heart, a lecture, gossip, complaining, flirting where it fits) follows how they get
  along. One short mechanics call writes the lines, only when a conversation is going; the card waits for it.
  How dramatic: calm, usual or spicy. The topics list can be edited (untick, add your own, with #tone).
- **Someone comes up to you** with something on their mind (mostly everyday; first what they most want to tell you, if
  there is something: unfinished business, a thread with you, news). **Listen** lets them start (one reply by the main
  model), **Not now** puts it off; sent away again and again, they come less.
- **Initiative.** Apart from you, the wish to see you grows (closeness, feelings, something to tell you). Then they come
  looking: into the room you are in, a knock on your door (in the day too), a text when you are out of the house.
- **Invitations** for the evening by text (movie night, game night, cooking together, where the house has the thing
  for it): yes makes it a plan with the activity; the phone buzzes an hour before, and again if it starts without you;
  not showing up is standing them up. Every few days by default.
- **The social battery** (hidden): talking with you tires them (an introvert in about two hours, an extrovert in seven;
  closer people and partners last longer, someone upset with you less); sitting in silence or with others, less; alone
  or asleep, they recharge. Tired: shorter answers. Had enough: they wrap it up and go to their room. Show the truth
  shows where it stands (and whether they want to see you).
- **People coming in** while you are in a room: the story says so, with what they are doing ("Leah comes in (making
  tea)"); someone who came looking for you comes up to you instead.
- **What they are doing** shows under their names in the scene (from their day: reading, headphones on…); the scene is
  told that headphones mean they do not hear.
- **Walking to another room** takes a minute (two to another floor). Can be turned off.
- **Fog on the map** (off by default): the map shows who is in your room; elsewhere, faded, where you last saw everyone,
  for three hours; closed doors show someone inside only if you saw them go in. The 3D view does not use it yet.

## Mundi Expanded 0.2.0.10 · 2026-10-29

Live in the scene: quick decisions, a phone that buzzes, calls and knocks you answer in time, and things to do
together on screen. Typing stays the way to answer; the new pieces only come up where a quick reaction is natural.

- **Quick reactions.** The expressions call (once per turn, nothing extra) also says whether the last line is a light
  "beat": a tease, a small question, something sudden, a touch, being put on the spot. Then two or three short ways to
  react appear by the message box, written for your persona's card (a quiet persona is never offered a rude one).
  A tap puts it in the box to finish in your own words. Never on serious or emotional moments; at most every fifth
  message by default ("normal": every third; off). Settings → the reactions, when expressions are not SillyTavern's.
- **Moments that cannot wait.** Rarely, a beat comes with a timer (8–11 s; a touch is quicker). If it runs out, the
  story gets "*you hesitate a moment too long*". The timer can be turned off.
- **Knocks** are anonymous until you ask "Who is it?"; whoever knocks gives up after about 14 seconds.
- **Calls** ring in the scene from people who are not here (rarely, in the day, once a day at most): answer and they
  are in the scene as a voice only, decline, or miss it (a missed call). How often: Chat settings.
- **The phone buzzes.** While the phone is closed, new messages and group chat lines pop up over its button with an
  unread count (99+); a tap opens the chat. Whoever is here notices when you keep looking at the phone.
- **Together** (the ✦ by the message box): watch a film (a TV in the room; one call makes up a film in the genre and
  era as eight moments with each viewer's reaction, shown as subtitles on a screen and bubbles over their heads; you
  react with emoji; it ends with a line in the story and brings them a little closer); play a match (a console or a
  PC; five rounds of hitting the zone, harder each round, against someone who is better at it if they are a gamer, with
  their trash talk); rock-paper-scissors (best of three) and a coin, with an optional "for what".
- **Sprites live a little**: a slow breath, a small hop when someone new appears, the speaker a little larger and in
  front, the others dimmed; a caller shows as on the phone.

## Mundi Expanded 0.2.0.9 · 2026-10-29

Behind closed doors: listening, and flirting and closeness. Mundi tracks the state around it; the scenes themselves
are the main model's, with your preset.

- **Feelings, one way.** Romance between characters as its own axis (0–100; interest, a crush, in love), each way
  apart: a crush can be unrequited and unspoken. It grows from the night reader's sparks only where it fits their
  orientation and gender (profiles), slower with a partner outside the house, and fades when nothing feeds it. A
  confession becomes a couple when it is returned, or unfinished business; a couple forms only from two crushes.
  Upstream's random couples are off in a Home.
- **You**: the romance line says it is their feelings for you (a crush is unspoken, not necessarily returned); your
  own feelings can be marked (likes, in love; kept to yourself), so the house can notice and talk. Alone with you,
  someone with an unspoken crush may confess. The scene says how flirting from you would land (glad, flustered,
  uncomfortable: a partner right there); flirting in front of someone's partner has a price.
- **Listening**: at a closed door (the mechanics model writes what you hear: mostly muffled sounds and scraps of
  words, never graphic); you may be caught. Keep an eye on someone for a few hours. Someone may listen at your door
  while someone is with you (rarely: nosy, close to you, or with feelings). The walls: thin, ordinary, thick. Asked
  about a secret, people tell, hint or cover, by trust, loyalty and discretion.
- **Nights**: couples sleep over now and then (never / sometimes / often; your partner too); a secret one slips out
  early and may be seen. Nights together from the reader and off-screen; neighbours may hear; the morning after is
  easy or awkward (affection in front of others, a new profile trait). Your partner can move into your room. A date at
  home: you ask the house for a room tonight in the house chat; who agrees keeps away.
- **Profiles**: gender (guessed from the card's pronouns), affection in front of others.
- **Failed mechanics calls** (the night, the story reader, listening): a notice with Try again.
- One switch turns flirting and romance off. Fix: the settings' segment buttons from 0.2.0.8 (the house's mood,
  limits) did nothing.
- Tests: love 5.

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


## Mundi 0.2.1 · 2026-10-28 (upstream)

Fixes and improvements for Home mode.

### Security

Thanks to **coldasblues**, whose fork found these.

- **World files can no longer run code.** Picture addresses, numbers and colors from a world file (yours or one
  you imported) went into the page's styles as they were, and a crafted file could run code inside SillyTavern.
  Now a picture can only be a picture, numbers stay numbers and colors stay colors, and everything Mundi draws
  is cleaned of anything that could run code.
- **Slash commands:** text sent through SillyTavern's commands (lines, narration, read aloud, pictures) can no
  longer carry an STscript `{: … :}` block.
- **Importing a world** only uses the pictures inside the file: nothing is downloaded from other sites.
- **Messages can't press Mundi's buttons:** a reply (or a card, or a shared chat) with HTML that copied Mundi's
  controls could make a click do something in Mundi. Those controls are now removed from what messages show.
- **Pictures from links in messages** now follow SillyTavern's "Forbid external media" (a picture from another
  site tells that site you are reading). To show them anyway: Chat look → Show pictures from links.
- **Every attribute filled from a world, a card or a save is escaped**, also in the world creator's fields, and a
  currency symbol or an icon can't carry HTML.

### Visitors (Home)

- **Invite people over** from the Calendar (a new Visits tab). They arrive about an hour later and stay until
  you say goodbye.
- **The doorbell:** when they arrive, it rings. Open the door yourself, or someone else answers after a while.
  If you are out, they are let in.
- **Where they sleep:** a free bedroom, your room or a housemate's room, chosen for each guest (and changeable
  while they stay).
- **Guests' rooms** are always open to you, and saying goodbye in their room no longer leaves you in the dark.

### Parties and going out

- **Guests from outside:** a party can invite people who don't live in the house. They come at the start and go
  home at the end, unless you ask them to stay after the party.
- **A party out of the house:** pick the place and its background.
- **Edit the guests** of a planned party on its card (Edit guests), next to Call it off.
- **Go out** with anyone from your cast or your library, and pick the background. A date "somewhere out" can
  have its own background too.
- **Sleeping through plans:** going to sleep when a party or a date is coming asks first. "Sleep until the
  party" (or the date) wakes you up just in time.

### Looks and sound

- **The AI narrates what you do right away** (Things to do, in a scene). On by default.
- **AI calls in one place:** This world → AI context lists everything that makes Mundi call the AI (narrating what
  you do, the diary, characters' texts, Chirp posts and pictures), each with its own switch. New: characters' texts
  can use short ready-made replies instead of the AI.
- **Rain and storm sounds**, with their own switch and volume (Settings → Weather sounds).
- **Cards layout:** sprites on the left or the right.
- **Visual novel:** the dialog box on the left, with an adjustable width.
- **Backgrounds** fade into each other when you move.
- **Character picker:** folders keep their color.

### Home

- **This Home** comes first in the menu and holds the Home settings.
- **Company stays:** someone who comes along with you stays until you part (no timer), and can go to your room
  with you.
- **More kinds of family ties.**
- **Bedroom doors:** someone's room when they're not in is locked (no more ringing a doorbell inside the house); when
  they're in, you knock.
- **The menu** no longer repeats "Go to my room" and "Go out" (they're on the top bar).
- **What you can do fits the room:** eating and drinking in the kitchen (everything) and the dining room (a meal, a
  coffee, a drink, a snack); the TV and the new **Play video games** in the living room; washing up (a shower, the
  new **Brush your teeth**) in the bathrooms. Rooms you set up yourself in the Home creator keep your choice.
- **Things to do in each room:** swim, sunbathe or relax by the pool; do the laundry; tinker or wash the car in the
  garage; sit on the porch or water the plants; tidy up the storage room; set the table; read in bed. Working out
  (the treadmill too) is in the gym.
  Your own Homes get the same: a room called "Piscina", "Garage", "Banheiro"… gets the actions of that kind of room
  (by its name, in English, Portuguese or Spanish).
- **Homes you made before** are brought up to date when they open: they get the actions added since and lose built-in
  ones that no longer exist. Actions you made yourself are never touched, and one you remove stays removed.
- **Go out** from the garage and the entrance too, not only from the floor plan.
- **Go somewhere else:** when you are out, go on to another place (the cinema, then the mall, then a restaurant…)
  with its own name and background; who is with you comes along.
- **Running into someone:** stopping to talk no longer makes them follow you. They stay where you met for a while.
- **New pictures** for Stella and Seraphina in the tour.
- **Needs, if you want them:** This Home → Needs turns on hunger, thirst, mood and hygiene for this game (off by
  default). Their icons show under the clock, they drop with time, and the AI is told when one is low. No energy, and
  nothing bad happens when one runs out.
- **The Advanced switch** at the top of This Home is easier to see.

### First steps, tour and gallery

- **Choose your language first:** the first time Mundi opens, before Stella shows up, a window asks only for the
  language (English, Português (Brasil), Español). The welcome and the tour then come in that language.
- **Stella's tour box** stays in the same place and the same size on every step, so the buttons (Skip tour, back,
  Next) never move. The text is bigger, the step count sits next to the buttons, and Stella is shown whole from the
  waist up, standing on the box's bottom line.
- **Gallery:** two tabs, **Saves** and **Character greetings**. Saves are one grid, newest first, with the game's
  name under each album (before, every game had its own row, so it looked like a list).
- **Settings → Game → What's new** opens this version's changelog instead of the tour.
- **The Old Manor** has a cover picture.

### Fixes

- **Playful slaps and teasing** no longer cost bond: a harsh line only counts if the character takes it badly (the
  emotion of their reply, or, without the Expressions extension, the words of it: they laugh, or they pull away in
  tears). Said with a grin, "de leve", "playfully"… it doesn't count at all.
- **Family and ties:** someone added later as your spouse (or fiancé, or partner) shows as Married (Engaged,
  Dating) and is no longer a stranger. Before, this only worked when set while creating the game.
- **Rooms off the floor plan:** a guest sleeping in a shared room no longer creates a room that isn't on the plan.
- **Scene background:** the floor plan no longer gets stuck in the background after you move.
- **The phone** no longer slides in again when a dialog opens.
- **Exporting a world** now takes along the backgrounds you picked from your own SillyTavern (My backgrounds),
  so the person who imports it sees them too.

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
