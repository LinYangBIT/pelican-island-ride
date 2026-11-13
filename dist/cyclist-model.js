// Original layered Canvas model. All surfaces share an upper-right key light;
// transparent wheel interiors, articulated feet and feathers remain real paths.
const TAU = Math.PI * 2;

export function drawCyclist(r) {
  const { ctx: c, s } = r, p = s.player;
  const menu = s.mode === 'menu', night = s.biome === 2;
  const lit = r.lightingEnabled !== false;
  const detail = !r.reducedEffects;
  const size = menu ? (r.viewWidth < 900 ? 1.6 : 1.85) : .86;
  const x = p.x - s.cameraX, y = p.y + r.offsetY;
  const turn = p.x / 30, pedal = p.x / 24;
  const cool = night ? '#aac7d2' : '#fff4cc';
  const dark = night ? '#233f53' : '#274f4a';
  const featherBase = night ? '#bbd1d3' : '#f5f1de';

  // A simple diffuse-only switch is useful for fixed-camera lighting comparisons.
  const shade = (base, stops, coords) => {
    if (!lit) return base;
    const g = c.createLinearGradient(...coords);
    stops.forEach(([at, color]) => g.addColorStop(at, color));
    return g;
  };
  const ring = (xx, yy, radius, color, width) => {
    c.beginPath(); c.arc(xx, yy, radius, 0, TAU);
    c.strokeStyle = color; c.lineWidth = width; c.stroke();
  };
  const arc = (xx, yy, radius, from, to, color, width) => {
    c.beginPath(); c.arc(xx, yy, radius, from, to);
    c.strokeStyle = color; c.lineWidth = width; c.stroke();
  };
  const tube = (points, width, base = '#3a938a') => {
    r.line(points, night ? '#244554' : '#255952', width + 2.4);
    r.line(points, shade(base, [[0, night ? '#9dd0d4' : '#b9e4cf'], [.26, night ? '#5d9da8' : '#6cb9a2'], [.61, base], [1, night ? '#254c60' : '#256659']], [42, -100, -20, -22]), width);
    if (lit) r.line(points.map(([xx, yy]) => [xx + .65, yy - 1]), night ? '#a1d6db' : '#c7ead5', Math.max(.8, width * .15));
  };
  const feather = (xx, yy, length, angle, color, stroke) => {
    c.save(); c.translate(xx, yy); c.rotate(angle);
    r.curve([0, 0], [[length * .3, -4.5, length * .77, -4.3, length, 0], [length * .8, 4.3, length * .25, 5, 0, 0]], stroke, .65, color);
    if (detail && lit) r.curve([3, -.5], [[length * .5, -1.2, length - 3, 0]], night ? '#cde4df' : '#fffdf0', .6);
    c.restore();
  };

  c.save(); c.translate(x, y); c.rotate(p.rotation || 0); c.scale(size, size);
  if (p.invincible > 0 && Math.floor(s.time * 12) % 2 === 0) c.globalAlpha = .56;
  if (p.shield > 0) {
    c.save();
    const a = c.globalAlpha;
    c.globalAlpha = a * .11; r.ellipse(12, -105, 126, 128, '#c1fff1');
    c.globalAlpha = a * .72;
    c.beginPath(); c.ellipse(12, -105, 126, 128, 0, 0, TAU); c.strokeStyle = '#b5f5e3'; c.lineWidth = 1.6; c.stroke();
    c.globalAlpha = a * .8;
    r.curve([96, -199], [[130, -168, 141, -132, 134, -98]], '#eafff5', 2.2);
    c.restore();
  }
  if (p.boosting && detail) {
    c.save(); c.globalAlpha *= .65;
    for (let i = 0; i < 5; i++) {
      const yy = -31 - i * 29;
      r.line([[-100 - i * 4, yy], [-158 - Math.sin(s.time * 12 + i) * 18, yy + 2]], night ? '#a6dded' : '#fff8d7', 1.5);
    }
    c.restore();
  }

  // Wire spokes leave the scenery visible. Dark sidewall, cream casing and a
  // narrow anodised rim read differently even at the smaller gameplay scale.
  for (const wx of [-53, 55]) {
    ring(wx, -31, 28, shade('#324e4b', [[0, '#5d7770'], [.4, '#344e4b'], [1, '#172e30']], [wx + 23, -57, wx - 20, -6]), 6);
    ring(wx, -31, 25.6, night ? '#a4b6ae' : '#d5c7a0', 2.1);
    ring(wx, -31, 24, shade('#b2c2b2', [[0, '#fbf8df'], [.4, '#b4d3c5'], [.6, '#648d86'], [1, '#b6bda3']], [wx + 22, -52, wx - 20, -10]), 2.4);
    if (lit) arc(wx, -31, 28.5, -2.0, -.13, night ? '#87a6af' : '#8caaa0', .8);
    const spokes = detail ? 16 : 10;
    for (let j = 0; j < spokes; j++) {
      const a = turn + j * TAU / spokes;
      const offset = j % 2 ? 2.1 : -2.1;
      r.line([[wx + offset, -31], [wx + Math.cos(a) * 22.5, -31 + Math.sin(a) * 22.5]], night ? '#9ab6bc' : '#ced9c7', .75);
      if (detail) {
        const outer = turn + j * TAU / spokes;
        r.line([[wx + Math.cos(outer) * 29.6, -31 + Math.sin(outer) * 29.6], [wx + Math.cos(outer + .045) * 30.1, -31 + Math.sin(outer + .045) * 30.1]], '#173a38', .7);
      }
    }
    r.ellipse(wx, -31, 4.8, 4.8, '#254a49');
    r.ellipse(wx + .5, -31.8, 3, 3, night ? '#bbd4d2' : '#e5e1c3');
    r.ellipse(wx + .6, -31.6, 1.1, 1.1, '#406960');
    // Thin wooden fenders, mounting stays, and a rear safety reflector.
    r.curve([wx - 29, -43], [[wx - 19, -72, wx + 23, -71, wx + 29, -40]], '#604b37', 4.3);
    r.curve([wx - 29, -43], [[wx - 19, -72, wx + 23, -71, wx + 29, -40]], shade('#c58e52', [[0, '#f6d49a'], [1, '#986b44']], [wx + 21, -66, wx - 20, -40]), 2.5);
    r.line([[wx, -31], [wx - 23, -50]], '#718b7d', 1);
    if (wx < 0) r.line([[wx - 29, -44], [wx - 28, -48]], '#d26b4e', 2.5);
  }

  const farX = 4 - Math.cos(pedal) * 17, farY = -32 - Math.sin(pedal) * 17;
  r.line([[-22, -102], [-31, -70], [farX, farY - 3]], night ? '#846e50' : '#ad7d42', 6);
  r.line([[farX - 7, farY], [farX + 9, farY]], '#696e59', 3.5);

  // The chain is behind the near crank and the frame tubes. Small join collars
  // and chrome highlights explain assembly rather than relying on outline alone.
  r.curve([-52, -36], [[-30, -40, -3, -45, 8, -42], [23, -38, 16, -21, 4, -22], [-18, -23, -39, -25, -55, -27], [-61, -29, -59, -35, -52, -36]], '#4d665b', 2);
  if (detail) r.curve([-52, -35], [[-28, -37, -5, -43, 8, -40]], '#aab8a1', .8);
  tube([[-53, -31], [-24, -82], [4, -32], [-53, -31]], 4.4, '#38877c');
  tube([[-24, -82], [35, -84]], 5.7);
  tube([[4, -32], [35, -84]], 5.7);
  tube([[35, -84], [55, -31]], 4.8, '#408d80');
  r.line([[32, -91], [53, -31]], '#355c58', 2);
  for (const [xx, yy] of [[-24, -82], [35, -84], [4, -32]]) {
    r.ellipse(xx, yy, 4.2, 3, night ? '#44838e' : '#65a88f', -.2);
    if (lit) r.curve([xx - 2, yy - 1], [[xx, yy - 3, xx + 3, yy - 1]], '#c7e5ce', .8);
  }
  if (detail) {
    r.line([[-10, -80], [7, -81]], '#ecdfae', 1.2);
    r.ellipse(11, -82, 1.2, 1.2, '#f1d295');
    r.line([[-19, -72], [-15, -63]], '#c4d1bd', 1);
  }
  // Seat post, leather saddle with lower padding, stem and wrapped handlebars.
  r.line([[-24, -82], [-27, -95]], '#355d5b', 4.4);
  if (lit) r.line([[-23, -84], [-26, -94]], '#d7e0c6', 1.1);
  r.curve([-44, -97], [[-32, -103, -23, -99, -13, -97], [-11, -93, -31, -91, -43, -94]], '#573e2d', 1.3, shade('#955e38', [[0, '#d9ab6f'], [.4, '#9d6e46'], [1, '#61432e']], [-15, -103, -40, -91]));
  if (detail) r.line([[-40, -96], [-20, -95]], '#e4bd87', .65);
  r.line([[35, -85], [29, -102], [40, -108], [49, -105], [48, -98]], '#234b4c', 5);
  r.line([[35, -85], [29, -102], [40, -108], [49, -105], [48, -98]], shade('#7eaaa0', [[0, '#f2ecd0'], [.35, '#8db5a7'], [1, '#3b6d69']], [48, -111, 28, -85]), 2.8);
  r.line([[44, -108], [50, -105]], '#684c36', 5);
  r.curve([43, -103], [[66, -92, 39, -77, 49, -50]], '#426761', 1);
  r.ellipse(43, -110, 3.5, 2.3, night ? '#9fb8b5' : '#efe1ac');

  ring(4, -32, 9.7, '#2e5c54', 3);
  ring(4, -32, 6.4, night ? '#9bb6b8' : '#c9d0ad', 2);
  if (detail) {
    for (let j = 0; j < 5; j++) {
      const a = pedal + j * TAU / 5;
      r.line([[4, -32], [4 + Math.cos(a) * 8.3, -32 + Math.sin(a) * 8.3]], '#567d6a', 1.3);
    }
  }
  const footX = 4 + Math.cos(pedal) * 17, footY = -32 + Math.sin(pedal) * 17;
  r.line([[4, -32], [footX, footY]], '#405f57', 4);
  if (lit) r.line([[5, -33], [footX + 1, footY - 1]], '#d5dcc1', 1.2);
  r.line([[footX - 9, footY + 2], [footX + 10, footY + 2]], '#274a47', 4);
  r.line([[footX - 7, footY + .5], [footX + 8, footY + .5]], '#a4b5a0', 1.2);
  r.line([[-18, -101], [8, -72], [footX, footY - 4]], shade('#d99b4f', [[0, '#ffdc8d'], [.55, '#ddaa5b'], [1, '#976b3a']], [15, -106, -19, -37]), 7);
  r.ellipse(8, -72, 3.4, 4, night ? '#b6a072' : '#e9b768');
  r.path([[footX - 3, footY - 7], [footX + 1, footY - 3], [footX + 11, footY - 1], [footX + 7, footY + 1], [footX - 7, footY]], night ? '#c4a36d' : '#edbb65', '#986d3d', .6);
  if (detail) r.line([[footX, footY - 2], [footX + 7, footY]], '#f9d38d', .7);

  // Tail feathers sit behind a sculpted pear-shaped torso and curved neck.
  const plumage = shade(featherBase, [[0, night ? '#e6f1df' : '#fffef0'], [.27, night ? '#d8e4df' : '#fff9e8'], [.6, night ? '#aac6ce' : '#e5e5cf'], [1, night ? '#6c93a5' : '#a6bdb0']], [37, -204, -68, -108]);
  r.curve([-50, -125], [[-66, -136, -72, -133, -84, -136], [-76, -119, -63, -109, -42, -109]], '#9db3a6', 1, shade(featherBase, [[0, '#fcf8e6'], [1, night ? '#819fac' : '#b6c6b5']], [-53, -137, -73, -109]));
  r.curve([-25, -96], [[-66, -104, -73, -142, -51, -160], [-34, -182, -7, -155, 3, -151], [14, -144, 14, -166, 5, -180], [-6, -196, -2, -217, 18, -219], [46, -220, 48, -190, 38, -175], [29, -159, 35, -136, 18, -114], [5, -97, -12, -91, -25, -96]], night ? '#789ba8' : '#a6bcaa', .8, plumage);
  if (lit) {
    // Broad form shadow follows the neck; a narrow edge carries the key light.
    r.curve([9, -196], [[1, -179, 25, -153, 5, -124], [-6, -107, -26, -105, -44, -116]], night ? '#90afb8' : '#d3d9bf', 6);
    r.curve([37, -193], [[37, -178, 28, -162, 30, -150]], night ? '#e5f0db' : '#fffef1', 2.2);
    r.curve([-49, -157], [[-38, -165, -25, -161, -15, -155]], night ? '#dce9df' : '#fffef4', 2);
    r.curve([-48, -111], [[-31, -96, -8, -95, 7, -106]], night ? '#789da8' : '#b8c7b3', 2);
  }
  if (detail) {
    for (let j = 0; j < 5; j++) {
      const yy = -133 + j * 5;
      r.curve([-8 - j, yy], [[-1 - j, yy + 4, 5 - j, yy]], night ? '#b1cbd0' : '#ecebd7', .65);
    }
  }

  // Woven coral scarf: a dark underside, rounded knot, folded collar and seams.
  const flutter = Math.sin(s.time * 7) * (r.reducedEffects ? 1.4 : 4);
  r.curve([4, -167], [[-13, -174, -31, -184 + flutter, -49, -185 + flutter], [-57, -180 + flutter, -60, -177 + flutter, -66, -174 + flutter], [-45, -175 + flutter, -25, -160, -5, -160]], '#9f5949', .8, shade('#dc775d', [[0, '#ffd59a'], [.38, '#e78c69'], [1, night ? '#8a5860' : '#af5b4b']], [-14, -185, -27, -157]));
  r.curve([-27, -177], [[-36, -175, -48, -177 + flutter, -59, -175 + flutter]], night ? '#bf8481' : '#f6ac81', 1.1);
  r.path([[-65, -174 + flutter], [-49, -181 + flutter], [-45, -173 + flutter]], night ? '#965f66' : '#a95043');
  r.curve([1, -170], [[8, -167, 19, -167, 27, -170], [26, -165, 25, -160, 23, -156], [12, -153, 5, -155, 0, -159]], '#ac6652', .6, shade('#e18a66', [[0, '#ffd9a3'], [.35, '#eda578'], [1, '#bc6655']], [19, -171, 1, -155]));
  r.ellipse(2, -163, 5, 6, night ? '#c38777' : '#e7a071', -.25);
  if (detail) {
    r.curve([8, -160], [[15, -158, 20, -159]], '#f5c08b', .75);
    for (let i = 0; i < 4; i++) r.line([[8 + i * 4, -166], [8 + i * 4, -164.5]], '#f7c998', .6);
  }

  // Layered flight feathers are individual tapered shapes. In flight, the
  // primary feathers open into a scalloped silhouette instead of a flat triangle.
  const wingShade = shade(featherBase, [[0, night ? '#e5f2df' : '#fffdf0'], [.48, night ? '#b8d1d5' : '#e9ead5'], [1, night ? '#7399aa' : '#a2b9aa']], [-19, -162, -66, -115]);
  if (!p.grounded) {
    r.curve([-31, -146], [[-70, -186, -117, -215, -153, -207], [-155, -204, -156, -202, -153, -201], [-126, -180, -94, -154, -62, -135], [-45, -123, -29, -130, -31, -146]], night ? '#82a6b2' : '#a9bdac', 1, wingShade);
    const count = detail ? 7 : 5;
    for (let i = count - 1; i >= 0; i--) {
      const t = i / (count - 1);
      feather(-53 - t * 62, -153 - t * 41, 33 + t * 13, -2.75 + t * .10, shade(featherBase, [[0, night ? '#bcd5d4' : '#f2f0dc'], [.5, night ? '#d2e5dc' : '#fffcea'], [1, night ? '#799eaf' : '#b0c0aa']], [-30, -190, -140, -150]), night ? '#789fae' : '#b2c2af');
    }
    r.curve([-34, -148], [[-69, -183, -112, -205, -147, -206]], night ? '#e0efe0' : '#fffdee', 2);
  } else {
    r.curve([-50, -149], [[-34, -160, -8, -146, -6, -128], [-11, -115, -29, -109, -48, -120], [-59, -126, -61, -139, -50, -149]], night ? '#7e9fa7' : '#a1b5a2', 1, wingShade);
    const count = detail ? 5 : 3;
    for (let j = 0; j < count; j++) {
      const t = j / (count - 1);
      feather(-49 + t * 6, -143 + t * 19, 25 - t * 3, .32 - t * .2, shade(featherBase, [[0, night ? '#c3d6d4' : '#f9f5e1'], [.5, night ? '#c8dfda' : '#f4f2db'], [1, night ? '#85a6b0' : '#b8c8b2']], [-22, -151, -57, -119]), night ? '#9cb7bb' : '#c7d1bb');
    }
    if (detail) for (let j = 0; j < 3; j++) feather(-37 + j * 5, -145 + j * 3, 12, .6, featherBase, night ? '#b0c8c7' : '#d8ddc5');
  }

  // Near wing/arm curls around the handlebar, with a tiny golden webbed hand.
  r.curve([-15, -129], [[4, -135, 19, -111, 37, -107]], night ? '#9bb8c0' : '#bdcbb7', 9.5);
  r.curve([-15, -130], [[4, -136, 19, -113, 37, -108]], shade(featherBase, [[0, night ? '#dfeee0' : '#fffdf0'], [1, night ? '#a9c5cd' : '#e0e4c9']], [22, -134, 5, -106]), 6.3);
  r.path([[32, -111], [39, -111], [44, -107], [42, -104], [35, -105]], night ? '#cfb278' : '#efbc6a', '#ad8146', .6);

  // The pelican's characteristic pouch is a translucent-looking curved surface
  // with a bright upper mandible, shaded throat and fine longitudinal creases.
  r.curve([39, -186], [[64, -182, 99, -180, 126, -188], [114, -171, 91, -154, 68, -154], [54, -153, 43, -162, 39, -174]], '#af7d43', 1, shade('#e9bb6c', [[0, night ? '#e6d6a0' : '#fff0b0'], [.33, night ? '#d6b47b' : '#f7cf83'], [.72, night ? '#ad8b61' : '#d9a25b'], [1, night ? '#7d6c59' : '#ae7d46']], [103, -189, 48, -151]));
  if (detail) {
    for (let j = 0; j < 4; j++) {
      const xx = 53 + j * 9;
      r.curve([xx, -180], [[xx + 1, -170, xx + 8, -160, xx + 14, -159]], night ? '#c6aa7f' : '#e6b873', .65);
    }
  }
  if (lit) r.curve([54, -165], [[66, -157, 88, -159, 104, -173]], night ? '#e8ce97' : '#ffe3a1', 1.1);
  r.path([[34, -198], [129, -188], [119, -183], [42, -179]], shade('#e8b660', [[0, night ? '#eddfa9' : '#fff0ae'], [.3, night ? '#dcc087' : '#edc372'], [1, night ? '#a58b64' : '#cd964b']], [89, -200, 45, -175]), '#9a7847', .9);
  r.curve([43, -184], [[66, -181, 100, -183, 125, -187]], '#89673f', 1.2);
  if (lit) r.line([[40, -196], [117, -188]], night ? '#f2e3b6' : '#fff4bf', 1);
  r.ellipse(43, -192, 2.2, .9, '#927a51', .1);
  // Eye socket and eyelid remain soft and readable, rather than a pasted dot.
  r.ellipse(27.5, -200, 6.2, 7, night ? '#9bb8b9' : '#e0dfc2', -.06);
  r.ellipse(28, -201, 4.2, 5.2, '#163f43');
  r.ellipse(29.5, -202.8, 1.35, 1.6, night ? '#d6eef0' : '#fffef1');
  r.ellipse(26.6, -198.6, .65, .7, '#6b9391');
  r.curve([23, -207], [[27, -211, 31, -209, 34, -206]], night ? '#a9c7c9' : '#e8e7d0', 1.4);
  r.ellipse(19, -189, 5.2, 3, night ? '#c9bba5' : '#edcba7', .14);

  // Moulded shell: a dark lower rim, three curved panels and recessed vents.
  const helmet = shade('#407e7d', [[0, night ? '#c0e5e4' : '#c8e4c7'], [.22, night ? '#77b5c3' : '#78b7a7'], [.55, night ? '#397083' : '#3e837c'], [1, night ? '#193e56' : '#234d51']], [40, -237, -6, -207]);
  r.curve([-7, -210], [[-7, -240, 39, -247, 50, -217], [33, -213, 10, -208, -7, -210]], '#244a4e', 1.5, helmet);
  r.curve([-6, -211], [[12, -210, 33, -216, 49, -217]], '#1d4148', 3.6);
  r.curve([8, -213], [[2, -227, 12, -240, 23, -239]], night ? '#305f75' : '#3b6d68', 1.3);
  r.curve([34, -216], [[33, -228, 27, -237, 23, -239]], night ? '#528ca1' : '#629a89', 1.2);
  if (lit) {
    r.curve([10, -234], [[18, -242, 33, -238, 39, -231]], night ? '#d4efeb' : '#e8f2d8', 2.2);
    r.curve([38, -228], [[41, -224, 42, -221, 43, -218]], night ? '#acd6db' : '#b8d9bb', 1.5);
  }
  for (const [xx, yy, angle] of [[7, -224, -.75], [20, -230, -.2], [34, -226, .56]]) {
    r.ellipse(xx, yy, 2.1, 5.1, '#1e434b', angle);
    if (lit) r.ellipse(xx + .6, yy + 1, .7, 3.2, night ? '#6c9eaa' : '#75a195', angle);
  }
  r.path([[39, -217], [64, -214], [61, -211], [43, -208]], shade('#2e6265', [[0, '#82b5a4'], [1, '#254e54']], [55, -217, 49, -207]), '#20464b', .7);
  r.curve([0, -208], [[0, -185, 19, -176, 29, -184]], night ? '#527b8a' : '#667d6b', 2.1);
  r.ellipse(17, -183, 3, 2.7, '#365957');
  r.ellipse(17, -183, 1.5, 1.2, night ? '#99bdc4' : '#c3d3bb');

  // Structured leather satchel. The side gusset, rolled flap and little brass
  // buckle are separate pieces; stitching is omitted at the light quality tier.
  r.path([[-63, -84], [-39, -84], [-35, -80], [-35, -62], [-61, -61], [-66, -66]], shade('#b67c4c', [[0, '#e9bb7c'], [.5, '#be8a55'], [1, '#795536']], [-38, -85, -66, -61]), '#72573d', 1.1);
  r.path([[-40, -81], [-35, -80], [-35, -62], [-40, -64]], night ? '#786249' : '#926a43');
  r.curve([-65, -85], [[-57, -88, -46, -86, -39, -84], [-38, -81, -39, -77, -42, -76], [-49, -76, -57, -76, -63, -77]], '#865e3c', .8, shade('#ce9b62', [[0, '#f2cf94'], [1, '#ad794d']], [-42, -86, -61, -75]));
  r.line([[-47, -84], [-47, -72]], '#76543b', 2.3);
  r.path([[-49, -78], [-45, -78], [-45, -74], [-49, -74]], '#ddbc7a', '#816c42', .6);
  r.ellipse(-55, -69, 4.3, 2.2, '#f6deb0');
  r.path([[-59, -69], [-62, -72], [-62, -67]], '#f6deb0');
  if (detail) {
    for (let j = 0; j < 5; j++) r.line([[-60 + j * 3.8, -64], [-58.8 + j * 3.8, -64]], '#e6be87', .55);
  }
  c.restore();
}
