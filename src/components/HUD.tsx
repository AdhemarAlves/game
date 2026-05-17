import type { HammerState } from '../types';

interface HUDProps {
  hp: number;           // Current HP
  maxHp: number;        // Max HP
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
  hp,
  maxHp,
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
  const hpFrac        = hp / maxHp;
  const hpColor       = hpFrac > 0.66 ? '#44ee44' : hpFrac > 0.33 ? '#ffcc00' : '#ee3333';

  const hammerColor =
    hammerState === 'giant'
      ? '#ffff00'
      : hammerState === 'supercharged'
      ? '#ff8800'
      : hammerState === 'charged'
      ? '#ffcc00'
      : '#555';

  const hammerBarColor =
    hammerState === 'supercharged' ? '#ff6600' : '#ffcc00';

  return (
    <div className="hud">
      {/* ── Left: HP bar ── */}
      <div className="hud-lives">
        <span className="hud-lives-icon">❤️</span>
        <div className="hud-lives-bar-bg">
          <div
            className="hud-lives-bar-fill"
            style={{
              width: `${Math.round(hpFrac * 100)}%`,
              background: hpColor,
              boxShadow: hpFrac < 0.4 ? `0 0 7px ${hpColor}` : 'none',
              transition: 'width 0.3s ease, background 0.3s ease',
            }}
          />
        </div>
        <span className="hud-lives-count">{Math.ceil(hp)}/{maxHp}</span>
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

