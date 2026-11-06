import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { ROUTES, sampleTerrain, biomeAt, sectionAt } from '../dist/routes.js';

// Execute the actual engine with browser/audio boundaries replaced. Full runs use
// only jump() and simulate(); fixture positioning isolates edge cases.
const source = fs.readFileSync(new URL('../dist/game.js', import.meta.url), 'utf8').replace(/^import .*;$/gm, '');
const html = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
function engine(rawSave = null) {
  const elements = new Map(ids.map(id => [id, { id, hidden: false, dataset: {}, style: {}, classList: { toggle() {}, add() {}, remove() {} }, parentElement: { setAttribute() {} }, textContent: '', value: '', checked: false, setAttribute() {}, addEventListener() {}, focus() {}, querySelector() { return null; }, querySelectorAll() { return []; } }]));
  const storage = new Map(rawSave === null ? [] : [['pelican-island-v1', typeof rawSave === 'string' ? rawSave : JSON.stringify(rawSave)]]);
  const listeners = {};
  class Renderer { constructor() { this.viewWidth = 1440; } resize() {} render() {} }
  class IslandAudio { constructor(settings, callback) { this.settings = settings; this.callback = callback; } unlock() {} setScene() {} setSettings() {} play() {} setHidden() {} }
  const context = vm.createContext({
    Renderer, IslandAudio, ROUTES, sampleTerrain, biomeAt, sectionAt, console,
    document: { getElementById: id => elements.get(id) || null, querySelectorAll: () => [], body: { dataset: {} }, addEventListener: (type, fn) => { listeners[type] = fn; }, hidden: false },
    window: { matchMedia: () => ({ matches: false }), addEventListener: (type, fn) => { listeners[type] = fn; } },
    localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) }, performance: { now: () => 0 }, requestAnimationFrame() {},
  });
  vm.runInContext(source + '\nthis.api={state,get saved(){return saved},get input(){return input},startRun,jump,simulate,pause,resume,finishRun,selectBiome,selectMode,terrain,syncStorageUI,updateHUD};', context);
  return { ...context.api, api: context.api, elements, storage, listeners };
}
function isolate(e) { const s=e.state; s.objects=[];s.nextSpawn=Infinity;s.nextCheckpoint=Infinity;s.player.invincible=0; }
function step(e, seconds) { for(let t=0;t<seconds;t+=1/120)e.simulate(1/120); }
let tests=0;
function check(name, run) { run();tests++;console.log('PASS',name); }

