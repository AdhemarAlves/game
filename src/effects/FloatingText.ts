import type { Vec2 } from '../types';

export type FloatingTextType = 'damage' | 'heal' | 'score' | 'combo' | 'result' | 'message';

/**
 * Generic floating text system.
 * Texts rise, fade out, and disappear smoothly.
 */
export class FloatingText {
  position: Vec2;
  text: string;
  type: FloatingTextType;
  duration: number;
  elapsed: number = 0;
  readonly size: { width: number; height: number };

  private fontSize: number;
  private baseColor: string;
  private fontWeight: string;

  constructor(
    x: number,
    y: number,
    text: string,
    type: FloatingTextType = 'score',
    durationMs: number = 1500
  ) {
    this.position = { x, y };
    this.text = text;
    this.type = type;
    this.duration = durationMs;
    this.size = { width: 100, height: 40 };

    // Style based on type
    switch (type) {
      case 'damage':
        this.fontSize = 32;
        this.baseColor = '#ff4444';
        this.fontWeight = 'bold';
        break;
      case 'heal':
        this.fontSize = 32;
        this.baseColor = '#44ff44';
        this.fontWeight = 'bold';
        break;
      case 'score':
        this.fontSize = 24;
        this.baseColor = '#ffff44';
        this.fontWeight = 'normal';
        break;
      case 'combo':
        this.fontSize = 48;
        this.baseColor = '#ffaa00';
        this.fontWeight = 'bold';
        break;
      case 'result':
        this.fontSize = 56;
        this.baseColor = '#44ff44';
        this.fontWeight = 'bold';
        break;
      case 'message':
        this.fontSize = 20;
        this.baseColor = '#ffffff';
        this.fontWeight = 'normal';
        break;
    }
  }

  update(deltaMs: number): void {
    this.elapsed += deltaMs;
    this.position.y -= (60 * deltaMs) / 1000; // Rise slowly
  }

  isAlive(): boolean {
    return this.elapsed < this.duration;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const progress = Math.min(this.elapsed / this.duration, 1);
    const alpha = 1 - progress; // Fade out

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.baseColor;
    ctx.font = `${this.fontWeight} ${this.fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Add slight glow/shadow for better visibility
    if (this.type === 'combo' || this.type === 'result') {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 3;
      ctx.strokeText(this.text, this.position.x, this.position.y);
    }

    ctx.fillText(this.text, this.position.x, this.position.y);
    ctx.restore();
  }
}
