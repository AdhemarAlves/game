import type { Vec2, Rect } from '../types';

export type GiftState = 'idle' | 'opening' | 'open' | 'fading' | 'gone';

/**
 * Learning gift: shows an operation (e.g., "3×2").
 * When player hits it, opens to reveal the result (e.g., "= 6").
 */
export class Gift {
  position: Vec2;
  velocity: Vec2 = { x: -72, y: 0 }; // Scrolls like monster
  readonly size = { width: 36, height: 40 };

  state: GiftState = 'idle';
  operation: { a: number; b: number; op: string; result: number }; // e.g. { a: 3, b: 2, op: '×', result: 6 }
  readonly id: number;

  private animTimer = 0;
  private openFrame = 0; // 0 = closed, 1 = opening, 2 = open
  public disappearTimer = 0;
  private resultPopupTimer = 0; // Animates result popup
  private resultRiseY = 0;    // Tracks how far the result has risen
  private resultDriftX = 0;   // Horizontal drift for smoke effect

  constructor(x: number, y: number, id: number, operation: { a: number; b: number; op: string; result: number }) {
    this.position = { x, y };
    this.id = id;
    this.operation = operation;
  }

  update(deltaMs: number, groundY: number): void {
    if (this.state === 'fading') {
      this.disappearTimer -= deltaMs;
      if (this.disappearTimer <= 0) {
        this.state = 'gone';
      }
      return;
    }

    if (this.state === 'gone') return;

    // Scroll movement (like monsters)
    const dt = deltaMs / 1000;
    this.position.x += this.velocity.x * dt;

    if (this.state === 'opening') {
      this.animTimer += deltaMs;
      if (this.animTimer >= 150) {
        this.animTimer = 0;
        this.openFrame++;
        if (this.openFrame >= 2) {
          this.openFrame = 2;
          this.state = 'open';
          this.resultPopupTimer = 2800; // Smoke rises for 2.8s
          this.resultRiseY = 0;
          this.resultDriftX = 0;
        }
      }
    }

    // Animate result popup: slowly rises like smoke
    if (this.resultPopupTimer > 0) {
      const dt = deltaMs / 1000;
      this.resultPopupTimer -= deltaMs;
      this.resultRiseY += 45 * dt; // Rise slowly (45px/s)
      this.resultDriftX += (Math.sin(this.resultRiseY * 0.05) * 15) * dt; // Gentle drift
    }

    // Gravity (snap to ground)
    const floor = groundY - this.size.height;
    if (this.position.y < floor) this.position.y = floor;
  }

  hit(): void {
    if (this.state === 'idle') {
      this.state = 'opening';
      this.animTimer = 0;
      this.openFrame = 0;
    }
  }

  startDisappearing(): void {
    if (this.state === 'open' && this.disappearTimer === 0) {
      this.state = 'fading';
      this.disappearTimer = 400;
    }
  }

  isOpen(): boolean {
    return this.state === 'open';
  }

  getResultPopupProgress(): number {
    return Math.max(0, 1 - this.resultPopupTimer / 2800);
  }

  getBounds(): Rect {
    return {
      x: this.position.x + 2,
      y: this.position.y + 4,
      width: this.size.width - 4,
      height: this.size.height - 6,
    };
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y } = this.position;
    const { width, height } = this.size;
    const px = width / 12; // pixel unit

    ctx.save();

    // Fade out during fading phase
    if (this.state === 'fading') {
      ctx.globalAlpha = this.disappearTimer / 400;
    }

    // Gift box with ribbon
    if (this.openFrame < 2) {
      // Closed/opening box
      const boxColor = '#dd6644';
      const ribbonColor = '#ffdd00';

      ctx.fillStyle = boxColor;
      ctx.fillRect(x + px * 1.5, y + px * 2, px * 9, px * 7);

      // Ribbon cross
      ctx.fillStyle = ribbonColor;
      ctx.fillRect(x + px * 5.5, y + px * 1.5, px * 1, px * 9); // vertical
      ctx.fillRect(x + px * 1.5, y + px * 5, px * 9, px * 1); // horizontal

      // Bow at top
      const bowY = y + px * 1;
      ctx.fillStyle = ribbonColor;
      ctx.beginPath();
      ctx.ellipse(x + px * 4.5, bowY + px * 0.5, px * 0.8, px * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + px * 7.5, bowY + px * 0.5, px * 0.8, px * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();

      // NO text inside the box — operation is shown ABOVE
    } else {
      // Open box — show result
      const boxColor = '#aa4422';
      const resultColor = '#ffdd00';

      ctx.fillStyle = boxColor;
      ctx.fillRect(x + px * 1.5, y + px * 2, px * 9, px * 7);

      // Inner shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(x + px * 2, y + px * 2.5, px * 8, px * 6);

      // Big result number
      ctx.fillStyle = resultColor;
      ctx.font = 'bold 16px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`= ${this.operation.result}`, x + width / 2, y + height / 2);

      // Stars around it
      ctx.fillStyle = '#ffff00';
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2;
        const sx = x + width / 2 + Math.cos(angle) * px * 6;
        const sy = y + height / 2 + Math.sin(angle) * px * 5;
        ctx.beginPath();
        ctx.arc(sx, sy, px * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw animated result — rises slowly, fades like smoke
    if (this.resultPopupTimer > 0) {
      const remaining = this.resultPopupTimer / 2800;
      // Alpha: full at start, starts fading at 50%, gone at 0%
      const alpha = remaining > 0.5 ? 1 : remaining * 2;
      // Scale: starts big (96px), shrinks/fades as smoke disperses
      const fontSize = 96;
      const popupX = x + width / 2 + this.resultDriftX;
      const popupY = y - this.resultRiseY;

      ctx.save();
      ctx.globalAlpha = alpha;

      // Outer glow (smoke-like)
      ctx.fillStyle = `rgba(100, 255, 120, ${alpha * 0.4})`;
      ctx.font = `bold ${fontSize + 8}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.filter = `blur(${Math.round((1 - remaining) * 6)}px)`;
      ctx.fillText(`${this.operation.result}`, popupX, popupY);
      ctx.filter = 'none';

      // Main text
      ctx.fillStyle = '#44ff88';
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.strokeStyle = 'rgba(0, 80, 20, 0.8)';
      ctx.lineWidth = 4;
      ctx.strokeText(`${this.operation.result}`, popupX, popupY);
      ctx.fillText(`${this.operation.result}`, popupX, popupY);

      ctx.restore();
    }

    // Draw operation LARGE above the gift (always visible while idle/opening)
    if (this.state === 'idle' || this.state === 'opening') {
      const opText = `${this.operation.a} × ${this.operation.b}`;
      const labelY = y - 48;
      const centerX = x + width / 2;

      ctx.save();
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.font = 'bold 40px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(opText, centerX + 2, labelY + 2);

      // Glow
      ctx.shadowColor = 'rgba(255, 220, 0, 0.9)';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#ffff44';
      ctx.fillText(opText, centerX, labelY);

      // Outline
      ctx.strokeStyle = '#ff8800';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 0;
      ctx.strokeText(opText, centerX, labelY);
      ctx.restore();
    }

    ctx.restore();
  }
}
