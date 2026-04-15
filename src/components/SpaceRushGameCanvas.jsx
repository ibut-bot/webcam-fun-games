import { useEffect, useRef, useLayoutEffect, useState } from 'react'
import { createSpaceRushGame } from '../spaceRushGame.js'
import { startSpaceRushBg, stopSpaceRushBg } from '../gameAudio.js'

export default function SpaceRushGameCanvas({
  active,
  poseReady = false,
  poseKeyPointsRef,
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
    if (!active) {
      queueMicrotask(() => setCountdown(null))
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return

    let cancelled = false

    const game = createSpaceRushGame(canvas, {
      getPoseKeypoints() {
        return poseKeyPointsRef?.current ?? null
      },
      onScore(s) {
        onScoreRef.current?.(s)
      },
      onGameOver(s) {
        stopSpaceRushBg()
        onGameOverRef.current?.(s)
      },
    })

    const ro = new ResizeObserver(() => game.resize())
    ro.observe(parent)
    game.resize()

    async function runSession() {
      while (!poseReadyRef.current && !cancelled) {
        await new Promise((r) => setTimeout(r, 50))
      }
      if (cancelled) return

      setReadyMessage('ISS deck calibration — stand neutrally…')
      await new Promise((r) => setTimeout(r, 2000))
      if (cancelled) return

      setReadyMessage('Lean to change lane · hands high to jump · bend knees to roll')
      await new Promise((r) => setTimeout(r, 2800))
      if (cancelled) return

      setReadyMessage('Low meteors: jump or sidestep · High meteors: roll or sidestep')
      await new Promise((r) => setTimeout(r, 2600))
      if (cancelled) return
      setReadyMessage(null)

      for (let i = 3; i > 0; i--) {
        if (cancelled) return
        setCountdown(i)
        await new Promise((r) => setTimeout(r, 1000))
      }
      if (cancelled) return
      setCountdown(null)

      game.resize()
      void startSpaceRushBg()
      game.start()
    }

    runSession()

    return () => {
      cancelled = true
      game.stop()
      stopSpaceRushBg()
      ro.disconnect()
      setCountdown(null)
      setReadyMessage(null)
    }
  }, [active, sessionKey, poseKeyPointsRef])

  return (
    <div className="space-rush-game-wrap">
      <canvas
        ref={canvasRef}
        className="space-rush-canvas"
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
          <span className="countdown-hint">Airlock cycling…</span>
        </div>
      )}
    </div>
  )
}
