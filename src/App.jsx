import { useCallback, useRef, useState } from 'react'
import FlappyGameCanvas from './components/FlappyGameCanvas.jsx'
import FruitNinjaGameCanvas from './components/FruitNinjaGameCanvas.jsx'
import DanceGameCanvas from './components/DanceGameCanvas.jsx'
import HomePage from './components/HomePage.jsx'
import PoseWebcamPanel from './components/PoseWebcamPanel.jsx'
import { SONGS } from './dancePoses.js'
import { stopBgMusic, stopFruitNinjaBg, stopDanceMusic } from './gameAudio.js'
import './App.css'

const GAME_META = {
  flappy: {
    title: 'Flappy Pose',
    tagline:
      'Classic-style flappy: raise arms, then lower to flap. After game over, clap or click to try again.',
    tip: 'Raise arms up, then lower to flap (elbows count if wrists are hidden). Five lives; soft background music while you play.',
    overTitle: 'Mission Over',
    overHint: 'Clap or click to try again',
    poseHint: 'Raise arms up, then down to flap · Clap hands to restart after game over',
    bgClass: 'game-inner',
    standHint: 'Stand back so your shoulders and arms are visible.',
    countdownHint: 'Get ready to flap!',
  },
  'fruit-ninja': {
    title: 'Fruit Ninja',
    tagline:
      'Slash fruits mid-air with your hands! Avoid the bombs. Combo slashes for bonus points.',
    tip: 'Move your hands fast to slash through fruits. Missing 3 fruits costs a life. Slicing a bomb costs a life too!',
    overTitle: 'Game Over',
    overHint: 'Clap or click to try again',
    poseHint: 'Move your hands quickly to slice · Clap to restart after game over',
    bgClass: 'game-inner game-inner--ninja',
    standHint: 'Stand back so your hands are visible.',
    countdownHint: 'Get ready to slash!',
  },
  dance: {
    title: 'Dance Party',
    tagline:
      'Match the dance poses to the beat! The closer you match, the more you score.',
    tip: 'Match the cyan target pose with your body. Green limbs = matching, red = off. Hold poses to rack up points!',
    overTitle: 'Song Complete!',
    overHint: 'Clap or click to play again',
    poseHint: 'Match the target pose · Clap to restart after song ends',
    bgClass: 'game-inner game-inner--dance',
    standHint: 'Stand back so your entire body is visible.',
    countdownHint: 'Get ready to dance!',
  },
}

