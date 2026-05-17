import { Monster } from './Monster';

/**
 * Stage / final boss.
 * Extends Monster so it integrates with the quiz, collision and scoring
 * systems without any special-casing.
 *
 * The boss patrols back and forth between minX and maxX instead of walking
 * off-screen. On each direction reversal, justTurnedAround is set for one
 * frame so callers can trigger a new quiz question.
 */
export class BossMonster extends Monster {
  /** Level this boss was spawned at. Controls HP, size and visuals. */
  readonly bossLevel: number;

  /** Ordered list of quiz operations the boss presents on each hit. */
  readonly operations: ReadonlyArray<{ a: number; b: number; result: number }>;

  private operationIndex = 0;

  // Dynamic size based on bossLevel — overrides the Monster base 40×34
  override readonly size: { width: number; height: number };

  // ── Patrol system ────────────────────────────────────────────────────────
  /** Left boundary of the patrol arena. */
  minX = 0;
  /** Right boundary of the patrol arena. */
  maxX = 800;
  /** True for exactly one frame each time the boss reverses direction. */
  justTurnedAround = false;
  /** Current patrol direction: -1 = left, +1 = right. */
  private patrolDir = -1;
  /** True while the boss is still entering from the right edge. */
  private isEntering = true;

  constructor(
    x: number,
    y: number,
    id: number,
    hp = 3,
    ops: ReadonlyArray<{ a: number; b: number }> = [],
    bossLevel = 0,
  ) {
    const firstOp = ops[0] ?? { a: 5, b: 5 };
    // isBoss=true so the existing score system awards 150 pts per kill
    super(x, y, id, { a: firstOp.a, b: firstOp.b, op: 'x' }, hp, true);

    this.bossLevel = bossLevel;
    const scale   = 1 + bossLevel * 0.15;
    this.size     = { width: Math.round(80 * scale), height: Math.round(80 * scale) };

    this.operations =
      ops.length > 0
        ? ops.map(o => ({ a: o.a, b: o.b, result: o.a * o.b }))
        : [{ a: firstOp.a, b: firstOp.b, result: firstOp.a * firstOp.b }];
  }

  getCurrentOperation(): { a: number; b: number; result: number } {
    return this.operations[this.operationIndex % this.operations.length];
  }

  private cycleOperation(): void {
    this.operationIndex = (this.operationIndex + 1) % this.operations.length;
    const op = this.operations[this.operationIndex];
    this.operation = { a: op.a, b: op.b, op: 'x' };
  }

  override hit(): void {
    super.hit();
    if (!this.isDead() && !this.isDying()) this.cycleOperation();
  }

  /**
   * Set the arena patrol limits. Call immediately after spawning.
   * The boss enters from the right edge, walks left to maxX, then
   * bounces between minX and maxX for the rest of the battle.
   */
  setPatrolBounds(minX: number, maxX: number): void {
    this.minX = minX;
    this.maxX = maxX;
  }

