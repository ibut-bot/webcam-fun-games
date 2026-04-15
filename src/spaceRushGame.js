const MIN_CONF = 0.28
const KP = {
  nose: 0,
  lSh: 5,
  rSh: 6,
  lWr: 9,
  rWr: 10,
  lHp: 11,
  rHp: 12,
  lKn: 13,
  rKn: 14,
}

export function createSpaceRushGame(canvas, hooks) {
  const h = hooks || {}
  const ctx = canvas.getContext('2d')
  const getPose = typeof h.getPoseKeypoints === 'function' ? h.getPoseKeypoints : () => null

  let width = 640
  let height = 480
  let running = false
  let rafId = 0
  let lastTs = 0

  let score = 0
  let distance = 0
  let gameOverTriggered = false

  let targetLane = 0
  let visualLane = 0
  let laneCooldown = 0
  let steerLeftTime = 0
  let steerRightTime = 0

  let jumpY = 0
  let jumpVy = 0
  let jumpCooldown = 0
  let rollTimer = 0
  let rollCooldown = 0

  let steerNeutral = 0
  let calibSamples = 0
  const CALIB_TARGET = 36

  let obstacles = []
  let spawnTimer = 0
  let runPhase = 0
  let deckScroll = 0

  let lastJumpPose = false
  let lastRollPose = false

  const JUMP_IMPULSE = -520
  const GRAVITY = 1850
  const ROLL_FRAMES = 52
  const CLEAR_JUMP = 48
  const HIT_P0 = 0.86
  const HIT_P1 = 0.98

  function resize() {
    const p = canvas.parentElement
    if (!p) return
    width = p.clientWidth
    height = p.clientHeight
    canvas.width = width
    canvas.height = height
  }

  function reset() {
    score = 0
    distance = 0
    gameOverTriggered = false
    targetLane = 0
    visualLane = 0
    laneCooldown = 0
    steerLeftTime = 0
    steerRightTime = 0
    jumpY = 0
    jumpVy = 0
    jumpCooldown = 0
    rollTimer = 0
    rollCooldown = 0
    steerNeutral = 0
    calibSamples = 0
    obstacles = []
    spawnTimer = 0.35
    runPhase = 0
    deckScroll = 0
    lastJumpPose = false
    lastRollPose = false
  }

  function kpOk(pose, i) {
    const p = pose.keypoints[i]
    return p && (p.score ?? 0) >= MIN_CONF ? p : null
  }

  function readPose(pose, dt) {
    if (!pose?.keypoints || pose.videoWidth < 50) return

    const nose = kpOk(pose, KP.nose)
    const lHp = kpOk(pose, KP.lHp)
    const rHp = kpOk(pose, KP.rHp)
    const lSh = kpOk(pose, KP.lSh)
    const rSh = kpOk(pose, KP.rSh)
    const lWr = kpOk(pose, KP.lWr)
    const rWr = kpOk(pose, KP.rWr)
    const lKn = kpOk(pose, KP.lKn)
    const rKn = kpOk(pose, KP.rKn)

    if (nose && lHp && rHp) {
      const hipCx = (lHp.x + rHp.x) / 2
      const raw = (nose.x - hipCx) / pose.videoWidth
      if (calibSamples < CALIB_TARGET) {
        steerNeutral += raw
        calibSamples += 1
        if (calibSamples >= CALIB_TARGET) steerNeutral /= CALIB_TARGET
      } else {
        const steer = -(raw - steerNeutral)
        const dead = 0.04
        if (steer < -dead) {
          steerLeftTime += dt
          steerRightTime = 0
          if (steerLeftTime > 0.1 && laneCooldown <= 0 && targetLane > -1) {
            targetLane -= 1
            laneCooldown = 0.32
            steerLeftTime = 0
          }
        } else if (steer > dead) {
          steerRightTime += dt
          steerLeftTime = 0
          if (steerRightTime > 0.1 && laneCooldown <= 0 && targetLane < 1) {
            targetLane += 1
            laneCooldown = 0.32
            steerRightTime = 0
          }
        } else {
          steerLeftTime = 0
          steerRightTime = 0
        }
      }
    }

    let jumpPose = false
    if (nose && lWr && rWr) {
      const wy = (lWr.y + rWr.y) / 2
      jumpPose = wy < nose.y - pose.videoHeight * 0.055
    }

    let rollPose = false
    if (lKn && rKn && lHp && rHp && lSh && rSh) {
      const hipY = (lHp.y + rHp.y) / 2
      const knY = (lKn.y + rKn.y) / 2
      const shY = (lSh.y + rSh.y) / 2
      if (knY > hipY + pose.videoHeight * 0.028 && shY > hipY - pose.videoHeight * 0.04) {
        rollPose = true
      }
    }

    if (jumpCooldown <= 0 && jumpY >= -1 && jumpPose && !lastJumpPose) {
      jumpVy = JUMP_IMPULSE * (height / 520)
      jumpCooldown = 0.42
    }
    lastJumpPose = jumpPose

    if (rollCooldown <= 0 && rollPose && !lastRollPose && jumpY >= -12) {
      rollTimer = ROLL_FRAMES
      rollCooldown = 0.55
    }
    lastRollPose = rollPose
  }

  function worldSpeed() {
    return 0.22 + Math.min(0.5, distance * 0.000018)
  }

  function spawnObstacle() {
    const lane = Math.floor(Math.random() * 3) - 1
    const kind = Math.random() < 0.52 ? 'deck' : 'high'
    obstacles.push({ lane, p: 0, kind, hit: false, wobble: Math.random() * Math.PI * 2 })
  }

  function collisionLane() {
    return Math.max(-1, Math.min(1, Math.round(visualLane)))
  }

  function update(ts) {
    if (!running) return
    const dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0.016
    lastTs = ts

    const pose = getPose()
    readPose(pose, dt)

    const wz = worldSpeed()
    distance += wz * dt * 180
    score = Math.floor(distance)
    h.onScore?.(score)

    if (laneCooldown > 0) laneCooldown -= dt
    if (jumpCooldown > 0) jumpCooldown -= dt
    if (rollCooldown > 0) rollCooldown -= dt
    if (rollTimer > 0) rollTimer -= 1

    visualLane += (targetLane - visualLane) * Math.min(1, dt * 10)

    jumpVy += GRAVITY * (height / 520) * dt
    jumpY += jumpVy * dt
    if (jumpY > 0) {
      jumpY = 0
      if (jumpVy > 0) jumpVy = 0
    }

    deckScroll += wz * dt * 3.2
    runPhase += dt * 14 * (1 + wz)

    spawnTimer -= dt
    if (spawnTimer <= 0) {
      spawnObstacle()
      spawnTimer = 0.85 - Math.min(0.45, distance * 0.00005)
      if (spawnTimer < 0.38) spawnTimer = 0.38
    }

    for (const o of obstacles) {
      o.p += wz * dt * 1.15
      o.wobble += dt * 6
    }

    const colLane = collisionLane()

    for (const o of obstacles) {
      if (o.hit) continue
      if (o.p < HIT_P0 || o.p > HIT_P1) continue
      if (o.lane !== colLane) continue
      if (o.kind === 'deck') {
        if (jumpY < -CLEAR_JUMP * (height / 520)) continue
        triggerGameOver()
        return
      }
      if (o.kind === 'high') {
        if (rollTimer > 0) continue
        triggerGameOver()
        return
      }
    }

    obstacles = obstacles.filter((o) => o.p < 1.12)
  }

  function triggerGameOver() {
    if (gameOverTriggered) return
    gameOverTriggered = true
    running = false
    h.onGameOver?.(score)
  }

  function roadGeometry() {
    const horizonY = height * 0.24
    const footY = height * 0.72
    const cx = width * 0.5
    const spreadBase = width * 0.2
    return { horizonY, footY, cx, spreadBase }
  }

  function project(lane, p) {
    const { horizonY, footY, cx, spreadBase } = roadGeometry()
    const t = Math.max(0, Math.min(1, p))
    const spread = spreadBase * (0.06 + 0.94 * t)
    const x = cx + lane * spread
    const y = horizonY + (footY - horizonY) * t
    const scale = 0.14 + 0.86 * t
    return { x, y, scale }
  }

  function drawSky() {
    const { horizonY } = roadGeometry()
    const g = ctx.createLinearGradient(0, 0, 0, height)
    g.addColorStop(0, '#020612')
    g.addColorStop(0.35, '#0a1630')
    g.addColorStop(0.55, '#122040')
    g.addColorStop(1, '#1a2848')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, width, height)

    ctx.fillStyle = 'rgba(147, 197, 253, 0.15)'
    ctx.beginPath()
    ctx.ellipse(width * 0.72, horizonY - height * 0.08, width * 0.55, height * 0.28, -0.2, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)'
    ctx.lineWidth = 1.2
    for (let i = 0; i < 5; i++) {
      const yy = horizonY * 0.35 + i * 14
      ctx.beginPath()
      ctx.moveTo(0, yy)
      for (let x = 0; x <= width; x += 20) {
        ctx.lineTo(x, yy + Math.sin(x * 0.02 + deckScroll + i) * 2)
      }
      ctx.stroke()
    }
  }

  function drawIssDeck() {
    const { horizonY, footY, cx } = roadGeometry()
    ctx.fillStyle = 'rgba(30, 41, 59, 0.95)'
    ctx.beginPath()
    ctx.moveTo(0, footY + height * 0.25)
    ctx.lineTo(0, footY)
    ctx.lineTo(cx - width * 0.02, horizonY + 8)
    ctx.lineTo(cx + width * 0.02, horizonY + 8)
    ctx.lineTo(width, footY)
    ctx.lineTo(width, footY + height * 0.25)
    ctx.closePath()
    ctx.fill()

    ctx.strokeStyle = 'rgba(100, 116, 139, 0.9)'
    ctx.lineWidth = 2
    for (let lane = -1; lane <= 1; lane++) {
      const near = project(lane, 1)
      const far = project(lane, 0.02)
      ctx.beginPath()
      ctx.moveTo(far.x, far.y)
      ctx.lineTo(near.x, near.y)
      ctx.stroke()
    }

    const dashOff = (deckScroll * 40) % 40
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([14, 22])
    ctx.lineDashOffset = -dashOff
    for (let lane = -1; lane < 1; lane++) {
      const a0 = project(lane + 0.5, 0.1)
      const a1 = project(lane + 0.5, 1)
      ctx.beginPath()
      ctx.moveTo(a0.x, a0.y)
      ctx.lineTo(a1.x, a1.y)
      ctx.stroke()
    }
    ctx.setLineDash([])

    ctx.fillStyle = 'rgba(51, 65, 85, 0.8)'
    ctx.fillRect(0, footY, width * 0.04, height * 0.06)
    ctx.fillRect(width * 0.96, footY, width * 0.04, height * 0.06)
    ctx.fillStyle = 'rgba(71, 85, 105, 0.9)'
    for (let i = 0; i < 4; i++) {
      const px = width * 0.02 + i * 8
      ctx.fillRect(px, footY - 20 - i * 6, 6, 28 + i * 4)
      ctx.fillRect(width - px - 6, footY - 20 - i * 6, 6, 28 + i * 4)
    }
  }

  function drawMeteor(o) {
    const base = project(o.lane, o.p)
    const sway = Math.sin(o.wobble) * 6 * (1 - o.p)
    const x = base.x + sway
    const y =
      o.kind === 'high'
        ? base.y - height * 0.14 * base.scale - Math.sin(o.wobble * 1.3) * 4
        : base.y - height * 0.06 * base.scale
    const r = (26 + o.p * 18) * (height / 480) * (o.kind === 'high' ? 0.85 : 1)

    const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 1.8)
    glow.addColorStop(0, 'rgba(251, 191, 36, 0.55)')
    glow.addColorStop(0.5, 'rgba(239, 68, 68, 0.25)')
    glow.addColorStop(1, 'rgba(15, 23, 42, 0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(x, y, r * 1.8, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#57534e'
    ctx.beginPath()
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + o.wobble
      const rr = r * (0.75 + Math.sin(k * 2.1) * 0.12)
      const px = x + Math.cos(a) * rr * 0.35
      const py = y + Math.sin(a) * rr * 0.35
      if (k === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(41, 37, 36, 0.9)'
    ctx.lineWidth = 1.2
    ctx.stroke()

    ctx.strokeStyle = 'rgba(251, 146, 60, 0.75)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x - r * 1.8, y + r * 0.2)
    ctx.lineTo(x - r * 0.9, y)
    ctx.stroke()
  }

  function drawAstronaut() {
    const { footY } = roadGeometry()
    const pl = project(visualLane, 1)
    const bob = Math.sin(runPhase) * 5
    const x = pl.x
    const baseY = footY - height * 0.085 + bob + jumpY * 0.52

    const roll = rollTimer > 0
    const squat = roll ? height * 0.055 : 0

    ctx.save()
    ctx.translate(x, baseY + squat)
    if (roll) {
      ctx.rotate(1.15)
      ctx.translate(0, height * 0.02)
    }

    const sc = 0.95 * (height / 520)
    ctx.scale(sc, sc)

    ctx.fillStyle = '#e2e8f0'
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 2

    ctx.beginPath()
    ctx.arc(0, -42, 18, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = 'rgba(14, 165, 233, 0.35)'
    ctx.beginPath()
    ctx.arc(-5, -46, 8, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#cbd5e1'
    ctx.fillRect(-14, -26, 28, 38)
    ctx.strokeRect(-14, -26, 28, 38)

    const legPhase = Math.sin(runPhase * 1.3)
    ctx.strokeStyle = '#475569'
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-8, 12)
    ctx.lineTo(-10 + legPhase * 8, 38)
    ctx.moveTo(8, 12)
    ctx.lineTo(10 - legPhase * 8, 38)
    ctx.stroke()

    ctx.strokeStyle = '#64748b'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(-18, -8)
    ctx.lineTo(-32, 4 + legPhase * 6)
    ctx.moveTo(18, -8)
    ctx.lineTo(32, 4 - legPhase * 6)
    ctx.stroke()

    ctx.restore()
  }

  function drawHud() {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)'
    ctx.fillRect(8, 8, 220, 72)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)'
    ctx.strokeRect(8, 8, 220, 72)

    ctx.fillStyle = '#e0f2fe'
    ctx.font = `600 ${Math.max(13, Math.round(height * 0.028))}px system-ui`
    ctx.textAlign = 'left'
    ctx.fillText(`Distance · ${score}`, 18, 34)
    ctx.fillStyle = '#94a3b8'
    ctx.font = `${Math.max(11, Math.round(height * 0.023))}px system-ui`
    const line =
      rollTimer > 0
        ? 'Rolling…'
        : jumpY < -20
          ? 'Airborne'
          : 'Sprint'
    ctx.fillText(line, 18, 58)
  }

  function draw() {
    drawSky()
    drawIssDeck()
    const sorted = [...obstacles].sort((a, b) => a.p - b.p)
    for (const o of sorted) {
      if (o.p < 0.08) continue
      drawMeteor(o)
    }
    drawAstronaut()
    drawHud()
  }

  function loop(ts) {
    if (!running) return
    update(ts)
    if (!running) return
    draw()
    rafId = requestAnimationFrame(loop)
  }

  return {
    resize,
    reset,
    start() {
      gameOverTriggered = false
      resize()
      reset()
      running = true
      lastTs = 0
      rafId = requestAnimationFrame(loop)
    },
    stop() {
      running = false
      if (rafId) cancelAnimationFrame(rafId)
      rafId = 0
    },
  }
}
