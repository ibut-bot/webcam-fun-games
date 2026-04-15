import './HomePage.css'

function SlashedAsteroidIcon() {
  return (
    <svg
      className="game-card-icon game-card-icon--svg"
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="slashRockL" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e7e5e4" />
          <stop offset="100%" stopColor="#57534e" />
        </linearGradient>
        <linearGradient id="slashRockR" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#d6d3d1" />
          <stop offset="100%" stopColor="#44403c" />
        </linearGradient>
        <linearGradient id="slashGlow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="50%" stopColor="#a5f3fc" />
          <stop offset="100%" stopColor="#c084fc" />
        </linearGradient>
      </defs>
      <path
        fill="url(#slashRockL)"
        stroke="#292524"
        strokeWidth="0.9"
        strokeLinejoin="round"
        d="M 5 36 11 14 24 7 30 24 29 40 30 54 12 58 5 44z"
      />
      <path fill="rgba(0,0,0,0.22)" d="M 16 18c2 0 4 2 3.5 4s-3 3-4 1.5-1-4.5 0.5-5.5z" />
      <path
        fill="url(#slashRockR)"
        stroke="#292524"
        strokeWidth="0.9"
        strokeLinejoin="round"
        d="M 35 12 53 9 59 26 57 41 59 56 35 52 33 32z"
      />
      <path fill="rgba(0,0,0,0.2)" d="M 46 34c1.8 0 3 1.5 2.5 3.2s-2.5 2-3.8 1-1-3.5 1.3-4.2z" />
      <path
        d="M 31 5 L 33 59"
        fill="none"
        stroke="url(#slashGlow)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M 31.6 5 L 32.8 59"
        fill="none"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  )
}

function CosmicChorusIcon() {
  return (
    <svg
      className="game-card-icon game-card-icon--svg"
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="ccNoteFill" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="55%" stopColor="#a5f3fc" />
          <stop offset="100%" stopColor="#c084fc" />
        </linearGradient>
        <linearGradient id="ccOrbit" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="rgba(103, 232, 249, 0)" />
          <stop offset="35%" stopColor="rgba(103, 232, 249, 0.45)" />
          <stop offset="65%" stopColor="rgba(192, 132, 252, 0.5)" />
          <stop offset="100%" stopColor="rgba(192, 132, 252, 0)" />
        </linearGradient>
      </defs>
      <ellipse
        cx="32"
        cy="46"
        rx="26"
        ry="7.5"
        fill="none"
        stroke="url(#ccOrbit)"
        strokeWidth="1.4"
        transform="rotate(-14 32 46)"
        opacity="0.95"
      />
      <path
        fill="#fef9c3"
        opacity="0.95"
        d="M 10 15 l 1.8 3.6 4 .6 -3 2.8 .7 4 -3.5-2 -3.5 2 .7-4 -3-2.8 4-.6z"
      />
      <path
        fill="#e9d5ff"
        opacity="0.88"
        d="M 52 12 l 1.5 3 3.2 .5 -2.4 2.3 .6 3.4 -3-1.7 -3 1.7 .6-3.4 -2.4-2.3 3.2-.5z"
      />
      <path fill="#a5f3fc" opacity="0.9" d="M 48 49 l 1.2 2.4 2.6.4 -2 1.9.5 2.7 -2.3-1.4 -2.3 1.4 .5-2.7 -2-1.9 2.6-.4z" />
      <path fill="#fef08a" opacity="0.85" d="M 14 50 l 1 2 2.2.3 -1.7 1.6.4 2.3 -2-1.2 -2 1.2 .4-2.3 -1.7-1.6 2.2-.3z" />
      <g fill="url(#ccNoteFill)">
        <ellipse cx="22.5" cy="43.5" rx="5.2" ry="4.2" transform="rotate(-22 22.5 43.5)" />
        <path
          fill="none"
          stroke="url(#ccNoteFill)"
          strokeWidth="2.2"
          strokeLinecap="round"
          d="M 27.5 41.5 L 27.5 18"
        />
        <ellipse cx="39" cy="40" rx="5.2" ry="4.2" transform="rotate(-18 39 40)" />
        <path
          fill="none"
          stroke="url(#ccNoteFill)"
          strokeWidth="2.2"
          strokeLinecap="round"
          d="M 44 38 L 44 16"
        />
        <path
          d="M 27.5 18 L 44 16 L 44 21 L 27.5 23 Z"
          opacity="0.92"
        />
      </g>
      <path
        fill="none"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="0.9"
        strokeLinecap="round"
        d="M 27.5 18 L 44 16"
      />
    </svg>
  )
}

