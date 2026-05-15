import type { Vec2, Rect } from '../types';

export type PlayerState = 'idle' | 'running' | 'jumping' | 'attacking' | 'hurt';

/**
 * The hero character drawn entirely with Canvas 2D primitives (pixel-art style).
 * Swap drawHero() for a real sprite sheet when assets are available.
 */
export class Player {
  position: Vec2;
  velocity: Vec2 = { x: 0, y: 0 };
  readonly size = { width: 36, height: 48 };

  state: PlayerState = 'idle';
  facingRight = true;
  isOnGround = false;

  private animTimer = 0;
  private animFrame = 0;
  private hurtTimer = 0;
  private attackTimer = 0;

  readonly MOVE_SPEED = 200;   // px / s
  readonly JUMP_FORCE = -520;  // px / s (negative = up)
  readonly GRAVITY = 1000;     // px / s²

  constructor(x: number, y: number) {
    this.position = { x, y };
  }

  update(deltaMs: number, groundY: number): void {
    const dt = deltaMs / 1000;

    // Gravity
    if (!this.isOnGround) {
      this.velocity.y += this.GRAVITY * dt;
    }

    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;

    // Ground collision
    const floor = groundY - this.size.height;
    if (this.position.y >= floor) {
      this.position.y = floor;
      this.velocity.y = 0;
      this.isOnGround = true;
      if (this.state === 'jumping') {
        this.state = Math.abs(this.velocity.x) > 10 ? 'running' : 'idle';
      }
    } else {
      this.isOnGround = false;
    }

    // Clamp left boundary
    if (this.position.x < 0) this.position.x = 0;

    // Timers
    if (this.hurtTimer > 0) {
      this.hurtTimer -= deltaMs;
      if (this.hurtTimer <= 0) {
        this.hurtTimer = 0;
        if (this.state === 'hurt') this.state = 'idle';
      }
    }
    if (this.attackTimer > 0) {
      this.attackTimer -= deltaMs;
      if (this.attackTimer <= 0) {
        this.attackTimer = 0;
        if (this.state === 'attacking') {
          this.state = this.isOnGround ? 'idle' : 'jumping';
        }
      }
    }

    // Frame animation
    this.animTimer += deltaMs;
    const dur = this.state === 'running' ? 100 : this.state === 'attacking' ? 75 : 260;
    if (this.animTimer >= dur) {
      this.animTimer = 0;
      const frames = this.state === 'running' ? 4 : this.state === 'attacking' ? 4 : 2;
      this.animFrame = (this.animFrame + 1) % frames;
    }
  }

  jump(): void {
    if (this.isOnGround) {
      this.velocity.y = this.JUMP_FORCE;
      this.state = 'jumping';
      this.isOnGround = false;
    }
  }

  attack(): void {
    if (this.state !== 'attacking') {
      this.state = 'attacking';
      this.animFrame = 0;
      this.animTimer = 0;
      this.attackTimer = 400;
    }
  }

  hurt(): void {
    this.state = 'hurt';
    this.hurtTimer = 1400;
    this.velocity.x = (this.facingRight ? -1 : 1) * 160;
  }

  getBounds(): Rect {
    return {
      x: this.position.x + 5,
      y: this.position.y + 6,
      width: this.size.width - 10,
      height: this.size.height - 6,
    };
  }

  isInvincible(): boolean {
    return this.hurtTimer > 0;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    // Flicker on hurt
    if (this.hurtTimer > 0 && Math.floor(this.hurtTimer / 90) % 2 === 0) return;

    const { x, y } = this.position;
    const { width, height } = this.size;

    ctx.save();
    if (!this.facingRight) {
      ctx.translate(x + width / 2, y + height / 2);
      ctx.scale(-1, 1);
      ctx.translate(-(x + width / 2), -(y + height / 2));
    }
    this.drawHero(ctx, x, y, width, height);
    ctx.restore();
  }

  // ─── Procedural pixel-art hero ──────────────────────────────────────────────

