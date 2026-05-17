/**
 * Phase-based progression through multiplication tables.
 *
 * Each table has two sub-phases:
 *   1. Artifact sub-phase: artifacts spawn in sequence (N×1, N×2 … N×10).
 *   2. Monster sub-phase:  only monsters spawn using random ops from table N.
 *      After MONSTERS_PER_TABLE monsters, advances to table N+1.
 *
 * After all 9 tables: artifacts and monsters are fully random (mix phase).
 */
export interface TableOp {
  a: number; // table factor  (1-9)
  b: number; // item within table (1-10)
  result: number;
}

export class TableProgressionSystem {
  private currentTable = 1;           // 1-9
  private currentItem = 1;            // 1-10 (artifact sequence within table)
  private subPhase: 'artifacts' | 'monsters' = 'artifacts';
  private monstersSpawned = 0;        // monsters shown in current monster sub-phase
  private readonly MONSTERS_PER_TABLE = 8;
  private allLearnedOps: TableOp[] = [];
  private currentTableOps: TableOp[] = []; // all ops shown for current table
  private randomMixPhase = false;
  private readyForBoss   = false;     // true after enough monsters → boss should spawn

  // ─── Sub-phase query ──────────────────────────────────────────────────────

  /** True when the next spawn should be an artifact. */
  isArtifactSubPhase(): boolean {
    return !this.randomMixPhase && this.subPhase === 'artifacts';
  }

  // ─── Artifact sequencing ─────────────────────────────────────────────────

  /** Returns next sequential artifact op; switches to monster sub-phase when table is complete. */
  nextArtifactOp(): TableOp {
    if (this.randomMixPhase) {
      return this.allLearnedOps[Math.floor(Math.random() * this.allLearnedOps.length)];
    }

    const op: TableOp = {
      a: this.currentTable,
      b: this.currentItem,
      result: this.currentTable * this.currentItem,
    };
    this.currentTableOps.push(op);
    this.allLearnedOps.push(op);

    this.currentItem++;
    if (this.currentItem > 10) {
      // All 10 artifacts shown — switch to monster sub-phase for this table
      this.subPhase = 'monsters';
      this.monstersSpawned = 0;
    }

    return op;
  }

  // ─── Monster operation pool ──────────────────────────────────────────────

  /** Returns a random op for a monster from the current table (or all in mix phase). */
  randomMonsterOp(): TableOp {
    if (this.randomMixPhase) {
      return this.allLearnedOps[Math.floor(Math.random() * this.allLearnedOps.length)];
    }
    const pool = this.currentTableOps.length > 0
      ? this.currentTableOps
      : [{ a: this.currentTable, b: 1, result: this.currentTable }];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /**
   * Call after each monster spawn in the monster sub-phase.
   * When enough monsters have been shown, advances to the next table.
   */
  onMonsterSpawned(): void {
    if (this.randomMixPhase || this.subPhase !== 'monsters') return;
    this.monstersSpawned++;
    if (this.monstersSpawned >= this.MONSTERS_PER_TABLE) {
      // Signal that the stage boss should now spawn (caller handles advancement)
      this.readyForBoss = true;
    }
  }

  // ─── Boss phase ───────────────────────────────────────────────────────────

  /** True when enough monsters have been defeated and the stage boss should spawn. */
  isReadyForBoss(): boolean { return this.readyForBoss && !this.randomMixPhase; }

  /** Call when the stage boss battle begins. */
  onBossPhaseStarted(): void { this.readyForBoss = false; }

  /** Call when the stage boss is defeated. Advances to the next table (or mix phase). */
  onBossDefeated(): void {
    if (this.randomMixPhase) return; // final battle has its own victory
    if (this.currentTable < 9) {
      this.currentTable++;
      this.currentItem     = 1;
      this.subPhase        = 'artifacts';
      this.monstersSpawned = 0;
      this.currentTableOps = [];
    } else {
      this.randomMixPhase = true; // → all tables done, triggers final boss
    }
  }

  /** All ops taught for the current table (used to build boss quiz operations). */
  getTableOps(): TableOp[] { return [...this.currentTableOps]; }

  /** Every op taught across all tables (used for final boss). */
  getAllLearnedOps(): TableOp[] { return [...this.allLearnedOps]; }

  // ─── Queries ─────────────────────────────────────────────────────────────

  /** Current table (1-9). Returns 0 when in random-mix phase. */
  getCurrentTable(): number {
    return this.randomMixPhase ? 0 : this.currentTable;
  }

  isRandomMixPhase(): boolean {
    return this.randomMixPhase;
  }

  getCurrentPhaseProgress(): number {
    return this.currentItem - 1;
  }

  getTotalTaught(): number {
    return this.allLearnedOps.length;
  }
  // ─── Checkpoint (save / restore on game-over continue) ──────────────────────────

  private checkpoint: {
    currentTable: number;
    currentItem: number;
    subPhase: 'artifacts' | 'monsters';
    monstersSpawned: number;
    allLearnedOps: TableOp[];
    currentTableOps: TableOp[];
    randomMixPhase: boolean;
  } | null = null;

  saveCheckpoint(): void {
    this.checkpoint = {
      currentTable: this.currentTable,
      currentItem: this.currentItem,
      subPhase: this.subPhase,
      monstersSpawned: this.monstersSpawned,
      allLearnedOps: [...this.allLearnedOps],
      currentTableOps: [...this.currentTableOps],
      randomMixPhase: this.randomMixPhase,
    };
  }

  restoreCheckpoint(): void {
    if (!this.checkpoint) return;
    this.currentTable = this.checkpoint.currentTable;
    this.currentItem = this.checkpoint.currentItem;
    this.subPhase = this.checkpoint.subPhase;
    this.monstersSpawned = this.checkpoint.monstersSpawned;
    this.allLearnedOps = [...this.checkpoint.allLearnedOps];
    this.currentTableOps = [...this.checkpoint.currentTableOps];
    this.randomMixPhase = this.checkpoint.randomMixPhase;
  }

  hasCheckpoint(): boolean {
    return this.checkpoint !== null;
  }
  // ─── Bird Lesson integration ─────────────────────────────────────────────

  /**
   * Called when the magic-bird lesson has finished teaching all 10 equations.
   * Records them all as learned and advances to the monster sub-phase so that
   * monsters start using those operations.
   */
  completeLessonPhase(): void {
    if (this.randomMixPhase || this.subPhase !== 'artifacts') return;

    // Record every remaining op for this table as learned
    for (let b = this.currentItem; b <= 10; b++) {
      const op: TableOp = { a: this.currentTable, b, result: this.currentTable * b };
      this.currentTableOps.push(op);
      this.allLearnedOps.push(op);
    }

    this.currentItem    = 11;
    this.subPhase       = 'monsters';
    this.monstersSpawned = 0;
  }

  // ─── Reset ───────────────────────────────────────────────────────────────

  reset(): void {
    this.currentTable    = 1;
    this.currentItem     = 1;
    this.subPhase        = 'artifacts';
    this.monstersSpawned = 0;
    this.allLearnedOps   = [];
    this.currentTableOps = [];
    this.randomMixPhase  = false;
    this.readyForBoss    = false;
  }
}
