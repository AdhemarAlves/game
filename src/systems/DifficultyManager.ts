/**
 * Adaptive difficulty manager.
 * Adjusts monster spawn rate and speed based on player performance.
 */
export class DifficultyManager {
  private correctStreak = 0;
  private wrongStreak = 0;
  private spawnRateMultiplier = 1;
  private speedMultiplier = 1;
  private monsterSpawnIntervalMs = 3000;

  /** Register a correct answer. */
  onCorrect(): void {
    this.correctStreak++;
    this.wrongStreak = 0;
    this.adjustDifficulty();
  }

  /** Register a wrong answer. */
  onWrong(): void {
    this.wrongStreak++;
    this.correctStreak = 0;
    this.adjustDifficulty();
  }

  private adjustDifficulty(): void {
    // If 4+ correct in a row, increase difficulty
    if (this.correctStreak >= 4) {
      this.spawnRateMultiplier = Math.min(2, this.spawnRateMultiplier + 0.1);
      this.speedMultiplier = Math.min(1.5, this.speedMultiplier + 0.05);
      this.correctStreak = 0; // Reset after adjustment
    }

    // If 2+ wrong in a row, decrease difficulty
    if (this.wrongStreak >= 2) {
      this.spawnRateMultiplier = Math.max(0.5, this.spawnRateMultiplier - 0.15);
      this.speedMultiplier = Math.max(0.7, this.speedMultiplier - 0.1);
      this.wrongStreak = 0; // Reset after adjustment
    }
  }

  /** Get the current spawn interval in milliseconds. */
  getSpawnIntervalMs(): number {
    return this.monsterSpawnIntervalMs / this.spawnRateMultiplier;
  }

  /** Get speed multiplier for monsters. */
  getSpeedMultiplier(): number {
    return this.speedMultiplier;
  }

  /** Get actual monster speed (px/s). */
  getMonsterSpeed(baseSpeed: number = -72): number {
    return baseSpeed * this.speedMultiplier;
  }

  reset(): void {
    this.correctStreak = 0;
    this.wrongStreak = 0;
    this.spawnRateMultiplier = 1;
    this.speedMultiplier = 1;
  }

  getDebugInfo(): string {
    return `Spawn: ${this.spawnRateMultiplier.toFixed(2)}x | Speed: ${this.speedMultiplier.toFixed(2)}x | Correct: ${this.correctStreak} | Wrong: ${this.wrongStreak}`;
  }
}
