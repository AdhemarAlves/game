import type { ActiveQuiz, QuizOption, QuizOptionPosition } from '../systems/QuizModeSystem';
import type { Vec2 } from '../types';

export interface PlayerBounds {
  position: Vec2;
  size: { width: number; height: number };
}

interface OptionLayout {
  x: number;
  y: number;
  position: QuizOptionPosition;
  hint: string;
}

const RESULT_MS = 1200;

export class QuizOverlay {
  draw(
    ctx: CanvasRenderingContext2D,
    quiz: ActiveQuiz,
    player: PlayerBounds,
    gameW: number,
    gameH: number,
  ): void {
    const pCX = player.position.x + player.size.width  / 2;
    const pCY = player.position.y + player.size.height * 0.5;

    // ── 1. Radial vignette – spotlight on player ──────────────────────────────
    const vig = ctx.createRadialGradient(pCX, pCY, 85, pCX, pCY, Math.max(gameW, gameH) * 0.85);
    vig.addColorStop(0,   'rgba(0,5,20,0)');
    vig.addColorStop(0.38,'rgba(0,5,20,0.48)');
    vig.addColorStop(1,   'rgba(0,5,20,0.82)');
    ctx.save();
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, gameW, gameH);
    ctx.restore();

    // ── 2. Thinking pulse around player ──────────────────────────────────────
    if (!quiz.answered) {
      const pulse = 0.68 + 0.32 * Math.sin(Date.now() / 280);
      const glow  = ctx.createRadialGradient(pCX, pCY, 12, pCX, pCY, 62);
      glow.addColorStop(0, `rgba(110,185,255,${0.38 * pulse})`);
      glow.addColorStop(1,  'rgba(110,185,255,0)');
      ctx.save();
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(pCX, pCY, 62, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ── 3. Timer bar ──────────────────────────────────────────────────────────
    this.drawTimer(ctx, quiz, pCX, player.position.y - 22);

    // ── 4. Equation label above player ────────────────────────────────────────
    const eqText = `${quiz.equation.a} × ${quiz.equation.b} = ?`;
    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font         = 'bold 22px Arial';
    ctx.fillStyle    = 'rgba(0,0,0,0.65)';
    ctx.fillText(eqText, pCX + 1, player.position.y - 27 + 1);
    ctx.shadowBlur   = 10;
    ctx.shadowColor  = 'rgba(140,210,255,0.9)';
    ctx.fillStyle    = '#ffffff';
    ctx.fillText(eqText, pCX, player.position.y - 27);
    ctx.restore();

    // ── 5. Answer option bubbles ──────────────────────────────────────────────
    const layouts: OptionLayout[] = [
      { x: pCX - 152, y: pCY,       position: 'left',  hint: '← / ◀' },
      { x: pCX + 152, y: pCY,       position: 'right', hint: '→ / ▶' },
      { x: pCX,       y: pCY - 118, position: 'up',    hint: '↑ / ↑' },
    ];

    for (const layout of layouts) {
      const opt = quiz.options.find(o => o.position === layout.position);
      if (opt) this.drawOption(ctx, opt, layout, quiz);
    }

    // ── 6. Result feedback overlay ────────────────────────────────────────────
    if (quiz.resultPhase !== 'none') {
      this.drawResult(ctx, quiz, pCX, pCY, gameW, gameH);
    }
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  private drawTimer(
    ctx: CanvasRenderingContext2D,
    quiz: ActiveQuiz,
    cx: number,
    topY: number,
  ): void {
    const frac = Math.max(0, quiz.timeLeft / quiz.maxTime);
    const barW = 132;
    const barH = 8;
    const bx   = cx - barW / 2;
    const by   = topY - barH;

    ctx.save();

    // Track background
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.roundRect(bx - 3, by - 3, barW + 6, barH + 6, 5);
    ctx.fill();

    // Colour: green → yellow → red
    const r = frac > 0.5 ? Math.round(255 * (1 - frac) * 2) : 255;
    const g = frac < 0.5 ? Math.round(255 * frac * 2)       : 255;
    const timeColor = `rgb(${r},${g},0)`;

    if (frac < 0.3) {
      ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(Date.now() / 100));
    }

    ctx.fillStyle = timeColor;
    ctx.beginPath();
    ctx.roundRect(bx, by, barW * frac, barH, 4);
    ctx.fill();

    ctx.restore();
  }

  private drawOption(
    ctx: CanvasRenderingContext2D,
    opt: QuizOption,
    layout: OptionLayout,
    quiz: ActiveQuiz,
  ): void {
    const { x, y } = layout;
    const r = 38;

    ctx.save();

    // Flicker when almost out of time
    const timeFrac = quiz.answered ? 1 : quiz.timeLeft / quiz.maxTime;
    if (!quiz.answered && timeFrac < 0.3) {
      ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(Date.now() / 120));
    }

    // Colours shift based on result phase
    let bgFill  = 'rgba(10,25,70,0.9)';
    let rimCol  = 'rgba(80,145,255,0.85)';
    let textFil = '#e8f0ff';
    let glowCol = 'rgba(80,145,255,0.6)';

    if (quiz.resultPhase === 'correct' && opt.isCorrect) {
      bgFill  = 'rgba(5,70,30,0.95)';
      rimCol  = '#44ff88';
      textFil = '#aaffcc';
      glowCol = '#44ff88';
    } else if (quiz.resultPhase === 'wrong') {
      if (opt.isCorrect) {
        // Highlight the correct answer the player missed
        bgFill  = 'rgba(80,60,0,0.95)';
        rimCol  = '#ffcc00';
        textFil = '#ffe066';
        glowCol = '#ffcc00';
      } else {
        bgFill  = 'rgba(70,8,8,0.95)';
        rimCol  = '#ff4444';
        textFil = '#ff9999';
        glowCol = '#ff4444';
      }
    } else if (quiz.resultPhase === 'timeout') {
      bgFill  = 'rgba(20,20,50,0.82)';
      rimCol  = 'rgba(100,100,180,0.45)';
      textFil = 'rgba(180,180,220,0.65)';
      glowCol = 'rgba(100,100,180,0.25)';
    }

    ctx.shadowBlur  = 22;
    ctx.shadowColor = glowCol;

    ctx.fillStyle = bgFill;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur  = 0;
    ctx.strokeStyle = rimCol;
    ctx.lineWidth   = 2.5;
    ctx.stroke();

    ctx.fillStyle    = textFil;
    ctx.font         = `bold ${Math.floor(r * 0.72)}px Arial`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(opt.value), x, y);

