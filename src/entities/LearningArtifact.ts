import type { Vec2, Rect } from '../types';

/**
 * Educational artifacts that appear on screen with multiplication operations.
 * Player collects them to learn operations, then monsters use those operations.
 */
export class LearningArtifact {
  position: Vec2;
  velocity: Vec2 = { x: -100, y: 0 }; // Comes from right, moves left
  readonly size = { width: 40, height: 40 };

  readonly a: number;
  readonly b: number;
  readonly result: number;

  state: 'active' | 'collected' = 'active';
  private collectedTimer = 0;
  private bobOffset = 0;
  private bobTime = 0;

  readonly id: number;

  constructor(x: number, y: number, a: number, b: number, id: number) {
    this.position = { x, y };
    this.a = a;
    this.b = b;
    this.result = a * b;
    this.id = id;
  }

  update(deltaMs: number): void {
    if (this.state === 'collected') {
      this.collectedTimer -= deltaMs;
      if (this.collectedTimer <= 0) {
        this.state = 'active';
      }
      return;
    }

    const dt = deltaMs / 1000;

    // Move left
    this.position.x += this.velocity.x * dt;

    // Bob gently up and down
    this.bobTime += deltaMs / 1000;
    this.bobOffset = Math.sin(this.bobTime * 2) * 8;
  }

  collect(): void {
    this.state = 'collected';
    this.collectedTimer = 400; // Brief animation
  }

  isAlive(): boolean {
    return this.position.x > -50; // Off-screen to the left
  }

  getBounds(): Rect {
    return {
      x: this.position.x + 5,
      y: this.position.y + 5,
      width: this.size.width - 10,
      height: this.size.height - 10,
    };
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y } = this.position;
    const { width, height } = this.size;

    ctx.save();

    // Draw body (crystal-like shape)
    ctx.fillStyle = '#7744ff';
    ctx.strokeStyle = '#aa88ff';
    ctx.lineWidth = 2;

    // Diamond/gem shape
    ctx.beginPath();
    ctx.moveTo(x + width / 2, y + this.bobOffset); // Top
    ctx.lineTo(x + width, y + height / 2); // Right
    ctx.lineTo(x + width / 2, y + height + this.bobOffset); // Bottom
    ctx.lineTo(x, y + height / 2); // Left
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Shine effect
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(x + width / 3, y + height / 3, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawLabel(ctx: CanvasRenderingContext2D): void {
    const { x, y } = this.position;

    ctx.save();

    // Draw operation WELL ABOVE artifact with huge size
    const text = `${this.a} × ${this.b}`;
    
    // Shadow/glow for visibility
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.font = 'bold 52px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw shadow text
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillText(text, x + this.size.width / 2 + 2, y - 55 + 2);

    // Draw bright main text
    ctx.fillStyle = '#ffff44';
    ctx.shadowColor = 'rgba(255, 220, 0, 0.8)';
    ctx.shadowBlur = 20;
    ctx.fillText(text, x + this.size.width / 2, y - 55);

    // Outline for extra pop
    ctx.strokeStyle = '#ff8800';
    ctx.lineWidth = 2;
    ctx.strokeText(text, x + this.size.width / 2, y - 55);

    ctx.restore();
  }
}
