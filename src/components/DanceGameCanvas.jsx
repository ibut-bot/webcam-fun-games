import { useEffect, useRef, useLayoutEffect, useState } from 'react'
import { createDanceGame } from '../danceGame.js'
import { SONGS } from '../dancePoses.js'
import { startDanceMusic, stopDanceMusic, playMatchSound } from '../gameAudio.js'

export default function DanceGameCanvas({
  active,
  poseReady = false,
  poseKeyPointsRef,
  sessionKey = 0,
  gameOver = false,
  selectedSong = 0,
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

    const game = createDanceGame(canvas, {
      getPoseKeypoints() {
        return poseKeyPointsRef?.current ?? null
      },
      onScore(s) { onScoreRef.current?.(s) },
      onGameOver(s) {
        stopDanceMusic()
        onGameOverRef.current?.(s)
      },
      onPoseMatch() { void playMatchSound() },
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

      setReadyMessage('Stand back so your entire body is visible')
      await new Promise(r => setTimeout(r, 2500))
      if (cancelled) return

      const song = SONGS[selectedSong] || SONGS[0]
      setReadyMessage(`♫ ${song.name} — match the dance poses!`)
      await new Promise(r => setTimeout(r, 2500))
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
      await startDanceMusic(song)
      game.start(song)
    }

    runSession()

    return () => {
      cancelled = true
      game.stop()
      stopDanceMusic()
      ro.disconnect()
      setCountdown(null)
      setReadyMessage(null)
    }
  }, [active, sessionKey, poseKeyPointsRef, selectedSong])

  return (
    <div className="dance-game-wrap">
      <canvas
        ref={canvasRef}
        className="dance-canvas"
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
          <span className="countdown-hint">Get ready to dance!</span>
        </div>
      )}
    </div>
  )
}