  private drawHero(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    const px = w / 16; // 1 "pixel" unit
    const t = this.animFrame;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h + 2, w * 0.36, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Legs ──
    const leg = this.state === 'running' ? Math.sin(t * Math.PI * 0.75) * px * 2.5 : 0;
    // Left leg
    ctx.fillStyle = '#252875';
    ctx.fillRect(x + px * 4.2, y + h * 0.66, px * 3, px * 4 + leg);
    ctx.fillStyle = '#2e1008';
    ctx.fillRect(x + px * 3.7, y + h * 0.66 + px * 4 + leg, px * 3.8, px * 2);
    // Right leg
    ctx.fillStyle = '#252875';
    ctx.fillRect(x + px * 8.8, y + h * 0.66, px * 3, px * 4 - leg);
    ctx.fillStyle = '#2e1008';
    ctx.fillRect(x + px * 8.3, y + h * 0.66 + px * 4 - leg, px * 3.8, px * 2);

    // ── Body ──
    ctx.fillStyle = '#3355cc';
    ctx.fillRect(x + px * 3.2, y + h * 0.38, px * 9.6, px * 5.2);
    // Belt
    ctx.fillStyle = '#7a3c10';
    ctx.fillRect(x + px * 3.2, y + h * 0.38 + px * 4.4, px * 9.6, px * 1.2);
    ctx.fillStyle = '#d4a020';
    ctx.fillRect(x + px * 7, y + h * 0.38 + px * 4.2, px * 2, px * 1.6);

    // ── Arms ──
    const arm = this.state === 'running' ? Math.sin(t * Math.PI * 0.75) * px * 1.5 : 0;
    if (this.state === 'attacking') {
      // Right arm swings sword
      const swing = (t / 3) * Math.PI;
      ctx.save();
      ctx.translate(x + px * 13.5, y + h * 0.44);
      ctx.rotate(swing - 0.5);
      ctx.fillStyle = '#d8d8d8';
      ctx.fillRect(-px * 0.8, -px * 7, px * 1.8, px * 7);
      ctx.fillStyle = '#d4a020';
      ctx.fillRect(-px * 1.5, -px * 7.2, px * 3.5, px * 1.2);
      ctx.fillStyle = '#7a3c10';
      ctx.fillRect(-px * 0.8, 0, px * 1.8, px * 2.5);
      ctx.restore();
      ctx.fillStyle = '#3355cc';
      ctx.fillRect(x + px * 11.5, y + h * 0.38, px * 2.8, px * 4.2);
      ctx.fillStyle = '#f4c090';
      ctx.fillRect(x + px * 11.5, y + h * 0.38 + px * 4, px * 2.8, px * 2.8);
    } else {
      // Sword at rest on right side
      ctx.fillStyle = '#d8d8d8';
      ctx.fillRect(x + px * 13.2, y + h * 0.32, px * 1.4, px * 6.5);
      ctx.fillStyle = '#d4a020';
      ctx.fillRect(x + px * 12, y + h * 0.32 + px * 1.2, px * 4, px * 1);
      ctx.fillStyle = '#3355cc';
      ctx.fillRect(x + px * 11.5, y + h * 0.38 + arm, px * 2.8, px * 4.2);
      ctx.fillStyle = '#f4c090';
      ctx.fillRect(x + px * 11.5, y + h * 0.38 + px * 4 + arm, px * 2.8, px * 2.8);
    }
    // Left arm
    ctx.fillStyle = '#3355cc';
    ctx.fillRect(x + px * 1.7, y + h * 0.38 - arm, px * 2.8, px * 4.2);
    ctx.fillStyle = '#f4c090';
    ctx.fillRect(x + px * 1.7, y + h * 0.38 + px * 4 - arm, px * 2.8, px * 2.8);

    // ── Head ──
    ctx.fillStyle = '#f4c090';
    ctx.fillRect(x + px * 3.8, y + px * 1.8, px * 8.4, px * 6.2);

    // Eyes
    const isHurt = this.state === 'hurt';
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + px * 5.2, y + px * 3.8, px * 2.6, px * 2);
    ctx.fillRect(x + px * 8.4, y + px * 3.8, px * 2.6, px * 2);
    ctx.fillStyle = isHurt ? '#ff3333' : '#2255cc';
    ctx.fillRect(x + px * 5.7, y + px * 4.1, px * 1.6, px * 1.5);
    ctx.fillRect(x + px * 8.9, y + px * 4.1, px * 1.6, px * 1.5);
    // Shine
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + px * 5.7, y + px * 4.1, px * 0.7, px * 0.7);
    ctx.fillRect(x + px * 8.9, y + px * 4.1, px * 0.7, px * 0.7);
    // Eyebrows
    ctx.fillStyle = '#5a3010';
    const brow = isHurt ? px * 3 : px * 2.6;
    ctx.fillRect(x + px * 5.2, y + brow, px * 2.6, px * 0.8);
    ctx.fillRect(x + px * 8.4, y + brow, px * 2.6, px * 0.8);
    // Mouth
    ctx.fillStyle = '#c06040';
    if (isHurt) {
      ctx.fillRect(x + px * 6.5, y + px * 6, px * 3, px * 1);
    } else {
      ctx.fillRect(x + px * 5.8, y + px * 6.2, px * 1, px * 0.8);
      ctx.fillRect(x + px * 9.2, y + px * 6.2, px * 1, px * 0.8);
      ctx.fillRect(x + px * 6.5, y + px * 6.7, px * 3, px * 0.7);
    }

    // Hair
    ctx.fillStyle = '#5a3010';
    ctx.fillRect(x + px * 3.8, y + px * 1.8, px * 8.4, px * 1.8);
    ctx.fillRect(x + px * 3.8, y + px * 2.5, px * 1.8, px * 3);
    ctx.fillRect(x + px * 10.4, y + px * 2.5, px * 1.8, px * 2.2);

    // Hat brim
    ctx.fillStyle = '#1a3399';
    ctx.fillRect(x + px * 2.5, y + px * 1, px * 11, px * 2.4);
    // Hat top
    ctx.fillRect(x + px * 4.2, y - px * 2.2, px * 7.6, px * 3.4);
    // Hat band
    ctx.fillStyle = '#d4a020';
    ctx.fillRect(x + px * 4.2, y + px * 0.5, px * 7.6, px * 1);
    // Feather
    ctx.fillStyle = '#ffe040';
    ctx.beginPath();
    ctx.moveTo(x + px * 11.5, y + px * 1);
    ctx.lineTo(x + px * 15, y - px * 4);
    ctx.lineTo(x + px * 13, y + px * 1.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff8800';
    ctx.beginPath();
    ctx.moveTo(x + px * 12, y + px * 0.5);
    ctx.lineTo(x + px * 14, y - px * 2.5);
    ctx.lineTo(x + px * 12.8, y + px * 0.8);
    ctx.closePath();
    ctx.fill();
  }
}
