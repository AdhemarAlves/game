/**
 * Tracks how many stage bosses have been defeated and provides
 * scaled parameters so each successive boss is stronger and larger.
 */
export class BossEvolutionSystem {
  private level = 0;

  /** Number of bosses defeated so far (= tables cleared). */
  getLevel(): number { return this.level; }

  /** HP for the next stage boss. Starts at 3, +2 per level. */
  getHp(): number { return 3 + this.level * 2; }

  /** Number of quiz operations the boss cycles through. */
  getOpCount(): number { return Math.min(6, 2 + this.level); }

  /** Horizontal speed (negative = leftward). */
  getSpeedX(): number { return -(28 + this.level * 5); }

  /** HP for the final mega-boss. */
  getFinalBossHp(): number { return 8 + this.level * 3; }

  onDefeated(): void { this.level++; }

  reset(): void { this.level = 0; }
}
