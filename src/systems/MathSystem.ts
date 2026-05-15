import type { MathQuestion } from '../types';

/**
 * Generates multiplication-table questions with distractors.
 * Difficulty scales with maxFactor (controlled by ScoreSystem.level).
 */
export class MathSystem {
  private maxFactor = 5;

  generateQuestion(): MathQuestion {
    const a = Math.floor(Math.random() * this.maxFactor) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    const answer = a * b;
    const options = this.buildOptions(answer, a, b);
    return { question: `${a} × ${b} = ?`, answer, options, a, b, operation: 'multiply' };
  }

  private buildOptions(correct: number, a: number, b: number): number[] {
    const set = new Set<number>([correct]);

    // Plausible near-miss distractors
    const candidates = [
      a * (b + 1),
      a * (b - 1),
      (a + 1) * b,
      Math.max(1, a - 1) * b,
      correct + 2,
      correct - 2,
      correct + a,
      correct + b,
    ].filter(n => n > 0 && n !== correct);

    for (const n of candidates.sort(() => Math.random() - 0.5)) {
      if (set.size >= 4) break;
      set.add(n);
    }

    // Fallback: random distinct integers
    while (set.size < 4) {
      set.add(Math.floor(Math.random() * 90) + 2);
    }

    return [...set].sort(() => Math.random() - 0.5);
  }

  /** Call when the player levels up. */
  setMaxFactor(factor: number): void {
    this.maxFactor = Math.min(Math.max(factor, 2), 10);
  }

  getPointsForCorrect(level: number): number {
    return 10 * level;
  }
}
