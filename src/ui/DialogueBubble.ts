import type { MagicBird } from '../entities/MagicBird';
import type { BirdLessonSystem } from '../systems/BirdLessonSystem';

/**
 * Draws the magic bird's speech bubble / lesson display.
 * Renders on the canvas; no HTML elements used.
 */
export class DialogueBubble {
  draw(
    ctx: CanvasRenderingContext2D,
    bird: MagicBird,
    lesson: BirdLessonSystem,
    gameW: number,
    gameH: number,
  ): void {
    const bx    = bird.position.x + bird.size.width  / 2;
    const by    = bird.position.y;
    const phase = lesson.getPhase();

    if (phase === 'intro') {
      this.drawIntroOverlay(ctx, bx, by, lesson.getTable(), lesson.getIntroProgress(), gameW, gameH);
    } else if (phase === 'teaching') {
      const eq = lesson.getCurrentEquation();
      if (eq) this.drawEquationBubble(ctx, eq, lesson.getStep(), bx, by, gameW);
    } else if (phase === 'complete') {
      this.drawCompleteBubble(ctx, lesson.getTable(), bx, by, gameW);
    }
  }

  // ── Intro ─────────────────────────────────────────────────────────────────

  private drawIntroOverlay(
    ctx: CanvasRenderingContext2D,
    bx: number,
    by: number,
    table: number,
    progress: number,
    gameW: number,
    gameH: number,
  ): void {
    ctx.save();
    ctx.fillStyle = `rgba(0,8,28,${0.35 * Math.min(1, progress * 3)})`;
    ctx.fillRect(0, 0, gameW, gameH);
    ctx.restore();

    const alpha = Math.min(1, progress * 2.5);
    if (alpha < 0.04) return;

    const bubX = Math.min(Math.max(bx, 175), gameW - 175);
    const bubY = by - 18;

    ctx.save();
    ctx.globalAlpha = alpha;
    this.drawBubbleShape(ctx, bubX, bubY - 104, 320, 82, bx, bubY);

    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = '#1a1a40';
    ctx.font         = 'bold 14px Arial';
    ctx.fillText('Olá, aventureiro! ✨', bubX, bubY - 104 + 25);

    ctx.font      = 'bold 18px Arial';
    ctx.fillStyle = '#002255';
    ctx.fillText(`Vou te ensinar a tabuada do ${table}!`, bubX, bubY - 104 + 56);

    ctx.restore();
  }

  // ── Teaching equation ─────────────────────────────────────────────────────

  private drawEquationBubble(
    ctx: CanvasRenderingContext2D,
    eq: { a: number; b: number; result: number; step: number },
    stepIndex: number,   // 0–9
    bx: number,
    by: number,
    gameW: number,
  ): void {
    const bubW = 330;
    const bubH = 122;
    const bubX = Math.min(Math.max(bx, 185), gameW - 185);
    const bubY = by - 20;
    const topY = bubY - bubH - 14;

    ctx.save();
    this.drawBubbleShape(ctx, bubX, topY, bubW, bubH, bx, bubY);

    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    // Big equation
    ctx.shadowColor = 'rgba(60,130,255,0.35)';
    ctx.shadowBlur  = 8;
    ctx.font        = 'bold 46px Arial';
    ctx.fillStyle   = '#1a1a50';
    ctx.fillText(`${eq.a} × ${eq.b} = ${eq.result}`, bubX, topY + bubH / 2 - 8);
    ctx.shadowBlur  = 0;

    // Progress dots
    const totalDots = 10;
    const dotGap    = 23;
    const dotsLeft  = bubX - (totalDots - 1) * dotGap / 2;
    for (let i = 0; i < totalDots; i++) {
      const isDone    = i < stepIndex;
      const isCurrent = i === stepIndex;
      ctx.globalAlpha = isDone || isCurrent ? 1 : 0.32;
      ctx.fillStyle   = isCurrent ? '#ffcc00' : isDone ? '#44dd88' : '#aaaaaa';
      ctx.beginPath();
      ctx.arc(dotsLeft + i * dotGap, topY + bubH - 14, isCurrent ? 5.5 : 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  // ── Complete ─────────────────────────────────────────────────────────────

  private drawCompleteBubble(
    ctx: CanvasRenderingContext2D,
    table: number,
    bx: number,
    by: number,
    gameW: number,
  ): void {
    const bubX = Math.min(Math.max(bx, 175), gameW - 175);
    const bubY = by - 20;

    ctx.save();
    this.drawBubbleShape(ctx, bubX, bubY - 96, 310, 72, bx, bubY);

    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = '#003322';
    ctx.font         = 'bold 18px Arial';
    ctx.fillText(`Tabuada do ${table} completa! ✨`, bubX, bubY - 96 + 28);

    ctx.font      = '14px Arial';
    ctx.fillStyle = '#224433';
    ctx.fillText('Você aprendeu tudo! Agora...', bubX, bubY - 96 + 54);

    ctx.restore();
  }

  // ── Shared bubble shape ──────────────────────────────────────────────────

  private drawBubbleShape(
    ctx: CanvasRenderingContext2D,
    cx: number,
    topY: number,
    w: number,
    h: number,
    tailX: number,
    tailTipY: number,
  ): void {
    const r     = 14;
    const left  = cx - w / 2;
    const right = cx + w / 2;
    const bot   = topY + h;
    const tailW = 13;

    ctx.save();
    ctx.fillStyle   = 'rgba(238,250,255,0.97)';
    ctx.strokeStyle = 'rgba(80,195,255,0.88)';
    ctx.lineWidth   = 2.5;
    ctx.shadowColor = 'rgba(60,180,255,0.55)';
    ctx.shadowBlur  = 20;

    ctx.beginPath();
    ctx.moveTo(left + r, topY);
    ctx.lineTo(right - r, topY);
    ctx.quadraticCurveTo(right, topY, right, topY + r);
    ctx.lineTo(right, bot - r);
    ctx.quadraticCurveTo(right, bot, right - r, bot);
    ctx.lineTo(Math.min(tailX + tailW, right - r), bot);
    ctx.lineTo(tailX, tailTipY);
    ctx.lineTo(Math.max(tailX - tailW, left + r), bot);
    ctx.lineTo(left + r, bot);
    ctx.quadraticCurveTo(left, bot, left, bot - r);
    ctx.lineTo(left, topY + r);
    ctx.quadraticCurveTo(left, topY, left + r, topY);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();
    ctx.restore();
  }
}