export default function App() {
  const [selectedGame, setSelectedGame] = useState(null)

  const flapQueueRef = useRef(0)
  const handPositionsRef = useRef(null)
  const poseKeyPointsRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [selectedSong, setSelectedSong] = useState(0)
  const [poseReady, setPoseReady] = useState(false)
  const [score, setScore] = useState(0)
  const [error, setError] = useState(null)
  const [gameOver, setGameOver] = useState(false)
  const [sessionKey, setSessionKey] = useState(0)

  const meta = GAME_META[selectedGame] || GAME_META.flappy

  const onModelReady = useCallback(() => {
    setPoseReady(true)
    setError(null)
  }, [])

  const onPoseError = useCallback((msg) => {
    stopBgMusic()
    stopFruitNinjaBg()
    stopDanceMusic()
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
    handPositionsRef.current = null
    poseKeyPointsRef.current = null
    bumpSession()
  }

  const stop = () => {
    stopBgMusic()
    stopFruitNinjaBg()
    stopDanceMusic()
    setPlaying(false)
    setPoseReady(false)
    setError(null)
    setGameOver(false)
  }

  const handleGameOver = useCallback((finalScore) => {
    stopBgMusic()
    stopFruitNinjaBg()
    stopDanceMusic()
    setScore(finalScore)
    setGameOver(true)
  }, [])

  const requestRestart = useCallback(() => {
    setGameOver(false)
    flapQueueRef.current = 0
    handPositionsRef.current = null
    poseKeyPointsRef.current = null
    bumpSession()
  }, [bumpSession])

  const handleClap = useCallback(() => {
    if (gameOver) requestRestart()
  }, [gameOver, requestRestart])

  const goHome = () => {
    stop()
    setSelectedGame(null)
    setScore(0)
  }

  if (!selectedGame) {
    return <HomePage onSelectGame={setSelectedGame} />
  }

  const isNinja = selectedGame === 'fruit-ninja'
  const isDance = selectedGame === 'dance'

  return (
    <div className="shell">
      <header className="top-bar">
        <div className="title-block">
          <button type="button" className="back-btn" onClick={goHome}>
            ← Games
          </button>
          <h1>{meta.title}</h1>
          <p className="tagline">{meta.tagline}</p>
        </div>
        <div className="score-pill">Score: {score}</div>
      </header>

      {error && <div className="banner error">{error}</div>}

      {isDance ? (
        <div className="ninja-arena-wrap">
          <div className="pane-inner dance-arena">
            <PoseWebcamPanel
              enabled={playing}
              poseKeyPointsRef={poseKeyPointsRef}
              drawSkeleton={false}
              onClap={playing ? handleClap : undefined}
              onError={onPoseError}
              onModelReady={onModelReady}
              statusHint={meta.poseHint}
            />
            {playing && (
              <DanceGameCanvas
                active={playing}
                poseReady={poseReady}
                poseKeyPointsRef={poseKeyPointsRef}
                sessionKey={sessionKey}
                gameOver={gameOver}
                selectedSong={selectedSong}
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
                <h2 className="game-over-title">{meta.overTitle}</h2>
                <p className="game-over-score">Score: {score}</p>
                <p className="game-over-hint">{meta.overHint}</p>
              </div>
            )}
            {!playing && (
              <div className="game-overlay">
                <p className="overlay-lead">{meta.standHint}</p>
                <div className="song-picker">
                  {SONGS.map((s, i) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`song-btn${selectedSong === i ? ' song-btn--active' : ''}`}
                      onClick={() => setSelectedSong(i)}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
                <button type="button" className="primary" onClick={start}>
                  Start Camera & Game
                </button>
              </div>
            )}
          </div>
        </div>
      ) : isNinja ? (
        <div className="ninja-arena-wrap">
          <div className="pane-inner ninja-arena">
            <PoseWebcamPanel
              enabled={playing}
              handPositionsRef={handPositionsRef}
              onClap={playing ? handleClap : undefined}
              onError={onPoseError}
              onModelReady={onModelReady}
              statusHint={meta.poseHint}
            />
            {playing && (
              <FruitNinjaGameCanvas
                active={playing}
                poseReady={poseReady}
                handPositionsRef={handPositionsRef}
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
                <h2 className="game-over-title">{meta.overTitle}</h2>
                <p className="game-over-score">Score: {score}</p>
                <p className="game-over-hint">{meta.overHint}</p>
              </div>
            )}
            {!playing && (
              <div className="game-overlay">
                <p className="overlay-lead">{meta.standHint}</p>
                <button type="button" className="primary" onClick={start}>
                  Start Camera & Game
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
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
                statusHint={meta.poseHint}
              />
            </div>
          </section>

          <section className="pane pane-game">
            <h2 className="pane-label">Game</h2>
            <div className={`pane-inner ${meta.bgClass}`}>
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
                  <h2 className="game-over-title">{meta.overTitle}</h2>
                  <p className="game-over-score">Score: {score}</p>
                  <p className="game-over-hint">{meta.overHint}</p>
                </div>
              )}
              {!playing && (
                <div className="game-overlay">
                  <p className="overlay-lead">{meta.standHint}</p>
                  <button type="button" className="primary" onClick={start}>
                    Start Camera & Game
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      <footer className="foot">
        {playing && (
          <button type="button" className="ghost" onClick={stop}>
            Stop
          </button>
        )}
        <p className="tip">{meta.tip}</p>
      </footer>
    </div>
  )
}
