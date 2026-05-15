export type UpdateFn = (deltaMs: number) => void;

/**
 * requestAnimationFrame-based game loop.
 * Caps delta at 100 ms to prevent spiral-of-death on tab blur.
 */
export class GameLoop {
  private animationId = 0;
  private lastTime = 0;
  private running = false;

  start(onUpdate: UpdateFn): void {
    this.running = true;
    const loop = (time: number) => {
      if (!this.running) return;
      const delta = Math.min(time - this.lastTime, 100);
      this.lastTime = time;
      onUpdate(delta);
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame((time) => {
      this.lastTime = time;
      loop(time);
    });
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.animationId);
  }
}
