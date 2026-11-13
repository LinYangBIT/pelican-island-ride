import { drawCyclist } from './cyclist-model.js';
import { drawIslandBackground } from './island-scenery.js';
import { drawTerrain, drawSolidObject, drawRiderShadow } from './terrain-model.js';
const TAU = Math.PI * 2;
const palettes = [
  { sky: '#e8f3ed', bottom: '#fff0cf', sea: '#78c8bf', deep: '#4ca99f', hill: '#a8c8b4', hill2: '#76b4a3', grass: '#568e70', road: '#f1d5a2', dirt: '#dabb8b', ink: '#23494b', sun: '#f8cc65' },
  { sky: '#d9eee1', bottom: '#f4edc7', sea: '#5eaa91', deep: '#378f7d', hill: '#8bbc96', hill2: '#4e997f', grass: '#2a715b', road: '#d9c491', dirt: '#bba270', ink: '#163f36', sun: '#efdc83' },
  { sky: '#182d48', bottom: '#64788b', sea: '#345f78', deep: '#244b63', hill: '#3b6474', hill2: '#2a5262', grass: '#214c4c', road: '#889997', dirt: '#586f73', ink: '#e7eee1', sun: '#fff0bc' }
];
const noise = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return v - Math.floor(v); };

export class Renderer {
  constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.reducedEffects = false; this.lightingEnabled = true; this.resize(); }
  resize() {
    const w = this.canvas.clientWidth || innerWidth, h = this.canvas.clientHeight || innerHeight;
    this.scale = Math.min(h / 900, w / 700);
    this.viewWidth = w / this.scale; this.viewHeight = h / this.scale;
    this.dpr = Math.min(devicePixelRatio || 1, this.reducedEffects ? 1.4 : 2);
    this.canvas.width = Math.round(w * this.dpr); this.canvas.height = Math.round(h * this.dpr);
  }
  path(points, fill, stroke, width = 1) {
    const c = this.ctx; c.beginPath();
    for (const [i, p] of points.entries()) i ? c.lineTo(...p) : c.moveTo(...p);
    if (fill) { c.closePath(); c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
  }
  ellipse(x, y, rx, ry, color, rotation = 0) {
    const c = this.ctx; c.beginPath(); c.ellipse(x, y, rx, ry, rotation, 0, TAU); c.fillStyle = color; c.fill();
  }
  line(points, color, width = 2) { this.path(points, null, color, width); }
  curve(start, controls, color, width = 2, fill = null) {
    const c = this.ctx; c.beginPath(); c.moveTo(...start);
    for (const p of controls) p.length === 6 ? c.bezierCurveTo(...p) : c.quadraticCurveTo(...p);
    if (fill) { c.closePath(); c.fillStyle = fill; c.fill(); }
    if (color) { c.strokeStyle = color; c.lineWidth = width; c.stroke(); }
  }
  background() { drawIslandBackground(this); }
  road() { drawTerrain(this); }
  object(o) {
    if (drawSolidObject(this, o)) return;
    const { ctx: c, s } = this;
    const x = o.x - s.cameraX, y = o.y + this.offsetY;
    if (o.collected || x < -160 || x > this.viewWidth + 160) return;
    c.save(); c.translate(x, y);
    const bob = Math.sin(s.time * 3 + o.x) * 3;
    if (['fish', 'pearl', 'shield', 'magnet'].includes(o.type)) {
      c.translate(0, this.reducedEffects ? 0 : bob); c.globalAlpha = s.biome === 2 ? .25 : .15;
      this.ellipse(0, 0, 26, 26, o.type === 'fish' ? '#ffd56a' : '#e9ffef'); c.globalAlpha = 1;
    }
    if (o.type === 'fish') {
      this.path([[-10, 0], [-23, -10], [-23, 10]], '#e9a842');
      this.ellipse(0, 0, 15, 9, s.biome === 2 ? '#ffdf81' : '#f8ce69', -.1); this.ellipse(7, -2, 2, 2, '#6f653f');
      this.curve([-8, -3], [[-1, -7, 7, -5]], '#fff2b1', 2);
    } else if (o.type === 'pearl') {
      c.shadowBlur = this.reducedEffects ? 0 : 16; c.shadowColor = '#edfff8'; this.ellipse(0, 0, 12, 12, '#f7fff9'); c.shadowBlur = 0;
      this.ellipse(-4, -4, 4, 4, '#ffffff'); this.curve([-8, 6], [[0, 13, 9, 3]], '#b8dcd5', 2);
      this.line([[19, -19], [19, -10]], '#fcffe3', 2); this.line([[15, -15], [23, -15]], '#fcffe3', 2);
    } else if (o.type === 'ring') {
      const rx = (o.w || 70) / 2, ry = (o.h || 110) / 2;
      c.save(); c.shadowBlur = this.reducedEffects ? 0 : 14; c.shadowColor = '#e7f5bb';
      c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); c.strokeStyle = '#f4d580'; c.lineWidth = 7; c.stroke();
      c.shadowBlur = 0; c.beginPath(); c.ellipse(0, 0, rx - 7, ry - 7, 0, 0, TAU); c.strokeStyle = '#c5ead8'; c.lineWidth = 2; c.stroke();
      c.restore();
      const sparkle = this.reducedEffects ? 0 : Math.sin(s.time * 3) * 3;
      this.path([[0, -12 + sparkle], [4, -4 + sparkle], [13, sparkle], [4, 4 + sparkle], [0, 12 + sparkle], [-4, 4 + sparkle], [-13, sparkle], [-4, -4 + sparkle]], '#fff1b5');
      c.fillStyle = s.biome === 2 ? '#fff2c7' : '#386554'; c.font = '600 12px sans-serif'; c.textAlign = 'center'; c.fillText('穿环 +10', 0, ry + 22); c.textAlign = 'start';
    } else if (o.type === 'wind') {
      for (let i = 0; i < 5; i++) {
        const yy = -((s.time * 75 + i * 30) % 150); c.globalAlpha = .25 + (yy + 150) / 300;
        this.curve([-30, yy], [[-8, yy - 10, 10, yy + 4, 23, yy - 12], [35, yy - 28, 12, yy - 32]], '#d7fff1', 3);
      }
    } else if (o.type === 'shield') {
      this.path([[-14, -16], [0, -21], [15, -16], [13, 6], [0, 18], [-13, 6]], '#76c9b9', '#e5fff0', 3);
      this.line([[-6, -2], [-1, 4], [8, -8]], '#ffffff', 3);
    } else if (o.type === 'magnet') {
      this.curve([-10, -12], [[-17, 18, 17, 18, 10, -12]], '#ec8b6f', 10);
      this.line([[-10, -13], [-10, -6]], '#fff7de', 10); this.line([[10, -13], [10, -6]], '#fff7de', 10);
    }
    c.restore();
  }
  cyclist() { drawRiderShadow(this); drawCyclist(this); }
  render(state) {
    this.s = state; this.palette = palettes[state.biome] || palettes[0];
    if (this.reducedEffects !== Boolean(state.reducedEffects)) { this.reducedEffects = Boolean(state.reducedEffects); this.resize(); }
    const c = this.ctx; c.setTransform(this.dpr * this.scale, 0, 0, this.dpr * this.scale, 0, 0);
    c.lineCap = 'round'; c.lineJoin = 'round';
    this.ground = this.viewHeight * (state.mode === 'menu' ? .77 : .73);
    this.offsetY = this.ground - 650;
    this.background();
    if (!this.reducedEffects && Math.abs(state.wind || 0) > 12 && state.mode === 'playing') {
      c.save(); c.globalAlpha = .22;
      for (let i = 0; i < 7; i++) {
        const x = ((noise(i + 220) * this.viewWidth - state.time * state.wind * 3) % this.viewWidth + this.viewWidth) % this.viewWidth;
        const y = this.ground - 100 - noise(i + 320) * 210;
        this.curve([x, y], [[x + 24, y - 4, x + 52, y + 4, x + 79, y]], '#fff9dc', 1.5);
      }
      c.restore();
    }
    c.save();
    if (!this.reducedEffects && state.shake > 0) {
      const strength = Math.min(1, state.shake / .25);
      c.translate(Math.sin(state.time * 110) * strength * 4, Math.cos(state.time * 99) * strength * 2.5);
    }
    this.road();
    for (const o of state.objects) this.object(o);
    // Adventure finish gate is visible before crossing the actual finish position.
    if (state.mode !== 'menu' && state.runMode === 'adventure') {
      const x = state.finish * 10 - state.cameraX, y = state.terrain(state.finish * 10) + this.offsetY;
      if (x > -160 && x < this.viewWidth + 160) {
        this.line([[x, y], [x, y - 290]], '#e9efdb', 7);
        this.path([[x, y - 290], [x + 100, y - 275], [x + 90, y - 222], [x, y - 235]], '#e88062');
        c.fillStyle = '#fff8df'; c.font = 'bold 16px sans-serif'; c.fillText('FINISH', x + 12, y - 254);
      }
    }
    this.cyclist();
    if (state.landingFlash > 0) {
      c.save(); c.globalAlpha = Math.min(.85, state.landingFlash * 1.4);
      const x = state.player.x - state.cameraX, y = state.terrain(state.player.x) + this.offsetY;
      c.beginPath(); c.ellipse(x, y + 4, 60 + (1 - Math.min(1, state.landingFlash)) * 35, 9, 0, 0, TAU); c.strokeStyle = '#fff1ab'; c.lineWidth = 3; c.stroke();
      c.fillStyle = state.biome === 2 ? '#fff2c7' : '#276c59'; c.font = '600 15px sans-serif'; c.textAlign = 'center'; c.fillText('完美落地 +3', x, state.player.y + this.offsetY - 215); c.textAlign = 'start'; c.restore();
    }
    for (let i = 0; i < state.particles.length; i += this.reducedEffects ? 3 : 1) { const p = state.particles[i]; c.globalAlpha = Math.max(0, p.life / p.maxLife); this.ellipse(p.x - state.cameraX, p.y + this.offsetY, p.size, p.size, p.color); } c.globalAlpha = 1;
    if (state.biome === 1 || state.biome === 2) {
      for (let i = 0; i < (this.reducedEffects ? 8 : 22); i++) {
        const x = (noise(i + 70) * this.viewWidth + Math.sin(state.time * .4 + i) * 30), y = this.ground - 30 - noise(i) * 250;
        c.globalAlpha = (.4 + Math.sin(state.time * 2 + i) * .3) * (state.biome === 2 ? 1 : .5);
        this.ellipse(x, y, 2, 2, '#fff1a2');
      } c.globalAlpha = 1;
    }
    c.restore();
    // Foreground foliage makes the postcard feel layered without obscuring play.
    for (const side of [-1, 1]) {
      const x = side === -1 ? 0 : this.viewWidth;
      for (let i = 0; i < 5; i++) {
        const xx = x - side * i * 18, yy = this.viewHeight - 15;
        this.ellipse(xx, yy, 19, 65 - i * 6, state.biome === 2 ? '#244d4d' : '#497a60', side * (.5 + i * .2));
      }
    }
  }
}
