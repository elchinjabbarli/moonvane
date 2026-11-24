export class AudioEngine {
    constructor() {
        this.ctx = null;
        this.master = null;
        this.musicGain = null;
        this.musicOsc = [];
        this.sound = true;
        this.music = false;
    }
    init() { if (this.ctx) {
        if (this.ctx.state === "suspended")
            this.ctx.resume();
        return;
    } const AC = window.AudioContext || window.webkitAudioContext; if (!AC)
        return; this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = 0.45; this.master.connect(this.ctx.destination); }
    tone(freq, dur, type, vol, delay = 0) { if (!this.sound || !this.ctx || !this.master)
        return; const t0 = this.ctx.currentTime + delay; const o = this.ctx.createOscillator(); const g = this.ctx.createGain(); o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); o.connect(g); g.connect(this.master); o.start(t0); o.stop(t0 + dur + 0.02); }
    place() { this.tone(523.25, 0.16, "sine", 0.28); this.tone(783.99, 0.12, "sine", 0.1, 0.02); }
    remove() { this.tone(329.63, 0.13, "sine", 0.18); }
    align(combo) { const base = 659.25 * Math.pow(1.0595, Math.min(combo, 12)); this.tone(base, 0.2, "triangle", 0.2); this.tone(base * 1.5, 0.16, "sine", 0.09, 0.03); }
    lock() { this.tone(880, 0.2, "triangle", 0.2); this.tone(1318.5, 0.16, "sine", 0.09, 0.03); }
    error() { this.tone(185, 0.15, "sawtooth", 0.1); }
    win() { const n = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98]; n.forEach((f, i) => this.tone(f, 0.42, "triangle", 0.2, i * 0.085)); }
    fanfare() { const n = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5]; n.forEach((f, i) => this.tone(f, 0.3, "triangle", 0.18, i * 0.1)); }
    setMusic(on) { this.music = on; if (!this.ctx || !this.master)
        return; if (on && !this.musicGain) {
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.045;
        this.musicGain.connect(this.master);
        const freqs = [110, 164.81, 220, 329.63];
        for (const f of freqs) {
            const o = this.ctx.createOscillator();
            o.type = "sine";
            o.frequency.value = f;
            const g = this.ctx.createGain();
            g.gain.value = 0.25;
            o.connect(g);
            g.connect(this.musicGain);
            o.start();
            this.musicOsc.push(o);
        }
    }
    else if (!on && this.musicGain) {
        this.musicOsc.forEach(o => { try {
            o.stop();
        }
        catch (e) { /* noop */ } });
        this.musicOsc = [];
        this.musicGain.disconnect();
        this.musicGain = null;
    } }
}
