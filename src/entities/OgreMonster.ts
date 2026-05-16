import { Monster } from './Monster';
import type { Rect } from '../types';

/**
 * Ogre monster — big, slow, takes 2 correct answers to defeat.
 * Uses medium-hard multiplications (4–8 × 4–8).
 */
export class OgreMonster extends Monster {
  override readonly size = { width: 68, height: 60 };

  constructor(
    x: number,
    y: number,
    id: number,
    operation?: { a: number; b: number; op: string },
  ) {
    super(x, y, id, operation);
    this.velocity.x = -44;
    this.hp = 2;
  }

  override getBounds(): Rect {
    return {
      x: this.position.x + 6,
      y: this.position.y + 6,
      width: this.size.width - 12,
      height: this.size.height - 6,
    };
  }

  override draw(ctx: CanvasRenderingContext2D): void {
    if (this.state === 'dead') return;

    const { x, y } = this.position;
    const w = this.size.width;
    const h = this.size.height;
    const isHurt = this.state === 'hurt';
    const bounce = Math.sin(this.animFrame * Math.PI * 0.5) * 2;

    ctx.save();

    if (this.state === 'dying') {
      const p = 1 - Math.max(0, this.deathTimer / 900);
      ctx.globalAlpha = 1 - p;
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(p * Math.PI * 0.6);
      ctx.scale(1 - p * 0.6, 1 - p * 0.6);
      ctx.translate(-(x + w / 2), -(y + h / 2));
    }

    const bodyColor = isHurt ? '#88bb44' : '#5a8a1a';
    const darkColor = isHurt ? '#668833' : '#3a6012';
    const skinColor = isHurt ? '#aacc66' : '#7aaa2a';

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h + 3, w * 0.42, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Feet / boots
    ctx.fillStyle = '#4a3010';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.27, y + h - 2, 11, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.73, y + h - 2, 11, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.fillStyle = darkColor;
    ctx.fillRect(x + w * 0.17, y + h * 0.62, w * 0.22, h * 0.34);
    ctx.fillRect(x + w * 0.61, y + h * 0.62, w * 0.22, h * 0.34);

    // Body
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h * 0.45 - bounce, w * 0.45, h * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();

    // Belly stripe (darker)
    ctx.fillStyle = darkColor;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h * 0.52 - bounce, w * 0.28, h * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Arms
    ctx.fillStyle = skinColor;
    ctx.fillRect(x + 1, y + h * 0.28, w * 0.19, h * 0.36);
    ctx.fillRect(x + w * 0.80, y + h * 0.28, w * 0.19, h * 0.36);

    // Fists
    ctx.fillStyle = darkColor;
    ctx.beginPath();
    ctx.arc(x + 9, y + h * 0.64, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + w - 9, y + h * 0.64, 10, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h * 0.22 - bounce, w * 0.35, h * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Horns
    ctx.fillStyle = '#8B6914';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.33, y + h * 0.05 - bounce);
    ctx.lineTo(x + w * 0.27, y - 10 - bounce);
    ctx.lineTo(x + w * 0.41, y + h * 0.07 - bounce);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + w * 0.67, y + h * 0.05 - bounce);
    ctx.lineTo(x + w * 0.73, y - 10 - bounce);
    ctx.lineTo(x + w * 0.59, y + h * 0.07 - bounce);
    ctx.closePath();
    ctx.fill();

    // Eyes (red and angry)
    ctx.fillStyle = '#ff3300';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.37, y + h * 0.17 - bounce, 6, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.63, y + h * 0.17 - bounce, 6, 5, 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Pupils
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(x + w * 0.37, y + h * 0.17 - bounce, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + w * 0.63, y + h * 0.17 - bounce, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Angry eyebrows
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.29, y + h * 0.10 - bounce);
    ctx.lineTo(x + w * 0.45, y + h * 0.14 - bounce);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + w * 0.71, y + h * 0.10 - bounce);
    ctx.lineTo(x + w * 0.55, y + h * 0.14 - bounce);
    ctx.stroke();

    // Mouth (snarl with teeth)
    ctx.fillStyle = darkColor;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h * 0.29 - bounce, 9, 0.15, Math.PI - 0.15);
    ctx.fill();
    ctx.fillStyle = '#fffde7';
    // Teeth
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(x + w * 0.38 + i * 7, y + h * 0.28 - bounce, 4, 5);
    }

    // HP dots above head
    for (let i = 0; i < this.hp; i++) {
      ctx.fillStyle = '#ff4444';
      ctx.beginPath();
      ctx.arc(x + w / 2 - 6 + i * 12, y - 10 - bounce, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();
  }
}
