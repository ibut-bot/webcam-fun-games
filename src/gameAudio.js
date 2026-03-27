let ctx = null
let bgInterval = null
let bgGain = null

function getContext() {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  return ctx
}

async function ensureRunning(c) {
  if (c && c.state === 'suspended') {
    try {
      await c.resume()
    } catch {
      /* ignore */
    }
  }
}

export async function playFlapSound() {
  const c = getContext()
  if (!c) return
  await ensureRunning(c)
  const now = c.currentTime
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.connect(gain)
  gain.connect(c.destination)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(520, now)
  osc.frequency.exponentialRampToValueAtTime(360, now + 0.06)
  gain.gain.setValueAtTime(0.07, now)
  gain.gain.exponentialRampToValueAtTime(0.003, now + 0.08)
  osc.start(now)
  osc.stop(now + 0.09)
}

function playBgChord() {
  if (!bgGain) return
  const c = getContext()
  if (!c) return
  const now = c.currentTime
  const root = 261.63
  const fifth = root * 1.5
  const high = root * 2
  ;[root, fifth, high].forEach((freq) => {
    const osc = c.createOscillator()
    const env = c.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    osc.connect(env)
    env.connect(bgGain)
    env.gain.setValueAtTime(0, now)
    env.gain.linearRampToValueAtTime(0.015, now + 0.1)
    env.gain.linearRampToValueAtTime(0.008, now + 0.7)
    env.gain.linearRampToValueAtTime(0, now + 1.0)
    osc.start(now)
    osc.stop(now + 1.05)
  })
}

export async function startBgMusic() {
  const c = getContext()
  if (!c || bgInterval) return
  await ensureRunning(c)
  bgGain = c.createGain()
  bgGain.gain.value = 0.18
  bgGain.connect(c.destination)
  playBgChord()
  bgInterval = setInterval(playBgChord, 2000)
}

export function stopBgMusic() {
  if (bgInterval) {
    clearInterval(bgInterval)
    bgInterval = null
  }
  if (bgGain) {
    const c = getContext()
    if (c) {
      try {
        bgGain.gain.linearRampToValueAtTime(0, c.currentTime + 0.2)
      } catch {
        /* ignore */
      }
    }
    setTimeout(() => {
      try {
        bgGain.disconnect()
      } catch {
        /* ignore */
      }
      bgGain = null
    }, 250)
  }
}

/* ── Fruit Ninja audio ─────────────────────────────── */

let fnBgInterval = null
let fnBgGain = null

export async function playSliceSound() {
  const c = getContext()
  if (!c) return
  await ensureRunning(c)
  const now = c.currentTime
  const buf = c.createBuffer(1, c.sampleRate * 0.08, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2)
  }
  const src = c.createBufferSource()
  src.buffer = buf
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.setValueAtTime(3200, now)
  bp.frequency.exponentialRampToValueAtTime(800, now + 0.07)
  bp.Q.value = 1.2
  const gain = c.createGain()
  gain.gain.setValueAtTime(0.18, now)
  gain.gain.exponentialRampToValueAtTime(0.003, now + 0.08)
  src.connect(bp)
  bp.connect(gain)
  gain.connect(c.destination)
  src.start(now)
  src.stop(now + 0.09)
}

export async function playBombSound() {
  const c = getContext()
  if (!c) return
  await ensureRunning(c)
  const now = c.currentTime
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(120, now)
  osc.frequency.exponentialRampToValueAtTime(30, now + 0.35)
  gain.gain.setValueAtTime(0.15, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
  osc.connect(gain)
  gain.connect(c.destination)
  osc.start(now)
  osc.stop(now + 0.45)

  const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.3), c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.5)
  const ns = c.createBufferSource()
  ns.buffer = buf
  const ng = c.createGain()
  ng.gain.setValueAtTime(0.12, now)
  ng.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
  ns.connect(ng)
  ng.connect(c.destination)
  ns.start(now)
  ns.stop(now + 0.35)
}

let fnBeat = 0
const FN_NOTES = [329.63, 392, 440, 523.25, 587.33, 659.25, 783.99]

function playFnTick() {
  if (!fnBgGain) return
  const c = getContext()
  if (!c) return
  const now = c.currentTime

  const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.04), c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3)
  const ns = c.createBufferSource()
  ns.buffer = buf
  const ng = c.createGain()
  ng.gain.setValueAtTime(fnBeat % 4 === 0 ? 0.06 : 0.03, now)
  ng.gain.exponentialRampToValueAtTime(0.001, now + 0.04)
  ns.connect(ng)
  ng.connect(fnBgGain)
  ns.start(now)
  ns.stop(now + 0.05)

  if (fnBeat % 2 === 0) {
    const note = FN_NOTES[Math.floor(Math.random() * FN_NOTES.length)]
    const osc = c.createOscillator()
    const env = c.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(note, now)
    osc.frequency.exponentialRampToValueAtTime(note * 0.98, now + 0.3)
    osc.connect(env)
    env.connect(fnBgGain)
    env.gain.setValueAtTime(0, now)
    env.gain.linearRampToValueAtTime(0.018, now + 0.02)
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
    osc.start(now)
    osc.stop(now + 0.4)
  }

  fnBeat++
}

export async function startFruitNinjaBg() {
  const c = getContext()
  if (!c || fnBgInterval) return
  await ensureRunning(c)
  fnBgGain = c.createGain()
  fnBgGain.gain.value = 0.18
  fnBgGain.connect(c.destination)
  fnBeat = 0
  playFnTick()
  fnBgInterval = setInterval(playFnTick, 320)
}

export function stopFruitNinjaBg() {
  if (fnBgInterval) { clearInterval(fnBgInterval); fnBgInterval = null }
  if (fnBgGain) {
    const c = getContext()
    if (c) { try { fnBgGain.gain.linearRampToValueAtTime(0, c.currentTime + 0.2) } catch { /* */ } }
    setTimeout(() => { try { fnBgGain.disconnect() } catch { /* */ }; fnBgGain = null }, 250)
  }
}
