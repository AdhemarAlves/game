import { useEffect, useRef } from 'react';
import type { InputManager } from '../engine/InputManager';

interface MobileControlsProps {
  inputManager: InputManager | null;
}

export function MobileControls({ inputManager }: MobileControlsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!inputManager || !containerRef.current) return;

    // Register touch zones (x, y, width, height in game-space 960×540)
    // Left: move left (quarter-width zones on left/right)
    inputManager.registerTouchZone('ArrowLeft', 0, 400, 120, 140);
    // Right: move right
    inputManager.registerTouchZone('ArrowRight', 840, 400, 120, 140);
    // Jump: up button in center-bottom
    inputManager.registerTouchZone('ArrowUp', 420, 420, 120, 120);
    // Attack/Answer: full right half
    inputManager.registerTouchZone('Space', 480, 350, 480, 190);
  }, [inputManager]);

  return (
    <div
      ref={containerRef}
      className="mobile-controls"
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 5,
      }}
    >
      {/* Invisible touch zones with visual guides (only on touch devices) */}
      <style>{`
        @media (hover: none) {
          .mobile-controls::before {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 35%;
            background: linear-gradient(
              to top,
              rgba(0, 200, 255, 0.15),
              rgba(0, 200, 255, 0.05),
              transparent
            );
            pointer-events: none;
          }

          .mobile-btn {
            position: absolute;
            bottom: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(100, 150, 255, 0.3);
            border: 2px solid rgba(100, 200, 255, 0.5);
            border-radius: 8px;
            color: #fff;
            font-family: 'Press Start 2P', monospace;
            font-size: 10px;
            text-shadow: 0 0 4px rgba(0, 200, 255, 0.8);
            user-select: none;
            -webkit-user-select: none;
            -webkit-touch-callout: none;
          }

          .mobile-btn:active {
            background: rgba(100, 200, 255, 0.6);
            box-shadow: 0 0 8px rgba(0, 200, 255, 0.8), inset 0 0 8px rgba(0, 200, 255, 0.4);
          }

          .mobile-btn-left {
            left: 10px;
            width: 70px;
            height: 70px;
          }

          .mobile-btn-right {
            right: 10px;
            width: 70px;
            height: 70px;
          }

          .mobile-btn-jump {
            left: 50%;
            transform: translateX(-50%);
            width: 80px;
            height: 70px;
          }

          .mobile-btn-act {
            right: 10px;
            top: 10px;
            width: 70px;
            height: 70px;
            bottom: auto;
            background: rgba(255, 100, 100, 0.3);
            border-color: rgba(255, 150, 150, 0.5);
          }

          .mobile-btn-act:active {
            background: rgba(255, 150, 150, 0.6);
            box-shadow: 0 0 8px rgba(255, 100, 100, 0.8), inset 0 0 8px rgba(255, 100, 100, 0.4);
          }
        }
      `}</style>

      {/* Desktop: show nothing. Mobile (hover: none): show buttons */}
      <div
        className="mobile-btn mobile-btn-left"
        style={{ display: 'var(--show-mobile, none)' }}
      >
        ◀
      </div>
      <div
        className="mobile-btn mobile-btn-right"
        style={{ display: 'var(--show-mobile, none)' }}
      >
        ▶
      </div>
      <div
        className="mobile-btn mobile-btn-jump"
        style={{ display: 'var(--show-mobile, none)' }}
      >
        ↑
      </div>
      <div
        className="mobile-btn mobile-btn-act"
        style={{ display: 'var(--show-mobile, none)' }}
      >
        ⚔️
      </div>

      <style>{`
        @media (hover: none) {
          .mobile-controls > div {
            --show-mobile: flex !important;
          }
        }
      `}</style>
    </div>
  );
}
