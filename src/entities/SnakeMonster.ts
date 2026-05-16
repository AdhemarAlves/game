import { Monster } from './Monster';
import type { Rect } from '../types';

/**
 * Snake monster — low ground slitherer with sinusoidal body wiggle.
 * Medium speed, HP 1.
 */
export class SnakeMonster extends Monster {
  override readonly size = { width: 66, height: 24 };

  private slitherTime = 0;
  private readonly baseY: number;

  constructor(
    x: number,
    y: number,
    id: number,
    operation?: { a: number; b: number; op: string },
  ) {
    super(x, y, id, operation);
    this.baseY = y;
    this.velocity.x = -65;
  }

  override update(deltaMs: number, _groundY: number): void {
    if (this.state === 'dead') return;

    const dt = deltaMs / 1000;

    if (this.state === 'dying') {
      this.deathTimer -= deltaMs;
      if (this.deathTimer <= 0) this.state = 'dead';
      this.position.x += this.velocity.x * dt * 0.4;
      this.position.y += 60 * dt;
      return;
    }

    this.position.x += this.velocity.x * dt;
    this.slitherTime += dt;
    this.position.y = this.baseY + Math.sin(this.slitherTime * 5) * 3;

    this.animTimer += deltaMs;
    if (this.animTimer >= 140) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 4;
    }
    if (this.state === 'hurt' && this.animFrame === 0) {
      this.state = 'walking';
    }
  }

  override getBounds(): Rect {
    return {
      x: this.position.x + 8,
      y: this.position.y + 4,
      width: this.size.width - 16,
      height: this.size.height - 6,
    };
  }

  override draw(ctx: CanvasRenderingContext2D): void {
    if (this.state === 'dead') return;

    const { x, y } = this.position;
    const w = this.size.width;
    const h = this.size.height;
    const isHurt = this.state === 'hurt';
    const wave = this.slitherTime * 5;
    const cx = x + w / 2;
    const midY = y + h / 2;

    ctx.save();

    if (this.state === 'dying') {
      const p = 1 - Math.max(0, this.deathTimer / 600);
      ctx.globalAlpha = 1 - p;
      ctx.translate(cx, midY);
      ctx.rotate(p * Math.PI * 1.2);
      ctx.scale(1 - p * 0.6, 1 - p * 0.6);
      ctx.translate(-cx, -midY);
    }

    const bodyColor = isHurt ? '#99ee55' : '#2d8a1e';
    const scaleColor = isHurt ? '#bbff88' : '#4db830';
    const bellyColor = isHurt ? '#eeffcc' : '#b8e080';

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(cx, y + h + 3, w * 0.38, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Body segments (tail → head, drawn right to left) ──
    const SEGS = 7;
    for (let i = SEGS; i >= 1; i--) {
      const t = i / SEGS; // 1 = tail, fraction → head
      const segX = x + 14 + (1 - t) * (w - 28); // spread across width
      const segWave = Math.sin(wave - (1 - t) * Math.PI * 2.2) * 5;
      const segY = midY + segWave;
      const segR = 5 + t * 3.5; // tail narrow, body wide

      ctx.fillStyle = i % 2 === 0 ? bodyColor : scaleColor;
      ctx.beginPath();
      ctx.ellipse(segX, segY, segR + 1, segR, 0, 0, Math.PI * 2);
      ctx.fill();

      // Belly stripe
      ctx.fillStyle = bellyColor;
      ctx.beginPath();
      ctx.ellipse(segX, segY + 1, segR * 0.55, segR * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Head ──
    const headX = x + 10;
    const headWave = Math.sin(wave) * 5;
    const headY = midY + headWave;

    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(headX, headY, 13, 10, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // Head top highlight
    ctx.fillStyle = scaleColor;
    ctx.beginPath();
    ctx.ellipse(headX + 1, headY - 3, 9, 5, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.ellipse(headX - 5, headY - 3, 3.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#330000';
    ctx.beginPath();
    // Vertical slit pupil
    ctx.ellipse(headX - 5, headY - 3, 1.2, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tongue (forked, flickers)
    if (Math.sin(wave * 1.8) > -0.3) {
      ctx.strokeStyle = '#ff2222';
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(headX - 13, headY + 1);
      ctx.lineTo(headX - 19, headY + 1);
      ctx.stroke();
      const tipX = headX - 19;
      ctx.beginPath();
      ctx.moveTo(tipX, headY + 1);
      ctx.lineTo(tipX - 5, headY - 3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(tipX, headY + 1);
      ctx.lineTo(tipX - 5, headY + 5);
      ctx.stroke();
    }

    ctx.restore();
  }
}
