// ─── Primitives ───────────────────────────────────────────────────────────────
export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ─── Game State ───────────────────────────────────────────────────────────────
export type GamePhase = 'playing' | 'gameover' | 'victory';
export type GameMode = 'normal' | 'mini-boss' | 'boss';

// ─── Math System ──────────────────────────────────────────────────────────────
export interface MathQuestion {
  question: string;
  answer: number;
  options: number[];
  a: number;
  b: number;
  operation: 'multiply' | 'add';
}

export interface MathEquation {
  id: string;
  a: number;
  b: number;
  answer: number;
}

// ─── Hammer System ────────────────────────────────────────────────────────────
export type HammerState = 'normal' | 'charged' | 'supercharged' | 'giant';
export type VisualAssistLevel = 'clear' | 'subtle' | 'none';

// ─── Persistence (prepared for Supabase) ──────────────────────────────────────
export interface SaveData {
  highScore: number;
  lastLevel: number;
  /** Future: Supabase user id */
  userId?: string;
}
