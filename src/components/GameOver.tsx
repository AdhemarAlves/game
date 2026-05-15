interface Props {
  score: number;
  highScore: number;
  onRestart: () => void;
}

export function GameOver({ score, highScore, onRestart }: Props) {
  return (
    <div className="gameover-overlay">
      <div className="gameover-panel">
        <h1>GAME OVER</h1>
        <p>
          Pontuação: <strong>{score}</strong>
        </p>
        <p>
          Recorde: <strong>{highScore}</strong>
        </p>
        <button className="restart-btn" onClick={onRestart}>
          🎮 JOGAR NOVAMENTE
        </button>
      </div>
    </div>
  );
}
