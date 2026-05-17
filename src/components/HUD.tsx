import type { HammerState } from '../types';

interface HUDProps {
  lives: number;
  score: number;
  level: number;
  highScore: number;
  combo?: number;
  currentTable?: number;
  hammerState?: HammerState;
  hammerEnergy?: number; // 0–1
  currentEquation?: string; // e.g. "7 × 8"
  soundMuted?: boolean;
  onToggleSound?: () => void;
}

export function HUD({
  lives,
  score,
  level,
  highScore,
  combo = 0,
  currentTable = 1,
  hammerState = 'normal',
  hammerEnergy = 0,
  currentEquation,
  soundMuted,
  onToggleSound,
}: HUDProps) {
  const livesFrac      = lives / 3;
  const livesBarColor  = livesFrac > 0.66 ? '#44ee44' : livesFrac > 0.33 ? '#ffcc00' : '#ee3333';

  const hammerColor =
    hammerState === 'supercharged'
      ? '#ff8800'
      : hammerState === 'charged'
      ? '#ffcc00'
      : '#555';

  const hammerBarColor =
    hammerState === 'supercharged' ? '#ff6600' : '#ffcc00';

  return (
    <div className="hud">
      {/* ── Left: health bar ── */}
      <div className="hud-lives">
        <span className="hud-lives-icon">❤️</span>
        <div className="hud-lives-bar-bg">
          <div
            className="hud-lives-bar-fill"
            style={{
              width: `${Math.round(livesFrac * 100)}%`,
              background: livesBarColor,
              boxShadow: livesFrac < 0.4 ? `0 0 7px ${livesBarColor}` : 'none',
            }}
          />
        </div>
        <span className="hud-lives-count">{lives}</span>
      </div>

      {/* ── Center: hammer + equation ── */}
      <div className="hud-center">
        {/* Hammer energy bar */}
        <div className="hud-hammer">
          <span
            className="hud-hammer-icon"
            style={{ color: hammerColor, filter: hammerState !== 'normal' ? `drop-shadow(0 0 4px ${hammerColor})` : 'none' }}
          >
            🔨
          </span>
          <div className="hud-hammer-bar-bg">
            <div
              className="hud-hammer-bar-fill"
              style={{
                width: `${Math.round(hammerEnergy * 100)}%`,
                background: hammerBarColor,
                boxShadow: hammerState !== 'normal' ? `0 0 8px ${hammerBarColor}` : 'none',
              }}
            />
          </div>
          {hammerState !== 'normal' && (
            <span className="hud-hammer-label">
              {hammerState === 'supercharged' ? '★ SUPER!' : '⚡ CARREGADO'}
            </span>
          )}
        </div>

        {currentEquation && (
          <div className="hud-equation">{currentEquation}</div>
        )}
      </div>

      {/* ── Right: score + sound ── */}
      <div className="hud-right">
        <div className="hud-score">
          PONTOS: <strong>{score}</strong>
        </div>
        {highScore > 0 && (
          <div className="hud-high">RECORDE: {highScore}</div>
        )}
        <div className="hud-level">Nível {level}</div>
        {onToggleSound && (
          <button className="hud-sound-btn" onClick={onToggleSound} title="Som">
            {soundMuted ? '🔇' : '🔊'}
          </button>
        )}
      </div>
    </div>
  );
}

