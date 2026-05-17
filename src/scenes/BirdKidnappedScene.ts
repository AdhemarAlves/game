type KidnapStage =
  | 'darkening'
  | 'boss_enters'
  | 'capture'
  | 'boss_flees'
  | 'message'
  | 'done';

/**
 * Plays the boss-kidnaps-the-bird cutscene entirely on the canvas.
 * Caller should:
 *   1. Call start() once.
 *   2. Call update(delta) each frame and poll getStage() for sound cues.
 *   3. Call draw(ctx, gameW, gameH) during the render pass.
 *   4. When isDone() → return to 'playing' mode.
 */
export class BirdKidnappedScene {
  private stage: KidnapStage = 'done';
  private stageTimer   = 0;
  private darknessAlpha = 0;
  private msgElapsed   = 0;

  // Boss position (public so callers can sync the bird entity)
  bossX = 0;
  bossY = 0;

  private bossTargetX = 0;
  private bossSpeed   = 0;

  private readonly DARKNESS_DURATION  = 750;
  private readonly BOSS_ENTER_DURATION = 1100;
  private readonly CAPTURE_DURATION   = 560;
  private readonly BOSS_FLEE_DURATION  = 1000;
  private readonly MESSAGE_DURATION   = 2700;

  start(gameW: number, groundY: number): void {
    this.stage        = 'darkening';
    this.stageTimer   = this.DARKNESS_DURATION;
    this.darknessAlpha = 0;
    this.msgElapsed   = 0;
    this.bossX        = gameW + 90;
    this.bossY        = groundY - 82;
    this.bossTargetX  = gameW * 0.55;
    this.bossSpeed    = 0;
  }

  update(deltaMs: number): void {
    const dt = deltaMs / 1000;

    switch (this.stage) {
      case 'darkening':
        this.stageTimer   -= deltaMs;
        this.darknessAlpha = Math.min(0.52, this.darknessAlpha + 0.55 * dt);
        if (this.stageTimer <= 0) {
          this.stage      = 'boss_enters';
          this.stageTimer = this.BOSS_ENTER_DURATION;
          this.bossSpeed  = 295;
        }
        break;

      case 'boss_enters':
        this.stageTimer -= deltaMs;
        if (this.bossX > this.bossTargetX) this.bossX -= this.bossSpeed * dt;
        if (this.stageTimer <= 0) {
          this.stage      = 'capture';
          this.stageTimer = this.CAPTURE_DURATION;
        }
        break;

      case 'capture':
        this.stageTimer -= deltaMs;
        if (this.stageTimer <= 0) {
          this.stage      = 'boss_flees';
          this.stageTimer = this.BOSS_FLEE_DURATION;
          this.bossSpeed  = 370;
        }
        break;

      case 'boss_flees':
        this.stageTimer -= deltaMs;
        this.bossX      += this.bossSpeed * dt;
        if (this.stageTimer <= 0) {
          this.stage      = 'message';
          this.stageTimer = this.MESSAGE_DURATION;
          this.msgElapsed = 0;
        }
        break;

      case 'message':
        this.stageTimer -= deltaMs;
        this.msgElapsed += deltaMs;
        this.darknessAlpha = Math.max(0, this.darknessAlpha - 0.22 * dt);
        if (this.stageTimer <= 0) {
          this.stage = 'done';
        }
        break;

      case 'done':
        break;
    }
  }

  isDone(): boolean                      { return this.stage === 'done'; }
  getStage(): KidnapStage                { return this.stage; }
  getDarknessAlpha(): number             { return this.darknessAlpha; }
  getBossPosition(): { x: number; y: number } { return { x: this.bossX, y: this.bossY }; }

  draw(ctx: CanvasRenderingContext2D, gameW: number, gameH: number): void {
    // Darkness
    if (this.darknessAlpha > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(0,0,20,${this.darknessAlpha})`;
      ctx.fillRect(0, 0, gameW, gameH);
      ctx.restore();
    }

    // Boss visible during approach / capture / flee
    if (
      this.stage === 'boss_enters' ||
      this.stage === 'capture'     ||
      this.stage === 'boss_flees'
    ) {
      this.drawBoss(ctx, this.bossX, this.bossY);
    }

    // Mission message
    if (this.stage === 'message') {
      this.drawMissionMessage(ctx, gameW, gameH, Math.min(1, this.msgElapsed / 420));
    }
  }

  // ── Boss sprite ──────────────────────────────────────────────────────────

  private drawBoss(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const w  = 88, h = 88;
    const cx = x + w / 2;
    const cy = y + h / 2;

    ctx.save();
    ctx.shadowColor = 'rgba(255,40,0,0.75)';
    ctx.shadowBlur  = 28;

    // Body
    ctx.fillStyle = '#cc2200';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 8, w / 2 - 2, h / 2 - 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Horns
    ctx.fillStyle = '#880000';
    const drawHorn = (hx: number, hy: number, tipX: number) => {
      ctx.beginPath();
      ctx.moveTo(hx - 10, hy);
      ctx.lineTo(tipX, hy - 26);
      ctx.lineTo(hx + 10, hy);
      ctx.closePath();
      ctx.fill();
    };
    drawHorn(cx - 20, cy - 20, cx - 14);
    drawHorn(cx + 20, cy - 20, cx + 14);

    ctx.shadowBlur = 0;

    // Eyes
    ctx.fillStyle = '#ff4400';
    ctx.beginPath(); ctx.arc(cx - 16, cy - 2, 9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 16, cy - 2, 9, 0, Math.PI * 2); ctx.fill();

    // Pupils
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(cx - 14, cy - 2, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 18, cy - 2, 5, 0, Math.PI * 2); ctx.fill();

    // Angry brows
    ctx.strokeStyle = '#550000';
    ctx.lineWidth   = 3;
    ctx.beginPath(); ctx.moveTo(cx - 26, cy - 16); ctx.lineTo(cx - 8,  cy - 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 26, cy - 16); ctx.lineTo(cx + 8,  cy - 10); ctx.stroke();

    // Mouth
    ctx.beginPath();
    ctx.arc(cx, cy + 18, 16, 0.15, Math.PI - 0.15);
    ctx.stroke();

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
