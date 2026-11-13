// Original layered Canvas island scenery. All shading is analytical 2D painting;
// the specular water ribbons and lighthouse beam are stylised, not ray tracing.
const TAU = Math.PI * 2;
const noise = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return v - Math.floor(v); };
const wrap = (n, span) => ((n % span) + span) % span;
const THEMES = [
  { sky: '#badbd9', horizon: '#fff2d3', high: '#edf7ee', waterTop: '#a3dacc', water: '#4aafa7', waterDeep: '#238d90', haze: '#c8ddd1', far: '#a2c3b1', mid: '#72a894', rock: '#8e9c82', rockDark: '#5a7a6e', rockLight: '#c3bea0', grass: '#61937b', leaf: '#447d64', leafLight: '#8cb17b', bark: '#9f825e', glow: '#ffe4a1' },
  { sky: '#c3ddcf', horizon: '#f6edc9', high: '#f1f5d9', waterTop: '#9ccdb3', water: '#4a9c87', waterDeep: '#297a73', haze: '#c4d8b8', far: '#9ab89a', mid: '#648e74', rock: '#82977a', rockDark: '#496f5e', rockLight: '#b1b58d', grass: '#508766', leaf: '#346c52', leafLight: '#8ba763', bark: '#7e7351', glow: '#f4e6a6' },
  { sky: '#102b43', horizon: '#809697', high: '#496475', waterTop: '#719b9d', water: '#396f83', waterDeep: '#204c67', haze: '#809a9c', far: '#557c86', mid: '#355e6b', rock: '#526b70', rockDark: '#294b58', rockLight: '#82968f', grass: '#365f5c', leaf: '#294e4d', leafLight: '#6b8a76', bark: '#506568', glow: '#dbeddd' }
];

function linear(r, x0, y0, x1, y1, stops, base) {
  if (r.lightingEnabled === false) return base || stops[Math.floor(stops.length / 2)][1];
  const g = r.ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [at, color] of stops) g.addColorStop(at, color);
  return g;
}
function radial(r, x, y, radius, stops, base) {
  if (r.lightingEnabled === false) return base || stops[0][1];
  const g = r.ctx.createRadialGradient(x, y, 0, x, y, radius);
  for (const [at, color] of stops) g.addColorStop(at, color);
  return g;
}

function cloud(r, x, y, size, theme, night, seed) {
  const c = r.ctx;
  c.save(); c.translate(x, y); c.scale(size, size);
  c.globalAlpha = night ? .19 : .74;
  const cloudFill = linear(r, 0, -45, -20, 12,
    [[0, night ? '#bad0ce' : '#fffdf1'], [.54, night ? '#849eab' : '#f5f4e1'], [1, theme.haze]], night ? '#98afad' : '#f4f4e7');
  r.curve([-103, 4], [[-105, -9, -78, -18, -58, -13], [-63, -41, -20, -51, -1, -31], [12, -66, 64, -54, 62, -26], [87, -28, 101, -14, 96, -4], [134, -3, 124, 12, 93, 13], [45, 20, -58, 20, -103, 4]], null, 1, cloudFill);
  if (r.lightingEnabled !== false && !r.reducedEffects) {
    c.globalAlpha *= .45;
    r.curve([-57, -15], [[-45, -25, -24, -28, -7, -17]], night ? '#d9e2d5' : '#ffffff', 2.2);
    r.curve([7, -33], [[19, -51, 46, -51, 57, -31]], night ? '#d9e2d5' : '#ffffff', 2);
    c.globalAlpha *= .55;
    r.curve([-83, 7], [[-28, 15, 50, 12, 84, 9]], theme.far, 2.5);
  }
  c.restore();
}

function mountain(r, y, layer, theme) {
  const { ctx: c, s, viewWidth: W } = r;
  const parallax = [.025, .065, .11][layer];
  const peaks = [];
  for (let x = -30; x <= W + 30; x += 18) {
    const world = x + s.cameraX * parallax;
    const h = Math.pow(Math.max(0, Math.sin(world / (370 - layer * 45) + layer * 2.1)), 1.8) * (72 + layer * 30);
    peaks.push([x, y - h - Math.sin(world / 97 + layer) * 8]);
  }
  const base = [theme.haze, theme.far, theme.mid][layer];
  r.path([...peaks, [W + 30, y + 80], [-30, y + 80]], linear(r, 0, y - 130, 0, y + 50, [[0, base], [1, theme.haze]], base));
  if (layer === 2 && r.lightingEnabled !== false) {
    c.save(); c.globalAlpha = .16;
    r.line(peaks, theme.high, 2); c.restore();
  }
}

