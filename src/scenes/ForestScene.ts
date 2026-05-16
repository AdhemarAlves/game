/**
 * Procedurally-drawn parallax forest background.
 * No external assets required — everything is painted with Canvas 2D API.
 *
 * v2: scroll is driven externally so the background only moves when
 * the player is actually walking right (worldScrollSpeed).
 */
export class ForestScene {
  private offset = 0;
  private scrollSpeed = 0; // px/s — set each frame by GameCanvas

  /** Called each frame with the current world scroll speed (0 when player is still). */
  update(deltaMs: number, worldScrollSpeed = 0): void {
    this.scrollSpeed = worldScrollSpeed;
    this.offset += this.scrollSpeed * (deltaMs / 1000);
  }

  setScrollSpeed(pxPerSec: number): void {
    this.scrollSpeed = pxPerSec;
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    this.drawSky(ctx, w, h);
    this.drawSun(ctx, w, h);
    this.drawClouds(ctx, w, h, this.offset * 0.08);

    // Mountains: 4 layers from distant (snow-capped) to near (dark hills)
    this.drawMountainLayer(ctx, w, h, this.offset * 0.07, '#5a7fa6', h * 0.49, 220, 100, 'rgba(225,238,255,0.80)');
    this.drawMountainLayer(ctx, w, h, this.offset * 0.15, '#3b5f7a', h * 0.55, 170, 80,  'rgba(210,228,255,0.55)');
    this.drawMountainLayer(ctx, w, h, this.offset * 0.27, '#2a4d40', h * 0.61, 140, 62);
    this.drawMountainLayer(ctx, w, h, this.offset * 0.42, '#1e3a28', h * 0.65, 105, 42);

    // Fundo (distante): lentas, pequenas, poucas, alto na tela
    this.drawTreeLayer(ctx, w, h, this.offset * 0.32, '#7aaa55', h * 0.62, 26, 33, 110, 20);
    // Meio: velocidade e tamanho médios
    this.drawTreeLayer(ctx, w, h, this.offset * 0.55, '#4a8a2e', h * 0.67, 44, 55, 78, 14);

    this.drawGround(ctx, w, h);

    // Frente (próximas): rápidas, grandes, encostadas no chão
    this.drawTreeLayer(ctx, w, h, this.offset * 0.90, '#2e6818', h * 0.74, 70, 86, 82, 22);
    this.drawGroundDetail(ctx, w, h, this.offset);
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private drawSky(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const g = ctx.createLinearGradient(0, 0, 0, h * 0.74);
    g.addColorStop(0, '#0d1b3e');
    g.addColorStop(0.35, '#1e4d8c');
    g.addColorStop(0.75, '#4e87c4');
    g.addColorStop(1, '#9ecfee');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  private drawSun(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const cx = w * 0.78;
    const cy = h * 0.14;
    // Glow
    const glow = ctx.createRadialGradient(cx, cy, 18, cx, cy, 55);
    glow.addColorStop(0, 'rgba(255,240,100,0.45)');
    glow.addColorStop(1, 'rgba(255,240,100,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 55, 0, Math.PI * 2);
    ctx.fill();
    // Core
    ctx.fillStyle = '#ffe87c';
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawClouds(ctx: CanvasRenderingContext2D, w: number, h: number, off: number): void {
    const spacing = 230;
    const count = Math.ceil(w / spacing) + 2;
    const start = -(off % spacing) - spacing;
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    for (let i = 0; i < count; i++) {
      const x = start + i * spacing + (i * 43 % 90) - 20;
      const y = h * 0.1 + (i * 19 % 55);
      const s = 0.65 + (i * 7 % 7) * 0.08;
      this.drawCloud(ctx, x, y, s);
    }
  }

  private drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
    ctx.beginPath();
    ctx.arc(x + 30 * s, y, 16 * s, 0, Math.PI * 2);
    ctx.arc(x + 52 * s, y - 10 * s, 22 * s, 0, Math.PI * 2);
    ctx.arc(x + 76 * s, y, 17 * s, 0, Math.PI * 2);
    ctx.arc(x + 52 * s, y + 10 * s, 18 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawMountainLayer(
    ctx: CanvasRenderingContext2D,
    w: number, h: number,
    off: number, color: string,
    baseY: number, spacing: number, peakH: number,
    snowColor?: string,
  ): void {
    // Normalize offset so negative scroll (player going left) wraps correctly
    const nOff  = ((off % spacing) + spacing) % spacing;
    const count = Math.ceil(w / spacing) + 3;
    const x0    = -nOff - spacing;
    const id0   = Math.floor(off / spacing);

    // ── Main silhouette ─ smooth S-curves between valleys and peaks ────────────
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x0, h);
    ctx.lineTo(x0, baseY);

    for (let i = 0; i <= count + 1; i++) {
      const id  = id0 + i;
      const bx  = x0 + i * spacing;
      // Deterministic variation per mountain (stable with scroll, no flicker)
      const phv = peakH * (0.72 + ((id * 37 + 13) % 33) / 100);
      const px  = bx + spacing * (0.30 + ((id * 23 + 7) % 32) / 100);
      const py  = baseY - phv;

      ctx.bezierCurveTo(
        bx + spacing * 0.18, baseY,           // leave valley flat
        px - spacing * 0.15, py + phv * 0.12, // approach peak
        px, py,                               // PEAK
      );
      ctx.bezierCurveTo(
        px + spacing * 0.15, py + phv * 0.12, // leave peak
        bx + spacing * 0.82, baseY,           // descend
        bx + spacing, baseY,                  // next valley
      );
    }

    ctx.lineTo(x0 + (count + 2) * spacing, h);
    ctx.closePath();
    ctx.fill();

    // ── Depth shadow on the descending (right) side of each peak ───────────
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    for (let i = 0; i <= count + 1; i++) {
      const id  = id0 + i;
      const bx  = x0 + i * spacing;
      const phv = peakH * (0.72 + ((id * 37 + 13) % 33) / 100);
      const px  = bx + spacing * (0.30 + ((id * 23 + 7) % 32) / 100);
      const py  = baseY - phv;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.bezierCurveTo(
        px + spacing * 0.15, py + phv * 0.12,
        bx + spacing * 0.82, baseY,
        px + spacing * 0.30, baseY,
      );
      ctx.closePath();
      ctx.fill();
    }

    // ── Snow caps on distant mountains ─────────────────────────────────
    if (snowColor) {
      ctx.fillStyle = snowColor;
      for (let i = 0; i <= count + 1; i++) {
        const id  = id0 + i;
        const bx  = x0 + i * spacing;
        const phv = peakH * (0.72 + ((id * 37 + 13) % 33) / 100);
        const px  = bx + spacing * (0.30 + ((id * 23 + 7) % 32) / 100);
        const py  = baseY - phv;
        const sw  = spacing * 0.10;
        const sh  = phv * 0.27;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.bezierCurveTo(px + sw * 0.6, py + sh * 0.4, px + sw, py + sh, px + sw,  py + sh);
        ctx.bezierCurveTo(px,            py + sh * 0.7,  px - sw, py + sh, px - sw,  py + sh);
        ctx.bezierCurveTo(px - sw * 0.6, py + sh * 0.4, px,       py,      px,       py);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  private drawTreeLayer(
    ctx: CanvasRenderingContext2D,
    w: number, h: number,
    off: number, color: string,
    baseY: number, minH: number, maxH: number, spacing: number,
    jitter = 14,
  ): void {
    // firstId: índice absoluto da primeira árvore visível (mais margem)
    const firstId = Math.floor(off / spacing) - 1;
    const count   = Math.ceil(w / spacing) + 4;

    for (let i = 0; i < count; i++) {
      const treeId  = firstId + i;
      // Jitter estável: depende só do treeId, nunca muda enquanto a árvore rola
      const jitterX = (((treeId * 7) % (jitter * 2)) + jitter * 2) % (jitter * 2) - jitter;
      const x = treeId * spacing - off + jitterX;
      const th = minH;

      // Apple-tree proportions
      const cr = th * 0.42;          // canopy radius
      const trunkW = Math.max(3, th * 0.13);
      const trunkH = th * 0.42;
      const cx = x + cr;             // horizontal centre of the whole tree
      const ccy = baseY - trunkH - cr * 0.72; // canopy centre Y

      // ── Ground shadow ───────────────────────────────────────────────────────
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.ellipse(cx, baseY + 2, cr * 0.7, Math.max(3, cr * 0.13), 0, 0, Math.PI * 2);
      ctx.fill();

      // ── Trunk ───────────────────────────────────────────────────────────────
      // Slight flare at the base
      ctx.fillStyle = '#5c3010';
      ctx.beginPath();
      ctx.moveTo(cx - trunkW * 0.5, baseY);
      ctx.lineTo(cx - trunkW * 0.38, baseY - trunkH);
      ctx.lineTo(cx + trunkW * 0.38, baseY - trunkH);
      ctx.lineTo(cx + trunkW * 0.5, baseY);
      ctx.closePath();
      ctx.fill();
      // Trunk highlight stripe
      ctx.fillStyle = '#7a4420';
      ctx.fillRect(cx - trunkW * 0.05, baseY - trunkH + 4, trunkW * 0.28, trunkH * 0.75);

      // ── Canopy — three overlapping circles ──────────────────────────────────
      ctx.fillStyle = color;
      // Left bump
      ctx.beginPath();
      ctx.arc(cx - cr * 0.50, ccy + cr * 0.10, cr * 0.70, 0, Math.PI * 2);
      ctx.fill();
      // Right bump
      ctx.beginPath();
      ctx.arc(cx + cr * 0.50, ccy + cr * 0.10, cr * 0.70, 0, Math.PI * 2);
      ctx.fill();
      // Centre (drawn last so it sits on top of the bumps)
      ctx.beginPath();
      ctx.arc(cx, ccy, cr, 0, Math.PI * 2);
      ctx.fill();

      // Dark underside (depth shadow)
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath();
      ctx.arc(cx, ccy + cr * 0.38, cr * 0.78, 0, Math.PI * 2);
      ctx.fill();

      // Re-draw centre top to recover from shadow overlay
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, ccy - cr * 0.08, cr * 0.78, 0, Math.PI * 2);
      ctx.fill();

      // Light highlight (top-left)
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath();
      ctx.arc(cx - cr * 0.22, ccy - cr * 0.30, cr * 0.50, 0, Math.PI * 2);
      ctx.fill();

      // ── Apples (only on trees large enough to see the detail) ───────────────
      if (th > 36) {
        const appleCount = 2 + (treeId % 2); // 2 or 3 apples per tree
        for (let a = 0; a < appleCount; a++) {
          // Deterministic but varied angle/distance per apple
          const angle = 0.55 + (a / appleCount) * Math.PI * 1.3 + (treeId % 3) * 0.28;
          const dist  = cr * (0.35 + (a * 5 % 3) * 0.10);
          const ax = cx  + Math.cos(angle) * dist;
          const ay = ccy + Math.sin(angle) * dist + cr * 0.18;
          const ar = Math.max(2.5, th * 0.065);

          // Apple body
          ctx.fillStyle = '#cc2020';
          ctx.beginPath();
          ctx.arc(ax, ay, ar, 0, Math.PI * 2);
          ctx.fill();
          // Shine spot
          ctx.fillStyle = '#ee5050';
          ctx.beginPath();
          ctx.arc(ax - ar * 0.30, ay - ar * 0.30, ar * 0.40, 0, Math.PI * 2);
          ctx.fill();
          // Stem
          ctx.strokeStyle = '#4a2a08';
          ctx.lineWidth = Math.max(1, ar * 0.35);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(ax, ay - ar);
          ctx.lineTo(ax + ar * 0.3, ay - ar - Math.max(2, ar * 0.7));
          ctx.stroke();
        }
      }
    }
  }

  private drawGround(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const gy = h * 0.74;
    // Main dirt
    const dirtGrad = ctx.createLinearGradient(0, gy, 0, h);
    dirtGrad.addColorStop(0, '#3a5e1a');
    dirtGrad.addColorStop(0.15, '#2d4a14');
    dirtGrad.addColorStop(1, '#1a2e0a');
    ctx.fillStyle = dirtGrad;
    ctx.fillRect(0, gy, w, h - gy);
    // Grass top
    ctx.fillStyle = '#4e7e22';
    ctx.fillRect(0, gy, w, 9);
    ctx.fillStyle = '#5e9228';
    ctx.fillRect(0, gy, w, 4);
  }

  private drawGroundDetail(ctx: CanvasRenderingContext2D, w: number, h: number, off: number): void {
    const gy = h * 0.74;
    const spacing = 38;
    const count = Math.ceil(w / spacing) + 3;
    const start = -(off % spacing) - spacing;

    for (let i = 0; i < count; i++) {
      const x = start + i * spacing + (i * 17 % 28) - 4;
      const variant = i % 7;

      if (variant <= 1) {
        // Grass tuft
        ctx.fillStyle = '#6aaa30';
        for (let g = 0; g < 3; g++) {
          ctx.beginPath();
          ctx.moveTo(x + g * 4, gy + 8);
          ctx.lineTo(x + g * 4 + 2, gy + 1);
          ctx.lineTo(x + g * 4 + 4, gy + 8);
          ctx.closePath();
          ctx.fill();
        }
      } else if (variant === 2) {
        // Yellow flower
        ctx.fillStyle = '#f0d028';
        ctx.beginPath();
        ctx.arc(x + 4, gy + 4, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e05010';
        ctx.beginPath();
        ctx.arc(x + 4, gy + 4, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3a7020';
        ctx.fillRect(x + 3, gy + 4, 1.5, 5);
      } else if (variant === 3) {
        // Red mushroom
        ctx.fillStyle = '#dd3311';
        ctx.beginPath();
        ctx.arc(x + 5, gy + 3, 5, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x + 4, gy + 1, 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 7, gy + 2, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f0c090';
        ctx.fillRect(x + 3.5, gy + 3, 3, 6);
      } else if (variant === 4) {
        // Small rock
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.ellipse(x + 5, gy + 5, 5, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#aaa';
        ctx.beginPath();
        ctx.ellipse(x + 4, gy + 4, 2.5, 2, -0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
