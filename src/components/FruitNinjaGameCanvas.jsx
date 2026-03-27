import { useEffect, useRef, useLayoutEffect, useState } from 'react'
import { createFruitNinjaGame } from '../fruitNinjaGame.js'
import { startFruitNinjaBg, stopFruitNinjaBg, playSliceSound, playBombSound } from '../gameAudio.js'

export default function FruitNinjaGameCanvas({
  active,
  poseReady = false,
  handPositionsRef,
  sessionKey = 0,
  gameOver = false,
  onScore,
  onGameOver,
  onRequestRestart,
}) {
  const canvasRef = useRef(null)
  const poseReadyRef = useRef(poseReady)
  const onScoreRef = useRef(onScore)
  const onGameOverRef = useRef(onGameOver)
  const [countdown, setCountdown] = useState(null)
  const [readyMessage, setReadyMessage] = useState(null)

  useLayoutEffect(() => { poseReadyRef.current = poseReady }, [poseReady])
  useLayoutEffect(() => { onScoreRef.current = onScore }, [onScore])
  useLayoutEffect(() => { onGameOverRef.current = onGameOver }, [onGameOver])

  useEffect(() => {
    if (!active) { setCountdown(null); return }
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return

    let cancelled = false

    const game = createFruitNinjaGame(canvas, {
      getHandPositions() {
        return handPositionsRef?.current ?? null
      },
      onScore(s) { onScoreRef.current?.(s) },
      onGameOver(s) {
        stopFruitNinjaBg()
        onGameOverRef.current?.(s)
      },
      onSlice() { void playSliceSound() },
      onBombHit() { void playBombSound() },
    })

    const ro = new ResizeObserver(() => game.resize())
    ro.observe(parent)
    game.resize()

    async function runSession() {
      while (!poseReadyRef.current && !cancelled) {
        await new Promise(r => setTimeout(r, 50))
      }
      if (cancelled) return

      setReadyMessage('Get in position!')
      await new Promise(r => setTimeout(r, 2000))
      if (cancelled) return

      setReadyMessage('Stand back so your hands are visible')
      await new Promise(r => setTimeout(r, 2000))
      if (cancelled) return

      setReadyMessage('Slash through the fruits with your hands!')
      await new Promise(r => setTimeout(r, 2000))
      if (cancelled) return
      setReadyMessage(null)

      for (let i = 3; i > 0; i--) {
        if (cancelled) return
        setCountdown(i)
        await new Promise(r => setTimeout(r, 1000))
      }
      if (cancelled) return
      setCountdown(null)
      game.resize()
      game.start()
      void startFruitNinjaBg()
    }

    runSession()

    return () => {
      cancelled = true
      game.stop()
      stopFruitNinjaBg()
      ro.disconnect()
      setCountdown(null)
      setReadyMessage(null)
    }
  }, [active, sessionKey, handPositionsRef])

  return (
    <div className="fruit-ninja-game-wrap">
      <canvas
        ref={canvasRef}
        className="fruit-ninja-canvas"
        onClick={() => gameOver && onRequestRestart?.()}
        role="presentation"
      />
      {readyMessage && (
        <div className="game-ready-overlay" aria-live="polite">
          <span className="ready-text">{readyMessage}</span>
        </div>
      )}
      {countdown != null && (
        <div className="game-countdown-overlay" aria-live="polite">
          <span className="countdown-number">{countdown}</span>
          <span className="countdown-hint">Get ready to slash!</span>
        </div>
      )}
    </div>
  )
}
