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
  let clouds = [];
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

  function initClouds() {
    clouds = [];
    var gy = groundY();
    for (var i = 0; i < 8; i++) {
      clouds.push({
        x: Math.random() * width * 1.2,
        y: 40 + Math.random() * (gy * 0.55),
        s: 0.55 + Math.random() * 0.65,
        speed: 0.25 + Math.random() * 0.35,
      });
    }
  }

  function resize() {
    const panel = canvas.parentElement;
    const w = panel.clientWidth;
    const h = panel.clientHeight;
    width = w;
    height = h;
    canvas.width = w;
    canvas.height = h;
    if (clouds.length === 0) initClouds();
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

  function drawCloudShape(cx, cy, sc) {
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.beginPath();
    ctx.arc(cx, cy, 26 * sc, 0, Math.PI * 2);
    ctx.arc(cx + 20 * sc, cy - 5 * sc, 20 * sc, 0, Math.PI * 2);
    ctx.arc(cx + 22 * sc, cy + 7 * sc, 17 * sc, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawClassicGround(gy) {
    var band = height - gy;
    var stripe = 16;
    ctx.fillStyle = '#ded895';
    ctx.fillRect(0, gy, width, band);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, gy, width, band);
    ctx.clip();
    for (var x = -stripe * 2 + groundScroll; x < width + stripe * 2; x += stripe) {
      ctx.fillStyle = (Math.floor(x / stripe) % 2 === 0) ? '#73bf2e' : '#5cad27';
      ctx.fillRect(x, gy, stripe, band * 0.55);
    }
    ctx.fillStyle = '#c6a86a';
    ctx.fillRect(0, gy + band * 0.55, width, band * 0.45);
    for (var x2 = -20 + groundScroll * 0.5; x2 < width + 40; x2 += 24) {
      ctx.fillStyle = '#9a7b4a';
      ctx.fillRect(x2, gy + band * 0.72, 10, 4);
    }
    ctx.restore();
    ctx.strokeStyle = '#546e32';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(width, gy);
    ctx.stroke();
  }

  function drawClassicPipePair(p) {
    var gy = groundY();
    var lip = 20 * s();
    var x = p.x;
    var w = PIPE_WIDTH();
    var lipW = 6 * s();

    ctx.fillStyle = '#73bf2e';
    ctx.strokeStyle = '#546e32';
    ctx.lineWidth = 2;
    ctx.fillRect(x, 0, w, Math.max(0, p.topHeight - lip));
    ctx.strokeRect(x, 0, w, Math.max(0, p.topHeight - lip));
    ctx.fillStyle = '#9fd356';
    ctx.fillRect(x - lipW, p.topHeight - lip, w + lipW * 2, lip);
    ctx.strokeRect(x - lipW, p.topHeight - lip, w + lipW * 2, lip);
    ctx.fillStyle = '#8bc34a';
    ctx.fillRect(x + 4, 4, w - 8, Math.max(0, p.topHeight - lip - 8));

    var botTop = p.topHeight + p.gap;
    var botBodyH = gy - botTop - lip;
    ctx.fillStyle = '#73bf2e';
    ctx.fillRect(x, botTop + lip, w, Math.max(0, botBodyH));
    ctx.strokeRect(x, botTop + lip, w, Math.max(0, botBodyH));
    ctx.fillStyle = '#9fd356';
    ctx.fillRect(x - lipW, botTop, w + lipW * 2, lip);
    ctx.strokeRect(x - lipW, botTop, w + lipW * 2, lip);
    ctx.fillStyle = '#8bc34a';
    ctx.fillRect(x + 4, botTop + lip + 4, w - 8, Math.max(0, botBodyH - 8));
  }

  function drawClassicBird() {
    var bob = Math.sin(frameCount * 0.14) * 0.8;
    ctx.save();
    ctx.translate(bird.x + bob, bird.y);
    var tilt = Math.max(-0.55, Math.min(0.65, bird.vy / (height / REF_H) * 0.02));
    ctx.rotate(tilt);
    var R = BIRD_RADIUS();

    ctx.fillStyle = '#f4d03f';
    ctx.strokeStyle = '#d4a017';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, R * 1.05, R * 0.92, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    var wingAngle = wingFlapFrames > 0
      ? Math.sin(wingFlapFrames * 0.5) * 0.45
      : 0;
    ctx.fillStyle = '#e8c030';
    ctx.beginPath();
    ctx.ellipse(-R * 0.35, R * 0.15 + wingAngle * R, R * 0.5, R * 0.32, 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.moveTo(R * 0.75, -R * 0.08);
    ctx.lineTo(R * 1.45, 0);
    ctx.lineTo(R * 0.75, R * 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#c87f0a';
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(R * 0.42, -R * 0.22, R * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(R * 0.48, -R * 0.2, R * 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function draw() {
    if (respawnCountdown > 0) {
      ctx.fillStyle = 'rgba(113, 197, 207, 0.92)';
      ctx.fillRect(0, 0, width, height);
      var text = respawnCountdown === 4 ? '3' : respawnCountdown === 3 ? '2' : respawnCountdown === 2 ? '1' : 'Go';
      ctx.fillStyle = 'rgba(255,255,255,0.98)';
      ctx.font = 'bold 72px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, width / 2, height / 2);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      return;
    }

    var gy = groundY();
    var sky = ctx.createLinearGradient(0, 0, 0, gy);
    sky.addColorStop(0, '#4ec0ca');
    sky.addColorStop(0.45, '#71c5cf');
    sky.addColorStop(1, '#b8e8ef');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, gy);

    if (clouds.length === 0) initClouds();
    clouds.forEach(function (c) {
      c.x -= c.speed;
      if (c.x < -100 * c.s) c.x = width + 60 + Math.random() * 80;
      drawCloudShape(c.x, c.y, c.s);
    });

    drawClassicGround(gy);

    pipes.forEach(function (p) {
      drawClassicPipePair(p);
    });

    drawClassicBird();

    ctx.fillStyle = '#fff';
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 3;
    ctx.font = 'bold 22px system-ui';
    ctx.strokeText('Score: ' + score, 12, 32);
    ctx.fillText('Score: ' + score, 12, 32);
    ctx.strokeText('Lives: ' + lives, 12, 56);
    ctx.fillText('Lives: ' + lives, 12, 56);
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
