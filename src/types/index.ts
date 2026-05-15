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
export type GamePhase = 'playing' | 'question' | 'gameover';

// ─── Math System ──────────────────────────────────────────────────────────────
export interface MathQuestion {
  question: string;
  answer: number;
  options: number[];
  a: number;
  b: number;
  operation: 'multiply' | 'add';
}

// ─── Persistence (prepared for Supabase) ──────────────────────────────────────
export interface SaveData {
  highScore: number;
  lastLevel: number;
  /** Future: Supabase user id */
  userId?: string;
}