function lighthouse(r, x, y, scale, night, theme) {
  const c = r.ctx;
  c.save(); c.translate(x, y); c.scale(scale, scale);
  // Polygon foundation, steps and the rounded masonry body are separate masses.
  r.path([[-40, 4], [-31, -8], [32, -8], [44, 5], [37, 12], [-38, 12]], night ? '#486168' : '#a3a28b');
  r.path([[-31, -8], [32, -8], [38, 3], [-37, 3]], night ? '#73878a' : '#d8d0b0');
  const body = linear(r, -33, 0, 28, -10, [[0, night ? '#617c83' : '#9ca996'], [.25, night ? '#a4b9b5' : '#e7e7d1'], [.76, night ? '#d4ddd0' : '#fff6da'], [1, night ? '#7f999e' : '#c3c8b4']], night ? '#9aafa9' : '#e7e4c9');
  r.path([[-31, 1], [31, 1], [19, -168], [-19, -168]], body);
  r.path([[-25, -55], [25, -55], [22, -96], [-22, -96]], linear(r, -24, -70, 25, -80, [[0, night ? '#5f6268' : '#a76c59'], [.6, night ? '#a39884' : '#eaa383'], [1, night ? '#84959a' : '#c5876a']], night ? '#8b8275' : '#ce8a6d'));
  if (!r.reducedEffects) {
    c.save(); c.globalAlpha = r.lightingEnabled === false ? .1 : .18;
    for (let yy = -142; yy < -9; yy += 17) {
      const ww = 18 + (yy + 168) * .074;
      r.curve([-ww + 3, yy], [[0, yy + 4, ww - 3, yy]], night ? '#c8d3c3' : '#7d8976', .6);
      if (yy > -51 || yy < -103) r.line([[yy % 2 ? -7 : 6, yy], [yy % 2 ? -7 : 6, yy - 12]], night ? '#d5d7c8' : '#b2b198', .6);
    }
    c.restore();
  }
  // Recessed openings with a lit jamb on their right side.
  r.path([[-6, 1], [-6, -24], [-2, -28], [5, -28], [10, -24], [10, 1]], night ? '#273f4d' : '#536c69');
  r.line([[10, -25], [10, 0]], night ? '#bfd2bc' : '#f2eccd', 2);
  r.line([[-5, -2], [9, -2]], night ? '#506a72' : '#9a9f89', 3);
  r.path([[-5, -115], [-5, -131], [6, -131], [6, -115]], '#294e59');
  r.path([[-2, -129], [4, -129], [4, -117], [-2, -117]], night ? '#e7d6a0' : '#86b0ad');
  r.line([[7, -130], [7, -114]], night ? '#b1c5b8' : '#fff1ce', 1.7);
  // Gallery underneath the lantern, sidewalls and a curved railing.
  r.ellipse(0, -165, 30, 7, night ? '#334b59' : '#58716b');
  r.ellipse(0, -169, 30, 5, night ? '#95aca7' : '#dfdfc3');
  r.path([[-20, -171], [-20, -199], [20, -199], [20, -171]], linear(r, -19, -185, 21, -185, [[0, '#254955'], [.5, night ? '#d9c582' : '#9dc1b7'], [1, '#4e7475']], '#688f8c'));
  if (night && r.lightingEnabled !== false) {
    c.save();
    c.globalAlpha = .18 + Math.sin(r.s.time * .65) * .025;
    const reach = 420, swing = Math.sin(r.s.time * .27) * 30;
    r.path([[1, -187], [reach, -254 + swing], [reach, -133 + swing]], linear(r, 1, -187, reach, -187, [[0, '#fff1b5'], [1, '#fff1b500']], 'transparent'));
    c.globalAlpha = .12;
    r.ellipse(1, -185, 45, 32, radial(r, 1, -185, 45, [[0, '#ffe7a8'], [1, '#ffe7a800']], 'transparent'));
    c.restore();
  }
  for (const xx of [-20, -7, 7, 20]) r.line([[xx, -199], [xx, -172]], night ? '#354c59' : '#3e6468', 2.6);
  r.path([[-29, -200], [0, -225], [29, -200]], linear(r, -24, -211, 22, -214, [[0, night ? '#455d64' : '#a96853'], [.7, night ? '#8f9690' : '#df9b77'], [1, night ? '#a8b3a4' : '#f1bc92']], night ? '#718385' : '#c58c70'));
  r.path([[-29, -200], [29, -200], [25, -195], [-25, -195]], night ? '#36515c' : '#657665');
  r.line([[0, -225], [0, -236]], night ? '#779799' : '#687d70', 2);
  r.ellipse(0, -237, 2.5, 2.5, night ? '#adbdac' : '#eed6a5');
  for (let xx = -31; xx <= 31; xx += 10.3) r.line([[xx, -162], [xx, -151]], night ? '#a6bbb4' : '#819487', 1.4);
  r.curve([-32, -163], [[0, -154, 32, -163]], night ? '#b7c9bb' : '#e5e2c6', 2);
  r.curve([-32, -151], [[0, -142, 32, -151]], night ? '#708e8b' : '#667f72', 2);
  c.restore();
}

