type KidnapStage =
  | 'darkening'
  | 'entering'
  | 'approaching'
  | 'grabbing'
  | 'holding'
  | 'escaping'
  | 'message'
  | 'done';

/**
 * Plays the "boss kidnaps the bird" cutscene entirely on the canvas.
 *
 * Flow:
 *  darkening   → screen dims
 *  entering    → boss slides in from the right edge, stops at ~65% width
 *  approaching → boss walks toward the bird's exact position
 *  grabbing    → boss extends arm and grabs bird  (caller sets bird.state='scared')
 *  holding     → boss holds bird                 (caller sets bird.state='captured')
 *  escaping    → boss flees right carrying bird
 *  message     → "recover the bird!" panel fades in
 *  done        → caller returns to 'playing' mode
 *
 * Usage:
 *   1. start(gameW, groundY, birdX, birdY)
 *   2. update(delta) each frame; poll getStage() for sound / state cues
 *   3. draw(ctx, gameW, gameH) during render
 *   4. isBirdGrabbed() → true once grabbing starts; sync bird pos to getBossPosition()
 *   5. isDone() → switch back to 'playing'
 */
export class BirdKidnappedScene {
  private stage: KidnapStage = 'done';
  private stageTimer    = 0;
  private darknessAlpha = 0;
  private msgElapsed    = 0;

  /** Exposed so the caller can snap the bird entity to the boss. */
  bossX = 0;
  bossY = 0;

  private bossTargetX = 0;
  private bossSpeed   = 0;

  /** 0 = arm at rest, 1 = arm fully extended toward bird (during grabbing). */
  private armExtend = 0;
  
  /** Tremor effect when boss is holding bird (0-1) */
  private tremor = 0;

  /** Where the bird is — boss walks to this location. */
  private birdX = 0;
  private birdY = 0;

  private readonly DARKENING_DUR   = 700;
  private readonly ENTERING_DUR    = 1100;
  private readonly APPROACHING_DUR = 1300;
  private readonly GRABBING_DUR    = 680;
  private readonly HOLDING_DUR     = 160;   // grab-and-run — very brief
  private readonly ESCAPING_DUR    = 420;   // flees fast
  private readonly MESSAGE_DUR     = 1600;

  /**
   * @param gameW   canvas width
   * @param groundY ground Y coordinate
   * @param birdX   current centre-X of the bird sprite
   * @param birdY   current top-Y of the bird sprite
   */
  start(gameW: number, groundY: number, birdX: number, birdY: number): void {
    this.stage         = 'darkening';
    this.stageTimer    = this.DARKENING_DUR;
    this.darknessAlpha = 0;
    this.msgElapsed    = 0;
    this.armExtend     = 0;
    this.birdX         = birdX;
    this.birdY         = birdY;
    this.bossX         = gameW + 100;
    this.bossY         = groundY - 92;
    this.bossTargetX   = gameW * 0.65;
    this.bossSpeed     = 0;
  }

  update(deltaMs: number): void {
    const dt = deltaMs / 1000;

    switch (this.stage) {
      case 'darkening':
        this.stageTimer   -= deltaMs;
        this.darknessAlpha = Math.min(0.50, this.darknessAlpha + 0.65 * dt);
        if (this.stageTimer <= 0) {
          this.stage      = 'entering';
          this.stageTimer = this.ENTERING_DUR;
          this.bossSpeed  = 340;
        }
        break;

      case 'entering':
        this.stageTimer -= deltaMs;
        if (this.bossX > this.bossTargetX) this.bossX -= this.bossSpeed * dt;
        if (this.stageTimer <= 0) {
          this.stage      = 'approaching';
          this.stageTimer = this.APPROACHING_DUR;
          const distToBird = Math.abs(this.bossX - (this.birdX - 44));
          this.bossSpeed   = distToBird / (this.APPROACHING_DUR / 1000) * 1.05;
        }
        break;

      case 'approaching': {
        this.stageTimer -= deltaMs;
        const stopX = this.birdX - 44;
        if (this.bossX > stopX) this.bossX -= this.bossSpeed * dt;
        if (this.stageTimer <= 0) {
          this.stage      = 'grabbing';
          this.stageTimer = this.GRABBING_DUR;
          this.armExtend  = 0;
        }
        break;
      }

      case 'grabbing': {
        this.stageTimer -= deltaMs;
        const p        = 1 - Math.max(0, this.stageTimer / this.GRABBING_DUR);
        this.armExtend  = Math.min(1, p * 1.6); // arm snaps out fast
        if (this.stageTimer <= 0) {
          this.stage      = 'holding';
          this.stageTimer = this.HOLDING_DUR;
          this.armExtend  = 1;
        }
        break;
      }

      case 'holding':
        this.stageTimer -= deltaMs;
        this.tremor = Math.sin(this.msgElapsed * 0.015) * 0.6; // Tremor effect
        if (this.stageTimer <= 0) {
          this.stage      = 'escaping';
          this.stageTimer = this.ESCAPING_DUR;
          this.bossSpeed  = 680;   // frightened sprint
          this.armExtend  = 0.65;
        }
        break;

      case 'escaping':
        this.stageTimer -= deltaMs;
        this.bossX      += this.bossSpeed * dt;
        this.bossSpeed  += 220 * dt;   // accelerates as it panics
        this.tremor = Math.sin(this.msgElapsed * 0.012) * 0.4; // Tremor while fleeing
        if (this.stageTimer <= 0) {
          this.stage      = 'message';
          this.stageTimer = this.MESSAGE_DUR;
          this.msgElapsed = 0;
        }
        break;

      case 'message':
        this.stageTimer    -= deltaMs;
        this.msgElapsed    += deltaMs;
        this.darknessAlpha  = Math.max(0, this.darknessAlpha - 0.22 * dt);
        if (this.stageTimer <= 0) this.stage = 'done';
        break;

      case 'done':
        break;
    }
  }

