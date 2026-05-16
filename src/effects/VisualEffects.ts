/**
 * Visual effects manager.
 * Handles screen shake, bloom/glow, and other post-processing effects.
 */
export class VisualEffects {
  private screenShake = 0;
  private screenShakeIntensity = 0;
  private bloomIntensity = 0;

  /** Trigger a screen shake effect. */
  shake(intensity: number = 5, durationMs: number = 200): void {
    this.screenShakeIntensity = Math.max(this.screenShakeIntensity, intensity);
    this.screenShake = durationMs;
  }

  /** Get current screen shake offset. */
  getShakeOffset(): { x: number; y: number } {
    if (this.screenShake <= 0) {
      return { x: 0, y: 0 };
    }

    return {
      x: (Math.random() - 0.5) * this.screenShakeIntensity * 2,
      y: (Math.random() - 0.5) * this.screenShakeIntensity * 2,
    };
  }

  /** Set bloom intensity for glow effect. */
  setBloom(intensity: number, durationMs: number = 300): void {
    this.bloomIntensity = intensity;
    // In a real implementation, this would be applied as a shader
    // For now, it's tracked for possible canvas effects
    setTimeout(() => {
      this.bloomIntensity = Math.max(0, this.bloomIntensity - 0.1);
    }, durationMs);
  }

  update(deltaMs: number): void {
    if (this.screenShake > 0) {
      this.screenShake -= deltaMs;
      if (this.screenShake < 0) {
        this.screenShake = 0;
        this.screenShakeIntensity = 0;
      } else {
        // Fade out intensity
        this.screenShakeIntensity *= 0.95;
      }
    }

    if (this.bloomIntensity > 0) {
      this.bloomIntensity *= 0.98;
    }
  }

  getBloomIntensity(): number {
    return Math.min(this.bloomIntensity, 1);
  }

  /** Apply glow effect to canvas context. */
  applyGlow(ctx: CanvasRenderingContext2D, intensity: number): void {
    if (intensity > 0) {
      ctx.shadowBlur = 10 * intensity;
      ctx.shadowColor = `rgba(255, 200, 0, ${0.5 * intensity})`;
    }
  }

  reset(): void {
    this.screenShake = 0;
    this.screenShakeIntensity = 0;
    this.bloomIntensity = 0;
  }
}