check('all three routes are playable to 1200m with actual timely jump inputs',()=>{
  for(let biome=0;biome<3;biome++){
    const e=engine();e.selectBiome(biome);e.startRun();
    for(let frame=0;frame<18000&&e.state.mode==='playing';frame++){
      const s=e.state,p=s.player;
      const obstacle=s.objects.find(o=>['rock','crate','log'].includes(o.type)&&!o.collected&&o.x>p.x&&o.x-p.x<s.speed*.30+o.w/2+20);
      if(p.grounded&&obstacle)e.jump();
      else if(obstacle&&s.jumpCount<2&&p.vy>0&&p.y>obstacle.y-obstacle.h-55)e.jump();
      e.api.input.jump=!p.grounded;
      e.simulate(1/120);
    }
    assert.equal(e.state.mode,'result');assert.ok(e.state.distance>=1200,`route ${biome} stopped ${e.state.distance}`);
    assert.ok(e.api.saved.records[biome].stars>0);
    console.log('route',biome,{distance:Math.floor(e.state.distance),seconds:+e.state.elapsed.toFixed(1),crashes:e.state.crashes,landings:e.state.perfectLandings,fish:e.state.fish});
  }
});
check('checkpoint healing and energy happen once per crossing, capped at maxima',()=>{
  const e=engine();e.startRun();isolate(e);const s=e.state;
  s.player.x=3999;s.distance=399.9;s.hp=1;s.energy=10;e.simulate(1/120);
  assert.equal(s.lastCheckpoint,1);assert.equal(s.hp,2);assert.ok(s.energy>45&&s.energy<46);
  s.player.x=3999;s.distance=399.9;s.energy=10;e.simulate(1/120);assert.equal(s.hp,2);assert.ok(s.energy<11);
  s.player.x=7999;s.distance=799.9;s.energy=90;e.simulate(1/120);assert.equal(s.hp,3);assert.equal(s.energy,100);
});
check('ring requires airborne overlap and pays only once',()=>{
  const e=engine();e.startRun();isolate(e);const s=e.state,p=s.player;
  const ring={type:'ring',x:p.x+3,y:p.y-76,w:70,h:110};s.objects=[ring];e.simulate(1/120);assert.equal(s.rings,0);
  p.grounded=false;p.y=e.terrain(p.x)-120;p.vy=0;ring.x=p.x+3;ring.y=p.y-76;e.simulate(1/120);
  assert.equal(s.rings,1);assert.equal(s.fish,10);e.simulate(1/120);assert.equal(s.rings,1);assert.equal(s.fish,10);
});
check('empty jumps never award perfect landing, clearing a log does',()=>{
  const e=engine();e.startRun();isolate(e);e.jump();step(e,1.3);assert.equal(e.state.perfectLandings,0);assert.equal(e.state.fish,0);
  const s=e.state,p=s.player;s.objects=[{type:'log',x:p.x+130,y:e.terrain(p.x+130),w:70,h:38}];e.jump();step(e,1.4);
  assert.equal(s.crashes,0);assert.equal(s.perfectLandings,1);assert.equal(s.fish,3);
});
check('a shield-assisted collision cancels a pending perfect landing',()=>{
  const e=engine();e.startRun();isolate(e);const s=e.state,p=s.player;
  p.shield=1;p.grounded=false;p.y=e.terrain(p.x)-15;p.vy=100;s.airtime=.6;s.clearedObstacle=true;s.jumpCount=1;
  s.objects=[{type:'log',x:p.x+3,y:e.terrain(p.x+3),w:70,h:38}];e.simulate(1/120);
  assert.equal(p.shield,0);assert.equal(s.clearedObstacle,false);step(e,.5);assert.equal(s.perfectLandings,0);
});
check('jump buffer triggers on landing and does not grant an airborne third jump',()=>{
  const e=engine();e.startRun();isolate(e);const s=e.state,p=s.player;
  e.jump();e.jump();const vy=p.vy;e.jump();assert.equal(p.vy,vy);assert.equal(s.jumpCount,2);assert.ok(s.jumpBuffer>0);
  p.y=e.terrain(p.x)-2;p.vy=400;e.simulate(1/120);
  assert.equal(p.grounded,false);assert.equal(s.jumpCount,1);assert.ok(p.vy<0);assert.equal(s.jumpBuffer,0);
});
check('old mute preferences and earned upgrades survive migration',()=>{
  const e=engine({wallet:123,muted:true,upgrades:{speed:2},bestDistance:815,completed:[true,false,false]});
  assert.equal(e.api.saved.wallet,123);assert.equal(e.api.saved.muted,true);assert.equal(e.api.saved.upgrades.speed,2);assert.equal(e.api.saved.upgrades.magnet,0);assert.equal(e.api.saved.records.length,3);
  assert.equal(e.api.saved.musicVolume,.5);assert.equal(e.api.saved.sfxVolume,.7);
});
check('malformed JSON falls back and malformed numeric progress is finite',()=>{
  const corrupt=engine('{oops');assert.equal(corrupt.api.saved.wallet,0);corrupt.startRun();corrupt.simulate(1/120);
  const e=engine({wallet:'NaN',bestDistance:'Infinity',bestScore:'invalid',musicVolume:99,sfxVolume:-3,upgrades:{speed:'not a number',shield:99},records:[{stars:99,bestTime:'Infinity',runs:-2}]});
  assert.equal(e.api.saved.wallet,0);assert.equal(e.api.saved.bestDistance,0);assert.equal(e.api.saved.bestScore,0);assert.equal(e.api.saved.musicVolume,1);assert.equal(e.api.saved.sfxVolume,0);assert.equal(e.api.saved.upgrades.speed,0);assert.equal(e.api.saved.upgrades.shield,3);assert.equal(e.api.saved.records[0].stars,3);assert.equal(e.api.saved.records[0].bestTime,0);
});
check('endless terrain has continuous value and slope across each biome boundary',()=>{
  for(let first=0;first<3;first++)for(const boundary of [9000,18000,27000,36000]){
    const left=sampleTerrain(boundary-.001,first,true),right=sampleTerrain(boundary+.001,first,true);
    assert.ok(Math.abs(left-right)<.01);
    const dl=(sampleTerrain(boundary,first,true)-sampleTerrain(boundary-.1,first,true))/.1;
    const dr=(sampleTerrain(boundary+.1,first,true)-sampleTerrain(boundary,first,true))/.1;
    assert.ok(Math.abs(dl-dr)<.01);
  }
  const e=engine();e.selectMode('endless');e.startRun();isolate(e);e.state.player.x=8999;e.state.distance=899.9;e.simulate(1/120);assert.equal(e.state.biome,1);
});
check('ending a run settles once and writes record and currency',()=>{
  const e=engine();e.startRun();e.state.fish=20;e.state.pearls=2;e.state.distance=1200;e.state.elapsed=40;e.state.collected=60;e.finishRun(true);
  const wallet=e.api.saved.wallet;e.finishRun(true);assert.equal(e.api.saved.wallet,wallet);assert.equal(e.api.saved.records[0].runs,1);assert.equal(e.api.saved.records[0].stars,3);assert.ok(JSON.parse(e.storage.get('pelican-island-v1')).wallet>0);
});
check('audio/settings and new route UI integration IDs are present exactly once',()=>{
  for(const id of ['settingsOverlay','musicVolume','sfxVolume','musicValue','sfxValue','audioStatus','reducedEffects','routeDescription','hudSection','resultDetails'])assert.equal(ids.filter(value=>value===id).length,1,id);
  const e=engine();e.startRun();e.pause();assert.equal(e.state.mode,'paused');assert.equal(e.api.input.boost,false);e.resume();assert.equal(e.state.mode,'playing');
});
console.log(`${tests} regression groups passed`);
