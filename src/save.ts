
export interface Stats { aligned: number; perfect: number; played: number; hints: number; dailyDone: number; streak: number; bestStreak: number; lastDailyDate: string; noHintWins: number; batWins: number; }
export interface SaveData {
  v: number; level: number; stars: Record<number, number>; gems: number; lang: string;
  sound: boolean; music: boolean; haptics: boolean; cb: boolean; reduceMotion: boolean; tips: boolean;
  lastDaily: string; noAds: boolean; wins: number; tutorialDone: boolean;
  stats: Stats; missions: Record<string, number>; claimed: string[];
}
const KEY = "moonvane.save";
export function defaultStats(): Stats { return { aligned: 0, perfect: 0, played: 0, hints: 0, dailyDone: 0, streak: 0, bestStreak: 0, lastDailyDate: "", noHintWins: 0, batWins: 0 }; }
export function defaults(): SaveData { return { v: 2, level: 1, stars: {}, gems: 60, lang: "", sound: true, music: false, haptics: true, cb: false, reduceMotion: false, tips: true, lastDaily: "", noAds: false, wins: 0, tutorialDone: false, stats: defaultStats(), missions: {}, claimed: [] }; }
export function load(): SaveData {
  try {
    const raw = localStorage.getItem(KEY); if (!raw) return defaults();
    const d = JSON.parse(raw) as Partial<SaveData>; const base = defaults();
    const merged = Object.assign(base, d);
    merged.stats = Object.assign(defaultStats(), d.stats || {});
    merged.missions = d.missions || {}; merged.claimed = d.claimed || [];
    return merged;
  } catch (e) { return defaults(); }
}
export function persist(d: SaveData): void { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* noop */ } }