function house(r, x, y, scale, night, seed) {
  const c = r.ctx;
  c.save(); c.translate(x, y); c.scale(scale, scale);
  r.path([[-23, 0], [19, 0], [32, -7], [32, -39], [-23, -31]], night ? '#789598' : '#eae4c8');
  r.path([[-23, 0], [-23, -31], [19, -31], [19, 0]], linear(r, -23, 0, 19, -24, [[0, night ? '#5f7b83' : '#b8c0a6'], [1, night ? '#a5b9b2' : '#fff3d5']], night ? '#7e9696' : '#e0dcc0'));
  r.path([[19, 0], [32, -7], [32, -39], [19, -31]], night ? '#6e8d90' : '#ced1b6');
  r.path([[-28, -30], [-2, -52], [24, -30]], night ? '#60737a' : '#c08667');
  r.path([[-2, -52], [11, -59], [37, -38], [24, -30]], night ? '#8a9b92' : '#e0a981');
  r.line([[-27, -30], [24, -30], [37, -38]], night ? '#425f68' : '#94775a', 2.5);
  r.path([[18, -45], [18, -57], [24, -59], [24, -43]], night ? '#8da69c' : '#e0d8bb');
  r.path([[-6, 0], [-6, -20], [4, -20], [4, 0]], night ? '#334f5d' : '#708b81');
  r.path([[-17, -22], [-10, -22], [-10, -13], [-17, -13]], night ? '#e4c68b' : '#86aaa2');
  r.path([[9, -22], [16, -22], [16, -13], [9, -13]], night && seed % 2 ? '#e4c68b' : '#668e8a');
  r.line([[-18, -12], [-9, -12]], night ? '#8ea9a2' : '#f7eed1', 1.5);
  r.line([[8, -12], [17, -12]], night ? '#8ea9a2' : '#f7eed1', 1.5);
  c.restore();
}

function palm(r, x, y, scale, theme, seed) {
  const c = r.ctx, t = r.s.time;
  c.save(); c.translate(x, y); c.scale(scale, scale);
  const sway = Math.sin(t * .9 + seed) * 3;
  const trunk = linear(r, -10, -65, 12, -65, [[0, theme.rockDark], [.5, theme.bark], [1, theme.rockLight]], theme.bark);
  r.curve([-6, 2], [[-13, -43, -1, -107, 19 + sway, -150], [24 + sway, -154, 27 + sway, -148, 24 + sway, -144], [8, -90, 4, -38, 6, 2]], null, 1, trunk);
  for (let j = 1; j < 7; j++) {
    const yy = -j * 20, xx = j < 3 ? 0 : (j - 3) * 4;
    r.curve([xx - 5, yy], [[xx + 1, yy + 3, xx + 7, yy - 1]], theme.rockDark, 1.1);
  }
  c.translate(23 + sway, -149);
  for (let i = 0; i < 7; i++) {
    const angle = -.2 + i / 6 * Math.PI * 1.16;
    const xx = Math.cos(angle) * (78 + noise(seed + i) * 22), yy = -Math.sin(angle) * 43 + 22;
    const leaf = linear(r, xx * .35, yy - 32, xx * .6, yy + 14, [[0, theme.leafLight], [.52, theme.leaf], [1, theme.rockDark]], theme.leaf);
    r.curve([0, 0], [[xx * .5, yy - 48, xx, yy - 19, xx, yy + 31], [xx * .62, yy - 3, xx * .35, yy - 4, 0, 0]], null, 1, leaf);
    r.curve([0, 0], [[xx * .6, yy - 29, xx, yy + 24]], r.lightingEnabled === false ? theme.leaf : theme.leafLight, 1);
    if (!r.reducedEffects) for (let vein = 1; vein < 5; vein++) {
      const v = vein / 5;
      r.line([[xx * v, (yy - 16) * v - Math.sin(v * Math.PI) * 17], [xx * (v + .09), yy * v + 4]], theme.rockDark, .7);
    }
  }
  r.ellipse(-1, 5, 6, 8, theme.bark); r.ellipse(8, 6, 6, 8, theme.rockLight);
  c.restore();
}

