// Solmara Nights — all sound is synthesised with WebAudio. No audio files.
// Engine hum, police siren, gunshot, punch, pickup chime, crash thud and a
// small procedural night-drive music loop (bass + hats + soft lead).

const AudioSys = {
  ctx: null,
  enabled: false,
  engineOsc: null,
  engineGain: null,
  sirenOsc: null,
  sirenGain: null,
  musicOn: false,
  musicTimer: null,
  musicStep: 0,

  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.enabled = true;
      // Engine: a low sawtooth whose pitch follows speed.
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'lowpass'; filt.frequency.value = 420;
      this.engineOsc.connect(filt); filt.connect(this.engineGain); this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start();
      // Siren: two-tone triangle, toggled by an LFO in update.
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'triangle';
      this.sirenOsc.frequency.value = 720;
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain); this.sirenGain.connect(this.ctx.destination);
      this.sirenOsc.start();
    } catch (err) {
      this.enabled = false;
    }
  },

  resume() {
    try { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); } catch (err) {}
  },

  engine(speedRatio, inCar) {
    if (!this.enabled) return;
    try {
      const target = inCar ? 0.05 + speedRatio * 0.06 : 0;
      this.engineGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
      this.engineOsc.frequency.setTargetAtTime(52 + speedRatio * 130, this.ctx.currentTime, 0.1);
    } catch (err) {}
  },

  siren(on, phase) {
    if (!this.enabled) return;
    try {
      this.sirenGain.gain.setTargetAtTime(on ? 0.028 : 0, this.ctx.currentTime, 0.1);
      this.sirenOsc.frequency.setTargetAtTime(phase ? 880 : 660, this.ctx.currentTime, 0.05);
    } catch (err) {}
  },

  blip(freq, dur, type, vol) {
    if (!this.enabled) return;
    try {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type || 'sine'; o.frequency.value = freq || 440;
      g.gain.setValueAtTime(vol || 0.12, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (dur || 0.12));
      o.connect(g); g.connect(this.ctx.destination);
      o.start(); o.stop(this.ctx.currentTime + (dur || 0.12) + 0.02);
    } catch (err) {}
  },

  noise(dur, vol, freq) {
    if (!this.enabled) return;
    try {
      const len = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 1200;
      const g = this.ctx.createGain(); g.gain.value = vol || 0.2;
      src.connect(f); f.connect(g); g.connect(this.ctx.destination);
      src.start();
    } catch (err) {}
  },

  gunshot() { this.noise(0.14, 0.35, 2600); this.blip(160, 0.1, 'square', 0.1); },
  punch() { this.noise(0.09, 0.22, 700); },
  crash() { this.noise(0.25, 0.3, 500); this.blip(70, 0.2, 'sine', 0.2); },
  pickup() { this.blip(660, 0.09, 'sine', 0.14); setTimeout(() => this.blip(990, 0.14, 'sine', 0.14), 90); },
  cash() { this.blip(880, 0.08, 'triangle', 0.12); setTimeout(() => this.blip(1174, 0.12, 'triangle', 0.12), 80); },
  busted() { this.blip(220, 0.4, 'sawtooth', 0.12); },
  missionDone() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.16, 'triangle', 0.14), i * 110)); },

  startMusic() {
    if (!this.enabled || this.musicOn) return;
    this.musicOn = true;
    // Night-drive loop: Am – F – C – G bass roots, hats on off-beats, sparse lead.
    const roots = [110, 87.31, 130.81, 98];
    const lead = [220, 261.63, 329.63, 392, 329.63, 261.63, 246.94, 196];
    this.musicTimer = setInterval(() => {
      if (!this.enabled || !G || G.state !== 'playing') return;
      const step = this.musicStep++;
      const bar = Math.floor(step / 8) % 4;
      if (step % 8 === 0) this.blip(roots[bar], 0.5, 'triangle', 0.07);
      if (step % 2 === 1) this.noise(0.03, 0.02, 6000);
      if (step % 8 === 4 && R() < 0.7) this.blip(lead[(step / 4 | 0) % lead.length] * 2, 0.22, 'sine', 0.045);
    }, 240);
  },

  stopMusic() {
    this.musicOn = false;
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
  },
};
