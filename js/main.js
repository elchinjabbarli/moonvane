import { Game } from "./game.js";
function boot() { const c = document.getElementById("board"); if (!c)
    return; new Game(c); if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => undefined);
} }
if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot);
else
    boot();
