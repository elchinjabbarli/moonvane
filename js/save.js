const KEY = "moonvane.save";
export function defaultStats() { return { aligned: 0, perfect: 0, played: 0, hints: 0, dailyDone: 0, streak: 0, bestStreak: 0, lastDailyDate: "", noHintWins: 0, batWins: 0 }; }
export function defaults() { return { v: 2, level: 1, stars: {}, gems: 60, lang: "", sound: true, music: false, haptics: true, cb: false, reduceMotion: false, tips: true, lastDaily: "", noAds: false, wins: 0, tutorialDone: false, stats: defaultStats(), missions: {}, claimed: [] }; }
export function load() {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw)
            return defaults();
        const d = JSON.parse(raw);
        const base = defaults();
        const merged = Object.assign(base, d);
        merged.stats = Object.assign(defaultStats(), d.stats || {});
        merged.missions = d.missions || {};
        merged.claimed = d.claimed || [];
        return merged;
    }
    catch (e) {
        return defaults();
    }
}
export function persist(d) { try {
    localStorage.setItem(KEY, JSON.stringify(d));
}
catch (e) { /* noop */ } }
