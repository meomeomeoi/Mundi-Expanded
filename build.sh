#!/bin/sh
# Builds the extension: TypeScript → dist/, CSS parts → style.css. Then the save-safety checks run: a build that
# would break players' saves (a removed id in a built-in world, or an old save that no longer opens) fails.
# Needs TypeScript (npm i -g typescript, or set TSC to your tsc) and Node 18+.
set -e
cd "$(dirname "$0")"
${TSC:-tsc} -p tsconfig.json
cat css/*.css > style.css
[ -f tests/ids.mjs ] && node tests/ids.mjs
[ -f tests/parity.test.mjs ] && node tests/parity.test.mjs 2>/dev/null | grep -v '^\[Mundi\]'
if [ -f tests/saves.test.mjs ]; then
node tests/saves.test.mjs > /tmp/mundi-saves-test.log 2>&1 || { cat /tmp/mundi-saves-test.log; echo "SAVE TESTS FAILED"; exit 1; }
tail -1 /tmp/mundi-saves-test.log
fi
if [ -f tests/systems.test.mjs ]; then
node tests/systems.test.mjs > /tmp/mundi-systems-test.log 2>&1 || { grep -v "^\[Mundi\]" /tmp/mundi-systems-test.log; echo "SYSTEM TESTS FAILED"; exit 1; }
echo "systems: $(tail -1 /tmp/mundi-systems-test.log)"
fi
if [ -f tests/prompt.test.mjs ]; then
node tests/prompt.test.mjs > /tmp/mundi-prompt-test.log 2>&1 || { grep -v "^\[Mundi\]" /tmp/mundi-prompt-test.log; echo "PROMPT TESTS FAILED"; exit 1; }
echo "prompt: $(tail -1 /tmp/mundi-prompt-test.log)"
fi
if [ -f tests/guests.test.mjs ]; then
node tests/guests.test.mjs > /tmp/mundi-guests-test.log 2>&1 || { grep -v "^\[Mundi\]" /tmp/mundi-guests-test.log; echo "GUEST TESTS FAILED"; exit 1; }
echo "guests: $(tail -1 /tmp/mundi-guests-test.log)"
fi
if [ -f tests/security.test.mjs ]; then
node tests/security.test.mjs > /tmp/mundi-security-test.log 2>&1 || { grep -v "^\[Mundi\]" /tmp/mundi-security-test.log; echo "SECURITY TESTS FAILED"; exit 1; }
echo "$(tail -1 /tmp/mundi-security-test.log)"
fi
if [ -f tests/world.test.mjs ]; then
node tests/world.test.mjs > /tmp/mundi-world-test.log 2>&1 || { grep -v "^\[Mundi\]" /tmp/mundi-world-test.log; echo "WORLD TESTS FAILED"; exit 1; }
echo "world: $(tail -1 /tmp/mundi-world-test.log)"
fi
if [ -f tests/daylife.test.mjs ]; then
node tests/daylife.test.mjs > /tmp/mundi-daylife-test.log 2>&1 || { grep -v "^\[Mundi\]" /tmp/mundi-daylife-test.log; echo "DAY LIFE TESTS FAILED"; exit 1; }
echo "day life: $(tail -1 /tmp/mundi-daylife-test.log)"
fi
if [ -f tests/rumors.test.mjs ]; then
node tests/rumors.test.mjs > /tmp/mundi-rumors-test.log 2>&1 || { grep -v "^\[Mundi\]" /tmp/mundi-rumors-test.log; echo "RUMOR TESTS FAILED"; exit 1; }
echo "rumors: $(tail -1 /tmp/mundi-rumors-test.log)"
fi
if [ -f tests/daynight.test.mjs ]; then
node tests/daynight.test.mjs > /tmp/mundi-daynight-test.log 2>&1 || { grep -v "^\[Mundi\]" /tmp/mundi-daynight-test.log; echo "DAY/NIGHT TESTS FAILED"; exit 1; }
echo "day/night: $(tail -1 /tmp/mundi-daynight-test.log)"
fi
if [ -f tests/social.test.mjs ]; then
node tests/social.test.mjs > /tmp/mundi-social-test.log 2>&1 || { grep -v "^\[Mundi\]" /tmp/mundi-social-test.log; echo "SOCIAL TESTS FAILED"; exit 1; }
echo "social: $(tail -1 /tmp/mundi-social-test.log)"
fi
if [ -f tests/rpg.test.mjs ]; then
node tests/rpg.test.mjs > /tmp/mundi-rpg-test.log 2>&1 || { grep -v "^\[Mundi\]" /tmp/mundi-rpg-test.log; echo "RPG TESTS FAILED"; exit 1; }
echo "rpg: $(tail -1 /tmp/mundi-rpg-test.log)"
fi
if [ -f tests/combat.test.mjs ]; then
node tests/combat.test.mjs > /tmp/mundi-combat-test.log 2>&1 || { grep -v "^\[Mundi\]" /tmp/mundi-combat-test.log; echo "COMBAT TESTS FAILED"; exit 1; }
echo "combat: $(tail -1 /tmp/mundi-combat-test.log)"
fi
if [ -f tests/society.test.mjs ]; then
node tests/society.test.mjs > /tmp/mundi-society-test.log 2>&1 || { grep -v "^\[Mundi\]" /tmp/mundi-society-test.log; echo "SOCIETY TESTS FAILED"; exit 1; }
echo "society: $(tail -1 /tmp/mundi-society-test.log)"
fi
if [ -f tests/realm.test.mjs ]; then
node tests/realm.test.mjs > /tmp/mundi-realm-test.log 2>&1 || { grep -v "^\[Mundi\]" /tmp/mundi-realm-test.log; echo "REALM TESTS FAILED"; exit 1; }
echo "realm: $(tail -1 /tmp/mundi-realm-test.log)"
fi
if [ -f tests/growth.test.mjs ]; then
node tests/growth.test.mjs > /tmp/mundi-growth-test.log 2>&1 || { grep -v "^\[Mundi\]" /tmp/mundi-growth-test.log; echo "GROWTH TESTS FAILED"; exit 1; }
echo "growth: $(tail -1 /tmp/mundi-growth-test.log)"
fi
if [ -f tests/economy.test.mjs ]; then
node tests/economy.test.mjs > /tmp/mundi-economy-test.log 2>&1 || { grep -v "^\[Mundi\]" /tmp/mundi-economy-test.log; echo "ECONOMY TESTS FAILED"; exit 1; }
echo "economy: $(tail -1 /tmp/mundi-economy-test.log)"
fi
if [ -f tests/adventure.test.mjs ]; then
node tests/adventure.test.mjs > /tmp/mundi-adventure-test.log 2>&1 || { grep -v "^\[Mundi\]" /tmp/mundi-adventure-test.log; echo "ADVENTURE TESTS FAILED"; exit 1; }
echo "adventure: $(tail -1 /tmp/mundi-adventure-test.log)"
fi
if [ -f tests/hobbies.test.mjs ]; then
node tests/hobbies.test.mjs > /tmp/mundi-hobbies-test.log 2>&1 || { grep -v "^\[Mundi\]" /tmp/mundi-hobbies-test.log; echo "EVENTS/HOBBIES TESTS FAILED"; exit 1; }
echo "events and hobbies: $(tail -1 /tmp/mundi-hobbies-test.log)"
fi
if [ -f tests/rpglock.test.mjs ]; then
node tests/rpglock.test.mjs > /tmp/mundi-rpglock-test.log 2>&1 || { grep -v "^\[Mundi\]" /tmp/mundi-rpglock-test.log; echo "RPG LOCK TESTS FAILED"; exit 1; }
echo "rpg lock: $(tail -1 /tmp/mundi-rpglock-test.log)"
fi
if [ -f tests/version.test.mjs ]; then
node tests/version.test.mjs > /tmp/mundi-version-test.log 2>&1 || { cat /tmp/mundi-version-test.log; echo "VERSION TESTS FAILED"; exit 1; }
echo "version: $(tail -1 /tmp/mundi-version-test.log)"
fi
# [expanded] the fork's own tests
node tests/bonds.test.mjs || { echo "BONDS TESTS FAILED"; exit 1; }
node tests/stock.test.mjs || { echo "STOCK TESTS FAILED"; exit 1; }
node tests/money.test.mjs || { echo "MONEY TESTS FAILED"; exit 1; }
node tests/slow.test.mjs && node tests/activities.test.mjs && node tests/outplaces.test.mjs && node tests/profile.test.mjs && node tests/doors.test.mjs && node tests/knocks.test.mjs && node tests/cplans.test.mjs && node tests/era.test.mjs && node tests/chats.test.mjs && node tests/jsonfix.test.mjs && node tests/exprs.test.mjs && node tests/furnish.test.mjs && node tests/secrets.test.mjs && node tests/love.test.mjs && node tests/talk.test.mjs && node tests/own.test.mjs && node tests/ensemble.test.mjs && node tests/turnplan.test.mjs && node tests/beatrun.test.mjs && node tests/overheard.test.mjs && node tests/aictx.test.mjs && node tests/chores.test.mjs || { echo "EXPANDED TESTS FAILED"; exit 1; }
echo "build ok"
