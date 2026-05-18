import type { MathMemory } from './MathMemory';

export interface LessonEquation {
  a: number;
  b: number;
  result: number;
  /** multiplier shown (1–10) */
  step: number;
}

export type LessonPhase = 'idle' | 'intro' | 'all_at_once' | 'teaching' | 'complete';

/**
 * Controls the magic-bird lesson sequence:
 *   intro (2.2 s) → teach each of the 10 equations (2.6 s each)
 *   → complete message (1.8 s) → isReadyForKidnap() becomes true.
 */
export class BirdLessonSystem {
  private table          = 1;
  private step           = 0;      // 0–9: current equation index
  private stepTimer      = 0;
  private introTimer     = 0;
  private completeTimer  = 0;
  private allAtOnceTimer = 0;
  private phase: LessonPhase = 'idle';

  private readonly STEP_DURATION     = 2600;
  private readonly INTRO_DURATION    = 2200;
  private readonly COMPLETE_DURATION = 1800;
  private readonly ALL_AT_ONCE_DURATION = 6000;

  private taughtOps: LessonEquation[] = [];

  // ── Public API ──────────────────────────────────────────────────────────────

  startLesson(table: number): void {
    this.table         = table;
    this.step          = 0;
    this.stepTimer     = 0;
    this.introTimer    = this.INTRO_DURATION;
    this.completeTimer = 0;
    this.taughtOps     = [];
    this.phase         = 'intro';
  }

  /**
   * Tick the lesson. Returns true whenever a step advances
   * (intro → all_at_once, or all_at_once → complete).
   */
  update(deltaMs: number): boolean {
    if (this.phase === 'intro') {
      this.introTimer -= deltaMs;
      if (this.introTimer <= 0) {
        this.phase = 'all_at_once';
        this.allAtOnceTimer = 0;
        // Record all 10 ops immediately so they are available for monsters
        this.taughtOps = [];
        for (let b = 1; b <= 10; b++) {
          this.taughtOps.push({ a: this.table, b, result: this.table * b, step: b });
        }
        return true;
      }
      return false;
    }

    if (this.phase === 'all_at_once') {
      this.allAtOnceTimer += deltaMs;
      if (this.allAtOnceTimer >= this.ALL_AT_ONCE_DURATION) {
        this.phase = 'complete';
        return true;
      }
      return false;
    }

    if (this.phase === 'teaching') {
      this.stepTimer += deltaMs;
      if (this.stepTimer >= this.STEP_DURATION) {
        this.stepTimer = 0;
        // Record the equation that was just displayed
        const b = this.step + 1;
        this.taughtOps.push({ a: this.table, b, result: this.table * b, step: b });
        this.step++;
        if (this.step >= 10) {
          this.phase = 'complete';
        }
        return true;
      }
      return false;
    }

    if (this.phase === 'complete') {
      this.completeTimer += deltaMs;
    }

    return false;
  }

  // ── Queries ──────────────────────────────────────────────────────────────────

  getPhase(): LessonPhase { return this.phase; }
  getTable(): number      { return this.table; }
  getStep(): number       { return this.step; }  // 0–9
  isComplete(): boolean   { return this.phase === 'complete'; }
  /** 0→1 progress of the all-at-once display phase. */
  getAllAtOnceProgress(): number {
    return Math.min(1, this.allAtOnceTimer / this.ALL_AT_ONCE_DURATION);
  }
  /** True once the "complete" message has been shown long enough. */
  isReadyForKidnap(): boolean {
    return this.phase === 'complete' && this.completeTimer >= this.COMPLETE_DURATION;
  }

  /** Returns the equation currently on screen (null during intro / complete). */
  getCurrentEquation(): LessonEquation | null {
    if (this.phase !== 'teaching') return null;
    const b = this.step + 1;
    return { a: this.table, b, result: this.table * b, step: b };
  }

  /** 0→1 progress of the intro message display. */
  getIntroProgress(): number {
    return Math.max(0, 1 - this.introTimer / this.INTRO_DURATION);
  }

  /** 0→1 fraction of how long the current equation has been shown. */
  getStepProgress(): number {
    return Math.min(1, this.stepTimer / this.STEP_DURATION);
  }

  /** Saves all taught ops into the MathMemory so monsters use them preferentially. */
  saveTaughtOps(memory: MathMemory): void {
    for (const op of this.taughtOps) {
      memory.recordOperation(op.a, op.b, op.result);
    }
  }

  getAllTaughtOps(): LessonEquation[] { return [...this.taughtOps]; }

  reset(): void {
    this.phase         = 'idle';
    this.step          = 0;
    this.stepTimer     = 0;
    this.introTimer    = 0;
    this.completeTimer = 0;
    this.allAtOnceTimer = 0;
    this.taughtOps     = [];
  }
}
