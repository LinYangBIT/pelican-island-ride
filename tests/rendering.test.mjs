import assert from 'node:assert/strict';
import test from 'node:test';
import { Renderer } from '../dist/renderer.js';
import { sampleTerrain } from '../dist/routes.js';

// Structural Canvas smoke test only. Real pixels, subjective quality and frame
// performance are checked through tools/visual-qa.html in an actual browser.
function mockCanvas(width, height) {
  let depth = 0, draws = 0;
  const finite = (values, method) => {
    for (const value of values.flat(Infinity)) if (typeof value === 'number') assert.ok(Number.isFinite(value), `${method} received ${value}`);
  };
  const gradient = () => ({ addColorStop(position, color) { assert.ok(position >= 0 && position <= 1); assert.equal(typeof color, 'string'); } });
  const methods = new Set(['beginPath','closePath','moveTo','lineTo','bezierCurveTo','quadraticCurveTo','arc','ellipse','rect','roundRect','fill','stroke','fillRect','strokeRect','clearRect','translate','rotate','scale','setTransform','transform','resetTransform','clip','fillText','strokeText','setLineDash','drawImage','putImageData']);
  const stateStack = [];
  const target = { globalAlpha: 1, globalCompositeOperation: 'source-over', shadowBlur: 0 };
  const context = new Proxy(target, {
    get(object, key) {
      if (key in object) return object[key];
      if (key === 'save') return () => { stateStack.push({ ...object }); depth++; };
      if (key === 'restore') return () => { assert.ok(depth > 0, 'Canvas restore without save'); const old = stateStack.pop(); for (const k of Object.keys(object)) delete object[k]; Object.assign(object, old); depth--; };
      if (key === 'createLinearGradient' || key === 'createRadialGradient' || key === 'createConicGradient') return (...args) => { finite(args,key); return gradient(); };
      if (key === 'measureText') return text => ({ width: String(text).length * 7 });
      if (key === 'getLineDash') return () => [];
      if (key === 'createPattern') return () => ({});
      if (methods.has(key)) return (...args) => { finite(args,key); if (['ellipse','arc'].includes(key)) assert.ok(args[2] >= 0, `${key} radius must be nonnegative`); if (key === 'ellipse') assert.ok(args[3] >= 0, 'ellipse radius must be nonnegative'); draws++; };
      throw new Error(`Mock Canvas method missing or renderer typo: ${String(key)}`);
    },
    set(object, key, value) { finite([value], `property ${String(key)}`); object[key] = value; return true; }
  });
  const canvas = { clientWidth: width, clientHeight: height, width: 0, height: 0, getContext: kind => { assert.equal(kind,'2d'); return context; } };
  return { canvas, assertBalanced() { assert.equal(depth,0,'Unbalanced Canvas save/restore'); assert.ok(draws > 0); assert.equal(context.globalAlpha,1); } };
}
function fixture(renderer, biome, mode, airborne, reducedEffects) {
  const terrain = x => sampleTerrain(x,biome);
  const x = 1350, cameraX = x - renderer.viewWidth * (mode === 'menu' ? .65 : .25);
  const terrainObject = (type, offset, lift, extra = {}) => ({ type, x: x + offset, y: terrain(x + offset) - lift, w: 44, h: 32, ...extra });
  return {
    mode, biome, time: 5, cameraX, terrain, runMode: 'adventure', finish: (cameraX + renderer.viewWidth * .85) / 10,
    player: { x, y: terrain(x) - (airborne ? 160 : 0), grounded: !airborne, rotation: airborne ? -.12 : .07, vy: airborne ? 80 : 0, boosting: true, shield: 1, invincible: .2 },
    objects: [terrainObject('rock',120,0),terrainObject('crate',230,0,{h:48}),terrainObject('log',340,0,{w:70,h:38}),terrainObject('ramp',480,0,{w:90,h:40}),terrainObject('ring',590,210,{w:70,h:110}),terrainObject('fish',90,210),terrainObject('pearl',200,230),terrainObject('shield',300,260),terrainObject('magnet',420,240),terrainObject('wind',560,0,{w:75,h:150}),terrainObject('fish',-9999,0),terrainObject('pearl',230,120,{collected:true})],
    particles: [{x:x-5,y:terrain(x)-30,size:3,life:.5,maxLife:.8,color:'#fce8a0'}],
    wind: 25, shake:.1, landingFlash:.3, reducedEffects
  };
}
test('render all biomes, sizes, poses, modes and quality/light combinations with finite balanced Canvas operations', () => {
  const old = { innerWidth: globalThis.innerWidth, innerHeight: globalThis.innerHeight, devicePixelRatio: globalThis.devicePixelRatio };
  let scenes = 0;
  try {
    for (const [width,height] of [[1366,768],[390,844],[844,390]]) {
      Object.assign(globalThis,{innerWidth:width,innerHeight:height,devicePixelRatio:2});
      const mock = mockCanvas(width,height), renderer = new Renderer(mock.canvas);
      for (const biome of [0,1,2]) for (const mode of ['menu','playing','paused','result']) for (const airborne of [false,true]) for (const reduced of [false,true]) for (const lighting of [false,true]) {
        renderer.lightingEnabled = lighting;
        renderer.render(fixture(renderer,biome,mode,airborne,reduced));
        mock.assertBalanced();
        assert.ok(renderer.viewWidth>0&&renderer.viewHeight>0&&renderer.scale>0);
        assert.ok(mock.canvas.width<=width*2&&mock.canvas.height<=height*2);
        scenes++;
      }
    }
  } finally {
    for (const [key,value] of Object.entries(old)) if (value===undefined) delete globalThis[key]; else globalThis[key]=value;
  }
  assert.equal(scenes,288);
});