function forestTree(r, x, y, scale, theme, seed) {
  const c = r.ctx;
  c.save(); c.translate(x, y); c.scale(scale, scale);
  r.curve([-9, 4], [[-7, -47, -1, -118, 7, -158], [13, -119, 11, -43, 10, 4]], null, 1,
    linear(r, -9, -50, 11, -50, [[0, theme.rockDark], [1, theme.bark]], theme.bark));
  r.line([[3, -61], [-31, -102]], theme.bark, 6);
  r.line([[6, -91], [35, -127]], theme.bark, 5);
  const masses = [[-41, -115, 42, 34], [36, -134, 48, 36], [-17, -151, 51, 37], [8, -182, 41, 34], [0, -126, 55, 38]];
  for (let k = 0; k < masses.length; k++) {
    const [xx, yy, rx, ry] = masses[k];
    r.ellipse(xx, yy, rx, ry, linear(r, xx + 22, yy - 30, xx - 19, yy + 27, [[0, theme.leafLight], [.38, theme.leaf], [1, theme.rockDark]], theme.leaf), -.1);
    if (!r.reducedEffects && r.lightingEnabled !== false) {
      c.globalAlpha = .2;
      for (let j = 0; j < 4; j++) {
        const a = j * 1.3 + seed;
        r.ellipse(xx + Math.cos(a) * rx * .55, yy - 10 + Math.sin(a) * ry * .55, 9 + noise(k + j) * 5, 5, theme.leafLight, -.4);
      }
      c.globalAlpha = 1;
    }
  }
  c.restore();
}

