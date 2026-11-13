const TAU = Math.PI * 2;
const noise = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return v - Math.floor(v); };

export function surfaceGradient(r, x, y, height, colors) {
  if (r.lightingEnabled === false) return colors[1];
  const g = r.ctx.createLinearGradient(x + 20, y - height, x - 10, y + 8);
  colors.forEach((color, i) => g.addColorStop(i / (colors.length - 1), color));
  return g;
}

// Layered analytic shadows: no full-screen blur or readback, and all projections
// follow the upper-right sun/moon. Airborne shadows widen and lose density.
export function groundShadow(r, x, y, width, height = 0, strength = 1) {
  if (r.lightingEnabled === false) return;
  const c = r.ctx, spread = Math.min(60, height * .17);
  c.save();
  for (let i = r.reducedEffects ? 1 : 3; i >= 0; i--) {
    c.globalAlpha = (.024 + (3 - i) * .012) * strength / (1 + height / 150);
    r.ellipse(x - height * .32 - width * .17, y + 3, width + spread + i * 5, 4 + spread * .11 + i * 2, '#162e35');
  }
  c.restore();
}

export function drawRiderShadow(r) {
  const s = r.s, p = s.player, size = s.mode === 'menu' ? (r.viewWidth < 900 ? 1.6 : 1.85) : .86;
  const height = Math.max(0, s.terrain(p.x) - p.y);
  const x = p.x - s.cameraX, y = s.terrain(p.x) + r.offsetY;
  groundShadow(r, x - 22 * size, y, 85 * size, height + 24, .9);
  if (height < 12 && r.lightingEnabled !== false) {
    r.ctx.save(); r.ctx.globalAlpha = .24 * (1 - height / 12);
    for (const dx of [-53, 55]) {
      const wx = p.x + dx * size;
      r.ellipse(wx - s.cameraX, s.terrain(wx) + r.offsetY + 1.5, 13 * size, 2.4 * size, '#233d3b');
    }
    r.ctx.restore();
  }
}

export function drawTerrain(r) {
  const { ctx: c, s, viewWidth: W, viewHeight: H, palette: p } = r;
  const night = s.biome === 2, forest = s.biome === 1;
  const points = [];
  for (let x = -40; x <= W + 50; x += 12) points.push([x, s.terrain(x + s.cameraX) + r.offsetY]);
  const filled = offset => [...points.map(([x, y]) => [x, y + offset]), [W + 60, H + 30], [-40, H + 30]];
  r.path(filled(-12), surfaceGradient(r, W * .7, r.ground, 50, night ? ['#7e9f94', '#416963', '#294a4c'] : ['#a4b679', p.grass, '#355e48']));
  const road = c.createLinearGradient(0, r.ground - 20, 0, H);
  road.addColorStop(0, night ? '#9daaa5' : forest ? '#e8d5a5' : '#f6deb1');
  road.addColorStop(.25, night ? '#728a8e' : forest ? '#c2ab79' : '#d6b582');
  road.addColorStop(1, night ? '#344e60' : forest ? '#796d4b' : '#ae8b5f');
  r.path(filled(0), r.lightingEnabled === false ? p.road : road);
  r.line(points.map(([x, y]) => [x, y + 3]), night ? '#b8c9bd' : '#fff0ca', 4);
  r.line(points.map(([x, y]) => [x, y + 10]), night ? '#506c70' : '#ae946b', 2);
  // Sediment seams follow the rolling ground, rather than screen-horizontal bands.
  c.save(); c.globalAlpha = .18;
  for (let k = 0; k < 3; k++) r.line(points.map(([x, y]) => [x, y + 56 + k * 53 + Math.sin((x + s.cameraX) / 155 + k) * 8]), night ? '#c4d3c5' : '#fff1ca', k ? 1.2 : 2);
  c.restore();
  const stride = r.reducedEffects ? 140 : 75, first = Math.floor(s.cameraX / stride);
  for (let i = first - 1; i < first + W / stride + 2; i++) {
    const wx = i * stride, x = wx - s.cameraX, y = s.terrain(wx) + r.offsetY;
    c.save(); c.globalAlpha = .32;
    r.line([[x + 5, y + 34], [x + 28, y + 34]], night ? '#c7d5c9' : '#fff7db', 2);
    for (let j = 0; j < (r.reducedEffects ? 2 : 5); j++) {
      const px = x + noise(i * 7 + j) * stride, py = y + 62 + noise(i * 11 + j) * 210;
      r.ellipse(px, py + 1.5, 2.8, 1.2, night ? '#294759' : '#6a7150');
      r.ellipse(px, py, 2.5, 1, night ? '#a4bbb2' : '#fae3b4');
    }
    c.restore();
    if (i % 3 === 0) {
      groundShadow(r, x, y - 3, 12, 12, .45);
      for (let j = 0; j < 3; j++) r.curve([x, y - 6], [[x + (j - 1) * 5, y - 13, x + (j - 1) * 7, y - 19 - j * 3]], j === 2 ? '#a0b982' : '#477657', 2);
    }
  }
  for (let i = Math.floor(s.cameraX / 800); i < (s.cameraX + W) / 800 + 1; i++) {
    const wx = i * 800, x = wx - s.cameraX, y = s.terrain(wx) + r.offsetY - 8;
    if (r.lightingEnabled !== false) {
      c.save(); c.globalAlpha = .14;
      r.path([[x - 4, y], [x + 4, y], [x - 35, y + 8], [x - 41, y + 7]], '#25423f'); c.restore();
    }
    r.path([[x - 4, y], [x + 4, y], [x + 4, y - 51], [x - 4, y - 51]], surfaceGradient(r, x, y, 51, ['#fff5d9', '#c4cdbb', '#738e84']));
    r.line([[x + 3, y - 38], [x + 3, y - 47]], '#eeaf6b', 4);
    r.ellipse(x, y - 51, 4.6, 2.3, '#ffebbd');
  }
}

