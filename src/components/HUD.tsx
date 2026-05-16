interface HUDProps {
  lives: number;
  score: number;
  level: number;
  highScore: number;
  combo?: number;
  currentTable?: number; // 1-9 = current table, 10 = random mix
}

export function HUD({ lives, score, level, highScore, combo = 0, currentTable = 1 }: HUDProps) {
  const tableLabel = currentTable === 10
    ? 'Mix Total'
    : `Tabuada do ${currentTable}`;

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
        <span className="hud-table">{tableLabel}</span>
        {combo > 1 && <span className="hud-combo">COMBO x{combo}</span>}
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
