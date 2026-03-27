import { useCallback, useRef, useState } from 'react'
import FlappyGameCanvas from './components/FlappyGameCanvas.jsx'
import PoseWebcamPanel from './components/PoseWebcamPanel.jsx'
import { stopBgMusic } from './gameAudio.js'
import './App.css'

export default function App() {
  const flapQueueRef = useRef(0)
  const [playing, setPlaying] = useState(false)
  const [poseReady, setPoseReady] = useState(false)
  const [score, setScore] = useState(0)
  const [error, setError] = useState(null)
  const [gameOver, setGameOver] = useState(false)
  const [sessionKey, setSessionKey] = useState(0)

  const onModelReady = useCallback(() => {
    setPoseReady(true)
    setError(null)
  }, [])

  const onPoseError = useCallback((msg) => {
    stopBgMusic()
    setError(msg)
    setPlaying(false)
    setPoseReady(false)
    setGameOver(false)
  }, [])

  const bumpSession = useCallback(() => {
    setSessionKey((k) => k + 1)
  }, [])

  const start = () => {
    setError(null)
    setPoseReady(false)
    setPlaying(true)
    setScore(0)
    setGameOver(false)
    flapQueueRef.current = 0
    bumpSession()
  }

  const stop = () => {
    stopBgMusic()
    setPlaying(false)
    setPoseReady(false)
    setError(null)
    setGameOver(false)
  }

  const handleGameOver = useCallback((finalScore) => {
    stopBgMusic()
    setScore(finalScore)
    setGameOver(true)
  }, [])

  const requestRestart = useCallback(() => {
    setGameOver(false)
    flapQueueRef.current = 0
    bumpSession()
  }, [bumpSession])

  const handleClap = useCallback(() => {
    if (gameOver) requestRestart()
  }, [gameOver, requestRestart])

  return (
    <div className="shell">
      <header className="top-bar">
        <div className="title-block">
          <h1>Flappy Pose</h1>
          <p className="tagline">
            Classic-style flappy: raise arms, then lower to flap. After game over, clap or
            click to try again.
          </p>
        </div>
        <div className="score-pill">Score: {score}</div>
      </header>

      {error && <div className="banner error">{error}</div>}

      <div className="split">
        <section className="pane pane-camera">
          <h2 className="pane-label">You</h2>
          <div className="pane-inner">
            <PoseWebcamPanel
              enabled={playing}
              flapQueueRef={flapQueueRef}
              onClap={playing ? handleClap : undefined}
              onError={onPoseError}
              onModelReady={onModelReady}
            />
          </div>
        </section>

        <section className="pane pane-game">
          <h2 className="pane-label">Game</h2>
          <div className="pane-inner game-inner">
            {playing && (
              <FlappyGameCanvas
                active={playing}
                poseReady={poseReady}
                flapQueueRef={flapQueueRef}
                sessionKey={sessionKey}
                gameOver={gameOver}
                onScore={setScore}
                onGameOver={handleGameOver}
                onRequestRestart={requestRestart}
              />
            )}
            {gameOver && (
              <div
                className="game-over-overlay"
                onClick={requestRestart}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') requestRestart()
                }}
                role="button"
                tabIndex={0}
              >
                <h2 className="game-over-title">Mission Over</h2>
                <p className="game-over-score">Score: {score}</p>
                <p className="game-over-hint">Clap or click to try again</p>
              </div>
            )}
            {!playing && (
              <div className="game-overlay">
                <p className="overlay-lead">
                  Stand back so your shoulders and arms are visible.
                </p>
                <button type="button" className="primary" onClick={start}>
                  Start Camera & Game
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      <footer className="foot">
        {playing && (
          <button type="button" className="ghost" onClick={stop}>
            Stop
          </button>
        )}
        <p className="tip">
          Raise arms, then lower to flap (elbows count if wrists are hidden). Five lives;
          soft background music while you play.
        </p>
      </footer>
    </div>
  )
}
