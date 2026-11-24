
export interface SaveData { v: number; level: number; stars: Record<number, number>; gems: number; lang: string; sound: boolean; music: boolean; haptics: boolean; cb: boolean; lastDaily: string; noAds: boolean; wins: number; }
const KEY = "moonvane.save";
export function defaults(): SaveData { return { v: 1, level: 1, stars: {}, gems: 60, lang: "", sound: true, music: false, haptics: true, cb: false, lastDaily: "", noAds: false, wins: 0 }; }
export function load(): SaveData { try { const raw = localStorage.getItem(KEY); if (!raw) return defaults(); const d = JSON.parse(raw) as Partial<SaveData>; return Object.assign(defaults(), d); } catch (e) { return defaults(); } }
export function persist(d: SaveData): void { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* noop */ } }
