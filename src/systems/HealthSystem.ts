/**
 * Manages player health, damage, invincibility, and healing.
 * Replaces the simple "lives" model with a more forgiving HP-based system.
 */
export class HealthSystem {
  private hp: number;
  readonly maxHp = 100;

  /** Time remaining in the current invincibility period (ms). */
  private invincibilityTimer = 0;
  private readonly INVINCIBILITY_DURATION = 1500; // 1.5 seconds

  /** Flash interval during invincibility (ms). */
  private readonly FLASH_INTERVAL = 90;

  constructor() {
    this.hp = this.maxHp;
  }

  /** Get current HP. */
  getHp(): number {
    return this.hp;
  }

  /** Get HP as a fraction (0–1). */
  getHpFraction(): number {
    return this.hp / this.maxHp;
  }

  /** Check if player is currently invincible. */
  isInvincible(): boolean {
    return this.invincibilityTimer > 0;
  }

  /**
   * Apply damage to the player.
   * Returns true if damage was actually applied (not blocked by invincibility).
   */
  takeDamage(amount: number): boolean {
    if (this.isInvincible()) return false;

    this.hp = Math.max(0, this.hp - amount);
    this.invincibilityTimer = this.INVINCIBILITY_DURATION;
    return true;
  }

  /** Heal the player. */
  heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  /** Check if player is dead (HP = 0). */
  isDead(): boolean {
    return this.hp <= 0;
  }

  /** Update invincibility timer. */
  update(deltaMs: number): void {
    if (this.invincibilityTimer > 0) {
      this.invincibilityTimer = Math.max(0, this.invincibilityTimer - deltaMs);
    }
  }

  /**
   * Determine if the player should flash during invincibility.
   * Used for rendering the blinking effect.
   */
  shouldFlash(): boolean {
    if (!this.isInvincible()) return false;
    return Math.floor(this.invincibilityTimer / this.FLASH_INTERVAL) % 2 === 0;
  }

  /**
   * Reset health to full.
   */
  reset(): void {
    this.hp = this.maxHp;
    this.invincibilityTimer = 0;
  }

  /**
   * Restore to a specific HP value (used for checkpoints).
   */
  restoreFromCheckpoint(hp: number): void {
    this.hp = Math.max(0, Math.min(this.maxHp, hp));
    this.invincibilityTimer = 0;
  }
}
