// name → what it is (the icon, and its flags)
const K = {
    'Sunny': { icon: '☀️', rain: false }, 'Fair': { icon: '🌤️', rain: false }, 'Partly cloudy': { icon: '⛅', rain: false }, 'Cloudy': { icon: '☁️', rain: false },
    'Light rain': { icon: '🌦️', rain: true, light: true }, 'Rain': { icon: '🌧️', rain: true },
    'Downpour': { icon: '☔', rain: true, harsh: true }, 'Thunderstorm': { icon: '⛈️', rain: true, harsh: true },
    'Heatwave': { icon: '🥵', rain: false, harsh: true }, 'Fog': { icon: '🌫️', rain: false }, 'Windy': { icon: '💨', rain: false },
    'Frost': { icon: '🥶', rain: false }, 'Snow': { icon: '🌨️', rain: false, snow: true }, 'Blizzard': { icon: '🌬️', rain: false, snow: true, harsh: true },
};
/** Every kind of weather there is, by name. */
export const WEATHER_NAMES = Object.keys(K);
// per season: [kind, where its share of the days ends (0..1)] in order
const TABLES = {
    '': [['Sunny', .3], ['Fair', .55], ['Partly cloudy', .75], ['Cloudy', .9], ['Rain', 1]],
    spring: [['Sunny', .15], ['Fair', .3], ['Partly cloudy', .44], ['Cloudy', .56], ['Fog', .62], ['Light rain', .77], ['Rain', .9], ['Downpour', .96], ['Thunderstorm', 1]],
    summer: [['Sunny', .3], ['Fair', .45], ['Partly cloudy', .57], ['Cloudy', .65], ['Heatwave', .78], ['Light rain', .84], ['Rain', .9], ['Downpour', .94], ['Thunderstorm', 1]],
    autumn: [['Sunny', .12], ['Fair', .24], ['Partly cloudy', .36], ['Cloudy', .52], ['Fog', .6], ['Windy', .7], ['Light rain', .82], ['Rain', .92], ['Downpour', 1]],
    winter: [['Sunny', .1], ['Fair', .2], ['Partly cloudy', .3], ['Cloudy', .45], ['Frost', .57], ['Snow', .72], ['Blizzard', .83], ['Light rain', .9], ['Rain', 1]],
};
// a map's climate takes out what cannot happen there
const SWAP = {
    hot: { Frost: 'Fair', Snow: 'Cloudy', Blizzard: 'Heatwave' },
    cold: { Heatwave: 'Sunny' },
};
const SEASON_IDS = ['spring', 'summer', 'autumn', 'winter']; // the year starts in spring (the same as sim/time.ts, not imported to keep this file light)
/** The season of a day (not only today's), by the game's season length. */
export const seasonIdOn = (g, day) => SEASON_IDS[Math.floor((Math.max(1, day) - 1) / Math.max(1, Math.round(g.cfg?.seasonDays ?? 14))) % 4];
export function weatherOn(world, day, o = {}) {
    const h = Math.abs(Math.sin(day * 12.9898 + (world.length * 7.1)) * 43758.5453) % 1;
    const table = TABLES[o.season ?? ''] ?? TABLES[''];
    let name = (table.find(([, to]) => h < to) ?? table[table.length - 1])[0];
    name = SWAP[o.climate ?? '']?.[name] ?? name;
    return { name, ...K[name] };
}
/** Does the weather match a name written by a world or a person ("Rain" is any rain)? */
export const weatherMatches = (wx, wanted) => { const w = wanted.trim().toLowerCase(); return !w || wx.name.toLowerCase().includes(w) || (w === 'rain' && wx.rain) || (w === 'snow' && !!wx.snow); };
/** Weather that sends people indoors (their outdoor plans change, outdoor events are off). A drizzle does not. */
export const keepsIndoors = (wx) => (wx.rain && !wx.light) || !!wx.harsh || !!wx.snow;
export function weatherOf(g) {
    const wx = weatherOn(g.world, g.day, { season: seasonIdOn(g, g.day) });
    const night = g.minutes < 330 || g.minutes >= 1170;
    return { ...wx, icon: night && !wx.rain && !wx.snow ? '🌙' : wx.icon };
}
