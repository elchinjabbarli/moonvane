
export class AudioEngine {
  private ctx: AudioContext | null = null; private master: GainNode | null = null; private musicGain: GainNode | null = null; private musicOsc: OscillatorNode[] = [];
  sound = true; music = false;
  init(): void { if (this.ctx) { if (this.ctx.state === "suspended") this.ctx.resume(); return; } const AC: typeof AudioContext | undefined = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (!AC) return; this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = 0.45; this.master.connect(this.ctx.destination); }
  private tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0): void { if (!this.sound || !this.ctx || !this.master) return; const t0 = this.ctx.currentTime + delay; const o = this.ctx.createOscillator(); const g = this.ctx.createGain(); o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); o.connect(g); g.connect(this.master); o.start(t0); o.stop(t0 + dur + 0.02); }
  place(): void { this.tone(523.25, 0.18, "sine", 0.3); this.tone(783.99, 0.14, "sine", 0.12, 0.02); }
  remove(): void { this.tone(329.63, 0.14, "sine", 0.2); }
  lock(): void { this.tone(880, 0.22, "triangle", 0.22); this.tone(1318.5, 0.18, "sine", 0.1, 0.03); }
  error(): void { this.tone(196, 0.16, "sawtooth", 0.12); }
  win(): void { const n = [523.25, 659.25, 783.99, 1046.5, 1318.5]; n.forEach((f, i) => this.tone(f, 0.4, "triangle", 0.22, i * 0.09)); }
  setMusic(on: boolean): void { this.music = on; if (!this.ctx || !this.master) return; if (on && !this.musicGain) { this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.05; this.musicGain.connect(this.master); const freqs = [110, 164.81, 220, 329.63]; for (const f of freqs) { const o = this.ctx.createOscillator(); o.type = "sine"; o.frequency.value = f; const g = this.ctx.createGain(); g.gain.value = 0.25; o.connect(g); g.connect(this.musicGain); o.start(); this.musicOsc.push(o); } } else if (!on && this.musicGain) { this.musicOsc.forEach(o => { try { o.stop(); } catch (e) { /* noop */ } }); this.musicOsc = []; this.musicGain.disconnect(); this.musicGain = null; } }
}
