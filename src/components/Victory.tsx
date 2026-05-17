interface VictoryProps {
  score: number;
  highScore: number;
  tablesCompleted: number;
  onRestart: () => void;
}

export function Victory({ score, highScore, tablesCompleted, onRestart }: VictoryProps) {
  return (
    <div
      className="game-over-overlay"
      style={{ background: 'rgba(0,25,60,0.93)' }}
    >
      <div style={{ fontSize: 68, marginBottom: 6 }}>🐦</div>

      <h2
        style={{
          color: '#88ffaa',
          fontSize: 46,
          margin: '0 0 10px',
          textShadow: '0 0 28px #44ff88, 0 0 8px #ffffff',
        }}
      >
        VOCÊ VENCEU!
      </h2>

      <p style={{ color: '#aaddff', fontSize: 21, margin: '0 0 22px' }}>
        O pássaro mágico está livre para sempre!
      </p>

      <div
        style={{
          color: '#ffffff',
          fontSize: 19,
          lineHeight: 2,
          textAlign: 'center',
        }}
      >
        <div>
          Tabuadas concluídas:{' '}
          <strong style={{ color: '#ffdd44', fontSize: 23 }}>{tablesCompleted}</strong>
        </div>
        <div>
          Pontuação final:{' '}
          <strong style={{ color: '#ffaa00', fontSize: 23 }}>
            {score.toLocaleString()}
          </strong>
        </div>
        <div>
          Recorde:{' '}
          <strong style={{ color: '#ff6688', fontSize: 23 }}>
            {highScore.toLocaleString()}
          </strong>
        </div>
      </div>

      <button
        onClick={onRestart}
        style={{
          marginTop: 30,
          padding: '14px 50px',
          fontSize: 22,
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #22cc66 0%, #0099cc 100%)',
          color: '#fff',
          border: 'none',
          borderRadius: 14,
          cursor: 'pointer',
          boxShadow: '0 4px 26px rgba(0,200,120,0.55)',
          letterSpacing: 1,
        }}
      >
        Jogar Novamente
      </button>
    </div>
  );
}
