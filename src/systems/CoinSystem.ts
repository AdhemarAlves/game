import type { Vec2 } from '../types';

/**
 * Coin that floats around and can be collected for score.
 */
export class Coin {
  position: Vec2;
  velocity: Vec2;
  readonly size = 8;
  lifetime: number = 0;
  readonly maxLifetime = 5000; // 5 seconds to collect

  constructor(x: number, y: number, velocityX: number, velocityY: number) {
    this.position = { x, y };
    this.velocity = { x: velocityX, y: velocityY };
  }

  update(deltaMs: number): void {
    const dt = deltaMs / 1000;
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.lifetime += deltaMs;

    // Gentle gravity
    this.velocity.y += 150 * dt;
  }

  isAlive(): boolean {
    return this.lifetime < this.maxLifetime;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const alpha = 1 - Math.min(this.lifetime / this.maxLifetime, 1);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffdd44';
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.size, 0, Math.PI * 2);
    ctx.fill();

    // Shine
    ctx.strokeStyle = '#ffff88';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  getBounds(): { x: number; y: number; size: number } {
    return {
      x: this.position.x,
      y: this.position.y,
      size: this.size,
    };
  }
}

/**
 * Coin system manager.
 */
export class CoinSystem {
  private coins: Coin[] = [];
  private coinsCollected = 0;

  /** Spawn coins at a position. */
  spawnCoins(x: number, y: number, count: number = 3): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.random() * Math.PI * 2) - Math.PI / 2; // Bias upward
      const speed = 100 + Math.random() * 150;
      const coin = new Coin(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed);
      this.coins.push(coin);
    }
  }

  update(deltaMs: number): void {
    for (let i = this.coins.length - 1; i >= 0; i--) {
      this.coins[i].update(deltaMs);
      if (!this.coins[i].isAlive()) {
        this.coins.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const coin of this.coins) {
      coin.draw(ctx);
    }
  }

  getCoins(): Coin[] {
    return this.coins;
  }

  collectCoin(index: number): void {
    if (index >= 0 && index < this.coins.length) {
      this.coins.splice(index, 1);
      this.coinsCollected++;
    }
  }

  getCollectedCount(): number {
    return this.coinsCollected;
  }

  reset(): void {
    this.coins = [];
    this.coinsCollected = 0;
  }
}
