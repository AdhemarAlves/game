import type { Vec2 } from '../types';

export type HealingItemType = 'heart' | 'star' | 'feather';

/**
 * A collectible healing item that restores player HP.
 * Can be a magical heart, shining star, or bird feather.
 */
export class HealingItem {
  position: Vec2;
  readonly size = { width: 24, height: 24 };

  private floatTimer = 0;
  private floatOffset = 0;
  private rotationAngle = 0;
  private readonly floatSpeed = 200; // px/s vertical float when collected
  private readonly duration = 6000; // ms until despawn if not collected
  private elapsedTime = 0;

  readonly healAmount: number;
  readonly type: HealingItemType;

  readonly COLLECT_RANGE = 60; // px

  constructor(x: number, y: number, type: HealingItemType = 'heart') {
    this.position = { x, y };
    this.type = type;

    // Determine heal amount by type
    switch (type) {
      case 'heart':  this.healAmount = 20; break;
      case 'star':   this.healAmount = 30; break;
      case 'feather': this.healAmount = 25; break;
      default: this.healAmount = 20;
    }
  }

  update(deltaMs: number): void {
    this.elapsedTime += deltaMs;
    this.floatTimer += deltaMs;

    // Gentle bobbing float motion
    this.floatOffset = Math.sin(this.floatTimer / 600) * 8;
    this.rotationAngle += deltaMs * 0.003; // slow rotation

    // Die after duration
    if (this.elapsedTime > this.duration) {
      this.elapsedTime = this.duration; // signal expiration
    }
  }

  /** Check if the item has expired. */
  isExpired(): boolean {
    return this.elapsedTime >= this.duration;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const cx = this.position.x + this.size.width / 2;
    const cy = this.position.y + this.size.height / 2 + this.floatOffset;

    ctx.save();

    // Fade out in the last second
    const fadeStart = this.duration - 1000;
    if (this.elapsedTime > fadeStart) {
      const fadeAlpha = 1 - (this.elapsedTime - fadeStart) / 1000;
      ctx.globalAlpha = fadeAlpha;
    }

    // Draw based on type
    ctx.translate(cx, cy);
    ctx.rotate(this.rotationAngle);
    ctx.translate(-cx, -cy);

    switch (this.type) {
      case 'heart':
        this.drawHeart(ctx, cx, cy);
        break;
      case 'star':
        this.drawStar(ctx, cx, cy);
        break;
      case 'feather':
        this.drawFeather(ctx, cx, cy);
        break;
    }

    ctx.restore();
  }

  private drawHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    ctx.fillStyle = '#ff4466';
    ctx.shadowColor = 'rgba(255,68,102,0.8)';
    ctx.shadowBlur = 12;

    ctx.beginPath();
    const sz = 10;
    const bump = 3;
    ctx.moveTo(cx, cy + sz);
    ctx.bezierCurveTo(
      cx - sz, cy - bump,
      cx - sz * 0.6, cy - sz * 0.8,
      cx, cy - sz * 0.3,
    );
    ctx.bezierCurveTo(
      cx + sz * 0.6, cy - sz * 0.8,
      cx + sz, cy - bump,
      cx, cy + sz,
    );
    ctx.fill();
  }

  private drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    ctx.fillStyle = '#ffee33';
    ctx.shadowColor = 'rgba(255,238,51,0.9)';
    ctx.shadowBlur = 14;

    const sz = 9;
    const points = 5;
    const innerR = sz * 0.4;
    const outerR = sz;

    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  private drawFeather(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    ctx.fillStyle = '#44ddaa';
    ctx.strokeStyle = '#22bb88';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(68,221,170,0.8)';
    ctx.shadowBlur = 12;

    // Feather shape: elongated teardrop
    ctx.beginPath();
    ctx.ellipse(cx, cy, 5, 12, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Detail: center vein
    ctx.strokeStyle = '#11aa77';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 10);
    ctx.lineTo(cx, cy + 10);
    ctx.stroke();
  }
}
