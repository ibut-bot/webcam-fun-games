import { POSES, SKELETON, LIMB_SEGMENTS } from './dancePoses.js'
import { getDanceMusicElapsed } from './gameAudio.js'

const MIN_CONF = 0.3
const ANGLE_FULL_MATCH = 0.4    // ~23°
const ANGLE_PARTIAL_MATCH = 0.7 // ~40°
const MATCH_THRESHOLD = 0.5
const GREAT_THRESHOLD = 0.8

export function createDanceGame(canvas, hooks) {
  const h = hooks || {}
  const ctx = canvas.getContext('2d')

  let width = 320
  let height = 480
  let running = false
  let score = 0
  let song = null
  let currentPoseId = null
  let currentPose = null
  let matchQuality = 0
  let limbMatchMap = {}
  let combo = 0
  let bestCombo = 0
  let poseMatchedThisChange = false
  let showMatchText = 0
  let songProgress = 0
  let nextPoseCountdown = 0

  let userHipCenter = null
  let userScaleX = 0
  let userScaleY = 0
  let backdropTick = 0

  function resize() {
    const p = canvas.parentElement
    if (!p) return
    width = p.clientWidth
    height = p.clientHeight
    canvas.width = width
    canvas.height = height
  }

  function getCurrentPose() {
    if (!song) return null
    const elapsed = getDanceMusicElapsed()
    if (elapsed < 0) return null

    const currentBeat = elapsed * song.bpm / 60
    songProgress = Math.min(1, elapsed / song.duration)

    const choreo = song.choreography
    let poseEntry = choreo[0]
    let nextBeat = song.duration * song.bpm / 60

    for (let i = 0; i < choreo.length; i++) {
      if (choreo[i].beat <= currentBeat) {
        poseEntry = choreo[i]
        if (i + 1 < choreo.length) nextBeat = choreo[i + 1].beat
      }
    }

    nextPoseCountdown = nextBeat - currentBeat

    if (poseEntry.pose !== currentPoseId) {
      currentPoseId = poseEntry.pose
      currentPose = POSES[poseEntry.pose]
      poseMatchedThisChange = false
    }

    return currentPose
  }

  function normalizeUserPose(poseData) {
    const kps = poseData.keypoints
    const vw = poseData.videoWidth
    const vh = poseData.videoHeight

    const lh = kps[11], rh = kps[12], ls = kps[5], rs = kps[6]
    if (lh.score < MIN_CONF || rh.score < MIN_CONF || ls.score < MIN_CONF || rs.score < MIN_CONF) {
      return null
    }

    const hipCx = (lh.x + rh.x) / 2
    const hipCy = (lh.y + rh.y) / 2
    const shCx = (ls.x + rs.x) / 2
    const shCy = (ls.y + rs.y) / 2

    const torsoLen = Math.sqrt((hipCx - shCx) ** 2 + (hipCy - shCy) ** 2)
    if (torsoLen < 5) return null

    userHipCenter = { x: hipCx / vw, y: hipCy / vh }
    userScaleX = torsoLen / vw
    userScaleY = torsoLen / vh

    const norm = {}
    for (let i = 5; i <= 16; i++) {
      const kp = kps[i]
      if (kp.score >= MIN_CONF) {
        norm[i] = {
          x: (kp.x - hipCx) / torsoLen,
          y: (kp.y - hipCy) / torsoLen,
        }
      }
    }
    return norm
  }

  function angleDiff(a, b) {
    let d = a - b
    while (d > Math.PI) d -= 2 * Math.PI
    while (d < -Math.PI) d += 2 * Math.PI
    return Math.abs(d)
  }

  function comparePoses(userNorm, target) {
    const results = {}
    let total = 0
    let count = 0

    for (const seg of LIMB_SEGMENTS) {
      const uA = userNorm[seg.from]
      const uB = userNorm[seg.to]
      const tA = target.joints[seg.from]
      const tB = target.joints[seg.to]
      if (!uA || !uB || !tA || !tB) continue

      const uAngle = Math.atan2(uB.y - uA.y, uB.x - uA.x)
      const tAngle = Math.atan2(tB.y - tA.y, tB.x - tA.x)
      const diff = angleDiff(uAngle, tAngle)

      let m = 0
      if (diff < ANGLE_FULL_MATCH) m = 1
      else if (diff < ANGLE_PARTIAL_MATCH) m = 0.5

      const key = `${seg.from}-${seg.to}`
      results[key] = m
      total += m
      count++
    }

    return { overall: count > 0 ? total / count : 0, limbs: results }
  }

  /* ── coordinate helpers ────────────────────────────── */

  function toCanvas(normX, normY) {
    return { x: (1 - normX) * width, y: normY * height }
  }

  function targetJointToCanvas(joint) {
    const cx = userHipCenter ? userHipCenter.x : 0.5
    const cy = userHipCenter ? userHipCenter.y : 0.4
    const sx = userScaleX || 0.12
    const sy = userScaleY || 0.16
    return toCanvas(cx + joint.x * sx, cy + joint.y * sy)
  }

  /* ── update ────────────────────────────────────────── */

  function update() {
    if (!running) return

    const elapsed = getDanceMusicElapsed()
    if (elapsed >= song.duration) {
      running = false
      h.onGameOver?.(score)
      return
    }

    const target = getCurrentPose()
    if (!target) return

    const poseData = h.getPoseKeypoints?.()
    if (!poseData || !poseData.keypoints) {
      matchQuality = 0
      limbMatchMap = {}
      combo = 0
      return
    }

    const userNorm = normalizeUserPose(poseData)
    if (!userNorm || Object.keys(userNorm).length < 4) {
      matchQuality = 0
      limbMatchMap = {}
      combo = 0
      return
    }

    const match = comparePoses(userNorm, target)
    matchQuality = match.overall
    limbMatchMap = match.limbs

    if (matchQuality >= MATCH_THRESHOLD) {
      const pts = matchQuality >= GREAT_THRESHOLD ? 3 : matchQuality >= 0.65 ? 2 : 1
      score += pts
      combo++
      if (combo > bestCombo) bestCombo = combo
      if (!poseMatchedThisChange && matchQuality >= 0.6) {
        poseMatchedThisChange = true
        showMatchText = 70
        h.onPoseMatch?.()
      }
      h.onScore?.(score)
    } else {
      combo = 0
    }

    if (showMatchText > 0) showMatchText--
  }

  /* ── drawing ───────────────────────────────────────── */

  function segMatchColor(key) {
    const m = limbMatchMap[key]
    if (m === undefined) return null
    if (m >= 0.8) return '#00ff88'
    if (m >= 0.4) return '#ffd700'
    return '#ff4444'
  }

  function drawMatchGlow(target, poseData) {
    if (matchQuality < MATCH_THRESHOLD || !target) return
    if (!poseData?.keypoints) return
    const kps = poseData.keypoints
    const vw = poseData.videoWidth
    const vh = poseData.videoHeight

    const pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.006)
    const glowAlpha = Math.min(1, (matchQuality - MATCH_THRESHOLD) * 2) * pulse

    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalCompositeOperation = 'screen'

    for (const [i, j] of SKELETON) {
      const tA = target.joints[i], tB = target.joints[j]
      if (!tA || !tB) continue
      const uA = kps[i], uB = kps[j]
      if (uA.score < MIN_CONF || uB.score < MIN_CONF) continue

      const pt = targetJointToCanvas(tA)
      const pt2 = targetJointToCanvas(tB)
      const pu = toCanvas(uA.x / vw, uA.y / vh)
      const pu2 = toCanvas(uB.x / vw, uB.y / vh)
      const mx1 = (pt.x + pu.x) / 2, my1 = (pt.y + pu.y) / 2
      const mx2 = (pt2.x + pu2.x) / 2, my2 = (pt2.y + pu2.y) / 2

      ctx.lineWidth = 44
      ctx.strokeStyle = `rgba(0, 255, 180, ${glowAlpha * 0.08})`
      ctx.beginPath(); ctx.moveTo(mx1, my1); ctx.lineTo(mx2, my2); ctx.stroke()

      ctx.lineWidth = 30
      ctx.strokeStyle = `rgba(0, 255, 200, ${glowAlpha * 0.14})`
      ctx.beginPath(); ctx.moveTo(mx1, my1); ctx.lineTo(mx2, my2); ctx.stroke()
    }

    for (const idx of Object.keys(target.joints)) {
      const tJ = target.joints[idx]
      const iNum = Number(idx)
      const uKp = kps[iNum]
      if (!uKp || uKp.score < MIN_CONF) continue
      const pt = targetJointToCanvas(tJ)
      const pu = toCanvas(uKp.x / vw, uKp.y / vh)
      const mx = (pt.x + pu.x) / 2, my = (pt.y + pu.y) / 2

      ctx.fillStyle = `rgba(0, 255, 200, ${glowAlpha * 0.18})`
      ctx.beginPath(); ctx.arc(mx, my, 20, 0, Math.PI * 2); ctx.fill()
    }

    ctx.restore()
  }

  function drawTargetPose(target) {
    if (!target) return

    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.lineWidth = 32
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.12)'
    for (const [i, j] of SKELETON) {
      const a = target.joints[i], b = target.joints[j]
      if (!a || !b) continue
      const pa = targetJointToCanvas(a), pb = targetJointToCanvas(b)
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke()
    }

    ctx.lineWidth = 20
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.7)'
    for (const [i, j] of SKELETON) {
      const a = target.joints[i], b = target.joints[j]
      if (!a || !b) continue
      const pa = targetJointToCanvas(a), pb = targetJointToCanvas(b)
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke()
    }

    ctx.lineWidth = 10
    ctx.strokeStyle = 'rgba(200, 245, 255, 0.9)'
    for (const [i, j] of SKELETON) {
      const a = target.joints[i], b = target.joints[j]
      if (!a || !b) continue
      const pa = targetJointToCanvas(a), pb = targetJointToCanvas(b)
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke()
    }

    ctx.fillStyle = 'rgba(200, 245, 255, 0.95)'
    for (const idx of Object.keys(target.joints)) {
      const p = targetJointToCanvas(target.joints[idx])
      ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, Math.PI * 2); ctx.fill()
    }

    ctx.restore()
  }

  function drawUserPose(poseData) {
    if (!poseData?.keypoints) return
    const kps = poseData.keypoints
    const vw = poseData.videoWidth
    const vh = poseData.videoHeight

    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    for (const [i, j] of SKELETON) {
      const a = kps[i], b = kps[j]
      if (a.score < MIN_CONF || b.score < MIN_CONF) continue

      const pa = toCanvas(a.x / vw, a.y / vh)
      const pb = toCanvas(b.x / vw, b.y / vh)

      ctx.lineWidth = 3
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke()
    }

    for (let i = 5; i <= 16; i++) {
      const kp = kps[i]
      if (kp.score < MIN_CONF) continue
      const p = toCanvas(kp.x / vw, kp.y / vh)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
      ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill()
    }

    ctx.restore()
  }

  function drawCosmosBackdrop() {
    const g = ctx.createLinearGradient(0, 0, width, height)
    g.addColorStop(0, 'rgba(22, 14, 48, 0.55)')
    g.addColorStop(0.5, 'rgba(12, 18, 42, 0.45)')
    g.addColorStop(1, 'rgba(8, 10, 32, 0.52)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, width, height)
    const n = 36
    for (let i = 0; i < n; i++) {
      const t = backdropTick * 0.025 + i
      const sx = ((Math.sin(i * 12.9898 + t * 0.01) * 0.5 + 0.5) * width)
      const sy = ((Math.cos(i * 4.141 + t * 0.008) * 0.5 + 0.5) * height)
      const a = 0.08 + 0.12 * Math.sin(t + i)
      ctx.fillStyle = `rgba(167, 196, 255, ${a})`
      ctx.beginPath()
      ctx.arc(sx, sy, 0.9, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  function drawHUD() {
    ctx.save()

    const sz = Math.min(width, height)
    const poseFontSize = Math.max(32, Math.round(sz * 0.06))
    const scoreFontSize = Math.max(28, Math.round(sz * 0.05))
    const matchBarW = Math.max(140, Math.round(width * 0.22))
    const matchBarH = Math.max(12, Math.round(sz * 0.02))

    if (currentPose) {
      ctx.font = `bold ${poseFontSize}px system-ui`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.strokeStyle = 'rgba(0,0,0,0.75)'
      ctx.lineWidth = 5
      ctx.strokeText(currentPose.name, width / 2, 14)
      ctx.fillStyle = '#fff'
      ctx.fillText(currentPose.name, width / 2, 14)
    }

    const barX = width / 2 - matchBarW / 2
    const barY = 18 + poseFontSize + 6
    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    ctx.beginPath()
    ctx.roundRect(barX, barY, matchBarW, matchBarH, matchBarH / 2)
    ctx.fill()
    const fc = matchQuality >= GREAT_THRESHOLD ? '#00ff88'
      : matchQuality >= MATCH_THRESHOLD ? '#ffd700' : '#ff4444'
    ctx.fillStyle = fc
    ctx.beginPath()
    ctx.roundRect(barX, barY, matchBarW * matchQuality, matchBarH, matchBarH / 2)
    ctx.fill()

    const pctFontSize = Math.max(16, Math.round(sz * 0.028))
    ctx.font = `bold ${pctFontSize}px system-ui`
    ctx.textAlign = 'center'
    ctx.fillStyle = fc
    ctx.fillText(Math.round(matchQuality * 100) + '% match', width / 2, barY + matchBarH + pctFontSize + 2)

    if (combo > 30) {
      const comboSize = Math.max(22, Math.round(sz * 0.04))
      ctx.font = `bold ${comboSize}px system-ui`
      ctx.textAlign = 'right'
      ctx.textBaseline = 'top'
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'
      ctx.lineWidth = 4
      ctx.strokeText(`×${Math.floor(combo / 30) + 1} combo`, width - 16, 14)
      ctx.fillStyle = '#ffd700'
      ctx.fillText(`×${Math.floor(combo / 30) + 1} combo`, width - 16, 14)
    }

    ctx.font = `bold ${scoreFontSize}px system-ui`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.strokeStyle = 'rgba(0,0,0,0.65)'
    ctx.lineWidth = 4
    ctx.strokeText('Score: ' + score, 14, 14)
    ctx.fillStyle = '#fff'
    ctx.fillText('Score: ' + score, 14, 14)

    const pgY = height - 8
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.fillRect(0, pgY, width, 6)
    ctx.fillStyle = 'rgba(0, 229, 255, 0.8)'
    ctx.fillRect(0, pgY, width * songProgress, 6)

    if (showMatchText > 0) {
      const alpha = Math.min(1, showMatchText / 20)
      const matchFontSize = Math.max(64, Math.round(sz * 0.13))
      const scale = 1 + (1 - alpha) * 0.15
      ctx.font = `bold ${matchFontSize}px system-ui`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.save()
      ctx.translate(width / 2, height / 2 - sz * 0.06)
      ctx.scale(scale, scale)
      ctx.strokeStyle = `rgba(0,0,0,${alpha * 0.6})`
      ctx.lineWidth = 6
      ctx.strokeText('MATCHED!', 0, 0)
      ctx.shadowColor = 'rgba(0, 255, 136, 0.7)'
      ctx.shadowBlur = 30
      ctx.fillStyle = `rgba(0, 255, 136, ${alpha})`
      ctx.fillText('MATCHED!', 0, 0)
      ctx.restore()
    }

    if (nextPoseCountdown > 0 && nextPoseCountdown <= 2 && song) {
      const alpha = Math.min(1, (2 - nextPoseCountdown) * 0.8)
      const nextSize = Math.max(18, Math.round(sz * 0.032))
      ctx.font = `bold ${nextSize}px system-ui`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillStyle = `rgba(255, 180, 0, ${alpha})`
      ctx.fillText('Next pose coming…', width / 2, height - 22)
    }

    ctx.restore()
  }

  function draw() {
    ctx.clearRect(0, 0, width, height)
    backdropTick++
    drawCosmosBackdrop()
    const pd = h.getPoseKeypoints?.()
    drawMatchGlow(currentPose, pd)
    drawTargetPose(currentPose)
    drawUserPose(pd)
    drawHUD()
  }

  function loop() {
    if (!running) return
    update()
    draw()
    requestAnimationFrame(loop)
  }

  return {
    resize,
    start(songObj) {
      song = songObj
      backdropTick = 0
      score = 0; matchQuality = 0; limbMatchMap = {}
      combo = 0; bestCombo = 0; currentPoseId = null; currentPose = null
      poseMatchedThisChange = false; showMatchText = 0; songProgress = 0
      nextPoseCountdown = 0; userHipCenter = null; userScaleX = 0; userScaleY = 0
      running = true
      h.onScore?.(0)
      loop()
    },
    stop() { running = false },
  }
}
