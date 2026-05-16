import type { VisualAssistLevel, Rect } from '../types';

let _uid = 0;

/**
 * A projectile launched by a monster carrying a possible answer to the current equation.
 * The player must attack (slash) the correct one to charge the hammer.
 */
export class AnswerProjectile {
  readonly id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;

  readonly value: number;
  readonly isCorrect: boolean;
  readonly equationId: string;
  readonly visualAssistLevel: VisualAssistLevel;

  active = true;

  private animTime = 0;
  readonly baseRadius: number;

  constructor(
    x: number, y: number,
    vx: number, vy: number,
    value: number,
    isCorrect: boolean,
    equationId: string,
    visualAssistLevel: VisualAssistLevel = 'none',
  ) {
    this.id = `p${_uid++}`;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.value = value;
    this.isCorrect = isCorrect;
    this.equationId = equationId;
    this.visualAssistLevel = visualAssistLevel;
    // Correct answer with clear visual assist is slightly bigger
    this.baseRadius = isCorrect && visualAssistLevel === 'clear' ? 26 : 22;
  }

  update(deltaMs: number, groundY: number): void {
    if (!this.active) return;
    const dt = deltaMs / 1000;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += 160 * dt; // gentle gravity arc
    this.animTime += deltaMs;

    if (this.x < -80 || this.x > 1100 || this.y > groundY + 40) {
      this.active = false;
    }
  }

  getBounds(): Rect {
    return {
      x: this.x - this.baseRadius,
      y: this.y - this.baseRadius,
      width: this.baseRadius * 2,
      height: this.baseRadius * 2,
    };
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    const pulse = Math.sin(this.animTime / 190) * 0.12;
    const r = this.baseRadius * (1 + pulse);

    ctx.save();

    // Glow for visual assist
    if (this.isCorrect && this.visualAssistLevel === 'clear') {
      ctx.shadowBlur = 22;
      ctx.shadowColor = '#44ffaa';
    } else if (this.isCorrect && this.visualAssistLevel === 'subtle') {
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#88ffcc';
    }

    // Orb body – radial gradient
    const grad = ctx.createRadialGradient(
      this.x - r * 0.25, this.y - r * 0.25, r * 0.1,
      this.x, this.y, r,
    );

    if (this.isCorrect && this.visualAssistLevel === 'clear') {
      grad.addColorStop(0, '#ccffee');
      grad.addColorStop(0.55, '#33bb77');
      grad.addColorStop(1, '#0a5530');
    } else {
      grad.addColorStop(0, '#ffeecc');
      grad.addColorStop(0.55, '#ff8822');
      grad.addColorStop(1, '#882200');
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fill();

    // Shine
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.arc(this.x - r * 0.28, this.y - r * 0.28, r * 0.32, 0, Math.PI * 2);
    ctx.fill();

    // Value text
    const fontSize = Math.max(13, Math.floor(r * 0.88));
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0,0,0,0.65)';
    ctx.lineWidth = 3;
    ctx.strokeText(String(this.value), this.x, this.y + 1);
    ctx.fillStyle = '#fff';
    ctx.fillText(String(this.value), this.x, this.y + 1);

    ctx.restore();
  }
}
