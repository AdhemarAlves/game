import type { SaveData } from '../types';

const STORAGE_KEY = 'tabuada_adventure_v1';

/**
 * Manages score, lives, and level — plus localStorage persistence.
 * The SaveData interface has a `userId?` field ready for Supabase integration.
 */
export class ScoreSystem {
  score = 0;
  lives = 3;
  readonly maxLives = 3;
  level = 1;

  private save: SaveData;

  constructor() {
    this.save = this.loadSave();
  }

  private loadSave(): SaveData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as SaveData;
    } catch {
      // Ignore parse errors; start fresh
    }
    return { highScore: 0, lastLevel: 1 };
  }

  private persist(): void {
    if (this.score > this.save.highScore) {
      this.save.highScore = this.score;
    }
    this.save.lastLevel = this.level;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.save));
    } catch {
      // Ignore storage errors (private mode, quota exceeded, etc.)
    }
  }

  addScore(points: number): void {
    this.score += points;
    const newLevel = Math.floor(this.score / 100) + 1;
    if (newLevel > this.level) {
      this.level = newLevel;
    }
    this.persist();
  }

  loseLife(): void {
    this.lives = Math.max(0, this.lives - 1);
    this.persist();
  }

  isGameOver(): boolean {
    return this.lives <= 0;
  }

  getHighScore(): number {
    return this.save.highScore;
  }

  reset(): void {
    this.score = 0;
    this.lives = 3;
    this.level = 1;
  }
}
