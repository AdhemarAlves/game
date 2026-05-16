/**
 * Tracks recently learned multiplication operations.
 * Accounts for correct/wrong counts to surface ops the player struggles with.
 */
export interface LearnedMultiplication {
  a: number;
  b: number;
  result: number;
  timestamp: number;
  correctCount: number;
  wrongCount: number;
}

export class MathMemory {
  private ops = new Map<string, LearnedMultiplication>();
  private readonly maxMemory = 30;
  private readonly retentionMs = 150_000; // 2.5 minutes

  private key(a: number, b: number): string {
    return `${Math.min(a, b)}x${Math.max(a, b)}`;
  }

  recordOperation(a: number, b: number, result: number): void {
    const k = this.key(a, b);
    const existing = this.ops.get(k);
    if (existing) {
      existing.correctCount++;
      existing.timestamp = Date.now();
    } else {
      if (this.ops.size >= this.maxMemory) {
        // Evict oldest
        let oldest: string | null = null;
        let oldestTime = Infinity;
        for (const [key, op] of this.ops) {
          if (op.timestamp < oldestTime) { oldestTime = op.timestamp; oldest = key; }
        }
        if (oldest) this.ops.delete(oldest);
      }
      this.ops.set(k, { a, b, result, timestamp: Date.now(), correctCount: 1, wrongCount: 0 });
    }
  }

  recordWrong(a: number, b: number): void {
    const k = this.key(a, b);
    const existing = this.ops.get(k);
    if (existing) {
      existing.wrongCount++;
      existing.timestamp = Date.now();
    }
  }

  getRecentOps(): LearnedMultiplication[] {
    const now = Date.now();
    return [...this.ops.values()].filter(op => now - op.timestamp < this.retentionMs);
  }

  /**
   * Returns a random op, weighted toward those answered wrongly more often.
   * Ops answered correctly many times are less likely to reappear.
   */
  getWeightedRandomOp(): LearnedMultiplication | null {
    const recent = this.getRecentOps();
    if (recent.length === 0) return null;

    // Weight = 1 + (wrongCount * 3) - (correctCount * 0.5), minimum 0.5
    const weights = recent.map(op => Math.max(0.5, 1 + op.wrongCount * 3 - op.correctCount * 0.5));
    const total = weights.reduce((s, w) => s + w, 0);
    let rnd = Math.random() * total;
    for (let i = 0; i < recent.length; i++) {
      rnd -= weights[i];
      if (rnd <= 0) return recent[i];
    }
    return recent[recent.length - 1];
  }

  /** @deprecated use getWeightedRandomOp() */
  getRandomRecentOp(): LearnedMultiplication | null {
    return this.getWeightedRandomOp();
  }

  clear(): void {
    this.ops.clear();
  }
}
