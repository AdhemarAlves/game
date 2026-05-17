import type { HammerState } from '../types';

/**
 * Governs quiz cycling and per-hit damage rules during a stage boss battle.
 *
 * Key rules:
 *  - An uncharged (normal) hammer deals 0 damage — boss is immune.
 *  - Players must answer questions correctly to charge the hammer.
 *  - The boss continuously re-enables new quiz questions while alive.
 *  - Every time the boss turns around at a patrol boundary, a new question
 *    is immediately available (cooldown reset).
 */
export class BossBattleSystem {
  /** Remaining cooldown (ms) before the boss can present another question. */
  private questionCooldown = 0;
  private readonly QUESTION_COOLDOWN_MS = 1800;

  /** Cumulative correct answers in this battle (for UI feedback). */
  correctAnswers = 0;
  /** Total questions answered (correct + wrong). */
  totalAnswers   = 0;

  update(deltaMs: number): void {
    if (this.questionCooldown > 0) {
      this.questionCooldown = Math.max(0, this.questionCooldown - deltaMs);
    }
  }

  /** True when the boss may present another quiz question. */
  canAskQuestion(): boolean {
    return this.questionCooldown <= 0;
  }

  /** Call immediately when the player answers a boss quiz (correct or wrong). */
  onQuestionAnswered(correct: boolean): void {
    this.totalAnswers++;
    if (correct) this.correctAnswers++;
    this.questionCooldown = this.QUESTION_COOLDOWN_MS;
  }

  /**
   * Call when the boss reverses patrol direction.
   * Clears the cooldown so a new question fires immediately.
   */
  onBossTurnedAround(): void {
    this.questionCooldown = 0;
  }

  /**
   * How much HP damage a hammer hit deals to the boss.
   * `normal` = 0, so the boss cannot be killed without answering questions first.
   */
  getDamageForHammer(state: HammerState): number {
    switch (state) {
      case 'normal':       return 0;
      case 'charged':      return 20;
      case 'supercharged': return 50;
      case 'giant':        return 100;
    }
  }

  reset(): void {
    this.questionCooldown = 0;
    this.correctAnswers   = 0;
    this.totalAnswers     = 0;
  }
}
