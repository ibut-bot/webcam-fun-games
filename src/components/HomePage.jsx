import './HomePage.css'

const GAMES = [
  {
    id: 'flappy',
    title: 'Flappy Bird',
    description: 'Raise your arms then lower them to flap. Dodge the pipes and survive!',
    icon: '🐦',
    ready: true,
  },
  {
    id: 'fruit-ninja',
    title: 'Fruit Ninja',
    description: 'Slash fruits mid-air with your hands. Avoid the bombs!',
    icon: '🍉',
    ready: true,
  },
]

export default function HomePage({ onSelectGame }) {
  return (
    <div className="home">
      <div className="home-hero">
        <h1 className="home-title">Webcam Fun Games</h1>
        <p className="home-subtitle">
          Pick a game and play using just your body — no controllers needed.
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
            <span className="game-card-icon">{game.icon}</span>
            <h2 className="game-card-title">{game.title}</h2>
            <p className="game-card-desc">{game.description}</p>
            {!game.ready && <span className="game-card-badge">Coming Soon</span>}
          </button>
        ))}
      </div>

      <p className="home-hint">
        You'll need a webcam and enough room for your upper body to be visible.
      </p>
    </div>
  )
}
