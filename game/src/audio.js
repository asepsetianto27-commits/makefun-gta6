// Solmara Nights — all sound synthesised with WebAudio. No audio files.
export class SoundBank {
  constructor() {
    this.ctx = null; this.master = null; this.musicTimer = null; this.musicOn = false;
    this.engineOsc = null; this.engineGain = null; this.sirenOsc = null; this.sirenGain = null;
    this.muted = false;
  }
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
  }
  tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }
  noise(dur, vol, filterFreq) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq || 1200;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol || 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t);
  }
  gunshot() { this.noise(0.18, 0.5, 3000); this.tone(160, 0.12, 'square', 0.25, 40); }
  punch() { this.noise(0.08, 0.3, 600); }
  pickup() { this.tone(660, 0.09, 'sine', 0.25); setTimeout(() => this.tone(990, 0.12, 'sine', 0.25), 90); }
  cash() { this.tone(880, 0.08, 'triangle', 0.25); setTimeout(() => this.tone(1320, 0.15, 'triangle', 0.25), 80); }
  crash() { this.noise(0.3, 0.5, 500); this.tone(70, 0.25, 'sawtooth', 0.3, 30); }
  busted() { this.tone(440, 0.4, 'sawtooth', 0.2, 220); setTimeout(() => this.tone(330, 0.5, 'sawtooth', 0.2, 165), 300); }
  missionOk() { [523, 659, 784].forEach((f, i) => setTimeout(() => this.tone(f, 0.18, 'triangle', 0.28), i * 110)); }
  startEngine() { if (!this.ctx) return; this.ensureEngine(); }
  ensureEngine() {
    if (!this.ctx || this.engineOsc) return;
    this.engineOsc = this.ctx.createOscillator(); this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 60;
    this.engineGain = this.ctx.createGain(); this.engineGain.gain.value = 0;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400;
    this.engineOsc.connect(f); f.connect(this.engineGain); this.engineGain.connect(this.master);
    this.engineOsc.start();
  }
  setEngine(speed01, on) {
    if (!this.ctx) return;
    this.ensureEngine();
    const t = this.ctx.currentTime;
    this.engineGain.gain.setTargetAtTime(on ? 0.05 + speed01 * 0.08 : 0, t, 0.1);
    this.engineOsc.frequency.setTargetAtTime(55 + speed01 * 140, t, 0.1);
  }
  setSiren(on) {
    if (!this.ctx) return;
    if (on && !this.sirenOsc) {
      this.sirenOsc = this.ctx.createOscillator(); this.sirenOsc.type = 'sine';
      this.sirenGain = this.ctx.createGain(); this.sirenGain.gain.value = 0.045;
      const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.7;
      const lg = this.ctx.createGain(); lg.gain.value = 320;
      lfo.connect(lg); lg.connect(this.sirenOsc.frequency);
      this.sirenOsc.frequency.value = 750;
      this.sirenOsc.connect(this.sirenGain); this.sirenGain.connect(this.master);
      this.sirenOsc.start(); lfo.start();
      this.sirenLfo = lfo;
    } else if (!on && this.sirenOsc) {
      try { this.sirenOsc.stop(); this.sirenLfo.stop(); } catch (e) {}
      this.sirenOsc = null; this.sirenLfo = null;
    }
  }
  // Simple procedural music loop: a lazy coastal groove, scheduled bar by bar.
  startMusic() {
    if (!this.ctx || this.musicOn) return;
    this.musicOn = true;
    const bass = [55, 55, 65.4, 49]; // A1 A1 C2 G1
    const chords = [[220, 261.6, 329.6], [220, 261.6, 329.6], [261.6, 329.6, 392], [196, 246.9, 293.7]];
    let bar = 0;
    const step = () => {
      if (!this.musicOn || !this.ctx) return;
      const root = bass[bar % 4], chord = chords[bar % 4];
      this.tone(root, 1.9, 'triangle', 0.16);
      chord.forEach((f) => this.tone(f, 0.5, 'sine', 0.05));
      this.tone(root * 2, 0.45, 'sine', 0.06);
      if (bar % 2 === 1) this.noise(0.05, 0.05, 6000);
      bar++;
      this.musicTimer = setTimeout(step, 480);
    };
    step();
  }
  stopMusic() { this.musicOn = false; if (this.musicTimer) clearTimeout(this.musicTimer); }
}
