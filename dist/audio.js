// Original procedural score for Pelican Island. No sampled or third-party music.
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const midi = note => 440 * 2 ** ((note - 69) / 12);
const MELODY = [
  [72, null, 76, 79, 76, 74, 72, null], [69, 72, 76, null, 74, 72, 69, null],
  [69, null, 72, 77, 76, 72, 69, 67], [71, 74, 79, null, 77, 74, 71, null],
  [76, 79, 84, null, 79, 76, 74, 72], [71, null, 76, 79, 78, 76, 71, null],
  [72, 77, 81, null, 79, 77, 76, 72], [74, null, 71, 67, 71, 74, 79, null],
  [81, null, 79, 76, 72, 76, 79, null], [77, 76, 72, null, 69, 72, 77, null],
  [79, null, 76, 72, 76, 79, 84, 79], [83, 79, 74, null, 71, 74, 79, null],
  [81, 77, 76, 72, 69, null, 72, 77], [79, 77, 74, 71, 67, 71, 74, null],
  [76, null, 79, 84, 79, 76, 74, 72], [76, 74, 72, null, 67, null, 72, null]
];
const HARMONY = [
  [48, 60, 64, 67], [45, 60, 64, 69], [41, 60, 65, 69], [43, 59, 62, 67],
  [48, 60, 64, 67], [40, 59, 64, 67], [41, 60, 65, 69], [43, 59, 62, 67],
  [45, 60, 64, 69], [41, 60, 65, 69], [48, 60, 64, 67], [43, 59, 62, 67],
  [41, 60, 65, 69], [43, 59, 62, 67], [48, 60, 64, 67], [48, 60, 64, 67]
];
const ARRANGEMENTS = [
  { bpm: 96, transpose: 0, lead: 'triangle', cutoff: 2400 },
  { bpm: 106, transpose: 5, lead: 'sine', cutoff: 3000 },
  { bpm: 80, transpose: -2, lead: 'sine', cutoff: 1600 }
];

export class IslandAudio {
  constructor(settings = {}, onStatus = () => {}) {
    this.settings = { musicVolume: .5, sfxVolume: .7, muted: false };
    this.onStatus = onStatus;
    this.ctx = null; this.timer = null; this.resumePromise = null;
    this.mode = 'menu'; this.biome = 0; this.boosting = false;
    this.hidden = typeof document !== 'undefined' && document.hidden;
    this.destroyed = false; this.unavailable = false;
    this.voices = new Set(); this.lastEffects = new Map();
    this.step = 0; this.nextNote = 0; this.lastStatus = -1; this.notesScheduled = 0;
    this.setSettings(settings);
    // Autoplay succeeds where permitted; a real user gesture can retry unlock().
    this.unlock();
  }

