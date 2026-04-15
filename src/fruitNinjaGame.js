export function createFruitNinjaGame(canvas, hooks) {
  const h = hooks || {}
  const ctx = canvas.getContext('2d')

  let width = 320
  let height = 480
  let running = false
  let score = 0
  let lives = 3
  let frameCount = 0

  const GRAVITY = 0.055
  const MAX_MISSES = 3
  const BLADE_TRAIL_MS = 200
  const SPAWN_PAUSE = 45

  let fruits = []
  let particles = []
  let splats = []
  let slashLines = []
  let bladeTrail = { left: [], right: [] }
  let missCount = 0
  let spawnDelay = 0
  let lastHandPos = { left: null, right: null }
  let handSpeedHistory = { left: [], right: [] }
  let screenFlash = 0
  const SPEED_HISTORY_LEN = 5
  const SLASH_AVG_THRESHOLD = 18

  const TARGET_TYPES = [
    { name: 'asteroid', kind: 'asteroid', color: '#78716c', inner: '#d6d3d1', dark: '#3f3f46', rFactor: 0.078, pts: 1 },
    { name: 'asteroid_b', kind: 'asteroid', color: '#57534e', inner: '#a8a29e', dark: '#292524', rFactor: 0.082, pts: 1 },
    { name: 'ufo', kind: 'ufo', color: '#94a3b8', inner: '#f1f5f9', dark: '#334155', rFactor: 0.068, pts: 1 },
    { name: 'planet', kind: 'planet', color: '#3b82f6', inner: '#bfdbfe', dark: '#1e3a8a', rFactor: 0.08, pts: 1 },
    { name: 'planet_b', kind: 'planet', color: '#7c3aed', inner: '#ddd6fe', dark: '#4c1d95', rFactor: 0.076, pts: 2 },
    { name: 'sun', kind: 'sun', color: '#f59e0b', inner: '#fef3c7', dark: '#b45309', rFactor: 0.072, pts: 2 },
  ]

  const BOMB = {
    name: 'blackhole',
    kind: 'blackhole',
    color: '#020617',
    inner: '#a855f7',
    dark: '#000000',
    rFactor: 0.072,
  }

  function rad(type) {
    return Math.max(24, Math.round(type.rFactor * Math.min(width, height)))
  }

  function resize() {
    const p = canvas.parentElement
    width = p.clientWidth
    height = p.clientHeight
    canvas.width = width
    canvas.height = height
  }

  function spawnFruit() {
    const isBomb = score > 2 && Math.random() < Math.min(0.15, 0.06 + score * 0.004)
    const type = isBomb ? BOMB : TARGET_TYPES[Math.floor(Math.random() * TARGET_TYPES.length)]
    const r = rad(type)
    const x = width * 0.15 + Math.random() * width * 0.7
    const y = height + r
    const peakH = height * (0.78 + Math.random() * 0.18)
    const vy = -Math.sqrt(2 * GRAVITY * peakH)
    const vx = (Math.random() - 0.5) * width * 0.004

    fruits.push({
      x, y, vx, vy, type, isBomb, radius: r,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.06,
      sliced: false, missed: false, halves: null,
    })
  }

  function addJuice(f) {
    const n = 16 + Math.floor(Math.random() * 10)
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const sp = 1.5 + Math.random() * 4
      particles.push({
        x: f.x + (Math.random() - 0.5) * f.radius,
        y: f.y + (Math.random() - 0.5) * f.radius,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2,
        color: i < n / 2 ? f.type.color : f.type.inner,
        r: 3 + Math.random() * 5, life: 1, decay: 0.012 + Math.random() * 0.01,
      })
    }
    splats.push({
      x: f.x, y: f.y, r: f.radius * 2, color: f.type.inner,
      life: 1, decay: 0.005,
    })
  }

  function addExplosion(f) {
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2
      const sp = 2 + Math.random() * 6
      particles.push({
        x: f.x, y: f.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        color: ['#f97316', '#a855f7', '#fef08a', '#e2e8f0'][i % 4],
        r: 3 + Math.random() * 7, life: 1, decay: 0.016 + Math.random() * 0.016,
      })
    }
    screenFlash = 14
  }

  function addSlashLine(f, angle) {
    const len = f.radius * 6 + 120
    const dx = Math.cos(angle) * len
    const dy = Math.sin(angle) * len
    slashLines.push({
      x1: f.x - dx, y1: f.y - dy,
      x2: f.x + dx, y2: f.y + dy,
      color: f.type.inner,
      life: 1, decay: 0.008,
    })
  }

  function sliceFruit(f, angle) {
    f.sliced = true
    const px = Math.cos(angle + Math.PI / 2)
    const py = Math.sin(angle + Math.PI / 2)
    f.halves = [
      { x: f.x, y: f.y, vx: f.vx + px * 3, vy: f.vy + py * 3 - 1.5, rot: f.rotation, rs: f.rotSpeed + 0.07 },
      { x: f.x, y: f.y, vx: f.vx - px * 3, vy: f.vy - py * 3 - 1.5, rot: f.rotation, rs: f.rotSpeed - 0.07 },
    ]
    addSlashLine(f, angle)
    addJuice(f)
  }

  function segDist(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1
    const len2 = dx * dx + dy * dy
    if (len2 === 0) return Math.hypot(px - x1, py - y1)
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2))
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
  }

  function checkHits(x1, y1, x2, y2) {
    const angle = Math.atan2(y2 - y1, x2 - x1)

    for (const f of fruits) {
      if (f.sliced) continue
      if (segDist(f.x, f.y, x1, y1, x2, y2) < f.radius + 15) {
        if (f.isBomb) {
          addExplosion(f)
          f.sliced = true
          f.halves = []
          lives--
          h.onBombHit?.()
          if (lives <= 0) {
            running = false
            h.onGameOver?.(score)
            return
          }
        } else {
          sliceFruit(f, angle)
          score++
          h.onScore?.(score)
          h.onSlice?.()
        }
      }
    }
  }

  function avgSpeed(side) {
    const hist = handSpeedHistory[side]
    if (hist.length === 0) return 0
    let sum = 0
    for (let i = 0; i < hist.length; i++) sum += hist[i]
    return sum / hist.length
  }

  function updateBlade() {
    const pos = h.getHandPositions?.()
    if (!pos) return
    const now = Date.now()

    for (const side of ['left', 'right']) {
      const hand = pos[side]
      if (!hand || hand.confidence < 0.25) {
        lastHandPos[side] = null
        handSpeedHistory[side] = []
        continue
      }
      const gx = (1 - hand.x) * width
      const gy = hand.y * height
      const prev = lastHandPos[side]

      if (prev) {
        const speed = Math.hypot(gx - prev.x, gy - prev.y)

        handSpeedHistory[side].push(speed)
        if (handSpeedHistory[side].length > SPEED_HISTORY_LEN) {
          handSpeedHistory[side].shift()
        }

        const avg = avgSpeed(side)
        const isSlashing = avg >= SLASH_AVG_THRESHOLD

        if (speed > 3) {
          bladeTrail[side].push({ x: gx, y: gy, t: now, speed })
        }

        if (isSlashing) {
          checkHits(prev.x, prev.y, gx, gy)
        }
      } else {
        handSpeedHistory[side] = []
      }

      lastHandPos[side] = { x: gx, y: gy }
      bladeTrail[side] = bladeTrail[side].filter(p => p.t > now - BLADE_TRAIL_MS)
    }
  }

  function update() {
    if (!running) return
    frameCount++
    if (screenFlash > 0) screenFlash--

    const hasActive = fruits.some(f => !f.sliced)
    if (!hasActive) {
      if (spawnDelay <= 0) {
        spawnFruit()
        spawnDelay = SPAWN_PAUSE
      } else {
        spawnDelay--
      }
    }

    updateBlade()

    for (let i = fruits.length - 1; i >= 0; i--) {
      const f = fruits[i]
      if (f.sliced && f.halves) {
        let gone = true
        for (const hl of f.halves) {
          hl.vy += GRAVITY
          hl.x += hl.vx
          hl.y += hl.vy
          hl.rot += hl.rs
          if (hl.y < height + 120) gone = false
        }
        if (gone || f.halves.length === 0) fruits.splice(i, 1)
      } else if (!f.sliced) {
        f.vy += GRAVITY
        f.x += f.vx
        f.y += f.vy
        f.rotation += f.rotSpeed
        if (f.y > height + f.radius * 2 && f.vy > 0) {
          if (!f.isBomb && !f.missed) {
            f.missed = true
            missCount++
            if (missCount >= MAX_MISSES) {
              missCount = 0
              lives--
              if (lives <= 0) {
                running = false
                h.onGameOver?.(score)
                return
              }
            }
          }
          fruits.splice(i, 1)
        }
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.vy += 0.05
      p.x += p.vx
      p.y += p.vy
      p.life -= p.decay
      if (p.life <= 0) particles.splice(i, 1)
    }

    for (let i = splats.length - 1; i >= 0; i--) {
      splats[i].life -= splats[i].decay
      if (splats[i].life <= 0) splats.splice(i, 1)
    }

    for (let i = slashLines.length - 1; i >= 0; i--) {
      slashLines[i].life -= slashLines[i].decay
      if (slashLines[i].life <= 0) slashLines.splice(i, 1)
    }
  }

  /* ── drawing ─────────────────────────────────────── */

  function lighten(hex, n) {
    const v = parseInt(hex.slice(1), 16)
    const r = Math.min(255, (v >> 16) + n)
    const g = Math.min(255, ((v >> 8) & 0xff) + n)
    const b = Math.min(255, (v & 0xff) + n)
    return `rgb(${r},${g},${b})`
  }

  function drawShadowDrop(r) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)'
    ctx.beginPath()
    ctx.ellipse(4, 6, r * 0.95, r * 0.88, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  function drawAsteroidRock(type, r) {
    const n = 10
    ctx.beginPath()
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2
      const jitter = r * (0.88 + Math.sin(i * 2.17 + 0.3) * 0.14 + (i % 3) * 0.03)
      const x = Math.cos(a) * jitter
      const y = Math.sin(a) * jitter * 0.92
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    const grd = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.05, 0, 0, r)
    grd.addColorStop(0, lighten(type.color, 40))
    grd.addColorStop(0.55, type.color)
    grd.addColorStop(1, type.dark)
    ctx.fillStyle = grd
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.beginPath()
    ctx.arc(r * 0.25, r * 0.15, r * 0.14, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(-r * 0.2, -r * 0.28, r * 0.08, 0, Math.PI * 2)
    ctx.fill()
  }

  function drawUFOTarget(type, r) {
    const domeH = r * 0.42
    const diskRy = r * 0.28
    const diskRx = r * 0.9
    const domeGrd = ctx.createRadialGradient(0, -domeH * 0.2, 0, 0, -domeH * 0.15, r * 0.5)
    domeGrd.addColorStop(0, type.inner)
    domeGrd.addColorStop(0.6, type.color)
    domeGrd.addColorStop(1, type.dark)
    ctx.fillStyle = domeGrd
    ctx.beginPath()
    ctx.arc(0, -domeH * 0.15, r * 0.38, Math.PI, 0)
    ctx.lineTo(r * 0.38, domeH * 0.2)
    ctx.quadraticCurveTo(0, domeH * 0.55, -r * 0.38, domeH * 0.2)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(15,23,42,0.5)'
    ctx.lineWidth = 1.2
    ctx.stroke()
    const diskGrd = ctx.createLinearGradient(-diskRx, 0, diskRx, 0)
    diskGrd.addColorStop(0, type.dark)
    diskGrd.addColorStop(0.2, type.color)
    diskGrd.addColorStop(0.5, lighten(type.color, 35))
    diskGrd.addColorStop(0.8, type.color)
    diskGrd.addColorStop(1, type.dark)
    ctx.fillStyle = diskGrd
    ctx.beginPath()
    ctx.ellipse(0, domeH * 0.32, diskRx, diskRy, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(15,23,42,0.45)'
    ctx.lineWidth = 1.2
    ctx.stroke()
    const blink = 0.5 + 0.5 * Math.sin(frameCount * 0.2)
    ctx.fillStyle = `rgba(56, 189, 248, ${0.5 + blink * 0.45})`
    for (let li = -1; li <= 1; li++) {
      ctx.beginPath()
      ctx.arc(li * diskRx * 0.55, domeH * 0.32 + li * 2, r * 0.06, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = `rgba(253, 224, 71, ${0.35 + blink * 0.3})`
    ctx.beginPath()
    ctx.arc(0, domeH * 0.28, r * 0.055, 0, Math.PI * 2)
    ctx.fill()
  }

  function drawPlanetTarget(type, r) {
    const grd = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.08, 0, 0, r)
    grd.addColorStop(0, type.inner)
    grd.addColorStop(0.35, lighten(type.color, 25))
    grd.addColorStop(0.65, type.color)
    grd.addColorStop(1, type.dark)
    ctx.fillStyle = grd
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.lineWidth = r * 0.045
    for (let b = -1; b <= 1; b++) {
      ctx.beginPath()
      ctx.ellipse(0, b * r * 0.35, r * 0.88, r * 0.18, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(r * 0.55, -r * 0.45, r * 0.12, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'
    ctx.beginPath()
    ctx.ellipse(0, 0, r * 1.25, r * 0.42, -0.25, 0, Math.PI * 2)
    ctx.stroke()
  }

  function drawSunTarget(type, r) {
    const corona = ctx.createRadialGradient(0, 0, r * 0.15, 0, 0, r * 1.35)
    corona.addColorStop(0, '#fffbeb')
    corona.addColorStop(0.25, type.inner)
    corona.addColorStop(0.55, type.color)
    corona.addColorStop(0.85, 'rgba(251, 146, 60, 0.35)')
    corona.addColorStop(1, 'rgba(251, 146, 60, 0)')
    ctx.fillStyle = corona
    ctx.beginPath()
    ctx.arc(0, 0, r * 1.28, 0, Math.PI * 2)
    ctx.fill()
    const core = ctx.createRadialGradient(-r * 0.2, -r * 0.25, 0, 0, 0, r * 0.75)
    core.addColorStop(0, '#fffde7')
    core.addColorStop(0.45, type.inner)
    core.addColorStop(1, type.dark)
    ctx.fillStyle = core
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(250, 250, 250, 0.35)'
    ctx.lineWidth = 1.2
    ctx.stroke()
    const flare = (frameCount * 0.08) % (Math.PI * 2)
    for (let k = 0; k < 8; k++) {
      const a = flare + (k / 8) * Math.PI * 2
      const len = r * (1.05 + (k % 2) * 0.12)
      ctx.strokeStyle = `rgba(254, 243, 199, ${0.15 + (k % 3) * 0.08})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55)
      ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len)
      ctx.stroke()
    }
  }

  function drawSliceTarget(type, r) {
    drawShadowDrop(r)
    switch (type.kind) {
      case 'asteroid':
        drawAsteroidRock(type, r)
        break
      case 'ufo':
        drawUFOTarget(type, r)
        break
      case 'planet':
        drawPlanetTarget(type, r)
        break
      case 'sun':
        drawSunTarget(type, r)
        break
      default:
        drawAsteroidRock(type, r)
    }
  }

  function drawBlackHole(r) {
    drawShadowDrop(r)
    const spin = frameCount * 0.03
    ctx.save()
    ctx.rotate(spin * 0.4)
    const disk = ctx.createRadialGradient(0, 0, r * 0.25, 0, 0, r * 1.15)
    disk.addColorStop(0, 'rgba(0,0,0,0)')
    disk.addColorStop(0.35, 'rgba(249, 115, 22, 0.45)')
    disk.addColorStop(0.52, 'rgba(192, 38, 211, 0.38)')
    disk.addColorStop(0.68, 'rgba(59, 130, 246, 0.22)')
    disk.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = disk
    ctx.beginPath()
    ctx.ellipse(0, 0, r * 1.12, r * 0.48, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.55)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(0, 0, r * 1.08, r * 0.44, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()

    const lens = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.62)
    lens.addColorStop(0, 'rgba(15, 23, 42, 0.95)')
    lens.addColorStop(0.72, '#000000')
    lens.addColorStop(0.88, 'rgba(168, 85, 247, 0.35)')
    lens.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = lens
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.58, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#000000'
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.38, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = `rgba(255,255,255,${0.12 + 0.08 * Math.sin(frameCount * 0.12)})`
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.52, 0, Math.PI * 2)
    ctx.stroke()
  }

  function drawCosmicBackdrop() {
    const g = ctx.createLinearGradient(0, 0, 0, height)
    g.addColorStop(0, 'rgba(12, 10, 36, 0.72)')
    g.addColorStop(0.45, 'rgba(18, 12, 52, 0.68)')
    g.addColorStop(1, 'rgba(8, 6, 28, 0.72)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, width, height)
    const n = 48
    const phi = 0.6180339887
    for (let i = 0; i < n; i++) {
      const sx = ((i * phi + frameCount * 0.003 * (1 + i * 0.02)) % 1) * width
      const sy = ((i * 0.4142 + frameCount * 0.0018) % 1) * height
      const a = 0.1 + 0.22 * Math.sin(frameCount * 0.04 + i * 0.7)
      ctx.fillStyle = `rgba(186, 230, 253, ${a})`
      ctx.beginPath()
      ctx.arc(sx, sy, i % 4 === 0 ? 1.5 : 0.85, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  function drawWholeFruit(f) {
    ctx.save()
    ctx.translate(f.x, f.y)
    ctx.rotate(f.rotation)
    f.isBomb ? drawBlackHole(f.radius) : drawSliceTarget(f.type, f.radius)
    ctx.restore()
  }

  function drawHalf(f, hl, idx) {
    ctx.save()
    ctx.translate(hl.x, hl.y)
    ctx.rotate(hl.rot)
    const r = f.radius
    ctx.beginPath()
    if (idx === 0) ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2)
    else ctx.arc(0, 0, r, Math.PI / 2, -Math.PI / 2)
    ctx.closePath()
    ctx.fillStyle = f.type.color
    ctx.fill()

    ctx.beginPath()
    if (idx === 0) ctx.arc(0, 0, r * 0.72, -Math.PI / 2, Math.PI / 2)
    else ctx.arc(0, 0, r * 0.72, Math.PI / 2, -Math.PI / 2)
    ctx.closePath()
    ctx.fillStyle = f.type.inner
    ctx.fill()
    ctx.restore()
  }

  function drawBladeHand(trail) {
    if (trail.length < 2) return
    const now = Date.now()
    for (let i = 1; i < trail.length; i++) {
      const a = trail[i - 1], b = trail[i]
      const age = (now - b.t) / BLADE_TRAIL_MS
      const alpha = Math.max(0, 1 - age)
      const w = Math.min(16, 4 + b.speed * 0.07) * alpha
      if (alpha <= 0 || w < 0.5) continue

      ctx.strokeStyle = `rgba(180,210,255,${alpha * 0.3})`
      ctx.lineWidth = w + 10
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()

      ctx.strokeStyle = `rgba(220,235,255,${alpha * 0.85})`
      ctx.lineWidth = w
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()

      ctx.strokeStyle = `rgba(255,255,255,${alpha})`
      ctx.lineWidth = Math.max(1, w * 0.35)
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
    }
  }

  function drawBlade() {
    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    drawBladeHand(bladeTrail.left)
    drawBladeHand(bladeTrail.right)
    ctx.restore()
  }

  function drawHeart(cx, cy, sz, fill) {
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.moveTo(cx, cy + sz * 0.3)
    ctx.bezierCurveTo(cx, cy - sz * 0.3, cx - sz, cy - sz * 0.3, cx - sz, cy + sz * 0.1)
    ctx.bezierCurveTo(cx - sz, cy + sz * 0.6, cx, cy + sz, cx, cy + sz * 1.2)
    ctx.bezierCurveTo(cx, cy + sz, cx + sz, cy + sz * 0.6, cx + sz, cy + sz * 0.1)
    ctx.bezierCurveTo(cx + sz, cy - sz * 0.3, cx, cy - sz * 0.3, cx, cy + sz * 0.3)
    ctx.fill()
  }

  function draw() {
    ctx.clearRect(0, 0, width, height)
    drawCosmicBackdrop()

    if (screenFlash > 0) {
      ctx.fillStyle = `rgba(255,40,20,${screenFlash / 28})`
      ctx.fillRect(0, 0, width, height)
    }

    for (const sp of splats) {
      ctx.globalAlpha = sp.life * 0.35
      ctx.fillStyle = sp.color
      ctx.beginPath()
      ctx.arc(sp.x, sp.y, sp.r * (1 + (1 - sp.life) * 0.5), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    for (const p of particles) {
      ctx.globalAlpha = p.life
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    for (const f of fruits) {
      if (f.sliced && f.halves && f.halves.length) {
        f.halves.forEach((hl, idx) => drawHalf(f, hl, idx))
      } else if (!f.sliced) {
        drawWholeFruit(f)
      }
    }

    for (const sl of slashLines) {
      ctx.save()
      ctx.globalAlpha = sl.life
      ctx.lineCap = 'round'

      ctx.shadowColor = sl.color
      ctx.shadowBlur = 30 * sl.life

      ctx.strokeStyle = `rgba(255,255,255,${sl.life * 0.35})`
      ctx.lineWidth = 40 * sl.life
      ctx.beginPath(); ctx.moveTo(sl.x1, sl.y1); ctx.lineTo(sl.x2, sl.y2); ctx.stroke()

      ctx.strokeStyle = sl.color
      ctx.lineWidth = 18 * sl.life
      ctx.beginPath(); ctx.moveTo(sl.x1, sl.y1); ctx.lineTo(sl.x2, sl.y2); ctx.stroke()

      ctx.shadowBlur = 0
      ctx.strokeStyle = `rgba(255,255,255,${sl.life})`
      ctx.lineWidth = 6 * sl.life
      ctx.beginPath(); ctx.moveTo(sl.x1, sl.y1); ctx.lineTo(sl.x2, sl.y2); ctx.stroke()

      ctx.restore()
    }

    drawBlade()

    /* HUD */
    ctx.fillStyle = '#fff'
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'
    ctx.lineWidth = 3
    ctx.font = 'bold 24px system-ui'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.strokeText('Score: ' + score, 14, 14)
    ctx.fillText('Score: ' + score, 14, 14)

    for (let i = 0; i < 3; i++) drawHeart(width - 38 - i * 32, 18, 11, i < lives ? '#22d3ee' : 'rgba(80,90,120,0.5)')

    if (missCount > 0) {
      ctx.font = '16px system-ui'
      ctx.textAlign = 'right'
      ctx.fillStyle = 'rgba(255,120,120,0.9)'
      ctx.strokeText(`Misses: ${missCount}/${MAX_MISSES}`, width - 14, 48)
      ctx.fillText(`Misses: ${missCount}/${MAX_MISSES}`, width - 14, 48)
    }
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
  }

  function loop() {
    update()
    draw()
    if (running) requestAnimationFrame(loop)
  }

  function reset() {
    fruits = []
    particles = []
    splats = []
    slashLines = []
    bladeTrail = { left: [], right: [] }
    score = 0
    lives = 3
    frameCount = 0
    missCount = 0
    spawnDelay = 30
    lastHandPos = { left: null, right: null }
    handSpeedHistory = { left: [], right: [] }
    screenFlash = 0
    running = true
    h.onScore?.(0)
  }

  return {
    resize,
    start() { resize(); reset(); loop() },
    stop() { running = false },
    isRunning() { return running },
    getScore() { return score },
  }
}
