import { Renderer } from './renderer.js';
import { IslandAudio } from './audio.js';
import { ROUTES, sampleTerrain, biomeAt, sectionAt } from './routes.js';

const $ = id => document.getElementById(id);
const all = query => [...document.querySelectorAll(query)];
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const routeNames = ROUTES.map(route => route.name);
const emptyRecord = () => ({ stars: 0, bestTime: 0, bestDistance: 0, runs: 0 });
const nonnegative = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
const saveKey = 'pelican-island-v1';
const defaultSave = () => ({ wallet: 0, bestDistance: 0, bestScore: 0, upgrades: { speed: 0, magnet: 0, shield: 0 }, muted: false, musicVolume: .5, sfxVolume: .7, reducedEffects: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false, records: [emptyRecord(), emptyRecord(), emptyRecord()], completed: [false, false, false] });
let saved = defaultSave();
try {
  const parsed = JSON.parse(localStorage.getItem(saveKey) || 'null');
  if (parsed && typeof parsed === 'object') {
    saved = { ...saved, ...parsed, upgrades: { ...saved.upgrades, ...parsed.upgrades } };
    saved.wallet = Math.floor(nonnegative(saved.wallet));
    saved.musicVolume = clamp(Number.isFinite(Number(saved.musicVolume)) ? Number(saved.musicVolume) : .5, 0, 1);
    saved.sfxVolume = clamp(Number.isFinite(Number(saved.sfxVolume)) ? Number(saved.sfxVolume) : .7, 0, 1);
    saved.muted = saved.muted === true;
    saved.reducedEffects = saved.reducedEffects === true;
    saved.records = [0, 1, 2].map(i => { const old = saved.records?.[i] || {}; return { stars: clamp(Math.floor(nonnegative(old.stars)), 0, 3), bestTime: nonnegative(old.bestTime), bestDistance: nonnegative(old.bestDistance), runs: Math.floor(nonnegative(old.runs)) }; });
    saved.bestDistance = nonnegative(saved.bestDistance);
    saved.bestScore = nonnegative(saved.bestScore);
    for (const key of ['speed', 'magnet', 'shield']) saved.upgrades[key] = clamp(Math.floor(nonnegative(saved.upgrades[key])), 0, 3);
    saved.completed = [0, 1, 2].map(i => saved.completed?.[i] === true);
  }
} catch { /* Play remains available when browser storage is disabled. */ }
function persist() { try { localStorage.setItem(saveKey, JSON.stringify(saved)); } catch { toast('浏览器暂未允许存档，本次仍可正常游玩'); } }

