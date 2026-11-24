
import { generateLevel, allSatisfied, Level, Obj, Color, Kind, CHAPTERS, VERSION, mothSatisfied } from "./engine.js";
import { Renderer, RenderState } from "./render.js";
import { AudioEngine } from "./audio.js";
import { load, persist, SaveData } from "./save.js";
import { t, setLang, applyDir, detectLang, LANGS, LANG_NAMES, Key } from "./i18n.js";
import { getNative, isNative } from "./native.js";
const $ = (id: string): HTMLElement => document.getElementById(id)!;
const HINT_COST = 30;
interface Action { type: "place" | "remove"; obj: Obj; }
interface Mission { id: string; goal: number; reward: number; get: (g: Game) => number; }
const MISSIONS: Mission[] = [
  { id: "m1", goal: 25, reward: 30, get: g => g.save.stats.aligned },
  { id: "m2", goal: 8, reward: 50, get: g => g.save.stats.perfect },
  { id: "m3", goal: 300, reward: 80, get: g => g.save.level },
  { id: "m4", goal: 8, reward: 40, get: g => g.save.stats.noHintWins },
  { id: "m5", goal: 40, reward: 40, get: g => g.save.stats.played },
  { id: "m6", goal: 3, reward: 50, get: g => g.save.stats.dailyDone },
];
function hashStr(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export class Game {
  save: SaveData; renderer: Renderer; audio: AudioEngine; level: Level;
  placed: Obj[] = []; selected: { c: Color; k: Kind } | null = null; moves = 0; undoStack: Action[] = [];
  hint: { x: number; y: number } | null = null; hintT = 0; won = false; lastT = 0; winsSinceAd = 0; time = 0; mapChapter = 0;
  dailyMode = false; hintUsed = false; prevAligned = 0; celebrateStart = -1; combo = 0;
  constructor(canvas: HTMLCanvasElement) {
    this.save = load(); const lang = this.save.lang || detectLang(); setLang(lang); applyDir();
    this.renderer = new Renderer(canvas); this.audio = new AudioEngine(); this.audio.sound = this.save.sound; this.audio.music = this.save.music;
    this.level = generateLevel(this.save.level); this.bind(); this.applyI18n(); this.buildLang(); this.syncSettings(); this.showScreen("home"); this.updateHome();
    window.addEventListener("resize", () => this.renderer.resize());
    const loop = (ts: number): void => { const dt = Math.min(0.05, (ts - this.lastT) / 1000 || 0); this.lastT = ts; this.time += dt; if (this.hintT > 0) this.hintT -= dt;
      let cel = 0; if (this.celebrateStart >= 0) { cel = Math.min(1, (this.time - this.celebrateStart) / 1.3); }
      const st: RenderState = { level: this.level, placed: this.placed, selected: this.selected, cb: this.save.cb, hint: this.hint, hintT: this.hintT, won: this.won, time: this.time, reduceMotion: this.save.reduceMotion, celebrate: cel };
      this.renderer.frame(st, dt); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  private bind(): void {
    const on = (id: string, fn: () => void): void => { const el = document.getElementById(id); if (el) el.addEventListener("click", () => { this.audio.init(); fn(); }); };
    on("btnPlay", () => { this.dailyMode = false; this.startLevel(this.save.level); });
    on("btnMap", () => this.openMap()); on("btnSettings", () => this.showScreen("settings")); on("btnHelp", () => this.showScreen("help"));
    on("btnShop", () => this.openShop()); on("btnDaily", () => this.claimDaily()); on("btnBack", () => this.openMap());
    on("btnMissions", () => this.openMissions()); on("btnMissionsBack", () => this.showScreen("home"));
    on("btnDailyChallenge", () => this.startDaily());
    on("btnUndo", () => this.undo()); on("btnReset", () => this.resetLevel()); on("btnHint", () => this.useHint());
    on("btnNext", () => this.nextLevel()); on("btnReplay", () => { this.dailyMode = false; this.startLevel(this.level.id); }); on("winMap", () => this.openMap()); on("btnDouble", () => this.doubleGems());
    on("btnMapBack", () => this.showScreen("home")); on("btnSettingsBack", () => this.showScreen("home")); on("btnHelpBack", () => this.showScreen("home")); on("btnShopBack", () => this.showScreen("home"));
    on("btnRestore", () => this.restore()); on("btnResetProgress", () => this.resetProgress()); on("btnPrivacy", () => { window.location.href = "privacy.html"; });
    on("coachBtn", () => { this.save.tutorialDone = true; persist(this.save); this.updateCoach(); });
    const cv = this.renderer.canvas;
    cv.addEventListener("pointerdown", (e: PointerEvent) => { this.audio.init(); const r = cv.getBoundingClientRect(); const c = this.renderer.cellAt(e.clientX - r.left, e.clientY - r.top, this.level.size); if (c) this.tapCell(c.x, c.y); });
    const chk = (id: string, key: "sound" | "music" | "haptics" | "cb" | "reduceMotion" | "tips"): void => { const el = document.getElementById(id) as HTMLInputElement | null; if (el) el.addEventListener("change", () => { this.save[key] = el.checked; if (key === "sound") this.audio.sound = el.checked; if (key === "music") { this.audio.init(); this.audio.setMusic(el.checked); } persist(this.save); }); };
    chk("setSound", "sound"); chk("setMusic", "music"); chk("setHaptics", "haptics"); chk("setCb", "cb"); chk("setReduceMotion", "reduceMotion"); chk("setTips", "tips");
    const ls = document.getElementById("langSelect") as HTMLSelectElement | null; if (ls) ls.addEventListener("change", () => { const v = ls.value; this.save.lang = v; setLang(v); applyDir(); persist(this.save); this.applyI18n(); this.updateHome(); this.buildTray(); this.updateHUD(); });
  }
  private haptic(k: "light" | "medium" | "heavy" | "success"): void { const n = getNative(); if (this.save.haptics && n) n.haptic(k); else if (this.save.haptics && navigator.vibrate) navigator.vibrate(k === "success" ? [20, 40, 20] : 12); }
  showScreen(name: string): void { document.querySelectorAll(".screen").forEach(s => s.classList.remove("active")); const el = $(name); el.classList.add("active"); el.classList.remove("anim"); void el.offsetWidth; el.classList.add("anim"); if (name === "game") setTimeout(() => this.renderer.resize(), 30); }
  private applyI18n(): void { document.querySelectorAll("[data-i18n]").forEach(el => { const k = el.getAttribute("data-i18n") as Key; el.textContent = t(k); }); $("verLabel").textContent = t("version") + " " + VERSION; }
  private buildLang(): void { const sel = $("langSelect") as HTMLSelectElement; sel.innerHTML = ""; for (const l of LANGS) { const o = document.createElement("option"); o.value = l; o.textContent = LANG_NAMES[l]; if (l === (this.save.lang || detectLang())) o.selected = true; sel.appendChild(o); } }
  private syncSettings(): void { const set = (id: string, v: boolean): void => { const el = document.getElementById(id) as HTMLInputElement | null; if (el) el.checked = v; }; set("setSound", this.save.sound); set("setMusic", this.save.music); set("setHaptics", this.save.haptics); set("setCb", this.save.cb); set("setReduceMotion", this.save.reduceMotion); set("setTips", this.save.tips); }
  private updateHome(): void { $("homeLevel").textContent = t("level") + " " + this.save.level + " · " + CHAPTERS[Math.floor((this.save.level - 1) / 100)]; $("homeGems").textContent = String(this.save.gems); const nat = isNative(); $("btnShop").style.display = nat ? "" : "none"; $("btnDaily").style.display = this.canDaily() ? "" : "none"; const done = this.save.stats.lastDailyDate === new Date().toISOString().slice(0, 10); const dc = document.getElementById("btnDailyChallenge"); if (dc) { dc.style.display = ""; dc.classList.toggle("done", done); } }
  private canDaily(): boolean { return this.save.lastDaily !== new Date().toISOString().slice(0, 10); }
  private claimDaily(): void { if (!this.canDaily()) return; this.save.lastDaily = new Date().toISOString().slice(0, 10); this.save.gems += 25; persist(this.save); this.updateHome(); this.toast("+25 " + t("gems")); this.audio.lock(); }
  startLevel(id: number): void { this.level = generateLevel(id); this.placed = []; this.moves = 0; this.undoStack = []; this.won = false; this.hint = null; this.hintT = 0; this.hintUsed = false; this.prevAligned = 0; this.combo = 0; this.celebrateStart = -1; this.renderer.angles = []; this.renderer.prevSat = []; this.selected = this.level.inv.length ? { c: this.level.inv[0].c, k: this.level.inv[0].k } : null; this.buildTray(); this.updateHUD(); this.showScreen("game"); this.renderer.resize(); this.updateCoach(); }
  private updateCoach(): void { const c = document.getElementById("coach"); if (!c) return; const show = this.save.tips && !this.save.tutorialDone && this.level.id <= 3 && !this.won && !this.dailyMode; c.style.display = show ? "" : "none"; if (show) { const txt = document.getElementById("coachText"); if (txt) txt.textContent = this.placed.length === 0 ? t("tut1") : (this.moves === 0 ? t("tut2") : t("tut3")); } }
  private remaining(c: Color, k: Kind): number { const e = this.level.inv.find(x => x.c === c && x.k === k); const used = this.placed.filter(o => o.c === c && o.k === k).length; return (e ? e.n : 0) - used; }
  private buildTray(): void { const tray = $("tray"); tray.innerHTML = ""; for (const e of this.level.inv) { const b = document.createElement("button"); b.className = "chip"; const rem = this.remaining(e.c, e.k); b.dataset.c = String(e.c); b.dataset.k = String(e.k); const dot = document.createElement("span"); dot.className = "dot c" + e.c + (e.k === 1 ? " bat" : ""); b.appendChild(dot); const lbl = document.createElement("span"); lbl.textContent = (e.k === 0 ? t("moon") : t("bat")) + " ×" + rem; b.appendChild(lbl); if (this.selected && this.selected.c === e.c && this.selected.k === e.k) b.classList.add("sel"); if (rem <= 0) b.classList.add("empty"); b.addEventListener("click", () => { this.selected = { c: e.c, k: e.k }; this.buildTray(); }); tray.appendChild(b); } }
  private updateHUD(): void { $("hudLevel").textContent = (this.dailyMode ? t("daily") : t("level") + " " + this.level.id); $("hudChapter").textContent = CHAPTERS[this.level.chapter]; $("hudGems").textContent = String(this.save.gems); $("hudMoves").textContent = t("moves") + " " + this.moves; $("hudPar").textContent = t("par") + " " + this.level.par; $("hintCost").textContent = HINT_COST + "◆"; }
  private occupied(x: number, y: number): boolean { return this.level.fixed.some(o => o.x === x && o.y === y) || this.placed.some(o => o.x === x && o.y === y); }
  private isBlocked(x: number, y: number): boolean { return this.level.blocked.includes(y * this.level.size + x); }
  private isMoth(x: number, y: number): boolean { return this.level.moths.some(m => m.x === x && m.y === y); }
  private alignedCount(): number { const objs = this.level.fixed.concat(this.placed); let n = 0; for (const m of this.level.moths) if (mothSatisfied(m, objs)) n++; return n; }
  tapCell(x: number, y: number): void {
    if (this.won) return;
    const pi = this.placed.findIndex(o => o.x === x && o.y === y);
    if (pi >= 0) { const obj = this.placed[pi]; this.placed.splice(pi, 1); this.moves++; this.undoStack.push({ type: "remove", obj }); this.audio.remove(); this.haptic("light"); this.combo = 0; this.buildTray(); this.updateHUD(); this.updateCoach(); return; }
    if (this.isBlocked(x, y) || this.isMoth(x, y) || this.occupied(x, y)) { this.audio.error(); this.renderer.shake = 4; return; }
    if (!this.selected || this.remaining(this.selected.c, this.selected.k) <= 0) { this.audio.error(); this.toast(t("inventory")); return; }
    const obj: Obj = { x, y, c: this.selected.c, k: this.selected.k }; this.placed.push(obj); this.moves++; this.undoStack.push({ type: "place", obj }); this.audio.place(); this.haptic("medium"); this.renderer.burst(x, y, ["#ffcf6b", "#ff8fb1", "#b79cff"][obj.c], 10);
    if (this.remaining(obj.c, obj.k) <= 0) { const nxt = this.level.inv.find(e => this.remaining(e.c, e.k) > 0); this.selected = nxt ? { c: nxt.c, k: nxt.k } : null; }
    this.buildTray(); this.updateHUD();
    const ac = this.alignedCount(); if (ac > this.prevAligned) { this.combo = ac; this.audio.align(this.combo); this.haptic("light"); } this.prevAligned = ac;
    this.updateCoach(); this.checkWin();
  }
  private undo(): void { const a = this.undoStack.pop(); if (!a) return; if (a.type === "place") { const i = this.placed.findIndex(o => o.x === a.obj.x && o.y === a.obj.y); if (i >= 0) this.placed.splice(i, 1); } else { this.placed.push(a.obj); } this.moves++; this.audio.remove(); this.prevAligned = this.alignedCount(); this.buildTray(); this.updateHUD(); }
  private resetLevel(): void { this.placed = []; this.moves = 0; this.undoStack = []; this.won = false; this.hint = null; this.hintUsed = false; this.prevAligned = 0; this.combo = 0; this.celebrateStart = -1; this.selected = this.level.inv.length ? { c: this.level.inv[0].c, k: this.level.inv[0].k } : null; this.buildTray(); this.updateHUD(); this.updateCoach(); }
  private useHint(): void { const nat = getNative(); const reveal = (): void => { const sol = this.level.solution.find(o => !this.placed.some(p => p.x === o.x && p.y === o.y && p.c === o.c && p.k === o.k)); if (!sol) { this.toast(t("allAligned")); return; } this.hint = { x: sol.x, y: sol.y }; this.hintT = 3.5; this.hintUsed = true; this.save.stats.hints++; persist(this.save); this.audio.lock(); };
    if (this.save.gems >= HINT_COST) { this.save.gems -= HINT_COST; persist(this.save); this.updateHUD(); this.updateHome(); reveal(); }
    else if (nat) { nat.showRewarded().then(ok => { if (ok) reveal(); else this.toast(t("adFail")); }); } else this.toast(t("needGems")); }
  private stars(): number { if (this.moves <= this.level.par + 2) return 3; if (this.moves <= this.level.par + 6) return 2; return 1; }
  private checkWin(): void {
    if (!allSatisfied(this.level, this.placed)) return;
    this.won = true; this.celebrateStart = this.time; const s = this.stars();
    this.save.stats.aligned += this.level.moths.length; this.save.stats.played++;
    if (s === 3) this.save.stats.perfect++;
    if (!this.hintUsed) this.save.stats.noHintWins++;
    if (this.level.solution.some(o => o.k === 1) || this.level.fixed.some(o => o.k === 1)) this.save.stats.batWins++;
    let reward = 8 + s * 4; let chapterBonus = 0;
    if (this.dailyMode) {
      const today = new Date().toISOString().slice(0, 10);
      if (this.save.stats.lastDailyDate !== today) {
        const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        this.save.stats.streak = this.save.stats.lastDailyDate === yest ? this.save.stats.streak + 1 : 1;
        this.save.stats.bestStreak = Math.max(this.save.stats.bestStreak, this.save.stats.streak);
        this.save.stats.lastDailyDate = today; this.save.stats.dailyDone++; reward += 40;
      }
    } else {
      const prev = this.save.stars[this.level.id] || 0; this.save.stars[this.level.id] = Math.max(prev, s);
      if (prev === 0) reward += 6;
      if (this.save.level <= this.level.id) this.save.level = Math.min(1000, this.level.id + 1);
      if (this.level.id % 100 === 0) { chapterBonus = 50; reward += chapterBonus; }
    }
    this.save.gems += reward; this.save.wins++; this.winsSinceAd++;
    persist(this.save); this.audio.win(); if (chapterBonus || this.dailyMode) this.audio.fanfare(); this.haptic("success");
    for (const m of this.level.moths) this.renderer.burst(m.x, m.y, ["#ffcf6b", "#ff8fb1", "#b79cff"][m.c], 12);
    const ws = $("winStars"); ws.textContent = "★".repeat(s) + "☆".repeat(3 - s); ws.classList.remove("pop"); void ws.offsetWidth; ws.classList.add("pop");
    $("winTitle").textContent = s === 3 ? t("perfect") : s === 2 ? t("great") : t("good");
    $("winSub").textContent = this.dailyMode ? (t("streak") + ": " + this.save.stats.streak + " 🔥") : t("winSub");
    this.countUp($("winGems"), reward);
    const cb = document.getElementById("chapterBanner"); if (cb) { cb.style.display = chapterBonus ? "" : "none"; cb.textContent = t("chapterComplete") + " +50 ◆"; }
    $("btnDouble").style.display = isNative() ? "" : "none";
    this.showScreen("win"); this.updateHome();
    const nat = getNative(); if (nat && !this.save.noAds && this.winsSinceAd >= 4) { this.winsSinceAd = 0; nat.showInterstitial().catch(() => undefined); }
  }
  private countUp(el: HTMLElement, target: number): void { let v = 0; const step = Math.max(1, Math.round(target / 24)); const iv = setInterval(() => { v += step; if (v >= target) { v = target; clearInterval(iv); } el.textContent = "+" + v + " ◆"; }, 28); }
  private nextLevel(): void { if (this.dailyMode) { this.dailyMode = false; this.showScreen("home"); this.updateHome(); return; } const id = Math.min(1000, this.level.id + 1); this.startLevel(id); }
  private doubleGems(): void { const nat = getNative(); if (!nat) return; nat.showRewarded().then(ok => { if (ok) { this.save.gems += 20; persist(this.save); $("winGems").textContent = "+20 ◆"; this.updateHome(); this.audio.lock(); } else this.toast(t("adFail")); }); }
  private startDaily(): void { const today = new Date().toISOString().slice(0, 10); if (this.save.stats.lastDailyDate === today) { this.toast(t("claimed")); return; } this.dailyMode = true; const id = 400 + (hashStr(today) % 400); this.startLevel(id); }
  private openMap(): void { this.mapChapter = Math.floor((this.save.level - 1) / 100); this.buildMap(); this.showScreen("map"); }
  private buildMap(): void {
    $("mapTitle").textContent = t("chapter") + " " + (this.mapChapter + 1) + " · " + CHAPTERS[this.mapChapter];
    const nav = $("mapNav"); nav.innerHTML = "";
    for (let c = 0; c < 10; c++) { const b = document.createElement("button"); b.className = "chapbtn" + (c === this.mapChapter ? " sel" : ""); b.textContent = String(c + 1); const unlocked = this.save.level > c * 100; b.disabled = !unlocked; b.addEventListener("click", () => { this.mapChapter = c; this.buildMap(); }); nav.appendChild(b); }
    const grid = $("mapGrid"); grid.innerHTML = "";
    for (let i = 1; i <= 100; i++) { const id = this.mapChapter * 100 + i; const b = document.createElement("button"); b.className = "node"; const st = this.save.stars[id] || 0; const unlocked = id <= this.save.level; b.disabled = !unlocked; const num = document.createElement("span"); num.textContent = String(id); b.appendChild(num); const s = document.createElement("small"); s.textContent = unlocked ? (st ? "★".repeat(st) : "·") : "🔒"; b.appendChild(s); if (st) b.classList.add("done"); b.addEventListener("click", () => { this.dailyMode = false; this.startLevel(id); }); grid.appendChild(b); }
  }
  private openMissions(): void {
    const list = $("missionsList"); list.innerHTML = "";
    for (const m of MISSIONS) {
      const cur = Math.min(m.get(this), m.goal); const done = cur >= m.goal; const claimed = this.save.claimed.includes(m.id);
      const row = document.createElement("div"); row.className = "mission" + (claimed ? " claimed" : "");
      const info = document.createElement("div"); info.className = "m-info";
      const name = document.createElement("div"); name.className = "m-name"; name.textContent = t(m.id as Key); info.appendChild(name);
      const desc = document.createElement("div"); desc.className = "m-desc"; desc.textContent = t((m.id + "d") as Key); info.appendChild(desc);
      const bar = document.createElement("div"); bar.className = "m-bar"; const fill = document.createElement("div"); fill.className = "m-fill"; fill.style.width = Math.round(cur / m.goal * 100) + "%"; bar.appendChild(fill); info.appendChild(bar);
      const prog = document.createElement("div"); prog.className = "m-prog"; prog.textContent = cur + " / " + m.goal; info.appendChild(prog);
      row.appendChild(info);
      const btn = document.createElement("button"); btn.className = "btn small gold m-claim"; btn.textContent = claimed ? "✓" : (t("claim") + " +" + m.reward); btn.disabled = !done || claimed;
      btn.addEventListener("click", () => { if (done && !claimed) { this.save.claimed.push(m.id); this.save.gems += m.reward; persist(this.save); this.audio.fanfare(); this.haptic("success"); this.updateHome(); this.openMissions(); this.toast("+" + m.reward + " ◆"); } });
      row.appendChild(btn); list.appendChild(row);
    }
    const sb = $("statsBox"); sb.innerHTML = "";
    const rows: [string, number][] = [[t("aligned"), this.save.stats.aligned], [t("perfect"), this.save.stats.perfect], [t("played"), this.save.stats.played], [t("bestStreak"), this.save.stats.bestStreak]];
    for (const [label, val] of rows) { const d = document.createElement("div"); d.className = "stat"; d.innerHTML = "<span>" + label + "</span><b>" + val + "</b>"; sb.appendChild(d); }
    this.showScreen("missions");
  }
  private openShop(): void { const nat = getNative(); if (!nat) { this.showScreen("home"); return; } const box = $("shopItems"); box.innerHTML = ""; const items: [string, string, string][] = [["moonvane.noads", t("removeAds"), "$2.99"], ["moonvane.gems.500", "500 ◆", "$0.99"], ["moonvane.gems.1500", "1500 ◆", "$1.99"], ["moonvane.gems.4000", "4000 ◆", "$3.99"]]; for (const [id, label, price] of items) { const b = document.createElement("button"); b.className = "shopitem"; b.innerHTML = "<span>" + label + "</span><span>" + price + "</span>"; b.addEventListener("click", () => { nat.purchase(id).then(ok => { this.toast(ok ? t("purchaseOk") : t("purchaseFail")); if (ok && id === "moonvane.noads") { this.save.noAds = true; persist(this.save); } if (ok && id.startsWith("moonvane.gems")) { const amt = id.endsWith("500") ? 500 : id.endsWith("1500") ? 1500 : 4000; this.save.gems += amt; persist(this.save); this.updateHome(); } }); }); box.appendChild(b); } this.showScreen("shop"); }
  private restore(): void { const nat = getNative(); if (!nat) return; nat.restore().then(ok => this.toast(ok ? t("restored") : t("purchaseFail"))); }
  private resetProgress(): void { if (!confirm(t("confirmReset"))) return; const lang = this.save.lang; this.save = Object.assign(this.save, { level: 1, stars: {}, gems: 60, wins: 0, lastDaily: "", noAds: false, lang, tutorialDone: false, claimed: [] }); this.save.stats = { aligned: 0, perfect: 0, played: 0, hints: 0, dailyDone: 0, streak: 0, bestStreak: 0, lastDailyDate: "", noHintWins: 0, batWins: 0 }; persist(this.save); this.updateHome(); this.toast(t("resetProgress")); }
  private toast(msg: string): void { const el = $("toast"); el.textContent = msg; el.classList.add("show"); setTimeout(() => el.classList.remove("show"), 1800); }
}