  _createContext() {
    if (this.ctx || this.destroyed || this.unavailable) return;
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Context) { this.unavailable = true; return; }
    try {
      this.ctx = new Context({ latencyHint: 'interactive' });
      const c = this.ctx;
      this.musicBus = c.createGain(); this.sfxBus = c.createGain(); this.master = c.createGain();
      this.compressor = c.createDynamicsCompressor();
      this.compressor.threshold.value = -16; this.compressor.knee.value = 14;
      this.compressor.ratio.value = 3; this.compressor.attack.value = .008; this.compressor.release.value = .2;
      this.analyser = c.createAnalyser(); this.analyser.fftSize = 512;
      this.analysisData = new Float32Array(this.analyser.fftSize);
      this.musicBus.connect(this.master); this.sfxBus.connect(this.master);
      this.master.connect(this.compressor); this.compressor.connect(this.analyser); this.analyser.connect(c.destination);
      this.master.gain.value = 0; this.musicBus.gain.value = 0; this.sfxBus.gain.value = 0;
      // A single quiet delay bus gives the melody space without stacking reverbs.
      this.delay = c.createDelay(.5); this.delay.delayTime.value = .21;
      this.feedback = c.createGain(); this.feedback.gain.value = .16;
      this.wet = c.createGain(); this.wet.gain.value = .12;
      this.musicBus.connect(this.delay); this.delay.connect(this.feedback); this.feedback.connect(this.delay);
      this.delay.connect(this.wet); this.wet.connect(this.master);
      this.noise = c.createBuffer(1, Math.ceil(c.sampleRate * .6), c.sampleRate);
      const samples = this.noise.getChannelData(0); let seed = 0x50454c49;
      for (let i = 0; i < samples.length; i++) {
        seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
        samples[i] = ((seed >>> 0) / 2147483648 - 1) * (1 - i / samples.length);
      }
      c.onstatechange = () => {
        if (this.destroyed) return;
        if (c.state === 'running') this._ensureScheduler();
        else this._stopScheduler();
        this._notify();
      };
      this._mix();
    } catch {
      // A missing/disabled audio device must never block the ride.
      this.unavailable = true; this.ctx?.close?.().catch?.(() => {}); this.ctx = null;
    }
  }

  unlock() {
    if (this.destroyed || this.hidden || this.settings.muted) { this._notify(); return Promise.resolve(false); }
    this._createContext();
    if (!this.ctx) { this._notify(); return Promise.resolve(false); }
    if (this.ctx.state === 'running') {
      this._mix(); this._ensureScheduler(); this._notify(); return Promise.resolve(true);
    }
    // Some browsers leave an autoplay resume promise pending until a gesture.
    // Calling resume again inside that gesture is safe; it does not create nodes/timers.
    let attempt;
    try { attempt = this.ctx.resume(); } catch { this._notify(); return Promise.resolve(false); }
    this.resumePromise = Promise.resolve(attempt).then(() => {
      if (this.destroyed || this.hidden || this.settings.muted) return false;
      this._mix(); this._ensureScheduler(); this._notify(); return this.ctx?.state === 'running';
    }).catch(() => { this._notify(); return false; });
    this._notify(); return this.resumePromise;
  }

  _ramp(param, value, seconds = .14) {
    const t = this.ctx.currentTime;
    if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(t);
    else { param.cancelScheduledValues(t); param.setValueAtTime(param.value, t); }
    param.linearRampToValueAtTime(Math.max(0, value), t + seconds);
  }

  _mix() {
    if (!this.ctx || !this.master) return;
    const active = !this.hidden && !this.settings.muted;
    const sceneGain = this.mode === 'paused' ? .16 : this.mode === 'playing' ? 1 : this.mode === 'result' ? .56 : .7;
    this._ramp(this.master.gain, active ? .82 : 0, .12);
    this._ramp(this.musicBus.gain, this.settings.musicVolume * .34 * sceneGain, .24);
    this._ramp(this.sfxBus.gain, this.settings.sfxVolume * .55, .08);
  }

  setSettings(settings = {}) {
    const wasAudible = !this.settings.muted && (this.settings.musicVolume > 0 || this.settings.sfxVolume > 0);
    for (const key of ['musicVolume', 'sfxVolume']) {
      if (settings[key] !== undefined && Number.isFinite(Number(settings[key]))) this.settings[key] = clamp(Number(settings[key]), 0, 1);
    }
    if (settings.muted !== undefined) this.settings.muted = Boolean(settings.muted);
    this._mix();
    if (this.settings.muted) { this._stopScheduler(); this._stopVoices(); }
    else {
      if (!this.settings.musicVolume) { this._stopScheduler(); this._stopVoices('music'); }
      if (!this.settings.sfxVolume) this._stopVoices('sfx');
      if (this.ctx?.state === 'running') this._ensureScheduler();
    }
    if (!wasAudible && !this.settings.muted && (this.settings.musicVolume > 0 || this.settings.sfxVolume > 0)) this.unlock();
    this._notify();
  }

  setScene(mode, biome = 0, boosting = false) {
    const nextMode = ['menu', 'playing', 'paused', 'result'].includes(mode) ? mode : 'menu';
    const nextBiome = clamp(Math.floor(Number(biome) || 0), 0, 2);
    this.boosting = Boolean(boosting);
    if (nextMode === this.mode && nextBiome === this.biome) return;
    const changedBiome = nextBiome !== this.biome, previousMode = this.mode;
    this.mode = nextMode; this.biome = nextBiome;
    if (nextMode === 'paused') this._stopVoices('sfx');
    if (changedBiome || (previousMode === 'playing' && nextMode === 'menu') || (previousMode !== 'paused' && nextMode === 'playing')) {
      this._stopVoices('music', .16); this.step = 0;
      if (this.ctx) this.nextNote = this.ctx.currentTime + .18;
    }
    this._mix(); this._ensureScheduler(); this._notify();
  }

  setHidden(hidden) {
    hidden = Boolean(hidden);
    if (hidden === this.hidden) return;
    this.hidden = hidden; this._mix();
    if (hidden) {
      this._stopScheduler(); this._stopVoices(); this.nextNote = 0;
      try { this.ctx?.suspend().catch(() => {}); } catch {}
    } else this.unlock();
    this._notify();
  }

  _ensureScheduler() {
    if (this.destroyed || this.hidden || this.settings.muted || !this.settings.musicVolume || this.ctx?.state !== 'running') return;
    if (this.timer !== null) return;
    this.nextNote = Math.max(this.nextNote, this.ctx.currentTime + .06);
    this.timer = setInterval(() => this._schedule(), 25);
    this._schedule();
  }

  _stopScheduler() { if (this.timer !== null) clearInterval(this.timer); this.timer = null; }

  _schedule() {
    if (this.destroyed || this.hidden || this.settings.muted || this.ctx?.state !== 'running') { this._stopScheduler(); return; }
    const now = this.ctx.currentTime;
    // Drop missed beats after throttling instead of firing a burst of old notes.
    if (this.nextNote < now - .1) this.nextNote = now + .04;
    let count = 0;
    while (this.nextNote < now + .13 && count++ < 4) {
      const arrangement = ARRANGEMENTS[this.biome];
      const eighth = 60 / arrangement.bpm / 2;
      this._beat(this.step, this.nextNote, eighth, arrangement);
      this.nextNote += eighth; this.step = (this.step + 1) % 128;
    }
    if (now - this.lastStatus > .55) { this.lastStatus = now; this._notify(); }
  }

  _beat(step, time, eighth, arrangement) {
    const bar = Math.floor(step / 8), beat = step % 8, trans = arrangement.transpose;
    const chord = HARMONY[bar], playing = this.mode === 'playing', paused = this.mode === 'paused';
    const note = MELODY[bar][beat];
    if (beat === 0) {
      chord.slice(1).forEach((n, i) => this._tone(midi(n + trans), time + i * .012, eighth * 7.4, .045, 'sine', 'music', { attack: .12, cutoff: 1500 }));
    }
    if (beat === 0 || (playing && beat === 4)) {
      this._tone(midi(chord[0] + trans), time, eighth * 2.7, .13, 'triangle', 'music', { attack: .018, cutoff: 450 });
    }
    if (note !== null && (!paused || beat % 2 === 0)) {
      const octave = this.biome === 2 && bar % 4 === 3 ? 12 : 0;
      this._tone(midi(note + trans + octave), time, eighth * (beat % 2 ? 1.2 : 1.8), this.biome === 2 ? .1 : .115, arrangement.lead, 'music', { attack: .014, cutoff: arrangement.cutoff });
      if (this.biome === 2 && beat % 4 === 0) this._tone(midi(note + trans + 12), time + .035, eighth * 2.8, .028, 'sine', 'music');
    }
    if (playing) {
      if (beat === 0 || beat === 4) this._tone(100, time, .14, .13, 'sine', 'music', { endFrequency: 48, attack: .006 });
      if (beat === 2 || beat === 6) this._noiseHit(time, .085, .045, 1800, 'music');
      if (beat % 2 === 1) this._noiseHit(time, .035, this.boosting ? .031 : .018, 6500, 'music');
      if ((this.boosting || this.biome === 1) && beat % 2 === 0) {
        this._tone(midi(chord[1 + (beat / 2 % 3)] + trans + 12), time + eighth * .5, eighth * .7, .035, 'triangle', 'music', { cutoff: 2600 });
      }
    }
    this.notesScheduled++;
  }

  _register(source, gain, filter, channel, stopTime) {
    const limit = channel === 'sfx' ? 12 : 36;
    const matching = [...this.voices].filter(voice => voice.channel === channel);
    if (matching.length >= limit) this._release(matching[0], 0);
    const voice = { source, gain, filter, channel, stopTime, released: false };
    source.onended = () => this._disconnect(voice);
    this.voices.add(voice); return voice;
  }

  _disconnect(voice) {
    this.voices.delete(voice);
    for (const node of [voice.source, voice.gain, voice.filter]) { try { node?.disconnect(); } catch {} }
  }

  _release(voice, fade = .025) {
    if (voice.released) return;
    voice.released = true;
    try {
      const t = this.ctx.currentTime;
      voice.gain.gain.cancelScheduledValues(t);
      voice.gain.gain.setValueAtTime(Math.max(.0001, voice.gain.gain.value), t);
      voice.gain.gain.exponentialRampToValueAtTime(.0001, t + Math.max(.002, fade));
      voice.source.stop(t + Math.max(.003, fade) + .005);
    } catch { this._disconnect(voice); }
    // Released nodes no longer count toward the concurrency cap.
    this.voices.delete(voice);
  }

  _stopVoices(channel, fade = .025) {
    for (const voice of [...this.voices]) if (!channel || voice.channel === channel) this._release(voice, fade);
  }

  _tone(frequency, when, duration, volume, type, channel, options = {}) {
    if (this.hidden || this.settings.muted || this.ctx?.state !== 'running') return;
    const c = this.ctx, start = Math.max(c.currentTime, when), attack = options.attack || .008;
    const osc = c.createOscillator(), gain = c.createGain(), filter = c.createBiquadFilter();
    osc.type = type; osc.frequency.setValueAtTime(frequency, start);
    if (options.endFrequency) osc.frequency.exponentialRampToValueAtTime(options.endFrequency, start + duration);
    filter.type = 'lowpass'; filter.frequency.value = options.cutoff || 5500; filter.Q.value = .5;
    gain.gain.setValueAtTime(.0001, start); gain.gain.linearRampToValueAtTime(volume, start + attack);
    gain.gain.exponentialRampToValueAtTime(.0001, start + Math.max(duration, attack + .03));
    osc.connect(filter); filter.connect(gain); gain.connect(channel === 'music' ? this.musicBus : this.sfxBus);
    this._register(osc, gain, filter, channel, start + duration + .03);
    osc.start(start); osc.stop(start + duration + .03);
  }

  _noiseHit(when, duration, volume, cutoff, channel) {
    if (this.hidden || this.settings.muted || this.ctx?.state !== 'running') return;
    const c = this.ctx, start = Math.max(c.currentTime, when);
    const source = c.createBufferSource(), gain = c.createGain(), filter = c.createBiquadFilter();
    source.buffer = this.noise; filter.type = 'highpass'; filter.frequency.value = cutoff; filter.Q.value = .6;
    gain.gain.setValueAtTime(.0001, start); gain.gain.linearRampToValueAtTime(volume, start + .003);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    source.connect(filter); filter.connect(gain); gain.connect(channel === 'music' ? this.musicBus : this.sfxBus);
    this._register(source, gain, filter, channel, start + duration + .01);
    source.start(start); source.stop(start + duration + .01);
  }

  play(name = 'click') {
    if (this.destroyed || this.hidden || this.settings.muted || !this.settings.sfxVolume || this.ctx?.state !== 'running') return;
    if (this.mode === 'paused' && !['click', 'finish'].includes(name)) return;
    const t = this.ctx.currentTime, cooldown = name === 'fish' ? .065 : name === 'hit' ? .18 : .04;
    if (t - (this.lastEffects.get(name) ?? -100) < cooldown) return;
    this.lastEffects.set(name, t);
    const notes = {
      fish: [76, 81], pearl: [76, 83, 88], jump: [60, 67], boost: [48, 55, 60, 67],
      hit: [42, 36], shield: [67, 74, 79], finish: [72, 76, 79, 84], click: [72],
      checkpoint: [67, 72, 76, 79], perfect: [79, 83, 86, 91]
    }[name] || [72];
    notes.forEach((n, i) => {
      const delay = ['finish', 'checkpoint', 'perfect'].includes(name) ? .11 : .045;
      this._tone(midi(n), t + i * delay, name === 'finish' ? .55 : name === 'click' ? .075 : .16, name === 'hit' ? .16 : .12, name === 'hit' ? 'triangle' : 'sine', 'sfx', { cutoff: 3400 });
    });
    if (name === 'boost') this._noiseHit(t, .18, .075, 1600, 'sfx');
    if (name === 'hit') this._noiseHit(t, .12, .12, 450, 'sfx');
    this._notify();
  }

  getStatus() {
    let sum = 0;
    if (this.analyser && this.ctx?.state === 'running') {
      try { this.analyser.getFloatTimeDomainData(this.analysisData); for (const value of this.analysisData) sum += value * value; } catch {}
    }
    return {
      context: this.ctx?.state === 'running' ? 'running' : this.unavailable || this.destroyed ? 'unavailable' : 'suspended',
      musicPlaying: Boolean(this.timer !== null && this.ctx?.state === 'running' && !this.hidden && !this.settings.muted && this.settings.musicVolume > 0),
      activeVoices: this.voices.size,
      musicVoices: [...this.voices].filter(voice => voice.channel === 'music').length,
      rms: this.analysisData ? Math.sqrt(sum / this.analysisData.length) : 0,
      notesScheduled: this.notesScheduled,
      scene: this.mode, biome: this.biome
    };
  }

  _notify() { try { this.onStatus(this.getStatus()); } catch {} }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true; this._stopScheduler(); this._stopVoices(undefined, 0);
    if (this.ctx) {
      this.ctx.onstatechange = null;
      for (const node of [this.musicBus, this.sfxBus, this.master, this.compressor, this.analyser, this.delay, this.feedback, this.wet]) { try { node?.disconnect(); } catch {} }
      try { this.ctx.close().catch(() => {}); } catch {}
    }
    this._notify();
  }
}