    // Control hint below the bubble
    ctx.globalAlpha  = 0.65;
    ctx.fillStyle    = '#aac4ff';
    ctx.font         = '10px Arial';
    ctx.textBaseline = 'top';
    ctx.fillText(layout.hint, x, y + r + 4);

    ctx.restore();
  }

  private drawResult(
    ctx: CanvasRenderingContext2D,
    quiz: ActiveQuiz,
    pCX: number,
    pCY: number,
    gameW: number,
    gameH: number,
  ): void {
    const frac = Math.max(0, quiz.resultTimer / RESULT_MS);
    ctx.save();

    if (quiz.resultPhase === 'correct') {
      ctx.globalAlpha = frac * 0.22;
      ctx.fillStyle   = '#00ff88';
      ctx.fillRect(0, 0, gameW, gameH);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha  = Math.min(1, frac * 1.8);
      ctx.font         = 'bold 54px Arial';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur   = 22;
      ctx.shadowColor  = '#00ff88';
      ctx.fillStyle    = '#ccffdd';
      ctx.fillText('Certo! ✓', pCX, pCY - 75);

    } else if (quiz.resultPhase === 'wrong') {
      ctx.globalAlpha = frac * 0.20;
      ctx.fillStyle   = '#ff2200';
      ctx.fillRect(0, 0, gameW, gameH);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha  = Math.min(1, frac * 1.8);
      ctx.font         = 'bold 50px Arial';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur   = 18;
      ctx.shadowColor  = '#ff4400';
      ctx.fillStyle    = '#ffaaaa';
      ctx.fillText('Ops! ✗', pCX, pCY - 75);

      const correctOpt = quiz.options.find(o => o.isCorrect);
      if (correctOpt) {
        ctx.font        = 'bold 20px Arial';
        ctx.shadowBlur  = 10;
        ctx.shadowColor = '#ffcc00';
        ctx.fillStyle   = '#ffe066';
        ctx.fillText(`Correto era: ${correctOpt.value}`, pCX, pCY - 32);
      }

    } else if (quiz.resultPhase === 'timeout') {
      ctx.globalAlpha = frac * 0.28;
      ctx.fillStyle   = '#001133';
      ctx.fillRect(0, 0, gameW, gameH);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha  = Math.min(1, frac * 1.8);
      ctx.font         = 'bold 38px Arial';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur   = 14;
      ctx.shadowColor  = '#4477ff';
      ctx.fillStyle    = '#aabbff';
      ctx.fillText('Tempo esgotado!', pCX, pCY - 65);
    }

    ctx.restore();
  }
}
