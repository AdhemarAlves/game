/**
 * Tracks keyboard & touch input per frame.
 * Touch areas create virtual key events to unify input handling.
 */
export class InputManager {
  private readonly keys = new Set<string>();
  private readonly justPressed = new Set<string>();
  private readonly touchZones: { key: string; x: number; y: number; w: number; h: number }[] = [];
  private activeTouches = new Set<string>();

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('touchstart', this.onTouchStart, { passive: false });
    window.addEventListener('touchmove', this.onTouchMove, { passive: false });
    window.addEventListener('touchend', this.onTouchEnd, { passive: false });
  }

  /** Register a touch zone that generates virtual key presses */
  registerTouchZone(key: string, x: number, y: number, w: number, h: number): void {
    this.touchZones.push({ key, x, y, w, h });
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.keys.has(e.code)) {
      this.justPressed.add(e.code);
    }
    this.keys.add(e.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    for (const touch of e.touches) {
      this.handleTouchPoint(touch, true);
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
  };

  private onTouchEnd = (e: TouchEvent): void => {
    e.preventDefault();
    for (const touch of e.changedTouches) {
      this.handleTouchPoint(touch, false);
    }
  };

  private handleTouchPoint(touch: Touch, isDown: boolean): void {
    const rect = (touch.target as HTMLElement)?.getBoundingClientRect() || { width: 960, height: 540 };
    const scale = rect.width / 960; // assume canvas is 960 wide
    const px = touch.clientX - rect.left;
    const py = touch.clientY - rect.top;

    for (const zone of this.touchZones) {
      const zx = zone.x * scale;
      const zy = zone.y * scale;
      const zw = zone.w * scale;
      const zh = zone.h * scale;
      if (px >= zx && px < zx + zw && py >= zy && py < zy + zh) {
        if (isDown) {
          if (!this.activeTouches.has(zone.key)) {
            this.justPressed.add(zone.key);
            this.activeTouches.add(zone.key);
          }
          this.keys.add(zone.key);
        } else {
          this.keys.delete(zone.key);
          this.activeTouches.delete(zone.key);
        }
      }
    }
  }

  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  wasPressed(code: string): boolean {
    return this.justPressed.has(code);
  }

  flush(): void {
    this.justPressed.clear();
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('touchstart', this.onTouchStart);
    window.removeEventListener('touchmove', this.onTouchMove);
    window.removeEventListener('touchend', this.onTouchEnd);
  }
}
