import type { Vec2, Rect } from '../types';

export type MonsterState = 'walking' | 'hurt' | 'dying' | 'dead';

/**
 * Bouncy slime monster drawn with Canvas 2D (pixel-art style).
 * id is exposed so future Supabase sync can reference the entity.
 */
export class Monster {
  position: Vec2;
  velocity: Vec2 = { x: -72, y: 0 };
  readonly size = { width: 40, height: 34 };

  state: MonsterState = 'walking';
  hp = 1;
  readonly id: number;
  operation?: { a: number; b: number; op: string }; // optional operation to display

  protected animTimer = 0;
  protected animFrame = 0;
  protected deathTimer = 0;

  /** Arbitrary key-value bag for future extensions (Supabase metadata etc.) */
  metadata: Record<string, unknown> = {};

  constructor(x: number, y: number, id: number, operation?: { a: number; b: number; op: string }) {
    this.position = { x, y };
    this.id = id;
    this.operation = operation;
  }

  update(deltaMs: number, groundY: number): void {
    if (this.state === 'dead') return;

    if (this.state === 'dying') {
      this.deathTimer -= deltaMs;
      if (this.deathTimer <= 0) this.state = 'dead';
      return;
    }

    const dt = deltaMs / 1000;
    this.position.x += this.velocity.x * dt;

    // Snap to ground
    const floor = groundY - this.size.height;
    if (this.position.y < floor) this.position.y = floor;

    // Animation
    this.animTimer += deltaMs;
    if (this.animTimer >= 190) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 4;
    }

    // Clear hurt after a beat
    if (this.state === 'hurt' && this.animFrame === 0) {
      this.state = 'walking';
    }
  }

  hit(): void {
    this.hp--;
    if (this.hp <= 0) {
      this.state = 'dying';
      this.deathTimer = 620;
    } else {
      this.state = 'hurt';
    }
  }

  isDead(): boolean {
    return this.state === 'dead';
  }

  isDying(): boolean {
    return this.state === 'dying';
  }

  getBounds(): Rect {
    return {
      x: this.position.x + 4,
      y: this.position.y + 4,
      width: this.size.width - 8,
      height: this.size.height - 4,
    };
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.state === 'dead') return;

    const { x, y } = this.position;
    const { width, height } = this.size;

    ctx.save();
    if (this.state === 'dying') {
      const p = 1 - this.deathTimer / 620;
      ctx.globalAlpha = 1 - p;
      ctx.translate(x + width / 2, y + height / 2);
      ctx.rotate(p * Math.PI);
      ctx.scale(1 - p * 0.5, 1 - p * 0.5);
      ctx.translate(-(x + width / 2), -(y + height / 2));
    }
    this.drawSlime(ctx, x, y, width, height);

    ctx.restore();
  }

  // ─── Procedural pixel-art slime ─────────────────────────────────────────────

  private drawSlime(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
  ): void {
    const px = w / 16;
    const bounce = Math.sin(this.animFrame * Math.PI * 0.5) * px * 1.8;
    const isHurt = this.state === 'hurt';

    const body = isHurt ? '#ff7070' : '#44cc44';
    const dark = isHurt ? '#cc2020' : '#1e8822';
    const light = isHurt ? '#ffaaaa' : '#88ee88';

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h + 2, w * 0.42, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bottom flat
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h * 0.85, w * 0.44, h * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main blob (squash/stretch)
    const sx = 1 + bounce * 0.015;
    const sy = 1 - bounce * 0.02;
    ctx.save();
    ctx.translate(x + w / 2, y + h * 0.56);
    ctx.scale(sx, sy);
    ctx.translate(-(x + w / 2), -(y + h * 0.56));
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h * 0.56 - bounce * 0.5, w * 0.46, h * 0.44, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Highlight
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.34, y + h * 0.36 - bounce * 0.4, w * 0.1, h * 0.08, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // Drip on top
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.36, y + h * 0.2 - bounce * 0.5);
    ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.0 - bounce * 0.9, x + w * 0.64, y + h * 0.2 - bounce * 0.5);
    ctx.fill();

    // Eyes (angry — pupils shifted up for menacing glare)
    const eyeY = y + h * 0.44 - bounce * 0.35;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.34, eyeY, px * 2.4, px * 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.66, eyeY, px * 2.4, px * 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Pupils shifted up — mean upward glare
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.36, eyeY - px * 0.8, px * 1.3, px * 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.64, eyeY - px * 0.8, px * 1.3, px * 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Shine
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x + w * 0.37, eyeY - px * 1.4, px * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + w * 0.63, eyeY - px * 1.4, px * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // Angry eyebrows — inner corners pressed down toward eyes (V frown)
    ctx.strokeStyle = dark;
    ctx.lineWidth = px * 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.44, eyeY - px * 2.2);
    ctx.lineTo(x + w * 0.18, eyeY - px * 4.8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + w * 0.56, eyeY - px * 2.2);
    ctx.lineTo(x + w * 0.82, eyeY - px * 4.8);
    ctx.stroke();

    // Mouth — frown with two fangs
    const mouthY = y + h * 0.62 - bounce * 0.25;
    ctx.strokeStyle = '#111';
    ctx.lineWidth = px * 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.28, mouthY);
    ctx.quadraticCurveTo(x + w * 0.50, mouthY - px * 3.2, x + w * 0.72, mouthY);
    ctx.stroke();
    // Fangs hanging below the frown lip
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.37, mouthY - px * 0.6);
    ctx.lineTo(x + w * 0.43, mouthY + px * 2.0);
    ctx.lineTo(x + w * 0.49, mouthY - px * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + w * 0.51, mouthY - px * 0.6);
    ctx.lineTo(x + w * 0.57, mouthY + px * 2.0);
    ctx.lineTo(x + w * 0.63, mouthY - px * 0.6);
    ctx.closePath();
    ctx.fill();

    // Stars burst when hurt
    if (isHurt) {
      ctx.fillStyle = '#ffee00';
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const sx2 = x + w / 2 + Math.cos(angle) * w * 0.52;
        const sy2 = y + h * 0.3 + Math.sin(angle) * h * 0.35;
        ctx.beginPath();
        ctx.arc(sx2, sy2, px * 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
