/**
 * Visual cage drawn around the captive magic bird during the boss battle.
 * Triggers a bar-flying break animation when the boss is defeated.
 */
export class BirdCage {
  private breakState: 'closed' | 'breaking' | 'broken' = 'closed';
  private breakTimer  = 0;
  private animTimer   = 0;
  private readonly BREAK_DURATION = 820;

  private fragments: Array<{
    x: number; y: number; vx: number; vy: number;
    rotation: number; rotSpeed: number; alpha: number;
    w: number; h: number;
  }> = [];

  /** Trigger the break animation. cx/cy = horizontal centre + vertical centre of the cage. */
  startBreaking(cx: number, cy: number): void {
    if (this.breakState !== 'closed') return;
    this.breakState = 'breaking';
    this.breakTimer = this.BREAK_DURATION;
    this.fragments  = [];

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.4;
      const spd   = 90 + Math.random() * 160;
      this.fragments.push({
        x: cx + Math.cos(angle) * 20,
        y: cy + Math.sin(angle) * 18,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 85,
        rotation: angle,
        rotSpeed: (Math.random() - 0.5) * 7,
        alpha: 1,
        w: 3 + Math.random() * 2.5,
        h: 10 + Math.random() * 13,
      });
    }
  }

  update(deltaMs: number): void {
    this.animTimer += deltaMs;
    if (this.breakState !== 'breaking') return;

    const dt = deltaMs / 1000;
    this.breakTimer -= deltaMs;

    for (const f of this.fragments) {
      f.x        += f.vx * dt;
      f.y        += f.vy * dt;
      f.vy       += 280 * dt;   // gravity
      f.rotation += f.rotSpeed * dt;
      f.alpha     = Math.max(0, this.breakTimer / this.BREAK_DURATION);
    }

    if (this.breakTimer <= 0) this.breakState = 'broken';
  }

  isBreaking(): boolean { return this.breakState === 'breaking'; }
  isBroken():   boolean { return this.breakState === 'broken'; }

  draw(ctx: CanvasRenderingContext2D, birdX: number, birdY: number): void {
    if (this.breakState === 'broken') return;

    // Centre of the cage (birdX is sprite centre-X, birdY is sprite top)
    const cx = birdX;
    const cy = birdY + 19;
    const cw = 54, ch = 58;

    if (this.breakState === 'closed') {
      this.drawClosedCage(ctx, cx, cy, cw, ch, 1);
    } else {
      const alpha = Math.max(0, (this.breakTimer / this.BREAK_DURATION) ** 1.5);
      this.drawClosedCage(ctx, cx, cy, cw, ch, alpha);

      ctx.save();
      for (const f of this.fragments) {
        ctx.save();
        ctx.globalAlpha = f.alpha * 0.9;
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rotation);
        ctx.fillStyle   = '#9B7020';
        ctx.shadowColor = 'rgba(255,200,50,0.6)';
        ctx.shadowBlur  = 5;
        ctx.fillRect(-f.w / 2, -f.h / 2, f.w, f.h);
        ctx.restore();
      }
      ctx.restore();
    }
  }

  private drawClosedCage(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    cw: number, ch: number,
    alpha: number,
  ): void {
    ctx.save();
    ctx.globalAlpha = alpha;

    const l = cx - cw / 2;
    const t = cy - ch / 2;

    // Sad ambient blue glow (trapped bird)
    const pulse = 0.06 + 0.04 * Math.sin(this.animTimer / 580);
    const glow  = ctx.createRadialGradient(cx, cy, 6, cx, cy, cw * 0.75);
    glow.addColorStop(0, `rgba(60,100,255,${pulse * alpha})`);
    glow.addColorStop(1, 'rgba(60,100,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, cw * 0.75, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = 'rgba(60,30,0,0.5)';
    ctx.shadowBlur  = 7;

    // Outer frame
    ctx.strokeStyle = '#7A5010';
    ctx.lineWidth   = 3.5;
    ctx.beginPath();
    ctx.roundRect(l, t, cw, ch, 6);
    ctx.stroke();

    // Top arch
    ctx.beginPath();
    ctx.arc(cx, t, cw * 0.28, -Math.PI, 0);
    ctx.stroke();

    // Vertical bars
    ctx.strokeStyle = '#A07030';
    ctx.lineWidth   = 2.5;
    ctx.shadowBlur  = 0;
    for (let i = 1; i < 4; i++) {
      const bx = l + (cw / 4) * i;
      ctx.beginPath();
      ctx.moveTo(bx, t + 6);
      ctx.lineTo(bx, t + ch - 6);
      ctx.stroke();
    }

    // Horizontal mid-bar
    ctx.beginPath();
    ctx.moveTo(l + 5,      t + ch / 2);
    ctx.lineTo(l + cw - 5, t + ch / 2);
    ctx.stroke();

    // Hanging chain (3 links)
    ctx.strokeStyle = '#60AAAA';
    ctx.lineWidth   = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(cx, t - 6 - i * 8, 3.5, 4.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}
