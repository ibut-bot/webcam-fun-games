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
