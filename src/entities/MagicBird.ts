import type { Vec2 } from '../types';

export type BirdState = 'flying_in' | 'hovering' | 'teaching' | 'idle' | 'captured';

/**
 * The magic bird tutor that flies in, teaches multiplication tables,
 * and gets kidnapped by the boss at the end of each lesson.
 */
export class MagicBird {
  position: Vec2;
  readonly size = { width: 44, height: 38 };

  state: BirdState = 'flying_in';
  glowIntensity = 1;
  /** When true the bird is mirrored so it faces the player on the left. */
  facingLeft    = false;

  // Movement target (approach / hover)
  private targetX = 0;
  private targetY = 0;

  // Animation timers
  private wingTimer   = 0;
  private wingAngle   = 0;
  private bobTimer    = 0;
  private bobOffset   = 0;
  private glowTimer   = 0;
  private sparkTimer  = 0;

  // When captured: lerps toward the boss
  capturedByX = 0;
  capturedByY = 0;

  constructor(x: number, y: number) {
    this.position = { x, y };
  }

  setTarget(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  /**
   * Updates the bird. Returns true the first time it reaches its target.
   */
  update(deltaMs: number): boolean {
    const dt = deltaMs / 1000;

    this.wingTimer  += deltaMs;
    this.glowTimer  += deltaMs;
    this.sparkTimer += deltaMs;
    this.wingAngle   = Math.sin(this.wingTimer / 115) * 0.55;
    this.glowIntensity = 0.7 + 0.3 * Math.sin(this.glowTimer / 380);

    if (this.state === 'flying_in') {
      const dx   = this.targetX - this.position.x;
      const dy   = this.targetY - this.position.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 10) {
        const spd = 230;
        this.position.x += (dx / dist) * spd * dt;
        this.position.y += (dy / dist) * spd * dt;
        return false;
      }
      this.position.x = this.targetX;
      this.position.y = this.targetY;
      return true;
    }

    if (this.state === 'hovering' || this.state === 'teaching') {
      this.bobTimer  += deltaMs;
      this.bobOffset  = Math.sin(this.bobTimer / 520) * 7;
      this.position.y = this.targetY + this.bobOffset;
    }

    // 'idle': bird has finished teaching and stands perfectly still waiting for the boss.
    // No movement update needed — position stays wherever it last was.

    if (this.state === 'captured') {
      this.position.x += (this.capturedByX - 30 - this.position.x) * 0.18;
      this.position.y += (this.capturedByY - 24 - this.position.y) * 0.18;
    }

    return false;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const cx = this.position.x + this.size.width  / 2;
    const cy = this.position.y + this.size.height / 2;

    ctx.save();

    // Mirror the sprite so the bird always faces the player
    if (this.facingLeft) {
      ctx.translate(2 * cx, 0);
      ctx.scale(-1, 1);
    }

    // Tremble when scared (captured state)
    if (this.state === 'captured') {
      ctx.translate(Math.sin(this.wingTimer / 28) * 2.5, 0);
    }

    // Outer halo
    const haloR = this.state === 'teaching' ? 50 : 38;
    const halo = ctx.createRadialGradient(cx, cy, 4, cx, cy, haloR);
    halo.addColorStop(0,    `rgba(120,255,210,${0.50 * this.glowIntensity})`);
    halo.addColorStop(0.55, `rgba(80,200,255,${0.22 * this.glowIntensity})`);
    halo.addColorStop(1,    'rgba(60,160,255,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = `rgba(80,255,190,${0.7 * this.glowIntensity})`;
    ctx.shadowBlur  = 14;

    // Tail feathers
    ctx.fillStyle = '#2288cc';
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy + 4);
    ctx.lineTo(cx - 26, cy - 3);
    ctx.lineTo(cx - 21, cy + 10);
    ctx.lineTo(cx - 11, cy + 12);
    ctx.closePath();
    ctx.fill();

    // Body
    ctx.fillStyle = '#33cc99';
    ctx.beginPath();
    ctx.ellipse(cx - 2, cy + 3, 15, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wing (flapping)
    ctx.save();
    ctx.translate(cx - 4, cy + 1);
    ctx.rotate(this.wingAngle);
    ctx.fillStyle = '#44bbee';
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 6, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Head
    ctx.fillStyle = '#44ddaa';
    ctx.beginPath();
    ctx.ellipse(cx + 9, cy - 6, 10, 9, 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    if (this.state === 'captured') {
      // ── Scared wide eyes ──────────────────────────────────────────
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx + 13, cy - 7, 5.5, 0, Math.PI * 2);
      ctx.fill();
      // Small contracted pupil shifted up (fear reflex)
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(cx + 13, cy - 9.5, 1.6, 0, Math.PI * 2);
      ctx.fill();
      // Shine
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(cx + 14, cy - 11, 0.8, 0, Math.PI * 2);
      ctx.fill();
      // Raised scared eyebrow
      ctx.strokeStyle = '#334';
      ctx.lineWidth   = 1.8;
      ctx.beginPath();
      ctx.moveTo(cx + 7, cy - 17);
      ctx.lineTo(cx + 20, cy - 15);
      ctx.stroke();
      // Tear drop
      ctx.fillStyle = 'rgba(100,180,255,0.80)';
      ctx.beginPath();
      ctx.ellipse(cx + 10, cy - 1, 2, 3.5, 0.1, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // ── Normal eyes ───────────────────────────────────────────────
      ctx.fillStyle  = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx + 14, cy - 7, 3.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(cx + 15, cy - 7, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(cx + 16, cy - 8.5, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }

    // Beak
    if (this.state === 'captured') {
      // Open beak – screaming in fright
      ctx.fillStyle = '#ffcc33';
      ctx.beginPath();
      ctx.moveTo(cx + 19, cy - 5);
      ctx.lineTo(cx + 27, cy - 3);
      ctx.lineTo(cx + 24, cy - 1);
      ctx.closePath();
      ctx.fill();
      // Lower mandible (open)
      ctx.fillStyle = '#ffaa22';
      ctx.beginPath();
      ctx.moveTo(cx + 19, cy + 1.5);
      ctx.lineTo(cx + 24, cy - 1);
      ctx.lineTo(cx + 20, cy + 4.5);
      ctx.closePath();
      ctx.fill();
      // Mouth interior
      ctx.fillStyle = '#bb3333';
      ctx.beginPath();
      ctx.ellipse(cx + 22, cy + 0.5, 2, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Closed beak
      ctx.fillStyle = '#ffcc33';
      ctx.beginPath();
      ctx.moveTo(cx + 20, cy - 6);
      ctx.lineTo(cx + 27, cy - 4);
      ctx.lineTo(cx + 20, cy - 1);
      ctx.closePath();
      ctx.fill();
    }

    // Cheek blush
    ctx.fillStyle = 'rgba(255,160,160,0.40)';
    ctx.beginPath();
    ctx.ellipse(cx + 11, cy - 2, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    this.drawSparkles(ctx, cx, cy);

    ctx.restore();
  }

  private drawSparkles(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    const t = this.sparkTimer;
    const pts = [
      { dx: -22, dy: -16, phase: 0.0 },
      { dx:  22, dy: -20, phase: 1.4 },
      { dx: -28, dy:   6, phase: 2.8 },
      { dx:  24, dy:   8, phase: 0.7 },
      { dx:   2, dy: -28, phase: 2.1 },
    ];
    for (const s of pts) {
      const alpha = 0.40 + 0.60 * Math.sin(t / 320 + s.phase);
      const sz    = 2.5  + 1.5  * Math.sin(t / 250 + s.phase + 1);
      const sx    = cx + s.dx;
      const sy    = cy + s.dy;

      ctx.save();
      ctx.globalAlpha  = alpha * this.glowIntensity;
      ctx.fillStyle    = '#ffffcc';
      ctx.shadowColor  = '#ffffff';
      ctx.shadowBlur   = 6;

      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const r     = i % 2 === 0 ? sz : sz * 0.4;
        ctx.lineTo(sx + Math.cos(angle) * r, sy + Math.sin(angle) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}
