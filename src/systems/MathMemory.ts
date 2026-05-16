/**
 * Tracks recently learned multiplication operations.
 * Used to generate monsters that test what the player just learned.
 */
export interface LearnedMultiplication {
  a: number;
  b: number;
  result: number;
  timestamp: number;
}

export class MathMemory {
  private recentlyLearned: LearnedMultiplication[] = [];
  private readonly maxMemory = 20;
  private readonly retentionTimeMs = 120000; // Keep for 2 minutes

  /** Record a newly learned operation. */
  recordOperation(a: number, b: number, result: number): void {
    this.recentlyLearned.push({
      a,
      b,
      result,
      timestamp: Date.now(),
    });

    // Keep only recent operations
    if (this.recentlyLearned.length > this.maxMemory) {
      this.recentlyLearned.shift();
    }
  }

  /** Get all operations still in memory. */
  getRecentOps(): LearnedMultiplication[] {
    const now = Date.now();
    return this.recentlyLearned.filter(op => now - op.timestamp < this.retentionTimeMs);
  }

  /** Get a random recently learned operation. */
  getRandomRecentOp(): LearnedMultiplication | null {
    const recent = this.getRecentOps();
    if (recent.length === 0) return null;
    return recent[Math.floor(Math.random() * recent.length)];
  }

  /** Clear memory. */
  clear(): void {
    this.recentlyLearned = [];
  }
}
