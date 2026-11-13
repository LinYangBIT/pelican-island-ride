const TAU = Math.PI * 2;
const palettes = [
  { sky: '#e8f3ed', bottom: '#fff0cf', sea: '#78c8bf', deep: '#4ca99f', hill: '#a8c8b4', hill2: '#76b4a3', grass: '#568e70', road: '#f1d5a2', dirt: '#dabb8b', ink: '#23494b', sun: '#f8cc65' },
  { sky: '#d9eee1', bottom: '#f4edc7', sea: '#5eaa91', deep: '#378f7d', hill: '#8bbc96', hill2: '#4e997f', grass: '#2a715b', road: '#d9c491', dirt: '#bba270', ink: '#163f36', sun: '#efdc83' },
  { sky: '#182d48', bottom: '#64788b', sea: '#345f78', deep: '#244b63', hill: '#3b6474', hill2: '#2a5262', grass: '#214c4c', road: '#889997', dirt: '#586f73', ink: '#e7eee1', sun: '#fff0bc' }
];
const noise = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return v - Math.floor(v); };

export class Renderer {
  constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.reducedEffects = false; this.resize(); }
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
  cloud(x, y, size, alpha) {
    const c = this.ctx; c.save(); c.globalAlpha = alpha;
    this.ellipse(x, y, size, size * .16, '#fffdf2');
    this.ellipse(x - size * .3, y - size * .12, size * .35, size * .22, '#fffdf2');
    this.ellipse(x + size * .2, y - size * .18, size * .42, size * .28, '#fffdf2'); c.restore();
  }
  tree(x, y, size, biome, phase = 0) {
    const c = this.ctx; c.save(); c.translate(x, y); c.scale(size, size);
    const sway = Math.sin(this.s.time * 1.4 + phase) * 4;
    this.curve([0, 0], [[-8, -50, 4, -106, 22 + sway, -156]], biome === 2 ? '#365257' : '#9c8461', 12);
    for (let k = 1; k < 7; k++) this.line([[-2 + k * 1.7, -k * 22], [9 + k * 1.5, -k * 22 - 3]], '#d1b487', 2);
    c.translate(22 + sway, -156);
    for (let j = 0; j < 7; j++) {
      const a = -.1 + j / 6 * Math.PI * 1.15;
      const xx = Math.cos(a) * 92, yy = -Math.sin(a) * 45 + 30;
      this.curve([0, 0], [[xx * .55, yy - 45, xx, yy - 20, xx, yy + 35], [xx * .55, yy - 2, 0, 0]], null, 1, j % 2 ? '#477d60' : '#679e74');
      this.curve([0, 0], [[xx * .55, yy - 30, xx, yy + 27]], '#90b38b', 1.2);
    }
    this.ellipse(2, 8, 7, 9, '#a57b4c'); this.ellipse(12, 9, 7, 9, '#b68c57'); c.restore();
  }
  pine(x, y, size, color) {
    this.line([[x, y], [x, y - size * 1.2]], '#647457', 6);
    for (let i = 0; i < 4; i++) this.path([[x, y - size * 1.7 + i * size * .28], [x + size * (.3 + i * .12), y - size * .7 + i * size * .25], [x - size * (.3 + i * .12), y - size * .7 + i * size * .25]], color);
  }
  lighthouse(x, y, scale, night) {
    const c = this.ctx; c.save(); c.translate(x, y); c.scale(scale, scale);
    this.path([[-33, 0], [31, 0], [19, -160], [-17, -160]], '#f6ecd2');
    this.path([[-24, -57], [26, -57], [23, -95], [-21, -95]], '#d97d63');
    this.path([[7, 0], [31, 0], [19, -160], [7, -160]], '#d6ccb9');
    this.path([[-25, -160], [26, -160], [26, -185], [-25, -185]], '#36585d');
    this.path([[-32, -187], [0, -211], [32, -187]], '#c66e54');
    this.line([[-34, -158], [34, -158]], '#36585d', 6);
    for (let i = -25; i <= 25; i += 10) this.line([[i, -157], [i, -145]], '#36585d', 2);
    this.line([[-32, -145], [32, -145]], '#36585d', 3);
    this.path([[-14, -166], [-14, -179], [15, -179], [15, -166]], '#ffe0a1');
    this.path([[-6, 0], [-6, -26], [7, -26], [7, 0]], '#698081');
    this.path([[-3, -112], [-3, -127], [5, -127], [5, -112]], '#698081');
    if (night) {
      c.globalAlpha = .13 + Math.sin(this.s.time) * .04;
      const beam = c.createLinearGradient(0, -170, 600, -170); beam.addColorStop(0, '#ffe7a6'); beam.addColorStop(1, '#ffe7a600');
      this.path([[0, -175], [650, -280], [650, -80]], beam); c.globalAlpha = 1;
    }
    c.restore();
  }
  background() {
    const { ctx: c, viewWidth: W, viewHeight: H, s, palette: p } = this;
    const sky = c.createLinearGradient(0, 0, 0, H * .75); sky.addColorStop(0, p.sky); sky.addColorStop(1, p.bottom); c.fillStyle = sky; c.fillRect(0, 0, W, H);
    const sx = W * .77, sy = H * .23;
    for (let i = 3; i >= 0; i--) { c.globalAlpha = i ? .04 : .84; this.ellipse(sx, sy, 68 + i * 30, 68 + i * 30, p.sun); } c.globalAlpha = 1;
    if (s.biome === 2) {
      for (let i = 0; i < (this.reducedEffects ? 40 : 90); i++) { c.globalAlpha = .35 + Math.sin(s.time * 1.5 + i) * .25; this.ellipse(noise(i) * W, noise(i + 500) * H * .56, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1, '#fff5ce'); }
      c.globalAlpha = 1; this.ellipse(sx + 23, sy - 20, 61, 61, p.sky);
    }
    for (let i = 0; i < (this.reducedEffects ? 5 : 7); i++) { const x = ((i * 390 - s.cameraX * .045 + s.time * 3) % (W + 400) + W + 400) % (W + 400) - 200; this.cloud(x, H * (.16 + noise(i + 43) * .23), 80 + noise(i) * 95, s.biome === 2 ? .09 : .45); }
    const horizon = H * .53;
    for (let layer = 0; layer < 2; layer++) {
      const points = [[-20, horizon + 35]];
      for (let x = -20; x <= W + 35; x += 20) {
        const xx = x + s.cameraX * (.06 + layer * .07);
        const y = horizon - 22 - Math.pow(Math.max(0, Math.sin(xx / 340 + layer * 4)), 1.8) * (80 + layer * 45) - Math.sin(xx / 81) * 4;
        points.push([x, y]);
      }
      points.push([W + 40, horizon + 80]); this.path(points, layer ? p.hill2 : p.hill);
    }
    const ocean = c.createLinearGradient(0, horizon, 0, this.ground + 80); ocean.addColorStop(0, p.sea); ocean.addColorStop(1, p.deep); c.fillStyle = ocean; c.fillRect(0, horizon, W, this.ground + 100 - horizon);
    const waveRows = this.reducedEffects ? 9 : 18;
    for (let row = 0; row < waveRows; row++) {
      const yy = horizon + 5 + row * (this.ground - horizon) / (waveRows + 1);
      for (let col = 0; col < (this.reducedEffects ? 8 : 12); col++) {
        const x = ((col * 180 + noise(row * 12 + col) * 100 - s.cameraX * (.12 + row * .006) + s.time * (row % 2 ? 6 : -5)) % (W + 220) + W + 220) % (W + 220) - 110;
        c.globalAlpha = .09 + noise(col * row + 14) * .22;
        this.curve([x, yy], [[x + 15, yy - 3, x + 36, yy + 2, x + 64, yy]], '#f6ffed', row < 5 ? 1 : 2);
      }
    } c.globalAlpha = 1;
    const islandX = ((W * .85 - s.cameraX * .18) % (W + 900) + W + 900) % (W + 900) - 100;
    this.path([[islandX - 180, horizon + 76], [islandX - 125, horizon + 42], [islandX - 80, horizon + 44], [islandX - 25, horizon + 18], [islandX + 75, horizon + 30], [islandX + 180, horizon + 84]], s.biome === 2 ? '#35595d' : '#709b78');
    this.lighthouse(islandX, horizon + 32, .74, s.biome === 2);
    for (let i = 0; i < 4; i++) {
      const x = islandX - 110 + i * 57, y = horizon + 43 + (i % 2) * 8;
      this.path([[x, y], [x + 34, y], [x + 34, y - 29], [x, y - 29]], i % 2 ? '#efe2bf' : '#f6ecd2');
      this.path([[x - 5, y - 27], [x + 17, y - 44], [x + 39, y - 27]], '#c47d66');
      this.path([[x + 13, y], [x + 13, y - 16], [x + 22, y - 16], [x + 22, y]], '#749494');
    }
    // A tiny sailboat and small bird silhouettes give the distance a sense of scale.
    const boatX = ((W * .35 - s.cameraX * .09) % (W + 200) + W + 200) % (W + 200) - 100;
    const by = horizon + 74 + Math.sin(s.time) * 2;
    this.path([[boatX - 23, by], [boatX + 23, by], [boatX + 13, by + 10], [boatX - 14, by + 10]], '#5b7b78');
    this.line([[boatX, by], [boatX, by - 64]], '#667a72', 2);
    this.path([[boatX - 3, by - 60], [boatX - 3, by - 8], [boatX - 36, by - 8]], '#f9f0d7');
    this.path([[boatX + 2, by - 45], [boatX + 2, by - 8], [boatX + 26, by - 8]], '#e2ac78');
    for (let i = 0; i < 6; i++) {
      const x = (W * .5 + i * 82 + s.time * 8) % (W + 80), y = H * .30 + Math.sin(i * 4) * 36;
      const flap = Math.sin(s.time * 3 + i) * 5;
      this.curve([x - 12, y + flap], [[x - 4, y - 7, x, y], [x + 5, y - 7, x + 12, y + flap]], s.biome === 2 ? '#a9c6c5' : '#78918a', 1.7);
    }
    if (s.biome === 1) {
      for (let i = -1; i < W / 140 + 2; i++) { const xx = i * 140 - (s.cameraX * .3 % 140); this.pine(xx, this.ground - 35, 90 + noise(i) * 65, i % 2 ? '#3d846c' : '#538e6e'); }
    } else {
      for (let i = -1; i < W / 650 + 2; i++) { const xx = i * 650 - (s.cameraX * .35 % 650); this.tree(xx, this.ground + 25, .75 + noise(i) * .25, s.biome, i); }
    }
  }
  road() {
    const { ctx: c, s, viewWidth: W, viewHeight: H, palette: p } = this;
    const groundPoints = [];
    for (let x = -30; x <= W + 40; x += 12) groundPoints.push([x, s.terrain(x + s.cameraX) + this.offsetY]);
    this.path([...groundPoints.map(([x, y]) => [x, y - 10]), [W + 40, H + 20], [-30, H + 20]], p.grass);
    this.path([...groundPoints, [W + 40, H + 20], [-30, H + 20]], p.road);
    this.line(groundPoints.map(([x, y]) => [x, y + 4]), '#fff0c8', 5);
    this.line(groundPoints.map(([x, y]) => [x, y + 83]), p.dirt, 3);
    const first = Math.floor(s.cameraX / 95);
    for (let i = first; i < first + W / 95 + 2; i++) {
      const x = i * 95 - s.cameraX, y = s.terrain(i * 95) + this.offsetY;
      c.globalAlpha = .45;
      this.line([[x + 5, y + 57], [x + 35, y + 58]], '#fff9e2', 3);
      this.ellipse(x + 19, y + 102 + noise(i) * 80, 2 + noise(i) * 2, 1.4, '#a68e6f');
      this.ellipse(x + 62, y + 150 + noise(i + 2) * 120, 2, 1, '#b19c78');
      c.globalAlpha = 1;
      if (i % 3 === 0) {
        this.line([[x, y - 6], [x - 5, y - 16]], '#497e60', 2);
        this.line([[x, y - 6], [x + 4, y - 21]], '#497e60', 2);
        if (i % 6 === 0) { this.ellipse(x + 3, y - 21, 3, 3, '#f9d675'); }
      }
    }
    // Small roadside posts are deliberately behind the player and do not imply hazards.
    for (let i = Math.floor(s.cameraX / 800); i < (s.cameraX + W) / 800 + 1; i++) {
      const x = i * 800 - s.cameraX, y = s.terrain(i * 800) + this.offsetY - 12;
      this.line([[x, y], [x, y - 53]], '#e9ebd3', 7);
      this.line([[x, y - 37], [x, y - 48]], '#d59874', 7);
    }
  }
  object(o) {
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
    } else if (o.type === 'rock') {
      this.path([[-25, 0], [-22, -19], [-10, -33], [11, -30], [26, -12], [27, 0]], '#718789');
      this.path([[-22, -19], [-10, -33], [11, -30], [2, -12]], '#a1aaa1'); this.line([[2, -12], [11, -30]], '#c3c7af', 2);
    } else if (o.type === 'crate') {
      this.path([[-22, 0], [22, 0], [22, -47], [-22, -47]], '#b98051', '#7c6546', 2);
      for (let i = 0; i < 3; i++) this.line([[-19, -8 - i * 14], [19, -8 - i * 14]], '#deae72', 4);
      this.line([[-19, -43], [18, -4]], '#efc087', 6);
      this.line([[-18, -3], [18, -43]], '#efc087', 6);
    } else if (o.type === 'log') {
      const w = o.w || 70, h = o.h || 38;
      this.path([[-w / 2, 0], [w / 2 - 10, 0], [w / 2 - 8, -h], [-w / 2, -h]], '#9c6f4c', '#6f5b43', 2);
      this.ellipse(w / 2 - 7, -h / 2, 12, h / 2, '#d6ad75');
      c.beginPath(); c.ellipse(w / 2 - 7, -h / 2, 7, h / 2 - 5, 0, 0, TAU); c.strokeStyle = '#a77c51'; c.lineWidth = 1.5; c.stroke();
      this.line([[-w / 2 + 4, -h + 7], [w / 2 - 19, -h + 9]], '#c69a65', 3);
      this.line([[-w / 2 + 8, -9], [w / 2 - 24, -12]], '#795e40', 2);
      this.path([[-18, -h], [-9, -h - 7], [2, -h - 5], [11, -h]], '#5b8b60');
    } else if (o.type === 'ring') {
      const rx = (o.w || 70) / 2, ry = (o.h || 110) / 2;
      c.save(); c.shadowBlur = this.reducedEffects ? 0 : 14; c.shadowColor = '#e7f5bb';
      c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); c.strokeStyle = '#f4d580'; c.lineWidth = 7; c.stroke();
      c.shadowBlur = 0; c.beginPath(); c.ellipse(0, 0, rx - 7, ry - 7, 0, 0, TAU); c.strokeStyle = '#c5ead8'; c.lineWidth = 2; c.stroke();
      c.restore();
      const sparkle = this.reducedEffects ? 0 : Math.sin(s.time * 3) * 3;
      this.path([[0, -12 + sparkle], [4, -4 + sparkle], [13, sparkle], [4, 4 + sparkle], [0, 12 + sparkle], [-4, 4 + sparkle], [-13, sparkle], [-4, -4 + sparkle]], '#fff1b5');
      c.fillStyle = s.biome === 2 ? '#fff2c7' : '#386554'; c.font = '600 12px sans-serif'; c.textAlign = 'center'; c.fillText('穿环 +10', 0, ry + 22); c.textAlign = 'start';
    } else if (o.type === 'ramp') {
      this.path([[-49, 0], [43, -38], [43, 0]], '#c9935e', '#866a49', 2);
      this.line([[-49, -2], [43, -41]], '#f5d19b', 6);
      this.line([[-20, -2], [-20, -12]], '#866a49', 3); this.line([[14, -2], [14, -28]], '#866a49', 3);
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
  cyclist() {
    const { ctx: c, s } = this, p = s.player, menu = s.mode === 'menu';
    const x = p.x - s.cameraX, y = p.y + this.offsetY;
    const size = menu ? (this.viewWidth < 900 ? 1.6 : 1.85) : .86;
    c.save(); c.globalAlpha = .13;
    this.ellipse(x, s.terrain(p.x) + this.offsetY + 5, 78 * size, 8 * size, '#344c3f'); c.restore();
    c.save(); c.translate(x, y); c.rotate(p.rotation || 0); c.scale(size, size);
    if (p.invincible > 0 && Math.floor(s.time * 12) % 2 === 0) c.globalAlpha = .5;
    if (p.shield > 0) {
      c.save(); c.globalAlpha = .2; this.ellipse(12, -105, 126, 128, '#b8fff0');
      c.globalAlpha = .75; c.beginPath(); c.ellipse(12, -105, 126, 128, 0, 0, TAU); c.strokeStyle = '#a2ebd9'; c.lineWidth = 2; c.stroke(); c.restore();
    }
    if (p.boosting && !this.reducedEffects) {
      for (let i = 0; i < 6; i++) { const yy = -22 - i * 25; this.line([[-95 - noise(i) * 35, yy], [-160 - Math.sin(s.time * 12 + i) * 20, yy]], '#fff4cf', 2); }
    }
    const turn = p.x / 30, pedal = p.x / 24;
    // Wire-spoked wheels, contrasting rims, and a turquoise diamond frame.
    for (const wx of [-53, 55]) {
      this.ellipse(wx, -31, 31, 31, '#2f4d4c'); this.ellipse(wx, -31, 26, 26, '#f1e0b6');
      this.ellipse(wx, -31, 23.5, 23.5, '#acc6b1');
      for (let i = 0; i < 12; i++) { const a = turn + i * TAU / 12; this.line([[wx, -31], [wx + Math.cos(a) * 23, -31 + Math.sin(a) * 23]], '#e9ead5', 1); }
      this.ellipse(wx, -31, 4, 4, '#395b57');
      this.curve([wx - 26, -44], [[wx - 15, -68, wx + 17, -68, wx + 28, -42]], '#d39e64', 3);
    }
    this.line([[-53, -31], [-24, -82], [4, -32], [-53, -31], [35, -84], [-24, -82]], '#265f60', 8);
    this.line([[-53, -31], [-24, -82], [4, -32], [-53, -31], [35, -84], [-24, -82]], '#5cb9a5', 5);
    this.line([[4, -32], [35, -84], [55, -31]], '#318c80', 6);
    this.line([[35, -84], [27, -105], [43, -108], [48, -99]], '#365654', 4);
    this.line([[-24, -82], [-27, -94]], '#4b6760', 4);
    this.line([[-42, -96], [-14, -96]], '#754e37', 7);
    this.ellipse(4, -32, 10, 10, '#537a6b'); this.ellipse(4, -32, 6, 6, '#d9d9b2');
    const footX = 4 + Math.cos(pedal) * 17, footY = -32 + Math.sin(pedal) * 17;
    this.line([[4, -32], [footX, footY]], '#4b6258', 3);
    this.line([[-18, -100], [10, -70], [footX, footY - 4]], '#ce9453', 7);
    this.line([[footX - 7, footY - 1], [footX + 9, footY - 1]], '#e1a24f', 5);
    // Body and long curved neck, with a recognisable deep pelican bill pouch.
    this.curve([-25, -96], [[-66, -104, -73, -142, -51, -160], [-34, -182, -7, -155, 3, -151], [14, -144, 14, -166, 5, -180], [-6, -196, -2, -217, 18, -219], [46, -220, 48, -190, 38, -175], [29, -159, 35, -136, 18, -114], [5, -97, -12, -91, -25, -96]], null, 1, '#fffbeb');
    this.curve([19, -189], [[5, -160, 29, -143, 7, -120], [-3, -110, -17, -108, -31, -112]], '#e0e4ce', 7);
    this.path([[-57, -124], [-81, -130], [-64, -112], [-42, -107]], '#f5f1db');
    // A coral scarf streams backward in the sea breeze.
    const flutter = Math.sin(s.time * 7) * 5;
    this.path([[4, -167], [-16, -174], [-49, -185 + flutter], [-66, -174 + flutter], [-38, -168], [-15, -161]], '#dc765d');
    this.path([[3, -170], [26, -168], [23, -156], [1, -157]], '#e58b68');
    this.line([[4, -162], [23, -162]], '#f0ae7b', 2);
    // Folded wing becomes a broad gliding wing in midair.
    if (!p.grounded) {
      this.curve([-31, -147], [[-81, -192, -122, -216, -157, -203], [-128, -183, -89, -160, -58, -132], [-42, -122, -26, -130, -31, -147]], '#d5dec8', 2, '#fffbee');
      for (let i = 0; i < 4; i++) this.line([[-72 - i * 16, -170 - i * 8], [-84 - i * 18, -166 - i * 9]], '#c9d6c3', 2);
    } else {
      this.curve([-49, -149], [[-34, -158, -6, -142, -7, -124], [-17, -111, -43, -115, -57, -128], [-50, -126, -32, -127, -28, -134]], '#d4deca', 2, '#e9edda');
      this.curve([-47, -140], [[-34, -142, -23, -134]], '#c3d3bd', 2);
    }
    this.curve([-15, -128], [[6, -130, 17, -112, 36, -107]], '#eceddb', 8);
    this.line([[33, -107], [42, -105]], '#e5aa58', 5);
    this.path([[34, -198], [128, -187], [42, -178]], '#edb453', '#bc8a45', 1.5);
    this.curve([42, -183], [[65, -174, 100, -178, 122, -185], [97, -152, 61, -145, 40, -173]], '#d1904a', 1.4, '#f1c77a');
    this.line([[45, -185], [119, -186]], '#a47c43', 1.5);
    this.ellipse(28, -201, 4.2, 5.2, '#244d4f'); this.ellipse(29.3, -203, 1.2, 1.7, '#ffffff');
    this.ellipse(19, -189, 6, 3.5, '#f2d4b0');
    // Vented cycling helmet and chin strap.
    this.curve([-6, -209], [[-8, -238, 42, -245, 49, -215], [32, -216, 13, -210, -6, -209]], '#234b50', 2, '#3e7777');
    this.curve([1, -212], [[5, -240, 31, -237, 37, -216]], '#78a7a0', 4);
    this.line([[10, -226], [15, -231]], '#214c52', 4); this.line([[24, -228], [29, -231]], '#214c52', 4);
    this.curve([0, -208], [[0, -181, 20, -177, 29, -184]], '#6d8579', 2);
    this.path([[38, -216], [64, -212], [43, -207]], '#254f53');
    // Small saddlebag with a hand-painted fish emblem.
    this.path([[-62, -85], [-38, -85], [-36, -63], [-64, -63]], '#c68a56', '#8d694b', 2);
    this.line([[-64, -79], [-37, -79]], '#f0c18a', 2);
    this.ellipse(-50, -72, 6, 3, '#f7dca2'); this.path([[-55, -72], [-60, -75], [-60, -69]], '#f7dca2');
    c.restore();
  }
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