  isDone(): boolean          { return this.stage === 'done'; }
  getStage(): KidnapStage    { return this.stage; }
  getDarknessAlpha(): number { return this.darknessAlpha; }
  getTremor(): number        { return this.tremor; }
  getBossPosition(): { x: number; y: number } { return { x: this.bossX, y: this.bossY }; }

  /**
   * True from the moment the boss starts grabbing.
   * Caller should switch the bird to 'captured' and keep its position synced
   * to getBossPosition() while this returns true.
   */
  isBirdGrabbed(): boolean {
    return (
      this.stage === 'grabbing'  ||
      this.stage === 'holding'   ||
      this.stage === 'escaping'  ||
      this.stage === 'message'   ||
      this.stage === 'done'
    );
  }

  draw(ctx: CanvasRenderingContext2D, gameW: number, gameH: number): void {
    // Darkening overlay
    if (this.darknessAlpha > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(0,0,20,${this.darknessAlpha})`;
      ctx.fillRect(0, 0, gameW, gameH);
      ctx.restore();
    }

    // Boss sprite (visible from entering through escaping)
    if (
      this.stage === 'entering'    ||
      this.stage === 'approaching' ||
      this.stage === 'grabbing'    ||
      this.stage === 'holding'     ||
      this.stage === 'escaping'
    ) {
      const scared = this.stage === 'escaping';
      this.drawBoss(ctx, this.bossX, this.bossY, this.armExtend, scared);
    }

    // Mission message panel
    if (this.stage === 'message') {
      this.drawMissionMessage(ctx, gameW, gameH, Math.min(1, this.msgElapsed / 420));
    }
  }

  // ── Boss sprite ──────────────────────────────────────────────────────────

  private drawBoss(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    armExtend: number,
    scared = false,
  ): void {
    const w  = 92, h = 92;
    // Frightened shake during escape
    const shakeX = scared ? Math.sin(Date.now() / 38) * 5 : 0;
    const shakeY = scared ? Math.cos(Date.now() / 28) * 3 : 0;
    const cx = x + w / 2 + shakeX;
    const cy = y + h / 2 + shakeY;

    ctx.save();

    // Red aura
    const aura = ctx.createRadialGradient(cx, cy, 10, cx, cy, 64);
    aura.addColorStop(0, 'rgba(255,30,0,0.42)');
    aura.addColorStop(1, 'rgba(200,0,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(cx, cy, 64, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = 'rgba(255,20,0,0.85)';
    ctx.shadowBlur  = 28;

    // Body
    ctx.fillStyle = '#c81800';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 6, w / 2 - 2, h / 2 - 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Horns (tall, pointy)
    ctx.fillStyle = '#770000';
    const drawHorn = (hx: number, hy: number, tx: number, ty: number) => {
      ctx.beginPath();
      ctx.moveTo(hx - 12, hy);
      ctx.lineTo(tx, ty);
      ctx.lineTo(hx + 12, hy);
      ctx.closePath();
      ctx.fill();
    };
    drawHorn(cx - 22, cy - 24, cx - 14, cy - 58);
    drawHorn(cx + 22, cy - 24, cx + 14, cy - 58);

    // ── Left arm (grabs the bird — bird is to the left, boss entered from right) ──
    const lShoulderX = cx - w * 0.45;
    const lShoulderY = cy + 6;
    // rest: arm hangs down; extended: stretches left toward bird
    const lHandX = lShoulderX - armExtend * 58 + (1 - armExtend) * 4;
    const lHandY = lShoulderY - armExtend * 14 + (1 - armExtend) * 20;

    ctx.shadowColor = 'rgba(160,0,0,0.5)';
    ctx.shadowBlur  = 8;
    ctx.strokeStyle = '#a81000';
    ctx.lineWidth   = 13;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(lShoulderX, lShoulderY);
    ctx.lineTo(lHandX, lHandY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Claw hand
    ctx.fillStyle = '#a81000';
    ctx.beginPath();
    ctx.arc(lHandX, lHandY, 9, 0, Math.PI * 2);
    ctx.fill();

    // Claw tips (3 fingers)
    const clawDir = armExtend > 0.4 ? -0.5 : 0.9;
    for (let i = -1; i <= 1; i++) {
      const angle = clawDir + i * 0.55;
      ctx.strokeStyle = '#cc2200';
      ctx.lineWidth   = 3.5;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(lHandX, lHandY);
      ctx.lineTo(lHandX + Math.cos(angle) * 14, lHandY + Math.sin(angle) * 14);
      ctx.stroke();
    }

    // ── Right arm (passive, at side) ──
    const rShoulderX = cx + w * 0.45;
    const rShoulderY = cy + 6;
    ctx.strokeStyle = '#a81000';
    ctx.lineWidth   = 11;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(rShoulderX, rShoulderY);
    ctx.lineTo(rShoulderX + 14, rShoulderY + 22);
    ctx.stroke();

    ctx.fillStyle = '#a81000';
    ctx.beginPath();
    ctx.arc(rShoulderX + 14, rShoulderY + 22, 8, 0, Math.PI * 2);
    ctx.fill();

    // ── Eyes (scared wide when fleeing, angry otherwise) ──
    ctx.shadowColor = scared ? 'rgba(255,200,0,0.9)' : 'rgba(255,80,0,0.9)';
    ctx.shadowBlur  = 12;
    ctx.fillStyle   = scared ? '#ffcc00' : '#ff2200';
    const eyeR      = scared ? 13 : 10;   // wider when scared
    ctx.beginPath(); ctx.arc(cx - 18, cy - 4, eyeR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 18, cy - 4, eyeR, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur  = 0;

    // Pupils — contracted (fear) when fleeing
    ctx.fillStyle = '#1a0000';
    const pupilR  = scared ? 3 : 6;
    ctx.beginPath(); ctx.arc(cx - 16, cy - 6, pupilR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 20, cy - 6, pupilR, 0, Math.PI * 2); ctx.fill();

    // Brows — raised in fear when escaping, angry V otherwise
    ctx.strokeStyle = '#440000';
    ctx.lineWidth   = 5;
    ctx.lineCap     = 'round';
    if (scared) {
      // Raised worried brows
      ctx.beginPath(); ctx.moveTo(cx - 30, cy - 28); ctx.lineTo(cx - 6, cy - 22); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 30, cy - 28); ctx.lineTo(cx + 6, cy - 22); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(cx - 30, cy - 22); ctx.lineTo(cx - 6, cy - 11); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 30, cy - 22); ctx.lineTo(cx + 6, cy - 11); ctx.stroke();
    }

    // ── Mouth: open in panic when fleeing, menacing grin otherwise ──
    if (scared) {
      ctx.beginPath();
      ctx.arc(cx, cy + 20, 14, 0, Math.PI);
      ctx.fillStyle = '#550000';
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(cx, cy + 22, 18, 0.15, Math.PI - 0.15);
      ctx.fillStyle = '#550000';
      ctx.fill();
      ctx.strokeStyle = '#770000';
      ctx.lineWidth   = 2;
      ctx.stroke();
      ctx.fillStyle = '#f0eedc';
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * 7 - 2,  cy + 22);
        ctx.lineTo(cx + i * 7 + 1,  cy + 32);
        ctx.lineTo(cx + i * 7 + 5,  cy + 22);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Sweat drop when scared
    if (scared) {
      ctx.fillStyle = 'rgba(100,200,255,0.85)';
      ctx.beginPath();
      ctx.ellipse(cx + 36, cy - 18, 5, 8, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + 34, cy - 4, 3.5, 5.5, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // ── Mission message panel ────────────────────────────────────────────────

  private drawMissionMessage(
    ctx: CanvasRenderingContext2D,
    gameW: number,
    gameH: number,
    alpha: number,
  ): void {
    ctx.save();
    ctx.globalAlpha = alpha;

    const pw = 510, ph = 114;
    const px = (gameW - pw) / 2;
    const py = gameH * 0.29;

    ctx.fillStyle   = 'rgba(8,0,25,0.91)';
    ctx.strokeStyle = '#ff5522';
    ctx.lineWidth   = 2.5;
    ctx.shadowColor = 'rgba(255,40,0,0.65)';
    ctx.shadowBlur  = 22;

    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 14);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();

    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#ff7755';
    ctx.font      = 'bold 23px Arial';
    ctx.fillText('O Boss roubou o pássaro mágico!', gameW / 2, py + 36);

    ctx.fillStyle = '#ffdd99';
    ctx.font      = 'bold 19px Arial';
    ctx.fillText('Recupere o pássaro! 🐦', gameW / 2, py + 78);

    ctx.restore();
  }
}