export function drawIslandBackground(r) {
  const { ctx: c, s, viewWidth: W, viewHeight: H } = r;
  const night = s.biome === 2, forest = s.biome === 1, theme = THEMES[s.biome] || THEMES[0];
  const light = r.lightingEnabled !== false, horizon = H * .53, sx = W * .77, sy = H * .23;
  c.save();
  c.fillStyle = linear(r, 0, 0, 0, horizon + 40, [[0, theme.sky], [.65, theme.high], [1, theme.horizon]], theme.sky);
  c.fillRect(0, 0, W, H);
  if (light) {
    c.fillStyle = radial(r, sx, sy, 310, [[0, night ? '#e5f3d32b' : '#fff7ce70'], [.3, night ? '#d3e8cf12' : '#fff7ce38'], [1, '#fff2cd00']], 'transparent');
    c.fillRect(sx - 310, sy - 310, 620, 620);
  }
  if (night) {
    for (let i = 0; i < (r.reducedEffects ? 35 : 68); i++) {
      c.globalAlpha = .32 + (Math.sin(s.time * 1.1 + i) + 1) * .15;
      r.ellipse(noise(i + 441) * W, noise(i + 500) * horizon * .83, i % 7 ? 1 : 1.7, i % 7 ? 1 : 1.7, '#edf3d9');
    }
    c.globalAlpha = 1;
    r.ellipse(sx, sy, 53, 53, linear(r, sx + 38, sy - 40, sx - 35, sy + 35, [[0, '#f2f2cf'], [1, '#a8c2b7']], '#dce4c3'));
    if (!r.reducedEffects) {
      c.globalAlpha = .13;
      for (const [xx, yy, rr] of [[-22, 15, 12], [15, -20, 9], [25, 13, 7], [-13, -25, 6]]) r.ellipse(sx + xx, sy + yy, rr, rr * .8, '#5b8895');
      c.globalAlpha = 1;
    }
  } else r.ellipse(sx, sy, 60, 60, linear(r, sx, sy - 60, sx, sy + 60, [[0, '#fff0b2'], [1, '#f1c976']], '#f4d38b'));
  const cloudCount = r.reducedEffects ? 4 : 6;
  for (let i = 0; i < cloudCount; i++) {
    const x = wrap(i * 360 - s.cameraX * .035 + s.time * 2.2, W + 420) - 210;
    cloud(r, x, H * (.17 + noise(i + 43) * .2), .65 + noise(i + 2) * .65, theme, night, i);
  }
  mountain(r, horizon - 35, 0, theme);
  mountain(r, horizon - 5, 1, theme);
  mountain(r, horizon + 28, 2, theme);
  // Water is drawn below the distance silhouettes. Fine near-horizon ripples
  // broaden towards the viewer, keeping perspective and reflections legible.
  c.fillStyle = linear(r, 0, horizon, 0, r.ground + 70, [[0, theme.waterTop], [.33, theme.water], [1, theme.waterDeep]], theme.water);
  c.fillRect(0, horizon, W, Math.max(1, r.ground + 90 - horizon));
  if (light) {
    // A low-energy oval sheen avoids a hard triangular cone on the water.
    const sheenRadiusY = Math.max(1, (r.ground - horizon) * .46);
    c.save(); c.translate(sx, horizon + sheenRadiusY); c.scale(1, sheenRadiusY / 170);
    c.globalAlpha = .12;
    r.ellipse(0, 0, 170, 170, radial(r, 0, 0, 170,
      [[0, night ? '#d5e4c3' : '#fff1bf'], [.4, night ? '#d5e4c350' : '#fff1bf50'], [1, '#fff1bf00']], 'transparent'));
    c.restore();
    const ribbons = r.reducedEffects ? 15 : 30;
    for (let i = 0; i < ribbons; i++) {
      const v = i / ribbons, y = horizon + 5 + Math.pow(v, 1.5) * (r.ground - horizon + 10);
      const spread = 10 + v * 100, x = sx + (noise(i + 50) - .5) * spread * 1.5 + Math.sin(s.time * .75 + i) * 4;
      c.globalAlpha = (.18 + noise(i + 27) * .3) * (1 - v * .55);
      r.ellipse(x, y, 6 + noise(i + 35) * spread, .7 + v * 1.4, theme.glow);
    }
    c.globalAlpha = 1;
  }
  const rows = r.reducedEffects ? 9 : 15, cols = r.reducedEffects ? 8 : 12;
  for (let row = 0; row < rows; row++) {
    const depth = (row + 1) / (rows + 1), yy = horizon + 3 + Math.pow(depth, 1.3) * (r.ground - horizon + 15);
    for (let col = 0; col < cols; col++) {
      const seed = row * 17 + col, len = 12 + depth * 46;
      const x = wrap(col * (W + 200) / cols + noise(seed) * 80 - s.cameraX * (.10 + depth * .06) + s.time * (row % 2 ? 4 : -4), W + 200) - 100;
      c.globalAlpha = (light ? .12 : .08) + noise(seed + 13) * .13;
      r.curve([x, yy], [[x + len * .3, yy - 1.8, x + len * .7, yy + 1.4, x + len, yy]], row % 4 === 0 ? theme.waterDeep : theme.high, .6 + depth * 1.4);
    }
  }
  c.globalAlpha = 1;
  // Layered rocky island: separate ochre cliff, shadow facets and grassy crest.
  const islandX = wrap(W * .86 - s.cameraX * .18, W + 850) - 110;
  const iy = horizon + 60;
  const crest = [[islandX - 174, iy + 13], [islandX - 127, iy - 23], [islandX - 69, iy - 34], [islandX - 32, iy - 45], [islandX + 50, iy - 33], [islandX + 114, iy - 19], [islandX + 173, iy + 18]];
  if (light) {
    // Broken, low contrast fragments indicate reflection on moving water.
    c.save(); c.globalAlpha = .12;
    for (let i = 0; i < 5; i++) {
      const y = iy + 37 + i * 5, span = 135 - i * 14;
      r.line([[islandX - span + Math.sin(s.time + i) * 6, y], [islandX - 12, y]], theme.rockDark, 2.2 - i * .2);
      r.line([[islandX + 6, y + 1], [islandX + span + Math.cos(s.time + i) * 5, y + 1]], theme.rockDark, 2.2 - i * .2);
    }
    c.restore();
  }
  r.path([...crest, [islandX + 142, iy + 31], [islandX - 141, iy + 26]], linear(r, islandX + 100, iy - 40, islandX - 120, iy + 35, [[0, theme.rockLight], [.4, theme.rock], [1, theme.rockDark]], theme.rock));
  r.path([[islandX - 127, iy - 23], [islandX - 69, iy - 34], [islandX - 78, iy + 19], [islandX - 141, iy + 26], [islandX - 174, iy + 13]], theme.rockDark);
  r.path([[islandX - 69, iy - 34], [islandX - 32, iy - 45], [islandX - 14, iy + 19], [islandX - 78, iy + 19]], theme.rock);
  r.path([[islandX + 50, iy - 33], [islandX + 114, iy - 19], [islandX + 92, iy + 25], [islandX + 34, iy + 22]], theme.rockLight);
  r.path([...crest, [islandX + 119, iy - 7], [islandX + 48, iy - 17], [islandX - 24, iy - 27], [islandX - 69, iy - 19], [islandX - 127, iy - 10]], linear(r, 0, iy - 45, 0, iy + 5, [[0, theme.leafLight], [1, theme.grass]], theme.grass));
  if (!r.reducedEffects) {
    c.save(); c.globalAlpha = .32;
    for (let i = 0; i < 8; i++) {
      const xx = islandX - 130 + i * 34;
      r.line([[xx, iy + noise(i) * 10], [xx - 6, iy + 15 + noise(i + 3) * 9]], theme.rockDark, 1);
    }
    c.restore();
  }
  c.save(); c.globalAlpha = .45;
  r.curve([islandX - 168, iy + 29], [[islandX - 67, iy + 36, islandX + 83, iy + 38, islandX + 171, iy + 28]], theme.high, 2);
  c.restore();
  house(r, islandX - 101, iy - 18, .69, night, 0);
  house(r, islandX + 89, iy - 12, .8, night, 1);
  lighthouse(r, islandX + 2, iy - 29, .8, night, theme);
  house(r, islandX - 49, iy - 22, .56, night, 2);
  // Curved hull and filled sails retain material volume at tiny viewing sizes.
  const bx = wrap(W * .35 - s.cameraX * .09, W + 250) - 100, by = horizon + 79 + Math.sin(s.time * .8) * 1.4;
  c.save(); c.translate(bx, by);
  if (light) { c.globalAlpha = .15; r.ellipse(-3, 12, 37, 3, theme.rockDark); c.globalAlpha = 1; }
  r.curve([-25, 0], [[0, 5, 24, 0], [17, 12, -13, 14, -25, 0]], '#5f756a', 1, linear(r, 0, 0, 0, 14, [[0, night ? '#b3c5b4' : '#cfa576'], [1, night ? '#355b6b' : '#725b47']], night ? '#80968a' : '#a38d68'));
  r.line([[0, 1], [0, -67]], night ? '#8ba9a6' : '#7b8271', 1.8);
  r.curve([-3, -64], [[-17, -43, -28, -15, -34, -7], [-22, -4, -11, -5, -3, -7]], null, 1, linear(r, -30, -24, -4, -24, [[0, night ? '#7f9eaa' : '#c3d5c1'], [1, night ? '#cad8cc' : '#fff4d9']], night ? '#a2b9b9' : '#ecedd2'));
  r.curve([3, -49], [[8, -33, 19, -19, 26, -7], [18, -4, 8, -4, 3, -6]], null, 1, linear(r, 3, -35, 25, -8, [[0, night ? '#b6b9a0' : '#f1c58f'], [1, night ? '#7a989b' : '#c79467']], night ? '#95a5a0' : '#dcb285'));
  r.line([[-31, -7], [-3, -61]], night ? '#c8d4bb' : '#fff1cf', .7); c.restore();
  for (let i = 0; i < 5; i++) {
    const x = wrap(W * .48 + i * 90 + s.time * 6, W + 80), y = H * .31 + Math.sin(i * 4) * 28;
    const flap = Math.sin(s.time * 2.6 + i) * 4;
    r.curve([x - 10, y + flap], [[x - 4, y - 6, x, y], [x + 5, y - 6, x + 10, y + flap]], night ? '#acbdb4' : '#7d9990', 1.4);
  }
  // Foreground plants remain behind the road and hazards. Stable world seeds
  // prevent tree proportions from changing as the camera crosses a tile.
  const spacing = forest ? 215 : 650, scroll = s.cameraX * (forest ? .29 : .35);
  const first = Math.floor(scroll / spacing) - 1;
  for (let i = first; i < first + W / spacing + 3; i++) {
    const x = i * spacing - scroll, scale = forest ? .68 + noise(i + 900) * .2 : .74 + noise(i + 900) * .24;
    if (forest) forestTree(r, x, r.ground - 9, scale, theme, i);
    else palm(r, x, r.ground + 19, scale, theme, i);
  }
  c.restore();
}
