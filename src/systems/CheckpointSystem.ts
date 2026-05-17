/**
 * Manages game checkpoints: saves state when a table is completed or boss is defeated.
 * If the player dies, they can respawn at the last checkpoint instead of restarting.
 */
export interface Checkpoint {
  table: number;
  hp: number;
  score: number;
  level: number;
  timestamp: number;
}

export class CheckpointSystem {
  private lastCheckpoint: Checkpoint | null = null;
  private maxCheckpoints = 5; // keep only the 5 most recent

  /**
   * Save a checkpoint when the player completes a milestone
   * (table completion, boss defeat, phase change, etc).
   */
  saveCheckpoint(table: number, hp: number, score: number, level: number): void {
    this.lastCheckpoint = {
      table,
      hp,
      score,
      level,
      timestamp: Date.now(),
    };
  }

  /** Get the last saved checkpoint, or null if none exists. */
  getLastCheckpoint(): Checkpoint | null {
    return this.lastCheckpoint;
  }

  /** Check if a checkpoint exists. */
  hasCheckpoint(): boolean {
    return this.lastCheckpoint !== null;
  }

  /** Clear all checkpoints (for game restart). */
  reset(): void {
    this.lastCheckpoint = null;
  }
}
