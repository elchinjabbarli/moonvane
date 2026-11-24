const KEY = "moonvane.save";
export function defaults() { return { v: 1, level: 1, stars: {}, gems: 60, lang: "", sound: true, music: false, haptics: true, cb: false, lastDaily: "", noAds: false, wins: 0 }; }
export function load() { try {
    const raw = localStorage.getItem(KEY);
    if (!raw)
        return defaults();
    const d = JSON.parse(raw);
    return Object.assign(defaults(), d);
}
catch (e) {
    return defaults();
} }
export function persist(d) { try {
    localStorage.setItem(KEY, JSON.stringify(d));
}
catch (e) { /* noop */ } }
