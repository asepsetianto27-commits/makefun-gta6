// Solmara Nights — all sound is synthesised with WebAudio. No audio files.
// One clear job: engine hum, sirens, gunshots, pickups and a procedural music loop.
export function createAudio() {
  const audio = {
    ctx: null, master: null, engineOsc: null, engineGain: null,
    sirenOsc: null, sirenGain: null, musicTimer: null, musicStep: 0,
    enabled: false, muted: false,
  };

  audio.init = function () {
    if (audio.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audio.ctx = new AC();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = 0.35;
      audio.master.connect(audio.ctx.destination);
      audio.enabled = true;
      audio.startEngine();
      audio.startMusic();
    } catch (err) {
      audio.enabled = false;
    }
  };

  audio.startEngine = function () {
    if (!audio.ctx) return;
    audio.engineOsc = audio.ctx.createOscillator();
    audio.engineOsc.type = 'sawtooth';
    audio.engineOsc.frequency.value = 55;
    audio.engineGain = audio.ctx.createGain();
    audio.engineGain.gain.value = 0.0;
    const filter = audio.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    audio.engineOsc.connect(filter);
    filter.connect(audio.engineGain);
    audio.engineGain.connect(audio.master);
    audio.engineOsc.start();
  };

  // speedNorm 0..1 while driving; 0 when on foot.
  audio.setEngine = function (speedNorm, driving) {
    if (!audio.ctx || !audio.engineOsc) return;
    const t = audio.ctx.currentTime;
    audio.engineOsc.frequency.setTargetAtTime(50 + speedNorm * 140, t, 0.08);
    audio.engineGain.gain.setTargetAtTime(driving ? 0.05 + speedNorm * 0.06 : 0.0, t, 0.1);
  };

  audio.setSiren = function (on) {
    if (!audio.ctx) return;
    if (on && !audio.sirenOsc) {
      audio.sirenOsc = audio.ctx.createOscillator();
      audio.sirenOsc.type = 'square';
      audio.sirenOsc.frequency.value = 700;
      audio.sirenGain = audio.ctx.createGain();
      audio.sirenGain.gain.value = 0.035;
      audio.sirenOsc.connect(audio.sirenGain);
      audio.sirenGain.connect(audio.master);
      audio.sirenOsc.start();
      const lfo = audio.ctx.createOscillator();
      lfo.frequency.value = 0.9;
      const lfoGain = audio.ctx.createGain();
      lfoGain.gain.value = 260;
      lfo.connect(lfoGain);
      lfoGain.connect(audio.sirenOsc.frequency);
      lfo.start();
      audio._sirenLfo = lfo;
    } else if (!on && audio.sirenOsc) {
      try { audio.sirenOsc.stop(); audio._sirenLfo.stop(); } catch (e) {}
      audio.sirenOsc = null;
      audio._sirenLfo = null;
    }
  };

  audio.blip = function (freq, dur, type, vol) {
    if (!audio.ctx) return;
    try {
      const o = audio.ctx.createOscillator();
      o.type = type || 'sine';
      o.frequency.value = freq || 660;
      const g = audio.ctx.createGain();
      g.gain.value = vol || 0.12;
      o.connect(g);
      g.connect(audio.master);
      const t = audio.ctx.currentTime;
      g.gain.exponentialRampToValueAtTime(0.001, t + (dur || 0.12));
      o.start(t);
      o.stop(t + (dur || 0.12));
    } catch (e) {}
  };

  audio.gunshot = function () {
    if (!audio.ctx) return;
    try {
      const dur = 0.14;
      const buf = audio.ctx.createBuffer(1, audio.ctx.sampleRate * dur, audio.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      }
      const src = audio.ctx.createBufferSource();
      src.buffer = buf;
      const g = audio.ctx.createGain();
      g.gain.value = 0.25;
      src.connect(g);
      g.connect(audio.master);
      src.start();
      audio.blip(180, 0.1, 'square', 0.1);
    } catch (e) {}
  };

  audio.crash = function () {
    if (!audio.ctx) return;
    try {
      const dur = 0.2;
      const buf = audio.ctx.createBuffer(1, audio.ctx.sampleRate * dur, audio.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) * 0.8;
      }
      const src = audio.ctx.createBufferSource();
      src.buffer = buf;
      const g = audio.ctx.createGain();
      g.gain.value = 0.3;
      src.connect(g);
      g.connect(audio.master);
      src.start();
    } catch (e) {}
  };

  audio.pickup = function () { audio.blip(880, 0.1, 'sine', 0.14); audio.blip(1320, 0.14, 'sine', 0.1); };
  audio.missionDone = function () {
    audio.blip(523, 0.12, 'triangle', 0.14);
    setTimeout(() => audio.blip(659, 0.12, 'triangle', 0.14), 120);
    setTimeout(() => audio.blip(784, 0.22, 'triangle', 0.16), 240);
  };
  audio.busted = function () { audio.blip(220, 0.4, 'sawtooth', 0.12); };

  // A lazy late-night bassline: Am – F – C – G roots with a soft pluck on top.
  audio.startMusic = function () {
    if (!audio.ctx || audio.musicTimer) return;
    const roots = [110, 87.31, 130.81, 98];
    const pluckNotes = [220, 261.63, 329.63, 392, 440, 523.25];
    audio.musicTimer = setInterval(() => {
      if (audio.muted || !audio.ctx) return;
      const bar = Math.floor(audio.musicStep / 4) % 4;
      if (audio.musicStep % 4 === 0) audio.blip(roots[bar], 0.5, 'triangle', 0.05);
      if (audio.musicStep % 2 === 1) {
        const n = pluckNotes[(audio.musicStep * 7 + bar * 3) % pluckNotes.length];
        audio.blip(n, 0.18, 'sine', 0.03);
      }
      audio.musicStep++;
    }, 300);
  };

  return audio;
}
