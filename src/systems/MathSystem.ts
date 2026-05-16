import type { MathQuestion } from '../types';

export interface LearnedOp {
  a: number;
  b: number;
  op: string;
  result: number;
}

/**
 * Generates multiplication-table questions with plausible distractors.
 * Difficulty scales with maxFactor (controlled by ScoreSystem.level).
 * Can also be constrained to a specific pool of operations (during learning phase).
 */
export class MathSystem {
  private maxFactor = 5;
  private operationPool: LearnedOp[] = [];

  /** Generate a question locked to a specific operation (used by monsters). */
  generateQuestionForOperation(a: number, b: number): MathQuestion {
    const answer = a * b;
    const options = this.buildOptions(answer, a, b);
    return { question: `${a} × ${b} = ?`, answer, options, a, b, operation: 'multiply' };
  }

  generateQuestion(): MathQuestion {
    let a: number, b: number, answer: number;

    if (this.operationPool.length > 0) {
      const op = this.operationPool[Math.floor(Math.random() * this.operationPool.length)];
      a = op.a;
      b = op.b;
      answer = op.result;
    } else {
      a = Math.floor(Math.random() * this.maxFactor) + 1;
      b = Math.floor(Math.random() * 10) + 1;
      answer = a * b;
    }

    const options = this.buildOptions(answer, a, b);
    return { question: `${a} × ${b} = ?`, answer, options, a, b, operation: 'multiply' };
  }

  /**
   * Returns 3 or 4 answer values for projectiles: exactly one correct.
   * Distractors are plausible (near-miss values from the same table).
   */
  buildProjectileOptions(correct: number, a: number, b: number, count = 4): number[] {
    return this.buildOptions(correct, a, b, count);
  }

  private buildOptions(correct: number, a: number, b: number, count = 4): number[] {
    const set = new Set<number>([correct]);

    // Plausible near-miss distractors specific to multiplication tables
    const candidates = [
      a * (b + 1),
      a * (b - 1),
      (a + 1) * b,
      Math.max(1, a - 1) * b,
      a * (b + 2),
      a * (b - 2),
      correct + a,
      correct - a,
      correct + b,
      correct - b,
      correct + 2,
      correct - 2,
    ].filter(n => n > 0 && n !== correct);

    for (const n of candidates.sort(() => Math.random() - 0.5)) {
      if (set.size >= count) break;
      set.add(n);
    }

    while (set.size < count) {
      const fallback = Math.floor(Math.random() * (correct + 20)) + 2;
      set.add(fallback);
    }

    return [...set].sort(() => Math.random() - 0.5);
  }

  /** Call when the player levels up. */
  setMaxFactor(factor: number): void {
    this.maxFactor = Math.min(Math.max(factor, 2), 10);
  }

  /** Constrain questions to specific operations (for learning phase) */
  setOperationPool(ops: LearnedOp[]): void {
    this.operationPool = ops;
  }

  clearOperationPool(): void {
    this.operationPool = [];
  }

  getPointsForCorrect(level: number): number {
    return 10 * level;
  }
}