  /**
   * Apply direct HP damage (used by BossBattleSystem for hammer hits).
   * Only flinches visually on large hits to avoid constant interruption.
   */
  takeDamage(amount: number): void {
    if (amount <= 0) return;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      this.state      = 'dying';
      this.deathTimer = 620;
    } else {
      this.state = 'hurt';
    }
    // Cycle to next quiz operation so the boss keeps asking
    this.cycleOperation();
  }

  override update(deltaMs: number, groundY: number): void {
    if (this.state === 'dead') return;
    if (this.state === 'dying') {
      this.deathTimer -= deltaMs;
      if (this.deathTimer <= 0) this.state = 'dead';
      return;
    }

    this.justTurnedAround = false;
    const dt    = deltaMs / 1000;
    const speed = Math.abs(this.velocity.x) || 40;

    if (this.isEntering) {
      // Walk left from spawn position until reaching the right patrol boundary
      this.position.x -= speed * dt;
      if (this.position.x <= this.maxX) {
        this.position.x = this.maxX;
        this.isEntering = false;
        this.patrolDir  = -1;   // start patrolling leftward
      }
    } else {
      // Bounce patrol between minX and maxX
      this.position.x += this.patrolDir * speed * dt;

      if (this.patrolDir < 0 && this.position.x <= this.minX) {
        this.position.x    = this.minX;
        this.patrolDir     = 1;
        this.justTurnedAround = true;
      } else if (this.patrolDir > 0 && this.position.x >= this.maxX) {
        this.position.x    = this.maxX;
        this.patrolDir     = -1;
        this.justTurnedAround = true;
      }
    }

    // Snap to ground
    const floor = groundY - this.size.height;
    if (this.position.y < floor) this.position.y = floor;

    // Animation
    this.animTimer += deltaMs;
    if (this.animTimer >= 190) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 4;
    }

    // Clear hurt state after one animation cycle
    if (this.state === 'hurt' && this.animFrame === 0) this.state = 'walking';

    // Attack cooldown
    if (this.attackCooldown > 0) {
      this.attackCooldown = Math.max(0, this.attackCooldown - deltaMs);
    }
  }

  override getBounds() {
    return {
      x: this.position.x + 8,
      y: this.position.y + 8,
      width:  this.size.width  - 16,
      height: this.size.height - 16,
    };
  }

  override draw(ctx: CanvasRenderingContext2D): void {
    if (this.state === 'dead') return;

    const { width: w, height: h } = this.size;
    const { x, y } = this.position;
    const cx = x + w / 2;
    const cy = y + h / 2;

    ctx.save();

    if (this.state === 'dying') {
      const p = 1 - Math.max(0, this.deathTimer / 620);
      ctx.globalAlpha = Math.max(0, 1 - p * 1.6);
      ctx.translate(cx, cy);
      ctx.rotate(p * Math.PI * 0.9);
      ctx.scale(1 - p * 0.7, 1 - p * 0.7);
      ctx.translate(-cx, -cy);
    }

    // Level-based colour palette
    const palettes = [
      { body: '#ff4444', dark: '#bb0000', eye: '#ff6600', brow: '#770000' },
      { body: '#dd2200', dark: '#880000', eye: '#ff3300', brow: '#550000' },
      { body: '#bb0022', dark: '#660011', eye: '#ff1133', brow: '#440011' },
      { body: '#880033', dark: '#440020', eye: '#ff0040', brow: '#330018' },
    ];
    const col = palettes[Math.min(this.bossLevel, palettes.length - 1)];

    // Shadow halo
    const haloR = 48 + this.bossLevel * 10;
    const hGrad = ctx.createRadialGradient(cx, cy, 6, cx, cy, haloR);
    hGrad.addColorStop(0, `rgba(255,30,0,${0.35 + this.bossLevel * 0.04})`);
    hGrad.addColorStop(1, 'rgba(200,0,0,0)');
    ctx.fillStyle = hGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = col.dark;
    ctx.shadowBlur  = 22 + this.bossLevel * 4;

    // Large threatening arms
    ctx.fillStyle = col.dark;
    // Left arm
    ctx.beginPath();
    ctx.ellipse(cx - w * 0.60, cy + h * 0.06, w * 0.22, h * 0.28, -0.35, 0, Math.PI * 2);
    ctx.fill();
    // Left hand/claw
    ctx.beginPath();
    ctx.ellipse(cx - w * 0.82, cy + h * 0.20, w * 0.15, w * 0.14, -0.4, 0, Math.PI * 2);
    ctx.fill();
    
    // Right arm
    ctx.beginPath();
    ctx.ellipse(cx + w * 0.60, cy + h * 0.06, w * 0.22, h * 0.28, 0.35, 0, Math.PI * 2);
    ctx.fill();
    // Right hand/claw
    ctx.beginPath();
    ctx.ellipse(cx + w * 0.82, cy + h * 0.20, w * 0.15, w * 0.14, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = col.body;
    ctx.beginPath();
    ctx.ellipse(cx, cy + h * 0.08, w * 0.47, h * 0.43, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Horns
    const drawHorn = (hx: number, hy: number, tx: number, ty: number) => {
      ctx.fillStyle = col.dark;
      ctx.beginPath();
      ctx.moveTo(hx - w * 0.09, hy);
      ctx.lineTo(tx, ty);
      ctx.lineTo(hx + w * 0.09, hy);
      ctx.closePath();
      ctx.fill();
    };
    drawHorn(cx - w * 0.22, cy - h * 0.20, cx - w * 0.15, cy - h * 0.50);
    drawHorn(cx + w * 0.22, cy - h * 0.20, cx + w * 0.15, cy - h * 0.50);

    if (this.bossLevel >= 2) {
      drawHorn(cx - w * 0.35, cy - h * 0.10, cx - w * 0.26, cy - h * 0.36);
      drawHorn(cx + w * 0.35, cy - h * 0.10, cx + w * 0.26, cy - h * 0.36);
    }

    // Crown spikes at level 3+
    if (this.bossLevel >= 3) {
      ctx.fillStyle = '#ffaa00';
      for (let i = -2; i <= 2; i++) {
        const sx = cx + i * w * 0.12;
        ctx.beginPath();
        ctx.moveTo(sx - w * 0.05, cy - h * 0.36);
        ctx.lineTo(sx,            cy - h * 0.54);
        ctx.lineTo(sx + w * 0.05, cy - h * 0.36);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(cx - w * 0.20, cy - h * 0.06, w * 0.10, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + w * 0.20, cy - h * 0.06, w * 0.10, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = col.eye;
    ctx.beginPath(); ctx.arc(cx - w * 0.17, cy - h * 0.06, w * 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + w * 0.22, cy - h * 0.06, w * 0.06, 0, Math.PI * 2); ctx.fill();

    // Angry brows
    ctx.strokeStyle = col.brow;
    ctx.lineWidth   = 2.5 + this.bossLevel * 0.5;
    ctx.beginPath(); ctx.moveTo(cx - w * 0.33, cy - h * 0.22); ctx.lineTo(cx - w * 0.08, cy - h * 0.14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + w * 0.33, cy - h * 0.22); ctx.lineTo(cx + w * 0.08, cy - h * 0.14); ctx.stroke();

    // Mouth
    ctx.beginPath();
    ctx.arc(cx, cy + h * 0.22, w * 0.18, 0.15, Math.PI - 0.15);
    ctx.stroke();

    // Hurt flash
    if (this.state === 'hurt') {
      ctx.fillStyle = 'rgba(255,255,255,0.52)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + h * 0.08, w * 0.47, h * 0.43, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // HP bar drawn outside transformed context
    if (!this.isDying()) this.drawHpBar(ctx);
  }

  drawHpBar(ctx: CanvasRenderingContext2D): void {
    const barW = 110 + this.bossLevel * 18;
    const barH = 14;
    const barX = this.position.x + (this.size.width - barW) / 2;
    const barY = this.position.y - 26;
    const pct  = Math.max(0, this.hp / this.maxHp);

    ctx.fillStyle = '#1a1020';
    ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);

    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barW, barH);

    const hpColor = pct > 0.55 ? '#ff3333' : pct > 0.25 ? '#ff8800' : '#cc0000';
    ctx.shadowColor = hpColor;
    ctx.shadowBlur  = 8;
    ctx.fillStyle   = hpColor;
    ctx.fillRect(barX, barY, barW * pct, barH);
    ctx.shadowBlur  = 0;

    ctx.strokeStyle = '#880000';
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.fillStyle    = '#fff';
    ctx.font         = `bold ${10 + this.bossLevel}px Arial`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${this.hp}/${this.maxHp}`, barX + barW / 2, barY + barH / 2);
  }
}