const GAMES = [
  {
    id: 'flappy',
    title: 'Asteroid Field',
    description:
      'Pilot your ship: raise your arms, then dip to thrust. Dodge the UFO tractor beams!',
    icon: '🚀',
    ready: true,
  },
  {
    id: 'fruit-ninja',
    title: 'Nebula Slash',
    description:
      'Slice asteroids, UFOs, planets, and suns. Black holes end your streak!',
    icon: <SlashedAsteroidIcon />,
    ready: true,
  },
  {
    id: 'dance',
    title: 'Cosmic Chorus',
    description:
      'Disco, chill, or Space Adventure — rocket poses, meteor strikes, supernovas & more.',
    icon: <CosmicChorusIcon />,
    ready: true,
  },
  {
    id: 'space-rush',
    title: 'Space Rush',
    description:
      'Endless ISS sprint: lean to strafe, jump deck meteors, roll under high ones — all pose-controlled.',
    icon: '🧑‍🚀',
    ready: true,
  },
]

function GalacticTitleDecor() {
  return (
    <span className="home-title__sky" aria-hidden="true">
      <svg
        className="home-title__constellation"
        viewBox="0 0 240 96"
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          d="M 12 58 L 48 32 L 86 50 L 118 22 L 152 44 L 188 28 L 222 52"
          fill="none"
          stroke="rgba(165, 243, 252, 0.65)"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 32 78 L 68 68 L 104 82"
          fill="none"
          stroke="rgba(192, 132, 252, 0.5)"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <circle cx="12" cy="58" r="3.2" fill="#fef08a" opacity="0.95" />
        <circle cx="48" cy="32" r="2.4" fill="#e9d5ff" />
        <circle cx="86" cy="50" r="2.8" fill="#a5f3fc" />
        <circle cx="118" cy="22" r="3" fill="#fde68a" />
        <circle cx="152" cy="44" r="2.5" fill="#f0abfc" />
        <circle cx="188" cy="28" r="2.6" fill="#93c5fd" />
        <circle cx="222" cy="52" r="3" fill="#fef9c3" />
        <circle cx="32" cy="78" r="2" fill="#67e8f9" opacity="0.9" />
        <circle cx="68" cy="68" r="2.2" fill="#c4b5fd" />
        <circle cx="104" cy="82" r="1.8" fill="#fcd34d" />
      </svg>
      <span className="home-title__ico home-title__ico--rocket home-title__ico--pos1">🚀</span>
      <span className="home-title__ico home-title__ico--rocket home-title__ico--pos2">🚀</span>
      <span className="home-title__ico home-title__ico--star home-title__ico--pos3">★</span>
      <span className="home-title__ico home-title__ico--star home-title__ico--pos4">✦</span>
      <span className="home-title__ico home-title__ico--star home-title__ico--pos5">✧</span>
      <span className="home-title__ico home-title__ico--star-lg home-title__ico--pos6">⭐</span>
      <span className="home-title__ico home-title__ico--star home-title__ico--pos7">⋆</span>
      <span className="home-title__ico home-title__ico--star-lg home-title__ico--pos8">🌟</span>
      <span className="home-title__ico home-title__ico--star home-title__ico--pos9">✦</span>
      <span className="home-title__ico home-title__ico--star home-title__ico--pos10">★</span>
      <span className="home-title__ico home-title__ico--star home-title__ico--pos11">✧</span>
      <span className="home-title__ico home-title__ico--star-lg home-title__ico--pos12">⋆</span>
      <span className="home-title__ico home-title__ico--star home-title__ico--pos13">🌠</span>
    </span>
  )
}

export default function HomePage({ onSelectGame }) {
  return (
    <div className="home">
      <div className="home-hero">
        <p className="home-eyebrow">Webcam arcade</p>
        <h1 className="home-title">
          <span className="home-title__edge">The</span>
          <span className="home-title__galactic-block">
            <GalacticTitleDecor />
            <span className="home-title__galactic-text">Galactic</span>
          </span>
          <span className="home-title__edge">Games</span>
        </h1>
        <p className="home-subtitle">
          No controllers — just you, your camera, and a pocket of deep space.
        </p>
      </div>

      <div className="game-grid">
        {GAMES.map((game) => (
          <button
            key={game.id}
            type="button"
            className={`game-card${game.ready ? '' : ' game-card--soon'}`}
            onClick={() => game.ready && onSelectGame(game.id)}
            disabled={!game.ready}
          >
            {typeof game.icon === 'string' ? (
              <span className="game-card-icon">{game.icon}</span>
            ) : (
              game.icon
            )}
            <h2 className="game-card-title">{game.title}</h2>
            <p className="game-card-desc">{game.description}</p>
            {!game.ready && <span className="game-card-badge">Coming Soon</span>}
          </button>
        ))}
      </div>

      <p className="home-hint">
        Use a webcam and enough room for your upper body to stay in frame.
      </p>
    </div>
  )
}
