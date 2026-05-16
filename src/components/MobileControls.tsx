import { useEffect, useRef, useState } from 'react';
import type { InputManager, InputAction } from '../engine/InputManager';

interface Props {
  inputManager: InputManager | null;
  soundMuted?: boolean;
  onToggleSound?: () => void;
}

// ─── Virtual Button ───────────────────────────────────────────────────────────

interface BtnProps {
  label: string;
  action: InputAction;
  inputManager: InputManager | null;
  color: string;
  size?: number;
}

function VBtn({ label, action, inputManager, color, size = 72 }: BtnProps) {
  const pressed = useRef(false);

  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    if (pressed.current) return;
    pressed.current = true;
    inputManager?.setAction(action, true);
  };

  const up = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!pressed.current) return;
    pressed.current = false;
    inputManager?.setAction(action, false);
  };

  return (
    <button
      onPointerDown={down}
      onPointerUp={up}
      onPointerLeave={up}
      onPointerCancel={up}
      style={{
        width: size,
        height: size,
        borderRadius: 14,
        background: `${color}33`,
        border: `2px solid ${color}88`,
        color: '#fff',
        fontSize: size * 0.35,
        cursor: 'pointer',
        touchAction: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MobileControls({ inputManager, soundMuted, onToggleSound }: Props) {
  const [isTouch, setIsTouch] = useState(false);
  const [portrait, setPortrait] = useState(false);

  useEffect(() => {
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouch(hasTouch);

    const check = () => setPortrait(window.innerHeight > window.innerWidth);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!isTouch) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        touchAction: 'none',
        zIndex: 20,
      }}
    >
      {/* Portrait warning */}
      {portrait && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.88)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 12,
            pointerEvents: 'auto',
          }}
        >
          <span style={{ fontSize: 48 }}>🔄</span>
          <p style={{ color: '#fff', fontSize: 16, textAlign: 'center', padding: '0 24px' }}>
            Vire o celular para jogar melhor
          </p>
        </div>
      )}

      {/* Left / Right movement – bottom-left */}
      <div
        style={{
          position: 'absolute',
          bottom: 18,
          left: 14,
          display: 'flex',
          gap: 10,
          pointerEvents: 'auto',
        }}
      >
        <VBtn label="◀" action="left" inputManager={inputManager} color="#4488ff" size={74} />
        <VBtn label="▶" action="right" inputManager={inputManager} color="#4488ff" size={74} />
      </div>

      {/* Jump + Attack – bottom-right */}
      <div
        style={{
          position: 'absolute',
          bottom: 18,
          right: 14,
          display: 'flex',
          gap: 10,
          pointerEvents: 'auto',
        }}
      >
        <VBtn label="↑" action="jump" inputManager={inputManager} color="#44cc44" size={74} />
        <VBtn label="⚔" action="attack" inputManager={inputManager} color="#ff6622" size={86} />
      </div>

      {/* Sound toggle – top-right */}
      <button
        onClick={onToggleSound}
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: 'rgba(0,0,0,0.55)',
          border: '1px solid rgba(255,255,255,0.25)',
          color: '#fff',
          borderRadius: 8,
          padding: '6px 12px',
          cursor: 'pointer',
          pointerEvents: 'auto',
          fontSize: 18,
        }}
      >
        {soundMuted ? '🔇' : '🔊'}
      </button>
    </div>
  );
}

