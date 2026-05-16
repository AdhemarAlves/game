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
  private animTime = 0; // continuous time for smooth limb animation

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

    // Continuous timer for smooth limb animation
    this.animTime += deltaMs / 1000;

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

    // ── Legs (pivot rotation from hip joint for smooth walk/run) ──
    const legSwing = this.state === 'running'
      ? Math.sin(this.animTime * 9) * 0.42
      : this.state === 'jumping'
      ? -0.22
      : Math.sin(this.animTime * 1.8) * 0.04;
    const hipY = y + h * 0.64;
    // Left leg
    ctx.save();
    ctx.translate(x + px * 5.8, hipY);
    ctx.rotate(legSwing);
    ctx.fillStyle = '#252875';
    ctx.fillRect(-px * 1.5, 0, px * 3.2, px * 4.4);
    ctx.fillStyle = '#2e1008';
    ctx.fillRect(-px * 1.8, px * 4.4, px * 4, px * 2.2);
    ctx.restore();
    // Right leg (opposite phase)
    ctx.save();
    ctx.translate(x + px * 10.2, hipY);
    ctx.rotate(-legSwing);
    ctx.fillStyle = '#252875';
    ctx.fillRect(-px * 1.5, 0, px * 3.2, px * 4.4);
    ctx.fillStyle = '#2e1008';
    ctx.fillRect(-px * 1.8, px * 4.4, px * 4, px * 2.2);
    ctx.restore();

    // ── Body ──
    ctx.fillStyle = '#3355cc';
    ctx.fillRect(x + px * 3.2, y + h * 0.38, px * 9.6, px * 5.2);
    // Belt
    ctx.fillStyle = '#7a3c10';
    ctx.fillRect(x + px * 3.2, y + h * 0.38 + px * 4.4, px * 9.6, px * 1.2);
    ctx.fillStyle = '#d4a020';
    ctx.fillRect(x + px * 7, y + h * 0.38 + px * 4.2, px * 2, px * 1.6);

    // ── Arms (pivot rotation from shoulder joint) ──
    const shoulderY = y + h * 0.40;
    const armSwing = this.state === 'running'
      ? Math.sin(this.animTime * 9 + Math.PI) * 0.32
      : this.state === 'jumping'
      ? -0.38
      : Math.sin(this.animTime * 1.8 + 0.5) * 0.05;
    if (this.state === 'attacking') {
      // Right arm swings sword
      const swing = (t / 3) * Math.PI;
      ctx.save();
      ctx.translate(x + px * 13.5, shoulderY);
      ctx.rotate(swing - 0.5);
      ctx.fillStyle = '#d8d8d8';
      ctx.fillRect(-px * 0.8, -px * 7, px * 1.8, px * 7);
      ctx.fillStyle = '#d4a020';
      ctx.fillRect(-px * 1.5, -px * 7.2, px * 3.5, px * 1.2);
      ctx.fillStyle = '#7a3c10';
      ctx.fillRect(-px * 0.8, 0, px * 1.8, px * 2.5);
      ctx.fillStyle = '#3355cc';
      ctx.fillRect(-px * 1.4, 0, px * 2.8, px * 4.2);
      ctx.fillStyle = '#f4c090';
      ctx.fillRect(-px * 1.4, px * 4.2, px * 2.8, px * 2.8);
      ctx.restore();
    } else {
      // Right arm with sword — swings opposite to left leg
      ctx.save();
      ctx.translate(x + px * 12.8, shoulderY);
      ctx.rotate(-armSwing);
      ctx.fillStyle = '#d8d8d8';
      ctx.fillRect(-px * 0.7, -px * 5.5, px * 1.5, px * 5.5);
      ctx.fillStyle = '#d4a020';
      ctx.fillRect(-px * 2, -px * 5.6, px * 4, px * 1);
      ctx.fillStyle = '#7a3c10';
      ctx.fillRect(-px * 0.7, -px * 1, px * 1.5, px * 1.5);
      ctx.fillStyle = '#3355cc';
      ctx.fillRect(-px * 1.4, 0, px * 2.8, px * 4.2);
      ctx.fillStyle = '#f4c090';
      ctx.fillRect(-px * 1.4, px * 4.2, px * 2.8, px * 2.8);
      ctx.restore();
    }
    // Left arm (opposite swing to right)
    ctx.save();
    ctx.translate(x + px * 3.2, shoulderY);
    ctx.rotate(this.state === 'attacking' ? 0.15 : armSwing);
    ctx.fillStyle = '#3355cc';
    ctx.fillRect(-px * 1.4, 0, px * 2.8, px * 4.2);
    ctx.fillStyle = '#f4c090';
    ctx.fillRect(-px * 1.4, px * 4.2, px * 2.8, px * 2.8);
    ctx.restore();

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