const sound = new IslandAudio(saved, status => {
  const element = $('audioStatus');
  if (element) {
    element.textContent = status.context === 'unavailable' ? '当前浏览器不支持声音，仍可正常游玩' : saved.muted ? '总声音已关闭' : saved.musicVolume === 0 ? '背景音乐已静音' : status.musicPlaying ? '原创配乐播放中' : status.context === 'running' ? '音乐已就绪' : '首次点击、触摸或按键后自动播放';
    element.dataset.audioState = status.context;
    element.dataset.musicPlaying = String(status.musicPlaying);
    element.dataset.voices = String(status.activeVoices);
    element.dataset.audioRms = Number(status.rms || 0).toFixed(5);
    element.dataset.notesScheduled = String(status.notesScheduled || 0);
  }
});
const renderer = new Renderer($('gameCanvas'));
let selectedBiome = 0, selectedMode = 'adventure', toastUntil = 0, activeModal = null;
let input = { jump: false, boost: false, brake: false };
let rngSeed = 12345, trackBiome = 0, trackEndless = false;
function random() { rngSeed = (rngSeed * 1664525 + 1013904223) >>> 0; return rngSeed / 4294967296; }
function terrain(x) { return sampleTerrain(x, trackBiome, trackEndless); }
const state = {
  mode: 'menu', time: 0, biome: 0, cameraX: 0, terrain,
  player: { x: 0, y: terrain(0), vy: 0, grounded: true, rotation: 0, boosting: false, invincible: 0, shield: 0 },
  objects: [], particles: [], weather: 'clear', distance: 0, combo: 0,
  fish: 0, pearls: 0, hp: 3, energy: 100, speed: 0, elapsed: 0,
  jumps: 0, boosts: 0, maxCombo: 0, collected: 0, mission: 0, missionBonus: 0,
  crashes: 0, jumpCount: 0, magnetTime: 0, lastCollect: -100, nextSpawn: 450,
  boostLatched: false, hitSlow: 0, finish: 1200, runMode: 'adventure', startBiome: 0,
  section: '海湾热身', wind: 0, nextCheckpoint: 400, lastCheckpoint: 0, rings: 0,
  perfectLandings: 0, airtime: 0, clearedObstacle: false, jumpBuffer: 0, landingFlash: 0, shake: 0, reducedEffects: saved.reducedEffects
};
function toast(message) {
  if (!$('toast')) return;
  $('toast').textContent = message; $('toast').hidden = false; toastUntil = performance.now() + 2700;
}
function setText(id, value) { if ($(id)) $(id).textContent = value; }
function hide(id, hidden) { if ($(id)) $(id).hidden = hidden; }
function syncScreens() {
  hide('menu', state.mode !== 'menu');
  hide('hud', state.mode === 'menu' || state.mode === 'result');
  hide('pauseOverlay', state.mode !== 'paused' || Boolean(activeModal));
  hide('resultOverlay', state.mode !== 'result');
  hide('touchControls', state.mode !== 'playing');
  document.body.dataset.screen = state.mode;
  sound.setScene(state.mode, state.biome, state.player.boosting);
  syncStorageUI();
}
function syncStorageUI() {
  setText('wallet', saved.wallet.toLocaleString());
  setText('bestDistance', Math.floor(saved.bestDistance).toLocaleString());
  all('[data-wallet]').forEach(el => el.textContent = saved.wallet.toLocaleString());
  all('[data-best]').forEach(el => el.textContent = `${Math.floor(saved.bestDistance)} m`);
  all('[data-route-record]').forEach(el => { const i = Number(el.dataset.routeRecord), record = saved.records[i]; el.textContent = record.stars ? '★'.repeat(record.stars) + '☆'.repeat(3 - record.stars) : saved.completed[i] ? '已完成' : '未完成'; });
  for (const key of ['musicVolume', 'sfxVolume']) { if ($(key)) $(key).value = Math.round(saved[key] * 100); }
  setText('musicValue', `${Math.round(saved.musicVolume * 100)}%`);
  setText('sfxValue', `${Math.round(saved.sfxVolume * 100)}%`);
  if ($('reducedEffects')) $('reducedEffects').checked = saved.reducedEffects;
  const labels = { speed: 'Speed', magnet: 'Magnet', shield: 'Shield' };
  for (const [key, label] of Object.entries(labels)) {
    const level = saved.upgrades[key];
    setText(`upgrade${label}`, `Lv. ${level} / 3`);
    setText(`price${label}`, level >= 3 ? '已满级' : `${upgradeCost(level)} 鱼干`);
    all(`[data-upgrade="${key}"]`).forEach(button => { button.disabled = level >= 3 || saved.wallet < upgradeCost(level); });
  }
  all('[data-action="mute"]').forEach(button => {
    button.setAttribute('aria-pressed', String(saved.muted));
    button.setAttribute('aria-label', saved.muted ? '开启声音' : '关闭声音');
    button.title = saved.muted ? '开启声音' : '关闭声音';
    button.classList.toggle('muted', saved.muted);
    const label = button.querySelector('[data-sound-label]');
    if (label) label.textContent = saved.muted ? '声音关' : '声音开';
  });
}
function upgradeCost(level) { return [60, 140, 260][level] || 0; }
function selectBiome(value) {
  selectedBiome = clamp(Number(value), 0, 2);
  if (state.mode === 'menu') { state.biome = selectedBiome; trackBiome = selectedBiome; trackEndless = false; }
  setText('routeDescription', ROUTES[selectedBiome].description);
  sound.setScene(state.mode, selectedBiome);
  all('[data-biome]').forEach(button => { const active = Number(button.dataset.biome) === selectedBiome; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
  document.body.dataset.biome = selectedBiome;
}
function selectMode(value) {
  selectedMode = value === 'endless' ? 'endless' : 'adventure';
  all('[data-mode]').forEach(button => { const active = button.dataset.mode === selectedMode; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
}
function particle(x, y, color, amount = 10) {
  if (state.reducedEffects) amount = Math.ceil(amount / 3);
  if (state.particles.length > 180) return;
  for (let i = 0; i < amount; i++) {
    const life = .4 + Math.random() * .5;
    state.particles.push({ x, y, vx: (Math.random() - .5) * 220, vy: -50 - Math.random() * 200, life, maxLife: life, color, size: 2 + Math.random() * 5 });
  }
}
function spawn(type, x, y, extras = {}) { state.objects.push({ type, x, y, collected: false, w: type === 'crate' ? 45 : 35, h: type === 'crate' ? 45 : 32, ...extras }); }
function generate() {
  while (state.nextSpawn < state.player.x + renderer.viewWidth + 800) {
    const x = state.nextSpawn, biome = biomeAt(x, trackBiome, trackEndless), route = ROUTES[biome];
    const difficulty = Math.min(1, state.distance / 2200), nearCheckpoint = Math.min((x + 230) % 4000, 4000 - (x + 230) % 4000) < 180;
    const obstacle = random() > .18 && !nearCheckpoint;
    const type = biome === 1 ? 'log' : random() > .6 ? 'crate' : 'rock';
    if (obstacle) spawn(type, x + 230, terrain(x + 230), { w: type === 'log' ? 70 : 44, h: type === 'crate' ? 48 : type === 'log' ? 38 : 31 });
    for (let i = 0; i < 6; i++) {
      const xx = x + i * 62;
      const arc = obstacle ? Math.sin(i / 5 * Math.PI) * (80 + difficulty * 15) : 0;
      spawn('fish', xx, terrain(xx) - 74 - arc);
    }
    if (random() < route.pearlChance) spawn('pearl', x + 240, terrain(x + 240) - (biome === 2 ? 205 : 230));
    const roll = random();
    if (roll < .14) spawn('shield', x + 400, terrain(x + 400) - 88);
    else if (roll < .29) spawn('magnet', x + 400, terrain(x + 400) - 88);
    else if (roll < (biome === 2 ? .62 : .43)) spawn('wind', x + 410, terrain(x + 410), { w: 75, h: 150 });
    else if (roll < (biome === 1 ? .86 : .67)) spawn('ramp', x + 425, terrain(x + 425), { w: 90, h: 40 });
    state.nextSpawn += route.spacing + random() * 140 - difficulty * 75;
  }
  while (state.nextCheckpoint * 10 < state.player.x + renderer.viewWidth + 800 && (state.runMode === 'endless' || state.nextCheckpoint < state.finish)) {
    const x = state.nextCheckpoint * 10;
    spawn('ring', x, terrain(x) - 145, { w: 70, h: 110 }); state.nextCheckpoint += 400;
  }
  state.objects = state.objects.filter(o => o.x > state.player.x - 500 && !o.collected);
}
function startRun() {
  closeModal(); sound.unlock();
  trackBiome = selectedBiome; trackEndless = selectedMode === 'endless';
  Object.assign(state, { mode: 'playing', biome: selectedBiome, cameraX: -renderer.viewWidth * .25, distance: 0, combo: 0, fish: 0, pearls: 0, hp: 3, energy: 100, speed: 270, elapsed: 0, jumps: 0, boosts: 0, maxCombo: 0, collected: 0, mission: 0, missionBonus: 0, crashes: 0, jumpCount: 0, magnetTime: 0, lastCollect: -100, nextSpawn: 460, boostLatched: false, hitSlow: 0, runMode: selectedMode, startBiome: selectedBiome, objects: [], particles: [] });
  Object.assign(state, { nextCheckpoint: 400, lastCheckpoint: 0, rings: 0, perfectLandings: 0, airtime: 0, clearedObstacle: false, jumpBuffer: 0, landingFlash: 0, shake: 0, section: ROUTES[selectedBiome].sections[0], wind: 0 });
  Object.assign(state.player, { x: 0, y: terrain(0), vy: 0, grounded: true, rotation: 0, boosting: false, invincible: 1, shield: saved.upgrades.shield });
  input = { jump: false, boost: false, brake: false };
  rngSeed = 17031 + selectedBiome * 1709;
  generate(); syncScreens(); updateHUD(); sound.play('click');
  toast(window.matchMedia?.('(pointer: coarse)').matches ? '轻触跳跃 · 再点二段跳 · 长按滑翔' : '空格跳跃 · 再按二段跳 · 长按滑翔');
}
function jump() {
  if (state.mode !== 'playing') return;
  if (state.jumpCount >= 2) { state.jumpBuffer = .14; return; }
  const p = state.player;
  state.jumpBuffer = 0;
  if (p.grounded) { state.airtime = 0; state.clearedObstacle = false; }
  p.vy = state.jumpCount === 0 ? -565 : -470;
  p.grounded = false; state.jumpCount++; state.jumps++;
  particle(p.x, p.y - 15, state.jumpCount === 2 ? '#f7d56a' : '#fff6db', 12);
  sound.play('jump');
}
function pause() {
  if (state.mode !== 'playing') return;
  state.mode = 'paused'; input = { jump: false, boost: false, brake: false }; state.jumpBuffer = 0; state.player.boosting = false; syncScreens();
}
function resume() { if (state.mode === 'paused') { state.mode = 'playing'; sound.unlock(); syncScreens(); } }
function home() {
  closeModal(); state.mode = 'menu'; state.biome = selectedBiome; state.objects = []; state.particles = [];
  state.player.invincible = 0; state.player.shield = 0; state.player.boosting = false;
  trackBiome = selectedBiome; trackEndless = false;
  syncScreens();
}
let focusBeforeModal = null;
function openModal(name) {
  if (state.mode === 'playing') pause();
  if (activeModal) hide(activeModal, true);
  focusBeforeModal = document.activeElement; activeModal = name;
  hide(name, false); hide('pauseOverlay', true); syncStorageUI();
  sound.setScene(state.mode, state.biome);
  requestAnimationFrame(() => $(name)?.querySelector('button')?.focus());
}
function closeModal() {
  if (!activeModal) return;
  hide(activeModal, true); activeModal = null; focusBeforeModal?.focus(); focusBeforeModal = null; syncScreens();
}
function finishRun(success) {
  if (state.mode !== 'playing') return;
  state.mode = 'result'; state.player.boosting = false;
  const distance = Math.floor(state.distance), reward = state.fish + state.pearls * 5;
  const bonus = Math.floor(distance / 100) * 2 + (success ? 30 : 0) + state.missionBonus;
  const oldBest = saved.bestDistance;
  const stars = success ? (state.crashes === 0 && state.collected >= 55 ? 3 : state.crashes <= 1 ? 2 : 1) : 0;
  const record = saved.records[state.startBiome];
  record.runs++; record.bestDistance = Math.max(record.bestDistance, distance);
  if (success && state.runMode === 'adventure') { record.stars = Math.max(record.stars, stars); record.bestTime = record.bestTime ? Math.min(record.bestTime, state.elapsed) : state.elapsed; }
  saved.wallet += reward + bonus;
  saved.bestDistance = Math.max(distance, saved.bestDistance);
  saved.bestScore = Math.max(reward + bonus, saved.bestScore || 0);
  if (success) saved.completed[state.startBiome] = true;
  persist();
  setText('resultTitle', success ? '海风，为你喝彩！' : '下一程，一定更远。');
  setText('resultSubtitle', success ? `${routeNames[state.startBiome]} · 1200 米旅程已完成` : `${routeNames[state.biome]} · ${state.runMode === 'endless' ? '无尽漫游' : '岛屿冒险'} · 已保存本次收获`);
  setText('resultDistance', distance.toLocaleString());
  setText('resultFish', reward.toLocaleString());
  setText('resultBonus', `+${bonus}`);
  setText('resultStars', success ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : distance > 600 ? '★☆☆' : '再接再厉');
  setText('resultDetails', `用时 ${state.elapsed.toFixed(1)} 秒 · 漂亮落地 ${state.perfectLandings} 次 · 圆环 ${state.rings} 个 · 最长连击 ${state.maxCombo}`);
  setText('resultBest', distance > oldBest ? 'NEW BEST · 新的个人纪录' : `个人最佳 ${Math.floor(saved.bestDistance)} m · 本次收入 ${reward + bonus} 鱼干`);
  input = { jump: false, boost: false, brake: false };
  syncScreens(); sound.play(success ? 'finish' : 'hit');
}
function updateMissions() {
  const done = [state.collected >= 25, state.jumps >= 8, state.boosts >= 3];
  if (state.mission < 3 && done[state.mission]) {
    state.mission++; state.missionBonus += 20;
    toast(`旅途任务完成！+20 鱼干${state.mission === 3 ? ' · 全部任务达成' : ''}`);
    sound.play('pearl');
  }
}
function collect(o) {
  o.collected = true;
  if (o.type === 'fish' || o.type === 'pearl') {
    state.combo = state.elapsed - state.lastCollect < 2.5 ? state.combo + 1 : 1;
    state.lastCollect = state.elapsed; state.maxCombo = Math.max(state.combo, state.maxCombo);
    const multiplier = Math.min(4, 1 + Math.floor(state.combo / 8));
    if (o.type === 'fish') { state.fish += multiplier; state.collected++; } else state.pearls++;
    state.energy = Math.min(100, state.energy + 2);
    particle(o.x, o.y, o.type === 'fish' ? '#ffc95e' : '#fafcff', 8);
    sound.play(o.type);
  } else if (o.type === 'magnet') { state.magnetTime = 10 + saved.upgrades.magnet * 3; toast('磁铁生效！附近鱼干自动吸附'); sound.play('shield'); }
  else if (o.type === 'shield') { state.player.shield = Math.min(3, state.player.shield + 1); toast('获得护盾 · 抵挡一次碰撞'); sound.play('shield'); }
}
function simulate(dt) {
  const p = state.player;
  state.elapsed += dt;
  state.jumpBuffer = Math.max(0, state.jumpBuffer - dt);
  state.landingFlash = Math.max(0, state.landingFlash - dt); state.shake = Math.max(0, state.shake - dt);
  const section = sectionAt(state.distance, state.biome, state.runMode === 'endless');
  state.section = section.label; state.wind = section.wind;
  const route = ROUTES[state.biome];
  p.invincible = Math.max(0, p.invincible - dt); state.hitSlow = Math.max(0, state.hitSlow - dt); state.magnetTime = Math.max(0, state.magnetTime - dt);
  const canBoost = input.boost && state.energy > (p.boosting ? 0 : 14) && !input.brake;
  p.boosting = canBoost;
  if (canBoost && !state.boostLatched) { state.boosts++; state.boostLatched = true; sound.play('boost'); }
  if (!input.boost) state.boostLatched = false;
  state.energy = clamp(state.energy + dt * (canBoost ? -31 : 13), 0, 100);
  const baseSpeed = route.speed + state.wind + saved.upgrades.speed * 18 + Math.min(65, state.distance / 70);
  let targetSpeed = canBoost ? baseSpeed * 1.65 : input.brake ? baseSpeed * .5 : baseSpeed;
  if (state.hitSlow > 0) targetSpeed *= .42;
  state.speed += (targetSpeed - state.speed) * Math.min(1, dt * 6);
  p.x += state.speed * dt; state.distance = p.x / 10;
  const checkpoint = Math.floor(state.distance / 400);
  if (checkpoint > state.lastCheckpoint && (state.runMode === 'endless' || state.distance < state.finish)) {
    state.lastCheckpoint = checkpoint; state.hp = Math.min(3, state.hp + 1); state.energy = Math.min(100, state.energy + 35);
    toast(`抵达 ${checkpoint * 400} m 补给站 · 恢复生命与能量`); sound.play('checkpoint');
  }
  if (state.runMode === 'endless') {
    const nextBiome = (state.startBiome + Math.floor(state.distance / 900)) % 3;
    if (nextBiome !== state.biome) { state.biome = nextBiome; toast(`进入新区域 · ${routeNames[nextBiome]}`); }
  }
  if (!p.grounded) {
    state.airtime += dt;
    p.vy += route.gravity * dt;
    if (input.jump && p.vy > 80) p.vy = Math.min(p.vy, 95);
    p.y += p.vy * dt;
    if (p.y >= terrain(p.x)) {
      p.y = terrain(p.x); p.vy = 0; p.grounded = true; state.jumpCount = 0;
      if (state.airtime > .28 && state.clearedObstacle) {
        state.perfectLandings++; state.fish += 3; state.energy = Math.min(100, state.energy + 8); state.landingFlash = .5;
        particle(p.x, p.y - 10, '#ffc95e', 14); sound.play('perfect');
      } else particle(p.x, p.y, '#f5e4c2', 5);
      state.airtime = 0; state.clearedObstacle = false;
      if (state.jumpBuffer > 0) jump();
    }
  } else { p.y = terrain(p.x); state.jumpCount = 0; if (state.jumpBuffer > 0) jump(); }
  const slope = Math.atan2(terrain(p.x + 12) - terrain(p.x - 12), 24);
  const targetRotation = p.grounded ? slope : clamp(p.vy / 1500, -.35, .24);
  p.rotation += (targetRotation - p.rotation) * Math.min(1, dt * 10);
  state.cameraX = p.x - renderer.viewWidth * (renderer.viewWidth < 900 ? .28 : .26);
  generate();
  for (const o of state.objects) {
    if (o.collected) continue;
    const dx = o.x - p.x, dy = o.y - (p.y - 76);
    if (o.type === 'ring') {
      if (Math.abs(dx) < 40 && Math.abs(dy) < 52 && !p.grounded) {
        o.collected = true; state.rings++; state.fish += 10; state.energy = Math.min(100, state.energy + 12);
        particle(o.x, o.y, '#fff0a6', 24); sound.play('pearl'); toast('穿环成功！+10 鱼干');
      }
    } else if (o.type === 'fish' || o.type === 'pearl' || o.type === 'magnet' || o.type === 'shield') {
      const range = (state.magnetTime > 0 ? 210 : 52) + saved.upgrades.magnet * 22;
      if (Math.hypot(dx, dy) < range) {
        if (Math.abs(dx) < 62 && Math.abs(dy) < 70) collect(o);
        else { const k = Math.min(1, dt * 9); o.x += (p.x - o.x) * k; o.y += (p.y - 76 - o.y) * k; }
      }
    } else if (o.type === 'ramp' && Math.abs(dx) < 38 && p.grounded) {
      p.vy = -640; p.grounded = false; state.airtime = 0; state.clearedObstacle = false; state.jumpCount = 1; state.jumps++; o.collected = true; sound.play('jump'); particle(p.x, p.y, '#ffcb67', 12);
    } else if (o.type === 'wind' && Math.abs(dx) < 54 && p.y > o.y - 220) {
      p.vy = -390; p.grounded = false; state.jumpCount = Math.min(1, state.jumpCount); o.collected = true;
      toast('上升气流！长按跳跃，张翼滑翔'); particle(p.x, p.y - 50, '#dbffed', 16);
    } else if (['rock', 'crate', 'log'].includes(o.type) && Math.abs(dx) < o.w / 2 + 20 && p.y <= o.y - o.h - 10 && !p.grounded && p.invincible <= 0) {
      state.clearedObstacle = true;
    } else if (['rock', 'crate', 'log'].includes(o.type) && Math.abs(dx) < o.w / 2 + 20 && p.y > o.y - o.h - 10 && p.invincible <= 0) {
      o.collected = true; p.invincible = 2.3; state.clearedObstacle = false;
      if (p.shield > 0) { p.shield--; particle(p.x, p.y - 70, '#74ebd9', 25); sound.play('shield'); toast('护盾抵挡了碰撞'); }
      else {
        state.hp--; state.crashes++; state.combo = 0; state.hitSlow = .7; state.shake = saved.reducedEffects ? 0 : .25; state.clearedObstacle = false;
        p.vy = -290; p.grounded = false; particle(p.x, p.y - 30, '#ff8c67', 22); sound.play('hit');
        if (state.hp <= 0) { finishRun(false); return; }
        toast('小心障碍！提前跳跃，或用二段跳越过');
      }
    }
  }
  if (state.elapsed - state.lastCollect > 2.5) state.combo = 0;
  if (canBoost && Math.random() < .65) particle(p.x - 55, p.y - 30, '#fff0b3', 1);
  updateMissions();
  if (state.runMode === 'adventure' && state.distance >= state.finish) finishRun(true);
}
let hudTimer = 0;
function updateHUD() {
  setText('hudDistance', `${Math.floor(state.distance)} m`);
  setText('hudFish', state.fish);
  setText('hudPearls', state.pearls);
  setText('hudHearts', '♥'.repeat(state.hp) + '♡'.repeat(3 - state.hp));
  setText('hudCombo', state.combo >= 3 ? `${state.combo} 连击 · ×${Math.min(4, 1 + Math.floor(state.combo / 8))}` : '保持节奏');
  setText('hudSpeed', `${Math.round(state.speed * .36)} km/h`);
  setText('hudBiome', routeNames[state.biome]);
  setText('hudSection', `${state.section}${state.wind ? ' · 顺风加速' : ''}`);
  const missions = [`收集鱼干 ${Math.min(25, state.collected)}/25`, `起跳挑战 ${Math.min(8, state.jumps)}/8`, `使用冲刺 ${Math.min(3, state.boosts)}/3`, '全部任务完成 · +60 鱼干'];
  setText('hudMission', missions[state.mission]);
  if ($('hudEnergy')) { $('hudEnergy').style.width = `${state.energy}%`; $('hudEnergy').parentElement?.setAttribute('aria-valuenow', Math.round(state.energy)); }
  if ($('hudProgress')) $('hudProgress').style.width = `${state.runMode === 'endless' ? (state.distance % 900) / 9 : clamp(state.distance / state.finish * 100, 0, 100)}%`;
  setText('hudGoal', state.runMode === 'endless' ? '无尽漫游' : '1200 m');
  setText('hudBuffs', `${state.player.shield ? `护盾 ×${state.player.shield}` : ''}${state.magnetTime > 0 ? ` 磁铁 ${Math.ceil(state.magnetTime)}s` : ''}`);
}

document.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button) return;
  sound.unlock();
  if (button.dataset.biome !== undefined) { selectBiome(button.dataset.biome); sound.play('click'); }
  if (button.dataset.mode) { selectMode(button.dataset.mode); sound.play('click'); }
  if (button.dataset.upgrade) {
    const key = button.dataset.upgrade, level = saved.upgrades[key], cost = upgradeCost(level);
    if (level < 3 && saved.wallet >= cost) {
      saved.wallet -= cost; saved.upgrades[key]++; persist(); syncStorageUI(); sound.play('pearl');
      setText('shopStatus', '升级成功！下一次骑行立即生效。');
    }
  }
  switch (button.dataset.action) {
    case 'start': case 'restart': startRun(); break;
    case 'pause': pause(); break;
    case 'resume': resume(); break;
    case 'home': home(); break;
    case 'workshop': openModal('workshopOverlay'); break;
    case 'help': openModal('helpOverlay'); break;
    case 'settings': openModal('settingsOverlay'); break;
    case 'close-modal': closeModal(); break;
    case 'mute': saved.muted = !saved.muted; sound.setSettings(saved); if (!saved.muted) sound.unlock(); persist(); syncStorageUI(); break;
    case 'fullscreen':
      try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen(); else await document.exitFullscreen(); }
      catch { toast('当前浏览器不支持全屏，可以横屏游玩'); }
      break;
  }
});
for (const key of ['musicVolume', 'sfxVolume']) {
  $(key)?.addEventListener('input', event => {
    saved[key] = clamp(Number(event.target.value) / 100, 0, 1);
    sound.setSettings(saved); sound.unlock(); persist(); syncStorageUI();
  });
}
$('reducedEffects')?.addEventListener('change', event => { saved.reducedEffects = event.target.checked; state.reducedEffects = saved.reducedEffects; persist(); });
window.addEventListener('pointerup', () => sound.unlock(), { passive: true });
function keyIs(event, names) { return names.includes(event.code); }
window.addEventListener('keydown', event => {
  sound.unlock();
  if (activeModal) {
    if (event.code === 'Escape') { event.preventDefault(); closeModal(); }
    if (event.code === 'Tab') {
      const buttons = [...$(activeModal).querySelectorAll('button:not(:disabled),input:not(:disabled),[tabindex="0"]')];
      const first = buttons[0], last = buttons.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    return;
  }
  if (keyIs(event, ['KeyP', 'Escape']) && !event.repeat) {
    event.preventDefault(); state.mode === 'playing' ? pause() : resume(); return;
  }
  if (state.mode !== 'playing') return;
  if (keyIs(event, ['Space', 'ArrowUp', 'KeyW', 'ShiftLeft', 'ShiftRight', 'ArrowRight', 'KeyD', 'ArrowDown', 'KeyS'])) event.preventDefault();
  if (keyIs(event, ['Space', 'ArrowUp', 'KeyW'])) { input.jump = true; if (!event.repeat) jump(); }
  if (keyIs(event, ['ShiftLeft', 'ShiftRight', 'ArrowRight', 'KeyD'])) input.boost = true;
  if (keyIs(event, ['ArrowDown', 'KeyS'])) input.brake = true;
});
window.addEventListener('keyup', event => {
  if (keyIs(event, ['Space', 'ArrowUp', 'KeyW'])) input.jump = false;
  if (keyIs(event, ['ShiftLeft', 'ShiftRight', 'ArrowRight', 'KeyD'])) input.boost = false;
  if (keyIs(event, ['ArrowDown', 'KeyS'])) input.brake = false;
});
all('[data-control]').forEach(button => {
  button.addEventListener('pointerdown', event => {
    event.preventDefault(); button.setPointerCapture(event.pointerId);
    const key = button.dataset.control; input[key] = true; button.classList.add('pressed');
    if (key === 'jump') jump(); sound.unlock();
  });
  const release = event => { input[button.dataset.control] = false; button.classList.remove('pressed'); };
  button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
});
window.addEventListener('blur', () => { pause(); sound.setHidden(true); });
window.addEventListener('focus', () => sound.setHidden(document.hidden));
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); sound.setHidden(document.hidden); });
window.addEventListener('resize', () => renderer.resize());
let previousTime = 0;
function frame(now) {
  const dt = Math.min(.033, (now - previousTime) / 1000 || .016); previousTime = now;
  if (state.mode !== 'paused') state.time += dt;
  if (state.mode === 'playing') {
    let remaining = dt;
    while (remaining > 0 && state.mode === 'playing') { const step = Math.min(1 / 120, remaining); simulate(step); remaining -= step; }
    hudTimer += dt;
    if (hudTimer > .08) { updateHUD(); hudTimer = 0; }
  } else if (state.mode === 'menu') {
    state.player.x += dt * 42; state.player.y = terrain(state.player.x); state.player.grounded = true;
    state.player.rotation = Math.atan2(terrain(state.player.x + 8) - terrain(state.player.x - 8), 16);
    state.cameraX = state.player.x - renderer.viewWidth * (renderer.viewWidth < 900 ? .63 : .73);
  }
  if (state.mode !== 'paused') {
    for (const p of state.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; }
    state.particles = state.particles.filter(p => p.life > 0);
  }
  sound.setScene(state.mode, state.biome, state.player.boosting);
  renderer.render(state, dt);
  if (toastUntil && now > toastUntil) { hide('toast', true); toastUntil = 0; }
  requestAnimationFrame(frame);
}
selectBiome(0); selectMode('adventure'); syncScreens(); requestAnimationFrame(frame);
