import assert from 'node:assert/strict';
import { IslandAudio } from '../dist/audio.js';

// A controlled Web Audio clock verifies scheduling/lifecycle. It does not claim
// to validate browser autoplay policy or the subjective sound of the mix.
const timers = new Map(); let timerId = 0, allowResume = false;
const native = { AudioContext: globalThis.AudioContext, setInterval: globalThis.setInterval, clearInterval: globalThis.clearInterval };
globalThis.setInterval = callback => { timers.set(++timerId, callback); return timerId; };
globalThis.clearInterval = id => timers.delete(id);
class Param {
  constructor(value = 0) { this.value = value; }
  setValueAtTime(value) { this.value = value; }
  linearRampToValueAtTime(value) { this.value = value; }
  exponentialRampToValueAtTime(value) { this.value = value; }
  cancelScheduledValues() {}
  cancelAndHoldAtTime() {}
}
class Node {
  constructor() { for (const key of ['gain', 'frequency', 'Q', 'threshold', 'knee', 'ratio', 'attack', 'release', 'delayTime']) this[key] = new Param(); }
  connect(node) { return node; }
  disconnect() { this.disconnected = true; }
}
class Source extends Node {
  constructor(ctx) { super(); this.ctx = ctx; this.ctx.sources.add(this); }
  start(time = 0) { this.started = time; }
  stop(time = 0) { this.stopTime = time; }
}
class Context {
  static instances = [];
  constructor() { this.state = 'suspended'; this.currentTime = 0; this.sampleRate = 8000; this.destination = new Node(); this.sources = new Set(); Context.instances.push(this); }
  createGain() { return new Node(); }
  createDynamicsCompressor() { return new Node(); }
  createBiquadFilter() { return new Node(); }
  createDelay() { return new Node(); }
  createAnalyser() { const node = new Node(); node.getFloatTimeDomainData = array => array.fill(this.state === 'running' ? .01 : 0); return node; }
  createBuffer(channels, length) { const array = new Float32Array(length); return { getChannelData: () => array }; }
  createBufferSource() { return new Source(this); }
  createOscillator() { return new Source(this); }
  async resume() { if (!allowResume) throw new Error('NotAllowedError'); this.state = 'running'; this.onstatechange?.(); }
  async suspend() { this.state = 'suspended'; this.onstatechange?.(); }
  async close() { this.state = 'closed'; }
  advance(seconds) {
    let peak = 0;
    for (let i = 0; i < Math.ceil(seconds / .025); i++) {
      this.currentTime += .025;
      for (const source of [...this.sources]) if (source.stopTime <= this.currentTime) { source.onended?.(); this.sources.delete(source); }
      for (const callback of [...timers.values()]) callback();
      peak = Math.max(peak, this.sources.size);
    }
    return peak;
  }
}
globalThis.AudioContext = Context;
try {
  const statuses = [], audio = new IslandAudio({}, status => statuses.push(status));
  await audio.unlock();
  assert.equal(audio.getStatus().context, 'suspended');
  assert.equal(timers.size, 0, 'autoplay denial does not start a timer');
  allowResume = true;
  assert.equal(await audio.unlock(), true, 'first real gesture can unlock');
  assert.equal(audio.getStatus().musicPlaying, true);
  assert.equal(timers.size, 1);
  const ctx = audio.ctx;
  audio.setScene('playing', 0);
  const peak = ctx.advance(44);
  assert(audio.getStatus().notesScheduled >= 128, 'score progresses beyond the entire 16-bar phrase');
  assert(peak <= 48, `source count stays bounded, observed ${peak}`);
  for (let i = 0; i < 100; i++) { audio.setScene('playing', 0, Boolean(i % 2)); await audio.unlock(); }
  assert.equal(Context.instances.length, 1, 'restarts/gestures never stack AudioContexts');
  assert.equal(timers.size, 1, 'frame-by-frame scene sync never stacks music timers');
  const normalMix = audio.musicBus.gain.value;
  audio.setScene('paused', 0);
  assert(audio.musicBus.gain.value < normalMix / 3, 'pause ducks music');
  audio.play('jump');
  assert.equal([...audio.voices].filter(v => v.channel === 'sfx').length, 0, 'pause blocks gameplay SFX');
  audio.setScene('playing', 1);
  for (let i = 0; i < 100; i++) audio.play('fish');
  assert([...audio.voices].filter(v => v.channel === 'sfx').length <= 2, 'pickups are debounced');
  audio.setSettings({ musicVolume: 0 });
  assert.equal(timers.size, 0);
  assert.equal(audio.getStatus().musicVoices, 0);
  ctx.advance(.2); audio.play('pearl');
  assert(audio.getStatus().activeVoices > 0, 'music mute leaves SFX available');
  audio.setSettings({ sfxVolume: 0 });
  audio.play('finish');
  assert.equal(audio.getStatus().activeVoices, 0, 'SFX channel mute works independently');
  audio.setSettings({ musicVolume: .5, sfxVolume: .7 });
  assert.equal(timers.size, 1);
  audio.setHidden(true);
  assert.equal(timers.size, 0); assert.equal(audio.ctx.state, 'suspended'); assert.equal(audio.getStatus().activeVoices, 0);
  const beforeHidden = audio.getStatus().notesScheduled;
  ctx.advance(300);
  assert.equal(audio.getStatus().notesScheduled, beforeHidden, 'background time does not queue beats');
  audio.setHidden(false); await audio.unlock(); ctx.advance(.1);
  assert(audio.getStatus().notesScheduled - beforeHidden < 4, 'returning foreground does not burst old notes');
  audio.setSettings({ muted: true });
  assert.equal(audio.master.gain.value, 0); assert.equal(timers.size, 0);
  audio.setSettings({ muted: false }); await audio.unlock();
  assert.equal(timers.size, 1);
  audio.setScene('result', 2); ctx.advance(2);
  assert.equal(audio.getStatus().scene, 'result');
  assert.equal(audio.getStatus().biome, 2);
  assert(statuses.some(s => s.musicPlaying));
  audio.destroy(); assert.equal(timers.size, 0); assert.equal(audio.getStatus().activeVoices, 0);
  const countBeforeMuted = Context.instances.length;
  const initiallyMuted = new IslandAudio({ muted: true });
  assert.equal(Context.instances.length, countBeforeMuted, 'saved mute prevents autoplay context creation');
  initiallyMuted.setSettings({ muted: false }); await initiallyMuted.unlock();
  assert.equal(initiallyMuted.getStatus().musicPlaying, true, 'unmute can start a previously uninitialized audio system');
  initiallyMuted.destroy();
  globalThis.AudioContext = undefined;
  const unavailable = new IslandAudio(); await unavailable.unlock();
  assert.equal(unavailable.getStatus().context, 'unavailable'); unavailable.play('jump'); unavailable.destroy();
  console.log(`Audio lifecycle checks passed; 16-bar playback, ${peak} peak mock sources, one scheduler, independent mute, background recovery, and unavailable-device fallback.`);
} finally {
  for (const [key, value] of Object.entries(native)) value === undefined ? delete globalThis[key] : globalThis[key] = value;
}
