import { Monster } from './Monster';
import type { Rect } from '../types';

/**
 * Eagle monster — flies above ground, features harder multiplications (7–9 × 7–9).
 * Overrides update() to fly at a fixed height with sine-wave bob.
 */
export class EagleMonster extends Monster {
  override readonly size = { width: 52, height: 40 };

  private wingTime = 0;
  private readonly baseY: number;

  constructor(
    x: number,
    y: number,
    id: number,
    operation?: { a: number; b: number; op: string },
  ) {
    super(x, y, id, operation);
    this.baseY = y;
    this.velocity.x = -100;
  }

  override update(deltaMs: number, _groundY: number): void {
    if (this.state === 'dead') return;

    const dt = deltaMs / 1000;

    if (this.state === 'dying') {
      this.deathTimer -= deltaMs;
      if (this.deathTimer <= 0) this.state = 'dead';
      this.position.x += this.velocity.x * dt;
      this.position.y += 280 * dt; // Fall dramatically
      return;
    }

    this.position.x += this.velocity.x * dt;
    this.wingTime += deltaMs / 1000;
    // Gentle vertical sine bob while flying
    this.position.y = this.baseY + Math.sin(this.wingTime * 2.5) * 18;

    this.animTimer += deltaMs;
    if (this.animTimer >= 110) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 4;
    }
    if (this.state === 'hurt' && this.animFrame === 0) {
      this.state = 'walking';
    }
  }

  override getBounds(): Rect {
    return {
      x: this.position.x + 6,
      y: this.position.y + 4,
      width: this.size.width - 12,
      height: this.size.height - 6,
    };
  }

  override draw(ctx: CanvasRenderingContext2D): void {
    if (this.state === 'dead') return;

    const { x, y } = this.position;
    const w = this.size.width;
    const h = this.size.height;
    const isHurt = this.state === 'hurt';
    const cx = x + w / 2;
    const cy = y + h / 2;
    const wingFlap = Math.sin(this.wingTime * 10) * 0.45;

    ctx.save();

    if (this.state === 'dying') {
      const p = 1 - Math.max(0, this.deathTimer / 700);
      ctx.globalAlpha = 1 - p;
      ctx.translate(cx, cy);
      ctx.rotate(p * Math.PI * 1.5);
      ctx.scale(1 - p * 0.5, 1 - p * 0.5);
      ctx.translate(-cx, -cy);
    }

    // Left wing
    ctx.save();
    ctx.translate(cx - 4, cy);
    ctx.rotate(-wingFlap - 0.15);
    ctx.fillStyle = isHurt ? '#cc7722' : '#8B4513';
    ctx.beginPath();
    ctx.ellipse(-14, -3, 17, 7, 0.25, 0, Math.PI * 2);
    ctx.fill();
    // Wing feather tip
    ctx.fillStyle = isHurt ? '#ddaa44' : '#a0522d';
    ctx.beginPath();
    ctx.ellipse(-22, -1, 7, 3, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Right wing
    ctx.save();
    ctx.translate(cx + 4, cy);
    ctx.rotate(wingFlap + 0.15);
    ctx.fillStyle = isHurt ? '#cc7722' : '#8B4513';
    ctx.beginPath();
    ctx.ellipse(14, -3, 17, 7, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isHurt ? '#ddaa44' : '#a0522d';
    ctx.beginPath();
    ctx.ellipse(22, -1, 7, 3, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Body
    ctx.fillStyle = isHurt ? '#cc7722' : '#8B4513';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, 11, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // White chest
    ctx.fillStyle = isHurt ? '#fffff0' : '#fff8e1';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 5, 7, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    const hx = cx + 5;
    const hy = y + 9;
    ctx.fillStyle = isHurt ? '#eecc88' : '#ffd700';
    ctx.beginPath();
    ctx.arc(hx, hy, 9, 0, Math.PI * 2);
    ctx.fill();

    // Beak (hooked)
    ctx.fillStyle = '#e0900a';
    ctx.beginPath();
    ctx.moveTo(hx + 7, hy - 1);
    ctx.lineTo(hx + 17, hy + 3);
    ctx.lineTo(hx + 12, hy + 7);
    ctx.lineTo(hx + 7, hy + 5);
    ctx.closePath();
    ctx.fill();

    // Eye
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(hx + 3, hy - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(hx + 4, hy - 3, 1, 0, Math.PI * 2);
    ctx.fill();

    // Talons
    ctx.strokeStyle = '#5c3317';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 5, y + h - 2);
    ctx.lineTo(cx - 9, y + h + 5);
    ctx.moveTo(cx - 5, y + h - 2);
    ctx.lineTo(cx - 3, y + h + 5);
    ctx.moveTo(cx - 5, y + h - 2);
    ctx.lineTo(cx, y + h + 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 5, y + h - 2);
    ctx.lineTo(cx + 9, y + h + 5);
    ctx.moveTo(cx + 5, y + h - 2);
    ctx.lineTo(cx + 3, y + h + 5);
    ctx.moveTo(cx + 5, y + h - 2);
    ctx.lineTo(cx, y + h + 4);
    ctx.stroke();

    ctx.restore();
  }
}
