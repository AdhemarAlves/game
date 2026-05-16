import type { Vec2, Rect } from '../types';

/**
 * Boss monster - larger, more HP, displays multiple operations.
 */
export class BossMonster {
  position: Vec2;
  velocity: Vec2 = { x: -40, y: 0 }; // Slower movement
  readonly size = { width: 80, height: 80 };

  readonly hp: number;
  private currentHp: number;
  state: 'walking' | 'hurt' | 'dying' | 'dead' = 'walking';
  readonly id: number;

  // Operations to display (cycles through them)
  readonly operations: Array<{ a: number; b: number; result: number }>;
  private operationIndex = 0;

  private animTimer = 0;
  private animFrame = 0;
  private deathTimer = 0;

  constructor(
    x: number,
    y: number,
    id: number,
    hp: number = 3,
    operations: Array<{ a: number; b: number }> = []
  ) {
    this.position = { x, y };
    this.id = id;
    this.hp = hp;
    this.currentHp = hp;

    // Generate operations
    this.operations = operations.map(op => ({
      a: op.a,
      b: op.b,
      result: op.a * op.b,
    }));

    // If no operations provided, generate some
    if (this.operations.length === 0) {
      for (let i = 0; i < 3; i++) {
        const a = 3 + Math.floor(Math.random() * 7);
        const b = 3 + Math.floor(Math.random() * 7);
        this.operations.push({ a, b, result: a * b });
      }
    }
  }

  getCurrentOperation(): { a: number; b: number; result: number } {
    return this.operations[this.operationIndex % this.operations.length];
  }

  cycleOperation(): void {
    this.operationIndex++;
  }

  update(deltaMs: number): void {
    if (this.state === 'dead') return;

    if (this.state === 'dying') {
      this.deathTimer -= deltaMs;
      if (this.deathTimer <= 0) this.state = 'dead';
      return;
    }

    const dt = deltaMs / 1000;
    this.position.x += this.velocity.x * dt;

    // Animation
    this.animTimer += deltaMs;
    if (this.animTimer >= 250) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 3;
    }

    // Clear hurt state
    if (this.state === 'hurt' && this.animFrame === 0) {
      this.state = 'walking';
    }
  }

  hit(): void {
    this.currentHp--;
    if (this.currentHp <= 0) {
      this.state = 'dying';
      this.deathTimer = 800;
    } else {
      this.state = 'hurt';
      this.cycleOperation(); // Show next operation after hit
    }
  }

  getHp(): number {
    return this.currentHp;
  }

  getMaxHp(): number {
    return this.hp;
  }

  getHpPercent(): number {
    return Math.max(0, this.currentHp / this.hp);
  }

  isDead(): boolean {
    return this.state === 'dead';
  }

  isDying(): boolean {
    return this.state === 'dying';
  }

  getBounds(): Rect {
    return {
      x: this.position.x + 8,
      y: this.position.y + 8,
      width: this.size.width - 16,
      height: this.size.height - 16,
    };
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.state === 'dead') return;

    const { x, y } = this.position;
    const { width, height } = this.size;

    ctx.save();

    if (this.state === 'dying') {
      const p = 1 - this.deathTimer / 800;
      ctx.globalAlpha = 1 - p;
      ctx.translate(x + width / 2, y + height / 2);
      ctx.rotate(p * Math.PI);
      ctx.scale(1 - p * 0.5, 1 - p * 0.5);
      ctx.translate(-(x + width / 2), -(y + height / 2));
    }

    // Draw boss body (larger slime)
    ctx.fillStyle = '#ff4444';
    ctx.strokeStyle = '#990000';
    ctx.lineWidth = 2;

    // Main body
    ctx.beginPath();
    ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + width * 0.35, y + height * 0.35, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + width * 0.65, y + height * 0.35, 8, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(x + width * 0.35, y + height * 0.35, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + width * 0.65, y + height * 0.35, 4, 0, Math.PI * 2);
    ctx.fill();

    // Hurt effect
    if (this.state === 'hurt') {
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.restore();
  }

  drawHpBar(ctx: CanvasRenderingContext2D): void {
    const barWidth = 100;
    const barHeight = 12;
    const barX = this.position.x + (this.size.width - barWidth) / 2;
    const barY = this.position.y - 20;

    // Background
    ctx.fillStyle = '#333333';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Health
    const healthWidth = barWidth * this.getHpPercent();
    ctx.fillStyle = this.currentHp > this.hp * 0.5 ? '#00ff00' : '#ff6600';
    ctx.fillRect(barX, barY, healthWidth, barHeight);

    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
  }

  drawLabel(ctx: CanvasRenderingContext2D): void {
    const { x, y } = this.position;
    const op = this.getCurrentOperation();

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const text = `${op.a} × ${op.b}`;
    ctx.fillText(text, x + this.size.width / 2, y - 40);

    ctx.restore();
  }
}
