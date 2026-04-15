import { useEffect, useRef, useLayoutEffect, useState } from 'react'
import { createFlappySpaceGame } from '../flappySpaceGame.js'
import { startBgMusic, stopBgMusic } from '../gameAudio.js'

export default function FlappyGameCanvas({
  active,
  poseReady = false,
  flapQueueRef,
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

  useLayoutEffect(() => {
    poseReadyRef.current = poseReady
  }, [poseReady])
  useLayoutEffect(() => {
    onScoreRef.current = onScore
  }, [onScore])
  useLayoutEffect(() => {
    onGameOverRef.current = onGameOver
  }, [onGameOver])

  useEffect(() => {
    if (!active) {
      setCountdown(null)
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return

    let cancelled = false

    const game = createFlappySpaceGame(canvas, {
      consumeFlap() {
        if (flapQueueRef.current > 0) {
          flapQueueRef.current -= 1
          return true
        }
        return false
      },
      onScore(s) {
        onScoreRef.current?.(s)
      },
      onGameOver(s) {
        onGameOverRef.current?.(s)
      },
    })

    const ro = new ResizeObserver(() => {
      game.resize()
    })
    ro.observe(parent)
    game.resize()

    async function runSession() {
      while (!poseReadyRef.current && !cancelled) {
        await new Promise((r) => setTimeout(r, 50))
      }
      if (cancelled) return

      setReadyMessage('Align with the airlock…')
      await new Promise((r) => setTimeout(r, 2000))
      if (cancelled) return

      setReadyMessage('Keep arms in frame for thruster control')
      await new Promise((r) => setTimeout(r, 2000))
      if (cancelled) return

      setReadyMessage('Arms up, then dip to fire thrusters')
      await new Promise((r) => setTimeout(r, 2000))
      if (cancelled) return
      setReadyMessage(null)

      for (let i = 3; i > 0; i--) {
        if (cancelled) return
        setCountdown(i)
        await new Promise((r) => setTimeout(r, 1000))
      }
      if (cancelled) return
      setCountdown(null)
      flapQueueRef.current = 0
      game.resize()
      game.start()
      void startBgMusic()
    }

    runSession()

    return () => {
      cancelled = true
      game.stop()
      stopBgMusic()
      ro.disconnect()
      setCountdown(null)
      setReadyMessage(null)
    }
  }, [active, sessionKey, flapQueueRef])

  return (
    <div className="flappy-game-wrap">
      <canvas
        ref={canvasRef}
        className="flappy-canvas"
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
          <span className="countdown-hint">Launch sequence…</span>
        </div>
      )}
    </div>
  )
}
