interface HUDProps {
  lives: number;
  score: number;
  level: number;
  highScore: number;
}

export function HUD({ lives, score, level, highScore }: HUDProps) {
  return (
    <div className="hud">
      <div className="hud-lives">
        {Array.from({ length: 3 }, (_, i) => (
          <span key={i} className={`heart${i < lives ? '' : ' empty'}`}>
            {i < lives ? '❤️' : '🖤'}
          </span>
        ))}
      </div>

      <div className="hud-center">
        <span className="hud-level">Nível {level}</span>
      </div>

      <div className="hud-right">
        <div className="hud-score">
          PONTOS: <strong>{score}</strong>
        </div>
        {highScore > 0 && (
          <div className="hud-high">RECORDE: {highScore}</div>
        )}
      </div>
    </div>
  );
}
