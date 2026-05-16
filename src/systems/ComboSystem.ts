/**
 * Tracks player combo streak.
 * Combo increases on correct answers, resets on wrong answers.
 */
export class ComboSystem {
  combo = 0;
  readonly maxCombo = 99;
  private comboTimer = 0;
  private comboTimeoutMs = 5000; // Reset if no correct answer in 5s

  /** Register a correct answer. */
  hit(): void {
    this.combo = Math.min(this.combo + 1, this.maxCombo);
    this.comboTimer = 0;
  }

  /** Reset combo on wrong answer. */
  miss(): void {
    this.combo = 0;
    this.comboTimer = 0;
  }

  update(deltaMs: number): void {
    if (this.combo > 0) {
      this.comboTimer += deltaMs;
      if (this.comboTimer >= this.comboTimeoutMs) {
        this.combo = 0;
        this.comboTimer = 0;
      }
    }
  }

  getCombo(): number {
    return this.combo;
  }

  getMultiplier(): number {
    return Math.max(1, this.combo);
  }

  reset(): void {
    this.combo = 0;
    this.comboTimer = 0;
  }
}
