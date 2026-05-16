import type { Vec2 } from '../types';

export type ParticleType = 'coin' | 'spark' | 'smoke' | 'explosion' | 'energy' | 'star';

interface Particle {
  position: Vec2;
  velocity: Vec2;
  type: ParticleType;
  life: number;
  maxLife: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
}

/**
 * Generic particle system for effects.
 * Supports coins, sparks, smoke, and explosions.
 */
export class ParticleSystem {
  private particles: Particle[] = [];

  /** Emit particles in a burst. */
  burst(
    x: number,
    y: number,
    type: ParticleType,
    count: number = 10,
    spread: number = Math.PI * 2,
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * spread + (Math.random() - 0.5) * 0.3;
      const speed = type === 'energy' ? 80 + Math.random() * 60 : 150 + Math.random() * 100;

      const particle: Particle = {
        position: { x: x + Math.random() * 10 - 5, y: y + Math.random() * 10 - 5 },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed,
        },
        type,
        life: 0,
        maxLife:
          type === 'coin'      ? 800  :
          type === 'spark'     ? 600  :
          type === 'smoke'     ? 2000 :
          type === 'energy'    ? 900  :
          type === 'star'      ? 700  :
                                 500,
        size:
          type === 'coin'   ? 8  :
          type === 'spark'  ? 4  :
          type === 'smoke'  ? 24 :
          type === 'energy' ? 6  :
          type === 'star'   ? 7  :
                              6,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 8,
      };

      this.particles.push(particle);
    }
  }

  update(deltaMs: number): void {
    const dt = deltaMs / 1000;
    const gravity = 300; // pixels/s²

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += deltaMs;

      // Movement
      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;

      // Gravity
      if (p.type !== 'smoke') {
        p.velocity.y += gravity * dt;
      } else {
        p.velocity.y -= 120 * dt; // Smoke rises faster
        p.velocity.x += (Math.random() - 0.5) * 40 * dt; // More drift for dispersal
      }

      // Drag (smoke has more drag for slower dispersion)
      const dragFactor = p.type === 'smoke' ? 0.95 : 0.98;
      p.velocity.x *= dragFactor;
      p.velocity.y *= dragFactor;

      // Rotation
      p.rotation += p.rotationSpeed * dt;

      // Remove dead particles
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const progress = Math.min(p.life / p.maxLife, 1);
      const alpha = 1 - progress;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.position.x, p.position.y);
      ctx.rotate(p.rotation);

      switch (p.type) {
        case 'coin':
          // Draw coin (yellow circle)
          ctx.fillStyle = '#ffdd44';
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
          // Coin shine
          ctx.strokeStyle = '#ffff88';
          ctx.lineWidth = 1;
          ctx.stroke();
          break;

        case 'spark':
          // Draw spark (small bright point)
          ctx.fillStyle = '#ffff88';
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'smoke':
          // Draw smoke (larger, better colored cloud)
          // Smoke grows as it rises
          const smokeSize = p.size * (0.5 + progress * 0.8);
          
          // Main smoke body
          ctx.fillStyle = `rgba(220, 220, 220, ${0.7 * alpha})`;
          ctx.beginPath();
          ctx.arc(0, 0, smokeSize, 0, Math.PI * 2);
          ctx.fill();
          
          // Darker smoke outline
          ctx.strokeStyle = `rgba(160, 160, 160, ${0.5 * alpha})`;
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Inner highlight for volumetric effect
          ctx.fillStyle = `rgba(255, 255, 255, ${0.3 * alpha})`;
          ctx.beginPath();
          ctx.arc(-smokeSize * 0.3, -smokeSize * 0.3, smokeSize * 0.4, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'explosion':
          // Draw explosion spark (orangish)
          ctx.fillStyle = `rgba(255, ${150 + Math.random() * 100}, 0, 0.8)`;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'energy':
          // Hammer energy particle – bright cyan/gold streaks
          ctx.fillStyle = `rgba(255, 220, 60, ${0.9 * alpha})`;
          ctx.shadowBlur = 6;
          ctx.shadowColor = '#ffcc00';
          ctx.beginPath();
          ctx.arc(0, 0, p.size * (0.5 + progress * 0.5), 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          break;

        case 'star': {
          // 4-point star shape
          const sr = p.size * (1 - progress * 0.4);
          ctx.fillStyle = `rgba(255, 255, 100, ${alpha})`;
          ctx.beginPath();
          for (let s = 0; s < 8; s++) {
            const a2 = (s / 8) * Math.PI * 2;
            const r2 = s % 2 === 0 ? sr : sr * 0.4;
            if (s === 0) ctx.moveTo(Math.cos(a2) * r2, Math.sin(a2) * r2);
            else ctx.lineTo(Math.cos(a2) * r2, Math.sin(a2) * r2);
          }
          ctx.closePath();
          ctx.fill();
          break;
        }
      }

      ctx.restore();
    }
  }

  clear(): void {
    this.particles = [];
  }
}
