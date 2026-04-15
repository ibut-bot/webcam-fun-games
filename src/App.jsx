import { useCallback, useRef, useState } from 'react'
import FlappyGameCanvas from './components/FlappyGameCanvas.jsx'
import FruitNinjaGameCanvas from './components/FruitNinjaGameCanvas.jsx'
import DanceGameCanvas from './components/DanceGameCanvas.jsx'
import SpaceRushGameCanvas from './components/SpaceRushGameCanvas.jsx'
import HomePage from './components/HomePage.jsx'
import PoseWebcamPanel from './components/PoseWebcamPanel.jsx'
import { SONGS } from './dancePoses.js'
import { stopBgMusic, stopFruitNinjaBg, stopDanceMusic, stopSpaceRushBg } from './gameAudio.js'
import './App.css'

const GAME_META = {
  flappy: {
    title: 'Asteroid Field',
    tagline:
      'Rocket through the void: arms up, then down to thrust. Dodge the UFO tractor beams — clap or tap to redeploy after a crash.',
    tip: 'Raise arms, then lower to thrust (elbows work if wrists are hidden). You have five shields and a chill cosmic track.',
    overTitle: 'Signal lost',
    overHint: 'Clap or click to relaunch',
    poseHint: 'Arms up, then down to thrust · Clap to restart after game over',
    bgClass: 'game-inner game-inner--space',
    standHint: 'Step back so shoulders and arms stay on camera.',
    countdownHint: 'Engines spooling…',
  },
  'fruit-ninja': {
    title: 'Nebula Slash',
    tagline:
      'Slice asteroids, UFOs, planets, and suns — dodge the black holes.',
    tip: 'Slash with quick hand moves. Three missed targets or slicing a black hole costs a shield.',
    overTitle: 'Hull breach',
    overHint: 'Clap or click to retry',
    poseHint: 'Swipe fast to slice · Clap to restart after game over',
    bgClass: 'game-inner game-inner--ninja',
    standHint: 'Keep both hands in frame.',
    countdownHint: 'Orbital debris inbound…',
  },
  dance: {
    title: 'Cosmic Chorus',
    tagline:
      'Mirror the hologram pose — tighter match, bigger score. Ride the beat.',
    tip: 'Pick a track (Disco / Chill / Space Adventure). Cyan wireframe = target; align limbs and build streaks.',
    overTitle: 'Transmission ends',
    overHint: 'Clap or click for an encore',
    poseHint: 'Match the hologram · Clap when the song wraps',
    bgClass: 'game-inner game-inner--dance',
    standHint: 'Frame your whole body for best tracking.',
    countdownHint: 'Hologram sync starting…',
  },
  'space-rush': {
    title: 'Space Rush',
    tagline:
      'Sprint the ISS truss deck: lean to strafe, jump over deck meteors, roll under high ones. Outrun the swarm.',
    tip: 'Full body in frame. Auto-run — you steer with body. Low rocks: jump or change lane. High rocks: duck or change lane.',
    overTitle: 'Decompression',
    overHint: 'Clap or click to suit up again',
    poseHint: 'Lean sideways to lane · Hands above head briefly to jump · Bend knees to roll',
    bgClass: 'game-inner game-inner--rush',
    standHint: 'Step back: hips, knees, and shoulders visible for lane and dodge tracking.',
    countdownHint: 'Airlock cycling…',
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
    stopSpaceRushBg()
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
    stopSpaceRushBg()
    setPlaying(false)
    setPoseReady(false)
    setError(null)
    setGameOver(false)
  }

  const handleGameOver = useCallback((finalScore) => {
    stopBgMusic()
    stopFruitNinjaBg()
    stopDanceMusic()
    stopSpaceRushBg()
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
  const isSpaceRush = selectedGame === 'space-rush'

  return (
    <div className="shell">
      <header className="top-bar">
        <div className="title-block">
          <button type="button" className="back-btn" onClick={goHome}>
            ← Arcade
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
      ) : isSpaceRush ? (
        <div className="ninja-arena-wrap">
          <div className="pane-inner ninja-arena ninja-arena--rush">
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
              <SpaceRushGameCanvas
                active={playing}
                poseReady={poseReady}
                poseKeyPointsRef={poseKeyPointsRef}
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
            <h2 className="pane-label">Pilot cam</h2>
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
            <h2 className="pane-label">Viewport</h2>
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
