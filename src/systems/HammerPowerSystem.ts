import type { HammerState } from '../types';

/**
 * Manages the hammer charge state.
 *
 * States:
 *  normal       – cannot kill monsters
 *  charged      – activated by cutting the correct answer
 *  supercharged – activated by a combo of 3+ correct answers
 *
 * Charged states expire after a few seconds or when energy is consumed.
 */
export class HammerPowerSystem {
  state: HammerState = 'normal';
  energy = 0;
  readonly maxEnergy = 100;

  private chargeTimer = 0;
  private readonly CHARGE_DURATION      = 4500;
  private readonly SUPERCHARGE_DURATION = 7000;
  private readonly GIANT_DURATION       = 10000;
  private readonly SUPERCHARGE_COMBO    = 3;
  private readonly GIANT_COMBO          = 6;

  /** Call when a correct-answer projectile is cut. */
  charge(combo: number): void {
    if (combo >= this.GIANT_COMBO) {
      this.state = 'giant';
      this.chargeTimer = this.GIANT_DURATION;
    } else if (combo >= this.SUPERCHARGE_COMBO) {
      if (this.state === 'supercharged' || this.state === 'giant') return;
      this.state = 'supercharged';
      this.chargeTimer = this.SUPERCHARGE_DURATION;
    } else {
      if (this.state !== 'normal') return; // don't downgrade
      this.state = 'charged';
      this.chargeTimer = this.CHARGE_DURATION;
    }
    this.energy = this.maxEnergy;
  }

  update(deltaMs: number): void {
    if (this.state === 'normal') return;

    this.chargeTimer -= deltaMs;
    const maxDur =
      this.state === 'giant'        ? this.GIANT_DURATION       :
      this.state === 'supercharged' ? this.SUPERCHARGE_DURATION : this.CHARGE_DURATION;
    this.energy = Math.max(0, (this.chargeTimer / maxDur) * this.maxEnergy);

    if (this.chargeTimer <= 0) {
      this.state = 'normal';
      this.energy = 0;
    }
  }

  /** Consume energy when hitting a monster. */
  consume(): void {
    const drain =
      this.state === 'giant'        ? 14 :
      this.state === 'supercharged' ? 28 : 55;
    this.energy -= drain;
    if (this.energy <= 0) {
      this.state = 'normal';
      this.energy = 0;
      this.chargeTimer = 0;
    } else {
      const maxDur =
        this.state === 'giant'        ? this.GIANT_DURATION       :
        this.state === 'supercharged' ? this.SUPERCHARGE_DURATION : this.CHARGE_DURATION;
      this.chargeTimer = (this.energy / this.maxEnergy) * maxDur;
    }
  }

  isCharged(): boolean {
    return this.state !== 'normal';
  }

  getEnergyFraction(): number {
    return this.energy / this.maxEnergy;
  }

  reset(): void {
    this.state = 'normal';
    this.energy = 0;
    this.chargeTimer = 0;
  }
}
