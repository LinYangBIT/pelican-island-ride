import { Renderer } from '../dist/renderer.js';
import { sampleTerrain } from '../dist/routes.js';

const byId = id => document.getElementById(id);
const canvas = byId('fixtureCanvas'), output = byId('metrics');
const params = new URLSearchParams(location.search);
const settings = {
  biome: Math.max(0, Math.min(2, Number(params.get('biome')) || 0)),
  view: ['menu', 'playing', 'gliding'].includes(params.get('fixture')) ? params.get('fixture') : 'menu',
  lighting: params.get('lighting') !== '0', reduced: params.get('reduced') === '1',
  version: 'current', moving: false, time: 5
};
let renderer = new Renderer(canvas), baselineClass, loading = false, previous = 0, measurement = null;

function stateForFrame() {
  const terrain = x => sampleTerrain(x, settings.biome);
  const menu = settings.view === 'menu', airborne = settings.view === 'gliding';
  const x = 240 + (settings.time - 5) * (menu ? 42 : 270);
  const cameraX = x - renderer.viewWidth * (menu ? (renderer.viewWidth < 900 ? .63 : .73) : .25);
  const world = fraction => cameraX + renderer.viewWidth * fraction;
  const at = (type, fraction, height, extras = {}) => {
    const ox = world(fraction); return { type, x: ox, y: terrain(ox) - height, w: 44, h: 32, collected: false, ...extras };
  };
  const objects = menu ? [] : [
    at('rock', .43, 0), at('crate', .55, 0, { h: 48 }), at('log', .69, 0, { w: 70, h: 38 }),
    at('ramp', .88, 0, { w: 90, h: 40 }), at('ring', .76, 210, { w: 70, h: 110 }),
    at('fish', .39, 135), at('fish', .44, 165), at('pearl', .53, 255),
    at('shield', .61, 150), at('magnet', .86, 215), at('wind', .95, 0, { w: 75, h: 150 })
  ];
  return {
    mode: menu ? 'menu' : 'playing', time: settings.time, biome: settings.biome, cameraX, terrain,
    player: { x, y: terrain(x) - (airborne ? 145 : 0), vy: airborne ? 80 : 0, grounded: !airborne,
      rotation: airborne ? -.08 : Math.atan2(terrain(x + 8) - terrain(x - 8), 16),
      boosting: false, invincible: 0, shield: 0 },
    objects, particles: [], runMode: 'adventure', finish: 1200, distance: x / 10,
    wind: settings.biome === 0 ? 22 : 0, shake: 0, landingFlash: 0, reducedEffects: settings.reduced
  };
}
function syncControls() {
  for (const button of document.querySelectorAll('[data-biome]')) button.setAttribute('aria-pressed', String(Number(button.dataset.biome) === settings.biome));
  for (const button of document.querySelectorAll('[data-view]')) button.setAttribute('aria-pressed', String(button.dataset.view === settings.view));
  byId('lighting').checked = settings.lighting;
  byId('lighting').disabled = settings.version === 'baseline' || Boolean(measurement);
  byId('reduced').checked = settings.reduced;
  byId('version').value = settings.version;
  byId('motion').textContent = settings.moving ? '冻结当前帧' : '播放动画';
  byId('motion').setAttribute('aria-pressed', String(settings.moving));
}
function draw() { renderer.lightingEnabled = settings.lighting; renderer.render(stateForFrame()); }
function reset() { settings.time = 5; settings.moving = false; previous = 0; syncControls(); draw(); }
function configure(change) { Object.assign(settings, change); reset(); }
for (const button of document.querySelectorAll('[data-biome]')) button.addEventListener('click', () => configure({ biome: Number(button.dataset.biome) }));
for (const button of document.querySelectorAll('[data-view]')) button.addEventListener('click', () => configure({ view: button.dataset.view }));
byId('lighting').addEventListener('change', e => configure({ lighting: e.target.checked }));
byId('reduced').addEventListener('change', e => configure({ reduced: e.target.checked }));
byId('motion').addEventListener('click', () => { settings.moving = !settings.moving; previous = 0; syncControls(); });
byId('reset').addEventListener('click', reset);
byId('version').addEventListener('change', async e => {
  if (loading) return;
  loading = true; byId('loading').textContent = '正在载入绘制版本…';
  try {
    if (e.target.value === 'baseline' && !baselineClass) baselineClass = (await import('./baseline-renderer.js')).Renderer;
    settings.version = e.target.value;
    renderer = new (settings.version === 'baseline' ? baselineClass : Renderer)(canvas);
    reset(); byId('loading').textContent = '';
  } catch (error) {
    settings.version = 'current'; renderer = new Renderer(canvas); reset();
    byId('loading').textContent = `原版夹具未提供或加载失败：${error.message}`;
  } finally { loading = false; }
});
const percentile = (values, fraction) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(values.length * fraction))] || 0;
function finishMeasurement(reason = '') {
  if (!measurement) return;
  const m = measurement; measurement = null;
  const elapsed = (m.last - m.start) / 1000;
  const result = {
    version: m.version, biome: m.biome, view: m.view, lighting: m.lighting, reduced: m.reduced,
    viewport: `${innerWidth}×${innerHeight}`, canvas: `${canvas.clientWidth}×${canvas.clientHeight}`,
    backing: `${canvas.width}×${canvas.height}`, dpr: renderer.dpr,
    seconds: +elapsed.toFixed(2), samples: m.renderTimes.length,
    frameIntervalP50: +percentile(m.intervals, .5).toFixed(2), frameIntervalP95: +percentile(m.intervals, .95).toFixed(2),
    framesOver33ms: m.intervals.filter(value => value > 33.3).length,
    renderCpuP50: +percentile(m.renderTimes, .5).toFixed(2), renderCpuP95: +percentile(m.renderTimes, .95).toFixed(2),
    complete: !reason
  };
  output.dataset.results = JSON.stringify(result);
  output.textContent = `${reason ? `采集中止：${reason}\n` : '15 秒绘制采集完成\n'}${JSON.stringify(result, null, 2)}\n单位 ms。CPU 为同步 Canvas 绘制提交；帧间隔包括浏览器调度，不是独立 GPU 计时。非游戏物理性能/真机验收。`;
  for (const control of document.querySelectorAll('button,select,input')) control.disabled = false;
  settings.moving = false; syncControls();
}
byId('measure').addEventListener('click', () => {
  settings.time = 5; settings.moving = true; previous = 0;
  measurement = { start: 0, last: 0, renderTimes: [], intervals: [], ...settings };
  for (const control of document.querySelectorAll('button,select,input')) control.disabled = true;
  output.textContent = '正在持续采集 15 秒，请保持此页可见。';
  delete output.dataset.results;
  syncControls();
});
window.addEventListener('resize', () => {
  if (measurement) finishMeasurement('采集期间视口改变');
  renderer.resize(); draw();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && measurement) finishMeasurement('页面进入后台');
  previous = 0;
});
function frame(now) {
  const dt = previous ? Math.min(.05, (now - previous) / 1000) : 0;
  if (settings.moving && !document.hidden) settings.time += dt;
  const started = performance.now(); draw(); const renderMs = performance.now() - started;
  if (measurement) {
    if (!measurement.start) measurement.start = now;
    if (previous) measurement.intervals.push(now - previous);
    measurement.renderTimes.push(renderMs); measurement.last = now;
    if (now - measurement.start >= 15000) finishMeasurement();
  }
  previous = now; requestAnimationFrame(frame);
}
syncControls(); draw(); requestAnimationFrame(frame);
