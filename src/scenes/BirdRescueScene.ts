type RescueStage = 'fly_free' | 'celebrate' | 'next_table_msg' | 'done';

/**
 * Short cutscene that plays after the stage boss is defeated.
 *  1. fly_free (1.2 s)      – bird flees the boss
 *  2. celebrate (2.2 s)     – "Tabuada X concluída!" banner
 *  3. next_table_msg (2.6 s)– "Próxima missão: Tabuada Y" banner
 *  4. done                  – caller returns to 'playing' or spawns final boss
 *
 * nextTable === 0 signals that all tables are done → final battle.
 */
export class BirdRescueScene {
  private stage: RescueStage = 'done';
  private stageTimer  = 0;
  private msgElapsed  = 0;
  private msgAlpha    = 0;

  private completedTable = 0;
  private nextTable      = 0;

  private readonly FLY_FREE_DUR    = 1200;
  private readonly CELEBRATE_DUR   = 2200;
  private readonly NEXT_TABLE_DUR  = 2600;

  start(completedTable: number, nextTable: number): void {
    this.stage          = 'fly_free';
    this.stageTimer     = this.FLY_FREE_DUR;
    this.completedTable = completedTable;
    this.nextTable      = nextTable;
    this.msgElapsed     = 0;
    this.msgAlpha       = 0;
  }

  update(deltaMs: number): void {
    switch (this.stage) {
      case 'fly_free':
        this.stageTimer -= deltaMs;
        if (this.stageTimer <= 0) {
          this.stage      = 'celebrate';
          this.stageTimer = this.CELEBRATE_DUR;
          this.msgElapsed = 0;
          this.msgAlpha   = 0;
        }
        break;

      case 'celebrate':
        this.stageTimer -= deltaMs;
        this.msgElapsed += deltaMs;
        this.msgAlpha    = Math.min(1, this.msgElapsed / 420);
        if (this.stageTimer <= 0) {
          this.stage      = 'next_table_msg';
          this.stageTimer = this.NEXT_TABLE_DUR;
          this.msgElapsed = 0;
          this.msgAlpha   = 0;
        }
        break;

      case 'next_table_msg':
        this.stageTimer -= deltaMs;
        this.msgElapsed += deltaMs;
        this.msgAlpha    = Math.min(1, this.msgElapsed / 420);
        if (this.stageTimer <= 0) this.stage = 'done';
        break;

      case 'done':
        break;
    }
  }

  getStage(): RescueStage  { return this.stage; }
  isDone(): boolean        { return this.stage === 'done'; }
  /** Returns true when nextTable === 0, meaning all tables are finished → spawn final boss. */
  isFinalBattle(): boolean { return this.nextTable === 0; }

  draw(ctx: CanvasRenderingContext2D, gameW: number, gameH: number): void {
    if (this.msgAlpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.msgAlpha;

    if (this.stage === 'celebrate') {
      this.drawCelebrate(ctx, gameW, gameH);
    } else if (this.stage === 'next_table_msg') {
      this.drawNextTable(ctx, gameW, gameH);
    }

    ctx.restore();
  }

  // ── Private draw helpers ───────────────────────────────────────────────────

  private drawCelebrate(ctx: CanvasRenderingContext2D, gameW: number, gameH: number): void {
    const cx = gameW / 2;
    const cy = gameH * 0.36;
    const pw = 600, ph = 110;

    ctx.fillStyle = 'rgba(0,40,0,0.82)';
    this.roundRect(ctx, cx - pw / 2, cy - ph / 2, pw, ph, 18);
    ctx.fill();

    ctx.strokeStyle = 'rgba(80,255,100,0.78)';
    ctx.lineWidth   = 2.5;
    this.roundRect(ctx, cx - pw / 2, cy - ph / 2, pw, ph, 18);
    ctx.stroke();

    ctx.shadowColor = 'rgba(80,255,80,0.55)';
    ctx.shadowBlur  = 20;
    ctx.fillStyle   = '#88ffaa';
    ctx.font        = 'bold 30px Arial';
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`✓ Tabuada do ${this.completedTable} concluída!`, cx, cy - 20);

    ctx.shadowBlur  = 0;
    ctx.fillStyle   = '#e0ffe0';
    ctx.font        = '22px Arial';
    ctx.fillText('🐦 Pássaro mágico libertado!', cx, cy + 20);
  }

  private drawNextTable(ctx: CanvasRenderingContext2D, gameW: number, gameH: number): void {
    const cx = gameW / 2;
    const cy = gameH * 0.36;
    const pw = 620, ph = 130;

    ctx.fillStyle = 'rgba(0,20,60,0.88)';
    this.roundRect(ctx, cx - pw / 2, cy - ph / 2, pw, ph, 18);
    ctx.fill();

    ctx.strokeStyle = 'rgba(80,180,255,0.78)';
    ctx.lineWidth   = 2.5;
    this.roundRect(ctx, cx - pw / 2, cy - ph / 2, pw, ph, 18);
    ctx.stroke();

    ctx.shadowColor = '#44aaff';
    ctx.shadowBlur  = 18;
    ctx.fillStyle   = '#aaddff';
    ctx.font        = 'bold 26px Arial';
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Próxima missão:', cx, cy - 26);

    ctx.shadowBlur  = 0;
    ctx.fillStyle   = '#ffffff';
    ctx.font        = 'bold 38px Arial';
    ctx.fillText(
      this.nextTable > 0 ? `Tabuada do ${this.nextTable}` : '⚔️  Batalha Final!',
      cx, cy + 22,
    );
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}