export function drawSolidObject(r, o) {
  const { ctx: c, s } = r, night = s.biome === 2;
  if (!['rock', 'crate', 'log', 'ramp'].includes(o.type)) return false;
  const x = o.x - s.cameraX, y = o.y + r.offsetY;
  if (o.collected || x < -160 || x > r.viewWidth + 160) return true;
  groundShadow(r, x - 7, y, (o.w || 44) * .65, 14, 1.1);
  c.save(); c.translate(x, y);
  if (o.type === 'rock') {
    r.path([[-25, 0], [-23, -18], [-9, -33], [12, -30], [25, -12], [27, 0]], surfaceGradient(r, 0, 0, 32, night ? ['#bac9c7','#738b93','#3e5666'] : ['#d4d1b4','#879b91','#4f6a69']), '#526b68', 1);
    r.path([[-23, -18], [-9, -33], [3, -14], [-3, -1], [-25, 0]], night ? '#547082' : '#6b837c');
    r.path([[-9, -33], [12, -30], [25, -12], [3, -14]], night ? '#bcccca' : '#c4cbb2');
    r.line([[3, -14], [12, -30]], night ? '#d0ded5' : '#f0e8c4', 1.4);
    r.line([[-20, -9], [-9, -14], [-5, -24]], '#536f6b', .9);
    if (!r.reducedEffects) for (let j=0;j<5;j++) r.ellipse(-10+noise(j+o.x)*23,-4-noise(j+51)*17,1,.7,night?'#99b1b1':'#b4bca3');
  } else if (o.type === 'crate') {
    r.path([[-22, 0], [22, 0], [22, -47], [-22, -47]], surfaceGradient(r, 0, 0, 47, ['#e3bb7c','#b48350','#785537']), '#674c36', 1.5);
    r.path([[-22, -47], [14, -50], [22, -47], [-14, -44]], '#f5d79c');
    r.path([[16, -45], [22, -47], [22, 0], [16, -3]], '#deb57c');
    for (let j = 1; j < 4; j++) {
      r.line([[-20, -j*11], [15, -j*11]], '#795637', 1.3);
      if (!r.reducedEffects) r.curve([-17,-j*11+5],[[0,-j*11+2,5,-j*11+7,12,-j*11+4]],'#c7975d',.7);
    }
    r.line([[-18, -41], [12, -5]], '#705134', 7);
    r.line([[-18, -42], [13, -7]], '#eac88e', 5);
    r.line([[-17, -5], [13, -41]], '#e0b777', 5);
    for (const [nx, ny] of [[-17,-41],[13,-41],[-17,-5],[13,-7]]) { r.ellipse(nx,ny,1.8,1.8,'#4c5e58'); r.ellipse(nx+.5,ny-.5,.6,.6,'#d6e2cf'); }
  } else if (o.type === 'log') {
    const w=o.w||70,h=o.h||38;
    r.path([[-w/2,0],[w/2-8,0],[w/2-8,-h],[-w/2,-h]],surfaceGradient(r,0,0,h,['#c29a61','#8d653e','#503c2b']));
    for(let j=0;j<4;j++) r.curve([-w/2+3,-5-j*8],[[0,-8-j*8,w/2-15,-5-j*8]],j%2?'#4d3b2b':'#c19762',j%2?1:1.7);
    r.ellipse(w/2-8,-h/2,12,h/2,surfaceGradient(r,w/2-8,0,h,['#f4d59b','#c4975d','#95653c']));
    for(let j=1;j<4;j++){c.beginPath();c.ellipse(w/2-7,-h/2,j*2.3,j*4.3,0,0,TAU);c.strokeStyle='#997447';c.lineWidth=1;c.stroke();}
    r.line([[w/2-8,-h/2],[w/2-4,-h+4]],'#896340',1);
    r.path([[-22,-h],[-16,-h-3],[-4,-h-2],[6,-h],[-2,-h+4],[-17,-h+3]],'#64845a');
    r.line([[-19,-h],[-8,-h-1]],'#a6b477',1.3);
  } else {
    r.path([[-49,0],[43,-38],[43,0]],surfaceGradient(r,0,0,38,['#d9b67c','#b68852','#6b523a']),'#73583d',1.5);
    r.path([[-49,-2],[43,-41],[43,-36],[-39,0]],'#f3d7a5');
    for(let j=0;j<4;j++){const xx=-29+j*20,yy=-10-j*8.5;r.line([[xx,yy],[xx+2,yy+3]],'#7b6246',1.2);}
    r.line([[-18,-2],[-18,-12]],'#72593e',3);r.line([[15,-2],[15,-27]],'#72593e',3);
    r.line([[-14,-1],[38,-28]],'#ead0a0',3);
    r.ellipse(16,-22,1.5,1.5,'#53645c');
  }
  c.restore(); return true;
}
