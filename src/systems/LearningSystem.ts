/**
 * Manages learning phase: generates 5 unique operations to learn.
 * Tracks which operations were learned, then provides a subset for quizzing.
 */
export interface LearnedOperation {
  a: number;
  b: number;
  op: string; // '×' for multiplication
  result: number;
}

export class LearningSystem {
  private learnedOps: LearnedOperation[] = [];

  generateLearningOps(): LearnedOperation[] {
    this.learnedOps = [];
    const seen = new Set<string>();

    // Generate 5 unique multiplication operations
    while (this.learnedOps.length < 5) {
      const a = 2 + Math.floor(Math.random() * 8); // 2-9
      const b = 2 + Math.floor(Math.random() * 8); // 2-9
      const key = `${a}×${b}`;

      if (!seen.has(key)) {
        seen.add(key);
        this.learnedOps.push({
          a,
          b,
          op: '×',
          result: a * b,
        });
      }
    }

    return this.learnedOps;
  }

  getLearnedOps(): LearnedOperation[] {
    return [...this.learnedOps];
  }

  reset(): void {
    this.learnedOps = [];
  }
}
