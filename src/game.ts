
import { generateLevel, allSatisfied, Level, Obj, Color, Kind, CHAPTERS, VERSION } from "./engine.js";
import { Renderer, RenderState } from "./render.js";
import { AudioEngine } from "./audio.js";
import { load, persist, SaveData } from "./save.js";
import { t, setLang, applyDir, detectLang, LANGS, LANG_NAMES, Key } from "./i18n.js";
import { getNative, isNative } from "./native.js";
const $ = (id: string): HTMLElement => document.getElementById(id)!;
const HINT_COST = 30;
interface Action { type: "place" | "remove"; obj: Obj; }
export class Game {
  save: SaveData; renderer: Renderer; audio: AudioEngine; level: Level;
  placed: Obj[] = []; selected: { c: Color; k: Kind } | null = null; moves = 0; undoStack: Action[] = [];
  hint: { x: number; y: number } | null = null; hintT = 0; won = false; lastT = 0; winsSinceAd = 0; time = 0; mapChapter = 0;
  constructor(canvas: HTMLCanvasElement) {
    this.save = load(); const lang = this.save.lang || detectLang(); setLang(lang); applyDir();
    this.renderer = new Renderer(canvas); this.audio = new AudioEngine(); this.audio.sound = this.save.sound; this.audio.music = this.save.music;
    this.level = generateLevel(this.save.level); this.bind(); this.applyI18n(); this.buildLang(); this.syncSettings(); this.showScreen("home"); this.updateHome();
    window.addEventListener("resize", () => this.renderer.resize());
    const loop = (ts: number): void => { const dt = Math.min(0.05, (ts - this.lastT) / 1000 || 0); this.lastT = ts; this.time += dt; if (this.hintT > 0) this.hintT -= dt;
      const st: RenderState = { level: this.level, placed: this.placed, selected: this.selected, cb: this.save.cb, hint: this.hint, hintT: this.hintT, won: this.won, time: this.time };
      this.renderer.frame(st, dt); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  private bind(): void {
    const on = (id: string, fn: () => void): void => { $(id).addEventListener("click", () => { this.audio.init(); fn(); }); };
    on("btnPlay", () => this.startLevel(this.save.level)); on("btnMap", () => this.openMap()); on("btnSettings", () => this.showScreen("settings")); on("btnHelp", () => this.showScreen("help")); on("btnShop", () => this.openShop()); on("btnDaily", () => this.claimDaily()); on("btnBack", () => this.openMap()); on("btnUndo", () => this.undo()); on("btnReset", () => this.resetLevel()); on("btnHint", () => this.useHint()); on("btnNext", () => this.nextLevel()); on("btnReplay", () => this.startLevel(this.level.id)); on("winMap", () => this.openMap()); on("btnDouble", () => this.doubleGems()); on("btnMapBack", () => this.showScreen("home")); on("btnSettingsBack", () => this.showScreen("home")); on("btnHelpBack", () => this.showScreen("home")); on("btnShopBack", () => this.showScreen("home")); on("btnRestore", () => this.restore()); on("btnResetProgress", () => this.resetProgress()); on("btnPrivacy", () => { window.location.href = "privacy.html"; });
    const cv = this.renderer.canvas;
    cv.addEventListener("pointerdown", (e: PointerEvent) => { this.audio.init(); const r = cv.getBoundingClientRect(); const c = this.renderer.cellAt(e.clientX - r.left, e.clientY - r.top, this.level.size); if (c) this.tapCell(c.x, c.y); });
    $("setSound").addEventListener("change", (e) => { this.save.sound = (<HTMLInputElement>e.target).checked; this.audio.sound = this.save.sound; persist(this.save); });
    $("setMusic").addEventListener("change", (e) => { this.save.music = (<HTMLInputElement>e.target).checked; this.audio.init(); this.audio.setMusic(this.save.music); persist(this.save); });
    $("setHaptics").addEventListener("change", (e) => { this.save.haptics = (<HTMLInputElement>e.target).checked; persist(this.save); });
    $("setCb").addEventListener("change", (e) => { this.save.cb = (<HTMLInputElement>e.target).checked; persist(this.save); });
    $("langSelect").addEventListener("change", (e) => { const v = (<HTMLSelectElement>e.target).value; this.save.lang = v; setLang(v); applyDir(); persist(this.save); this.applyI18n(); this.updateHome(); this.buildTray(); this.updateHUD(); });
  }
  private haptic(k: "light" | "medium" | "heavy" | "success"): void { const n = getNative(); if (this.save.haptics && n) n.haptic(k); else if (this.save.haptics && navigator.vibrate) navigator.vibrate(k === "success" ? [20, 40, 20] : 12); }
  showScreen(name: string): void { document.querySelectorAll(".screen").forEach(s => s.classList.remove("active")); $(name).classList.add("active"); if (name === "game") setTimeout(() => this.renderer.resize(), 30); }
  private applyI18n(): void { document.querySelectorAll("[data-i18n]").forEach(el => { const k = el.getAttribute("data-i18n") as Key; el.textContent = t(k); }); $("verLabel").textContent = t("version") + " " + VERSION; }
  private buildLang(): void { const sel = $("langSelect") as HTMLSelectElement; sel.innerHTML = ""; for (const l of LANGS) { const o = document.createElement("option"); o.value = l; o.textContent = LANG_NAMES[l]; if (l === (this.save.lang || detectLang())) o.selected = true; sel.appendChild(o); } }
  private syncSettings(): void { ($("setSound") as HTMLInputElement).checked = this.save.sound; ($("setMusic") as HTMLInputElement).checked = this.save.music; ($("setHaptics") as HTMLInputElement).checked = this.save.haptics; ($("setCb") as HTMLInputElement).checked = this.save.cb; }
  private updateHome(): void { $("homeLevel").textContent = t("level") + " " + this.save.level + " · " + CHAPTERS[Math.floor((this.save.level - 1) / 100)]; $("homeGems").textContent = String(this.save.gems); const nat = isNative(); $("btnShop").style.display = nat ? "" : "none"; $("btnDaily").style.display = this.canDaily() ? "" : "none"; }
  private canDaily(): boolean { return this.save.lastDaily !== new Date().toISOString().slice(0, 10); }
  private claimDaily(): void { if (!this.canDaily()) return; this.save.lastDaily = new Date().toISOString().slice(0, 10); this.save.gems += 25; persist(this.save); this.updateHome(); this.toast("+25 " + t("gems")); this.audio.lock(); }
  startLevel(id: number): void { this.level = generateLevel(id); this.placed = []; this.moves = 0; this.undoStack = []; this.won = false; this.hint = null; this.hintT = 0; this.renderer.angles = []; this.selected = this.level.inv.length ? { c: this.level.inv[0].c, k: this.level.inv[0].k } : null; this.buildTray(); this.updateHUD(); this.showScreen("game"); this.renderer.resize(); }
  private remaining(c: Color, k: Kind): number { const e = this.level.inv.find(x => x.c === c && x.k === k); const used = this.placed.filter(o => o.c === c && o.k === k).length; return (e ? e.n : 0) - used; }
  private buildTray(): void { const tray = $("tray"); tray.innerHTML = ""; for (const e of this.level.inv) { const b = document.createElement("button"); b.className = "chip"; const rem = this.remaining(e.c, e.k); b.dataset.c = String(e.c); b.dataset.k = String(e.k); const dot = document.createElement("span"); dot.className = "dot c" + e.c + (e.k === 1 ? " bat" : ""); b.appendChild(dot); const lbl = document.createElement("span"); lbl.textContent = (e.k === 0 ? t("moon") : t("bat")) + " ×" + rem; b.appendChild(lbl); if (this.selected && this.selected.c === e.c && this.selected.k === e.k) b.classList.add("sel"); if (rem <= 0) b.classList.add("empty"); b.addEventListener("click", () => { this.selected = { c: e.c, k: e.k }; this.buildTray(); }); tray.appendChild(b); } }
  private updateHUD(): void { $("hudLevel").textContent = t("level") + " " + this.level.id; $("hudChapter").textContent = CHAPTERS[this.level.chapter]; $("hudGems").textContent = String(this.save.gems); $("hudMoves").textContent = t("moves") + " " + this.moves; $("hudPar").textContent = t("par") + " " + this.level.par; $("hintCost").textContent = HINT_COST + "◆"; }
  private occupied(x: number, y: number): boolean { return this.level.fixed.some(o => o.x === x && o.y === y) || this.placed.some(o => o.x === x && o.y === y); }
  private isBlocked(x: number, y: number): boolean { return this.level.blocked.includes(y * this.level.size + x); }
  private isMoth(x: number, y: number): boolean { return this.level.moths.some(m => m.x === x && m.y === y); }
  tapCell(x: number, y: number): void {
    if (this.won) return;
    const pi = this.placed.findIndex(o => o.x === x && o.y === y);
    if (pi >= 0) { const obj = this.placed[pi]; this.placed.splice(pi, 1); this.moves++; this.undoStack.push({ type: "remove", obj }); this.audio.remove(); this.haptic("light"); this.buildTray(); this.updateHUD(); return; }
    if (this.isBlocked(x, y) || this.isMoth(x, y) || this.occupied(x, y)) { this.audio.error(); return; }
    if (!this.selected || this.remaining(this.selected.c, this.selected.k) <= 0) { this.audio.error(); this.toast(t("inventory")); return; }
    const obj: Obj = { x, y, c: this.selected.c, k: this.selected.k }; this.placed.push(obj); this.moves++; this.undoStack.push({ type: "place", obj }); this.audio.place(); this.haptic("medium"); this.renderer.burst(x, y, ["#ffcf6b", "#ff8fb1", "#b79cff"][obj.c], 8);
    if (this.remaining(obj.c, obj.k) <= 0) { const nxt = this.level.inv.find(e => this.remaining(e.c, e.k) > 0); this.selected = nxt ? { c: nxt.c, k: nxt.k } : null; }
    this.buildTray(); this.updateHUD(); this.checkWin();
  }
  private undo(): void { const a = this.undoStack.pop(); if (!a) return; if (a.type === "place") { const i = this.placed.findIndex(o => o.x === a.obj.x && o.y === a.obj.y); if (i >= 0) this.placed.splice(i, 1); } else { this.placed.push(a.obj); } this.moves++; this.audio.remove(); this.buildTray(); this.updateHUD(); }
  private resetLevel(): void { this.placed = []; this.moves = 0; this.undoStack = []; this.won = false; this.hint = null; this.selected = this.level.inv.length ? { c: this.level.inv[0].c, k: this.level.inv[0].k } : null; this.buildTray(); this.updateHUD(); }
  private useHint(): void { const nat = getNative(); const reveal = (): void => { const sol = this.level.solution.find(o => !this.placed.some(p => p.x === o.x && p.y === o.y && p.c === o.c && p.k === o.k)); if (!sol) { this.toast(t("allAligned")); return; } this.hint = { x: sol.x, y: sol.y }; this.hintT = 3.5; this.audio.lock(); };
    if (this.save.gems >= HINT_COST) { this.save.gems -= HINT_COST; persist(this.save); this.updateHUD(); this.updateHome(); reveal(); }
    else if (nat) { nat.showRewarded().then(ok => { if (ok) reveal(); else this.toast(t("adFail")); }); } else this.toast(t("needGems")); }
  private stars(): number { if (this.moves <= this.level.par + 2) return 3; if (this.moves <= this.level.par + 6) return 2; return 1; }
  private checkWin(): void {
    if (!allSatisfied(this.level, this.placed)) return;
    this.won = true; const s = this.stars(); const prev = this.save.stars[this.level.id] || 0; this.save.stars[this.level.id] = Math.max(prev, s);
    const reward = 8 + s * 4 + (prev === 0 ? 6 : 0); this.save.gems += reward; this.save.wins++; this.winsSinceAd++;
    if (this.save.level <= this.level.id) this.save.level = Math.min(1000, this.level.id + 1);
    persist(this.save); this.audio.win(); this.haptic("success");
    for (const m of this.level.moths) this.renderer.burst(m.x, m.y, ["#ffcf6b", "#ff8fb1", "#b79cff"][m.c], 10);
    $("winStars").textContent = "★".repeat(s) + "☆".repeat(3 - s); $("winTitle").textContent = s === 3 ? t("perfect") : s === 2 ? t("great") : t("good"); $("winSub").textContent = t("winSub"); $("winGems").textContent = "+" + reward + " ◆"; $("btnDouble").style.display = isNative() ? "" : "none";
    this.showScreen("win"); this.updateHome();
    const nat = getNative(); if (nat && !this.save.noAds && this.winsSinceAd >= 4) { this.winsSinceAd = 0; nat.showInterstitial().catch(() => undefined); }
  }
  private nextLevel(): void { const id = Math.min(1000, this.level.id + 1); this.startLevel(id); }
  private doubleGems(): void { const nat = getNative(); if (!nat) return; nat.showRewarded().then(ok => { if (ok) { this.save.gems += 20; persist(this.save); $("winGems").textContent = "+20 ◆"; this.updateHome(); this.audio.lock(); } else this.toast(t("adFail")); }); }
  private openMap(): void { this.mapChapter = Math.floor((this.save.level - 1) / 100); this.buildMap(); this.showScreen("map"); }
  private buildMap(): void {
    $("mapTitle").textContent = t("chapter") + " " + (this.mapChapter + 1) + " · " + CHAPTERS[this.mapChapter];
    const nav = $("mapNav"); nav.innerHTML = "";
    for (let c = 0; c < 10; c++) { const b = document.createElement("button"); b.className = "chapbtn" + (c === this.mapChapter ? " sel" : ""); b.textContent = String(c + 1); const unlocked = this.save.level > c * 100; b.disabled = !unlocked; b.addEventListener("click", () => { this.mapChapter = c; this.buildMap(); }); nav.appendChild(b); }
    const grid = $("mapGrid"); grid.innerHTML = "";
    for (let i = 1; i <= 100; i++) { const id = this.mapChapter * 100 + i; const b = document.createElement("button"); b.className = "node"; const st = this.save.stars[id] || 0; const unlocked = id <= this.save.level; b.disabled = !unlocked; const num = document.createElement("span"); num.textContent = String(id); b.appendChild(num); const s = document.createElement("small"); s.textContent = unlocked ? (st ? "★".repeat(st) : "·") : "🔒"; b.appendChild(s); if (st) b.classList.add("done"); b.addEventListener("click", () => this.startLevel(id)); grid.appendChild(b); }
  }
  private openShop(): void { const nat = getNative(); if (!nat) { this.showScreen("home"); return; } const box = $("shopItems"); box.innerHTML = ""; const items: [string, string, string][] = [["moonvane.noads", t("removeAds"), "$2.99"], ["moonvane.gems.500", "500 ◆", "$0.99"], ["moonvane.gems.1500", "1500 ◆", "$1.99"], ["moonvane.gems.4000", "4000 ◆", "$3.99"]]; for (const [id, label, price] of items) { const b = document.createElement("button"); b.className = "shopitem"; b.innerHTML = "<span>" + label + "</span><span>" + price + "</span>"; b.addEventListener("click", () => { nat.purchase(id).then(ok => { this.toast(ok ? t("purchaseOk") : t("purchaseFail")); if (ok && id === "moonvane.noads") { this.save.noAds = true; persist(this.save); } if (ok && id.startsWith("moonvane.gems")) { const amt = id.endsWith("500") ? 500 : id.endsWith("1500") ? 1500 : 4000; this.save.gems += amt; persist(this.save); this.updateHome(); } }); }); box.appendChild(b); } this.showScreen("shop"); }
  private restore(): void { const nat = getNative(); if (!nat) return; nat.restore().then(ok => this.toast(ok ? t("restored") : t("purchaseFail"))); }
  private resetProgress(): void { if (!confirm(t("confirmReset"))) return; const lang = this.save.lang; this.save = Object.assign(this.save, { level: 1, stars: {}, gems: 60, wins: 0, lastDaily: "", noAds: false, lang }); persist(this.save); this.updateHome(); this.toast(t("resetProgress")); }
  private toast(msg: string): void { const el = $("toast"); el.textContent = msg; el.classList.add("show"); setTimeout(() => el.classList.remove("show"), 1800); }
}
