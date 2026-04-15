export function createFlappySpaceGame(canvas, hooks) {
  const h = hooks || {};
  const ctx = canvas.getContext('2d');

  const REF_H = 480;
  const BASE_GRAVITY = 0.048;
  const BASE_JUMP = -3.0;
  const BASE_PIPE_GAP = 0.42;
  const BASE_PIPE_WIDTH = 0.1;
  const BASE_PIPE_SPEED = 0.85;
  const PIPE_SPAWN_INTERVAL = 400;
  const BASE_BIRD_RADIUS = 0.03;
  const HEAD_START_FRAMES = 300;

  let width = 320;
  let height = 480;
  const LIVES = 5;
  const INVINCIBLE_FRAMES = 100;

  let bird = { x: 0, y: 0, vy: 0 };
  let pipes = [];
  let score = 0;
  let frameCount = 0;
  let running = false;
  let lives = LIVES;
  let invincibleFrames = 0;
  let stars = [];
  let galaxies = [];
  let groundScroll = 0;
  let wingFlapFrames = 0;
  let respawnCountdown = 0;
  let respawnCountdownFrames = 0;
  const RESPAWN_STEP_FRAMES = 50;

  function s() { return height / REF_H; }
  function GRAVITY() { return BASE_GRAVITY * s(); }
  function JUMP() { return BASE_JUMP * s(); }
  function PIPE_GAP() { return Math.round(BASE_PIPE_GAP * height); }
  function PIPE_WIDTH() { return Math.round(BASE_PIPE_WIDTH * width); }
  function PIPE_SPEED() { return BASE_PIPE_SPEED * s(); }
  function BIRD_RADIUS() { return Math.max(12, Math.round(BASE_BIRD_RADIUS * height)); }

  function groundY() {
    return height - Math.max(76, height * 0.15);
  }

  function initStars() {
    stars = [];
    var gy = groundY();
    for (var i = 0; i < 72; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * gy * 0.92,
        s: 0.35 + Math.random() * 1.4,
        tw: Math.random() * Math.PI * 2,
        speed: 0.08 + Math.random() * 0.22,
      });
    }
  }

  function initGalaxies() {
    galaxies = [
      { nx: 0.22, ny: 0.22, rs: 0.46, spin: 0.00035, vx: 0.09, depth: 0, angle: 0, hue: 252 },
      { nx: 0.68, ny: 0.42, rs: 0.52, spin: -0.00028, vx: 0.12, depth: 1, angle: 0, hue: 268 },
      { nx: 0.48, ny: 0.58, rs: 0.42, spin: 0.00042, vx: 0.08, depth: 0, angle: 0, hue: 238 },
    ];
    for (var j = 0; j < galaxies.length; j++) galaxies[j].angle = Math.random() * Math.PI * 2;
  }

  function updateGalaxies() {
    for (var i = 0; i < galaxies.length; i++) {
      var g = galaxies[i];
      var par = 0.45 + g.depth * 0.35;
      g.nx -= g.vx * 0.00009 * par;
      var wrap = 0.35 + g.rs * 0.35;
      if (g.nx < -wrap) g.nx = 1 + wrap;
      g.angle += g.spin;
    }
  }

  function drawGalaxies(gy) {
    if (galaxies.length === 0) return;
    var m = Math.min(width, height);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (var i = 0; i < galaxies.length; i++) {
      var g = galaxies[i];
      var cx = g.nx * width;
      var cy = g.ny * gy;
      var rx = m * g.rs * 0.48;
      var ry = m * g.rs * 0.19;
      var aOut = 0.2 + g.depth * 0.08;
      var aMid = 0.32 + g.depth * 0.1;
      var aCore = 0.45 + g.depth * 0.12;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(g.angle);

      var mist = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * 1.12);
      mist.addColorStop(0, 'hsla(' + g.hue + ', 55%, 62%, ' + (aMid * 0.85) + ')');
      mist.addColorStop(0.4, 'hsla(' + (g.hue + 14) + ', 48%, 52%, ' + (aOut * 0.95) + ')');
      mist.addColorStop(0.72, 'hsla(' + (g.hue + 22) + ', 40%, 44%, ' + (aOut * 0.5) + ')');
      mist.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = mist;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx * 1.08, ry * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();

      var core = ctx.createRadialGradient(-rx * 0.1, -ry * 0.07, 0, 0, 0, rx * 0.45);
      core.addColorStop(0, 'hsla(' + (g.hue + 6) + ', 48%, 82%, ' + (aCore * 0.75) + ')');
      core.addColorStop(0.45, 'hsla(' + g.hue + ', 52%, 58%, ' + (aMid * 0.9) + ')');
      core.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx * 0.78, ry * 0.78, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
    ctx.restore();
  }

  function resize() {
    const panel = canvas.parentElement;
    const w = panel.clientWidth;
    const h = panel.clientHeight;
    width = w;
    height = h;
    canvas.width = w;
    canvas.height = h;
    if (stars.length === 0) initStars();
    if (galaxies.length === 0) initGalaxies();
    if (running) return;
    bird.x = width * 0.3;
    bird.y = height / 2;
    bird.vy = 0;
  }

  function reset() {
    bird.x = width * 0.3;
    bird.y = height * 0.45;
    bird.vy = JUMP() * 0.3;
    pipes = [];
    score = 0;
    if (h.onScore) h.onScore(0);
    frameCount = 0;
    lives = LIVES;
    invincibleFrames = 0;
    running = true;
    respawnCountdown = 0;
    respawnCountdownFrames = 0;
  }

  function loseLife() {
    lives--;
    if (lives <= 0) {
      running = false;
      if (h.onGameOver) h.onGameOver(score);
      return;
    }
    respawnCountdown = 4;
    respawnCountdownFrames = RESPAWN_STEP_FRAMES;
  }

  function jump() {
    if (!running || respawnCountdown > 0) return;
    bird.vy = JUMP();
  }

  function addPipe() {
    const gy = groundY();
    const minTop = 70;
    var gap = PIPE_GAP();
    const maxTop = Math.max(minTop + 40, gy - gap - 70);
    const topHeight = minTop + Math.random() * (maxTop - minTop);
    pipes.push({
      x: width + PIPE_WIDTH(),
      top: 0,
      topHeight: topHeight,
      gap: gap,
      bottomHeight: height - topHeight - gap,
      scored: false
    });
  }

  function hitPipe(p) {
    const cx = bird.x;
    const cy = bird.y;
    const gy = groundY();
    var pw = PIPE_WIDTH();
    var br = BIRD_RADIUS();
    if (cx + br < p.x || cx - br > p.x + pw) return false;
    if (cy - br < p.topHeight) return true;
    if (cy + br > p.topHeight + p.gap && cy - br < gy) return true;
    return false;
  }

  function update() {
    if (!running) return;

    if (h.consumeFlap && h.consumeFlap()) {
      jump();
      wingFlapFrames = 18;
    }
    if (wingFlapFrames > 0) wingFlapFrames--;

    if (respawnCountdown > 0) {
      respawnCountdownFrames--;
      if (respawnCountdownFrames <= 0) {
        respawnCountdownFrames = RESPAWN_STEP_FRAMES;
        respawnCountdown--;
        if (respawnCountdown === 0) {
          bird.x = width * 0.3;
          bird.y = height / 2;
          bird.vy = JUMP() * 0.6;
          invincibleFrames = INVINCIBLE_FRAMES;
        }
      }
      return;
    }

    bird.vy += GRAVITY();
    bird.y += bird.vy;

    if (invincibleFrames > 0) invincibleFrames--;

    if (bird.y - BIRD_RADIUS() <= 0 || bird.y + BIRD_RADIUS() >= groundY()) {
      if (invincibleFrames > 0) return;
      loseLife();
      return;
    }

    frameCount++;
    groundScroll = (groundScroll + PIPE_SPEED() * 2) % 48;
    if (frameCount >= HEAD_START_FRAMES && (frameCount - HEAD_START_FRAMES) % PIPE_SPAWN_INTERVAL === 0) addPipe();

    for (let i = pipes.length - 1; i >= 0; i--) {
      const p = pipes[i];
      p.x -= PIPE_SPEED();

      if (!p.scored && p.x + PIPE_WIDTH() < bird.x) {
        p.scored = true;
        score++;
        if (h.onScore) h.onScore(score);
      }
      if (hitPipe(p)) {
        if (invincibleFrames > 0) continue;
        loseLife();
        return;
      }
      if (p.x + PIPE_WIDTH() < 0) pipes.splice(i, 1);
    }
  }

  function drawStarField(st) {
    var tw = 0.35 + 0.65 * Math.sin(frameCount * 0.08 + st.tw);
    ctx.fillStyle = 'rgba(220,235,255,' + (0.2 + tw * 0.75) + ')';
    ctx.beginPath();
    ctx.arc(st.x, st.y, st.s, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPlanetGround(gy) {
    var band = height - gy;
    ctx.save();
    var g = ctx.createLinearGradient(0, gy, 0, height);
    g.addColorStop(0, '#3d2d5c');
    g.addColorStop(0.35, '#2a1f45');
    g.addColorStop(1, '#120a22');
    ctx.fillStyle = g;
    ctx.fillRect(0, gy, width, band);
    ctx.strokeStyle = 'rgba(110, 231, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(110, 231, 255, 0.5)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(width, gy);
    ctx.stroke();
    ctx.shadowBlur = 0;
    for (var x = -40 + groundScroll * 0.35; x < width + 60; x += 28) {
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath();
      ctx.ellipse(x + (x % 56) * 0.3, gy + band * 0.35, 8 + (x % 7), 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawTractorBeamColumn(x0, y0, colH, beamDown) {
    var w = PIPE_WIDTH();
    var cx = x0 + w / 2;
    var pulse = 0.72 + 0.28 * Math.sin(frameCount * 0.14 + x0 * 0.03);
    ctx.save();
    var edge = ctx.createLinearGradient(x0, y0, x0 + w, y0);
    edge.addColorStop(0, 'rgba(56, 189, 248, ' + (0.06 * pulse) + ')');
    edge.addColorStop(0.48, 'rgba(224, 242, 254, ' + (0.42 * pulse) + ')');
    edge.addColorStop(1, 'rgba(56, 189, 248, ' + (0.06 * pulse) + ')');
    ctx.fillStyle = edge;
    ctx.fillRect(x0, y0, w, colH);
    var vert = ctx.createLinearGradient(x0, y0, x0, y0 + colH);
    if (beamDown) {
      vert.addColorStop(0, 'rgba(250, 250, 255, ' + (0.38 * pulse) + ')');
      vert.addColorStop(0.35, 'rgba(167, 139, 248, ' + (0.2 * pulse) + ')');
      vert.addColorStop(1, 'rgba(56, 189, 248, ' + (0.1 * pulse) + ')');
    } else {
      vert.addColorStop(0, 'rgba(56, 189, 248, ' + (0.12 * pulse) + ')');
      vert.addColorStop(0.45, 'rgba(167, 139, 248, ' + (0.22 * pulse) + ')');
      vert.addColorStop(1, 'rgba(254, 249, 195, ' + (0.4 * pulse) + ')');
    }
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = vert;
    ctx.fillRect(x0, y0, w, colH);
    ctx.globalCompositeOperation = 'source-over';
    var stride = Math.max(10, Math.floor(colH / 14));
    var scan = (frameCount * 2 + x0 * 0.5) % stride;
    for (var sy = y0 + scan; sy < y0 + colH; sy += stride) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.1 * pulse) + ')';
      ctx.fillRect(x0, sy, w, 1.5);
    }
    ctx.strokeStyle = 'rgba(186, 230, 253, ' + (0.35 * pulse) + ')';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x0 + 1.5, y0);
    ctx.lineTo(x0 + 1.5, y0 + colH);
    ctx.moveTo(x0 + w - 1.5, y0);
    ctx.lineTo(x0 + w - 1.5, y0 + colH);
    ctx.stroke();
    ctx.restore();
  }

  function drawUFOSaucer(cx, cy, saucerUp) {
    var sc = s();
    var bob = Math.sin(frameCount * 0.07 + cx * 0.015) * 2.5 * sc;
    var blink = 0.65 + 0.35 * Math.sin(frameCount * 0.21);
    ctx.save();
    ctx.translate(cx + bob, cy);
    if (!saucerUp) ctx.scale(1, -1);
    var rimW = Math.max(18, PIPE_WIDTH() * 0.85);
    var domeH = 6 * sc;
    var domeGrad = ctx.createRadialGradient(0, -domeH * 0.3, 0, 0, -domeH * 0.2, rimW * 0.55);
    domeGrad.addColorStop(0, '#e2e8f0');
    domeGrad.addColorStop(0.55, '#94a3b8');
    domeGrad.addColorStop(1, '#64748b');
    ctx.fillStyle = domeGrad;
    ctx.beginPath();
    ctx.arc(0, 0, rimW * 0.32, Math.PI, 0);
    ctx.lineTo(rimW * 0.32, domeH * 0.2);
    ctx.quadraticCurveTo(0, domeH * 0.55, -rimW * 0.32, domeH * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    var diskGrad = ctx.createLinearGradient(-rimW, 2, rimW, 2);
    diskGrad.addColorStop(0, '#475569');
    diskGrad.addColorStop(0.25, '#cbd5e1');
    diskGrad.addColorStop(0.55, '#94a3b8');
    diskGrad.addColorStop(0.75, '#64748b');
    diskGrad.addColorStop(1, '#334155');
    ctx.fillStyle = diskGrad;
    ctx.beginPath();
    ctx.ellipse(0, domeH * 0.25, rimW, 5 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(56, 189, 248, ' + blink + ')';
    for (var li = -1; li <= 1; li++) {
      ctx.beginPath();
      ctx.arc(li * rimW * 0.42, domeH * 0.22 + li * 0.3, 2.2 * sc, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(253, 224, 71, ' + (0.4 * blink) + ')';
    ctx.beginPath();
    ctx.arc(0, domeH * 0.18, 2 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawUFOBeams(p) {
    var gy = groundY();
    var x = p.x;
    var w = PIPE_WIDTH();
    var cx = x + w / 2;
    var topH = Math.max(0, p.topHeight);
    var botTop = p.topHeight + p.gap;
    var botH = Math.max(0, gy - botTop);

    if (topH > 1) {
      drawTractorBeamColumn(x, 0, topH, true);
      drawUFOSaucer(cx, 2 * s(), true);
    }
    if (botH > 1) {
      drawTractorBeamColumn(x, botTop, botH, false);
      drawUFOSaucer(cx, gy - 2 * s(), false);
    }
  }

  function drawRocketShip() {
    var bob = Math.sin(frameCount * 0.14) * 0.55;
    ctx.save();
    ctx.translate(bird.x + bob, bird.y);
    var tilt = Math.max(-0.55, Math.min(0.65, bird.vy / (height / REF_H) * 0.02));
    ctx.rotate(tilt);
    var R = BIRD_RADIUS();
    var thrust = wingFlapFrames > 0 ? wingFlapFrames / 18 : 0;
    var nav = 0.55 + 0.45 * Math.sin(frameCount * 0.19);
    var fin = wingFlapFrames > 0 ? Math.sin(wingFlapFrames * 0.55) * 0.14 : 0;

    function drawThrustPlume() {
      if (thrust <= 0) return;
      var ax = -R * 0.72;
      ctx.save();
      ctx.translate(ax, 0);
      var wobble = Math.sin(frameCount * 0.9) * R * 0.04 * thrust;
      var core = ctx.createLinearGradient(0, 0, -R * 2.8, 0);
      core.addColorStop(0, 'rgba(255, 255, 255, ' + (0.95 * thrust) + ')');
      core.addColorStop(0.18, 'rgba(186, 230, 253, ' + (0.55 * thrust) + ')');
      core.addColorStop(0.45, 'rgba(56, 189, 248, ' + (0.35 * thrust) + ')');
      core.addColorStop(0.75, 'rgba(167, 139, 250, ' + (0.2 * thrust) + ')');
      core.addColorStop(1, 'rgba(99, 102, 241, 0)');
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-R * 2.65, -R * (0.62 + thrust * 0.12) + wobble);
      ctx.quadraticCurveTo(-R * 1.9, wobble * 0.5, -R * 2.35, R * (0.55 + thrust * 0.1) + wobble);
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = 'rgba(253, 224, 71, ' + (0.35 * thrust) + ')';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-R * 1.35, -R * 0.22);
      ctx.lineTo(-R * 1.55, R * 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      for (var i = 0; i < 5; i++) {
        var sx = -R * (0.5 + i * 0.35) * thrust;
        var sy = (Math.sin(frameCount * 0.4 + i * 1.7) * R * 0.18 - R * 0.05) * thrust;
        ctx.fillStyle = 'rgba(255,255,255,' + (0.35 * thrust * (1 - i * 0.15)) + ')';
        ctx.beginPath();
        ctx.arc(sx, sy, (2.2 - i * 0.25) * thrust, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawEngineHalo() {
      var h = 0.12 + thrust * 0.55 + Math.sin(frameCount * 0.11) * 0.03;
      var rg = ctx.createRadialGradient(-R * 0.62, 0, 0, -R * 0.62, 0, R * 0.95);
      rg.addColorStop(0, 'rgba(56, 189, 248, ' + h + ')');
      rg.addColorStop(0.45, 'rgba(129, 140, 248, ' + (h * 0.45) + ')');
      rg.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.ellipse(-R * 0.58, 0, R * 0.85, R * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    drawThrustPlume();
    drawEngineHalo();

    ctx.fillStyle = 'rgba(15, 23, 42, 0.5)';
    ctx.beginPath();
    ctx.moveTo(R * 0.35, -R * 0.02);
    ctx.lineTo(-R * 0.55, -R * 0.88);
    ctx.lineTo(-R * 1.02, -R * 0.78);
    ctx.lineTo(-R * 0.38, -R * 0.34);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(R * 0.35, R * 0.02);
    ctx.lineTo(-R * 0.55, R * 0.88);
    ctx.lineTo(-R * 1.02, R * 0.78);
    ctx.lineTo(-R * 0.38, R * 0.34);
    ctx.closePath();
    ctx.fill();

    var bodyGrad = ctx.createLinearGradient(R * 1.05, -R * 0.5, -R * 0.95, R * 0.5);
    bodyGrad.addColorStop(0, '#f8fafc');
    bodyGrad.addColorStop(0.22, '#e2e8f0');
    bodyGrad.addColorStop(0.5, '#94a3b8');
    bodyGrad.addColorStop(0.78, '#64748b');
    bodyGrad.addColorStop(1, '#334155');
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.95)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(R * 1.12, 0);
    ctx.quadraticCurveTo(R * 0.9, -R * 0.08, R * 0.15, -R * 0.38);
    ctx.lineTo(-R * 0.42, -R * 0.42);
    ctx.lineTo(-R * 0.95, -R * 0.08 + fin * R);
    ctx.lineTo(-R * 0.72, 0);
    ctx.lineTo(-R * 0.95, R * 0.08 - fin * R);
    ctx.lineTo(-R * 0.42, R * 0.42);
    ctx.lineTo(R * 0.15, R * 0.38);
    ctx.quadraticCurveTo(R * 0.9, R * 0.08, R * 1.12, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(R * 0.85, -R * 0.06);
    ctx.lineTo(-R * 0.35, -R * 0.18);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(R * 0.85, R * 0.06);
    ctx.lineTo(-R * 0.35, R * 0.18);
    ctx.stroke();

    var deck = ctx.createLinearGradient(R * 0.05, -R * 0.32, R * 0.75, R * 0.15);
    deck.addColorStop(0, '#475569');
    deck.addColorStop(1, '#1e293b');
    ctx.fillStyle = deck;
    ctx.beginPath();
    ctx.moveTo(R * 0.55, -R * 0.06);
    ctx.lineTo(R * -0.05, -R * 0.32);
    ctx.lineTo(-R * 0.32, -R * 0.18);
    ctx.lineTo(R * 0.22, R * 0.05);
    ctx.closePath();
    ctx.fill();

    var wingGlow = ctx.createLinearGradient(R * 0.2, -R * 0.9, R * 0.2, R * 0.9);
    wingGlow.addColorStop(0, 'rgba(56, 189, 248, ' + (0.28 + thrust * 0.35) + ')');
    wingGlow.addColorStop(0.5, 'rgba(56, 189, 248, 0)');
    wingGlow.addColorStop(1, 'rgba(167, 139, 250, ' + (0.22 + thrust * 0.25) + ')');
    ctx.strokeStyle = wingGlow;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(R * 0.22, -R * 0.38);
    ctx.lineTo(-R * 0.88, -R * 0.92);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(R * 0.22, R * 0.38);
    ctx.lineTo(-R * 0.88, R * 0.92);
    ctx.stroke();

    ctx.fillStyle = 'rgba(56, 189, 248, ' + (0.55 * nav) + ')';
    ctx.beginPath();
    ctx.arc(-R * 0.65, -R * 0.58, 2.2, 0, Math.PI * 2);
    ctx.arc(-R * 0.62, R * 0.56, 2.2, 0, Math.PI * 2);
    ctx.fill();

    var capGrad = ctx.createRadialGradient(R * 1.05, -R * 0.06, 0, R * 1.02, 0, R * 0.2);
    capGrad.addColorStop(0, '#ffffff');
    capGrad.addColorStop(0.45, '#cbd5e1');
    capGrad.addColorStop(1, '#64748b');
    ctx.fillStyle = capGrad;
    ctx.beginPath();
    ctx.moveTo(R * 1.18, 0);
    ctx.lineTo(R * 1.05, -R * 0.1);
    ctx.lineTo(R * 0.82, 0);
    ctx.lineTo(R * 1.05, R * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.9)';
    ctx.lineWidth = 1;
    ctx.stroke();

    var glass = ctx.createRadialGradient(R * 0.38, -R * 0.06, R * 0.04, R * 0.42, -R * 0.04, R * 0.32);
    glass.addColorStop(0, 'rgba(224, 242, 254, 0.95)');
    glass.addColorStop(0.35, 'rgba(56, 189, 248, 0.65)');
    glass.addColorStop(0.7, 'rgba(14, 165, 233, 0.35)');
    glass.addColorStop(1, 'rgba(15, 23, 42, 0.5)');
    ctx.fillStyle = glass;
    ctx.beginPath();
    ctx.ellipse(R * 0.48, -R * 0.05, R * 0.26, R * 0.2, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.85)';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(R * 0.55, -R * 0.12, R * 0.08, 2.1, 3.8);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 5]);
    ctx.lineDashOffset = -frameCount * 0.35;
    ctx.beginPath();
    ctx.moveTo(R * 0.75, -R * 0.02);
    ctx.lineTo(-R * 0.5, -R * 0.02);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.beginPath();
    ctx.arc(R * 0.52, -R * 0.04, R * 0.09, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function draw() {
    if (respawnCountdown > 0) {
      ctx.fillStyle = 'rgba(11, 8, 38, 0.94)';
      ctx.fillRect(0, 0, width, height);
      var text = respawnCountdown === 4 ? '3' : respawnCountdown === 3 ? '2' : respawnCountdown === 2 ? '1' : 'Go';
      ctx.fillStyle = 'rgba(186, 230, 253, 0.98)';
      ctx.shadowColor = 'rgba(56, 189, 248, 0.8)';
      ctx.shadowBlur = 24;
      ctx.font = 'bold 72px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, width / 2, height / 2);
      ctx.shadowBlur = 0;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      return;
    }

    var gy = groundY();
    var sky = ctx.createLinearGradient(0, 0, 0, gy);
    sky.addColorStop(0, '#0a0528');
    sky.addColorStop(0.4, '#140a40');
    sky.addColorStop(0.78, '#1e0f55');
    sky.addColorStop(1, '#2d1b69');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, gy);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, gy);
    ctx.clip();
    updateGalaxies();
    drawGalaxies(gy);

    if (stars.length === 0) initStars();
    stars.forEach(function (st) {
      st.x -= st.speed;
      if (st.x < -4) st.x = width + 4;
      drawStarField(st);
    });
    ctx.restore();

    drawPlanetGround(gy);

    pipes.forEach(function (p) {
      drawUFOBeams(p);
    });

    drawRocketShip();

    ctx.fillStyle = 'rgba(224, 242, 254, 0.98)';
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.lineWidth = 3;
    ctx.font = 'bold 22px system-ui';
    ctx.strokeText('Score: ' + score, 12, 32);
    ctx.fillText('Score: ' + score, 12, 32);
    ctx.strokeText('Shields: ' + lives, 12, 56);
    ctx.fillText('Shields: ' + lives, 12, 56);
  }

  function loop() {
    update();
    draw();
    if (running) requestAnimationFrame(loop);
  }

  return {
    jump,
    reset,
    resize,
    start: function start() {
      resize();
      reset();
      loop();
    },
    stop: function stop() {
      running = false;
    },
    isRunning: function isRunning() {
      return running;
    },
    getScore: function getScore() {
      return score;
    },
  };
}
