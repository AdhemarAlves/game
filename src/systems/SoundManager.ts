/**
 * SoundManager – synthesises all game audio via Web Audio API.
 * No audio files required. Gracefully no-ops if AudioContext is unavailable.
 * Preferences (mute / volume) are persisted in localStorage.
 */

export type SoundEvent =
  | 'gift_collect'
  | 'result_reveal'
  | 'correct_answer'
  | 'wrong_answer'
  | 'hammer_charge'
  | 'hammer_supercharge'
  | 'monster_hit'
  | 'monster_defeated'
  | 'coin_collect'
  | 'player_damage'
  | 'combo'
  | 'game_over'
  // Magic-bird lesson events
  | 'magic_bird_appear'
  | 'bird_teach'
  | 'lesson_complete'
  | 'boss_appear'
  | 'bird_kidnapped'
  | 'mission_start'
  // Stage boss / rescue / victory events
  | 'boss_defeated'
  | 'bird_rescued'
  | 'victory';

export class SoundManager {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private vol = 0.55;
  private ready = false;

  constructor() {
    this.loadPrefs();
    // AudioContext may only be created after a user gesture
    const boot = () => {
      this.initCtx();
      window.removeEventListener('pointerdown', boot);
      window.removeEventListener('keydown', boot);
    };
    window.addEventListener('pointerdown', boot, { passive: true });
    window.addEventListener('keydown', boot, { passive: true });
  }

  private initCtx(): void {
    if (this.ready) return;
    try {
      this.ctx = new AudioContext();
      this.ready = true;
    } catch { /* unavailable – all play() calls will no-op */ }
  }

  // ── Preferences ────────────────────────────────────────────────────────────

  private loadPrefs(): void {
    try {
      const raw = localStorage.getItem('game_snd_v1');
      if (raw) {
        const p = JSON.parse(raw) as { enabled?: boolean; vol?: number };
        this.enabled = p.enabled ?? true;
        this.vol = p.vol ?? 0.55;
      }
    } catch { /* ignore */ }
  }

  private savePrefs(): void {
    try {
      localStorage.setItem('game_snd_v1', JSON.stringify({ enabled: this.enabled, vol: this.vol }));
    } catch { /* ignore */ }
  }

  toggle(): void {
    this.enabled = !this.enabled;
    this.savePrefs();
  }

  isMuted(): boolean { return !this.enabled; }

  setVolume(v: number): void {
    this.vol = Math.max(0, Math.min(1, v));
    this.savePrefs();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  play(event: SoundEvent): void {
    if (!this.enabled || !this.ready || !this.ctx) return;
    try {
      switch (event) {
        case 'correct_answer':     this.tone(880, 0.11, 'sine', 0.20, 0, 1100, 0.20); break;
        case 'wrong_answer':       this.sweep(280, 110, 0.15, 'sawtooth', 0.28); break;
        case 'hammer_charge':      this.tone(440, 0.14, 'sawtooth', 0.35, 0, 880, 0.35); break;
        case 'hammer_supercharge': this.arpeggio([523, 659, 784, 1047], 0.13, 'triangle', 0.10); break;
        case 'monster_hit':        this.tone(220, 0.18, 'square', 0.12, 0, 160, 0.12); break;
        case 'monster_defeated':   this.arpeggio([440, 554, 659, 880], 0.12, 'sine', 0.10); break;
        case 'coin_collect':       this.tone(1047, 0.09, 'sine', 0.10, 0, 1319, 0.10); break;
        case 'player_damage':      this.noise(0.17, 0.28); break;
        case 'combo':              this.arpeggio([523, 659, 784], 0.10, 'triangle', 0.08); break;
        case 'game_over':          this.sweep(440, 80, 0.20, 'sawtooth', 1.20); break;
        case 'gift_collect':       this.tone(523, 0.11, 'triangle', 0.22, 0, 784, 0.22); break;
        case 'result_reveal':      this.tone(784, 0.11, 'sine', 0.28); break;
        // Bird lesson
        case 'magic_bird_appear':  this.arpeggio([659, 784, 1047, 1319], 0.12, 'sine', 0.09); break;
        case 'bird_teach':         this.tone(1047, 0.07, 'sine', 0.22); break;
        case 'lesson_complete':    this.arpeggio([523, 659, 784, 1047, 1319], 0.14, 'triangle', 0.09); break;
        case 'boss_appear':        this.sweep(440, 80, 0.18, 'sawtooth', 0.85); break;
        case 'bird_kidnapped':     this.tone(220, 0.20, 'sawtooth', 0.12, 0, 110, 0.28); break;
        case 'mission_start':      this.arpeggio([440, 523, 659, 784], 0.14, 'triangle', 0.10); break;
        // Boss / rescue / victory
        case 'boss_defeated':      this.arpeggio([523, 659, 784, 1047, 1319, 1568], 0.15, 'triangle', 0.09); break;
        case 'bird_rescued':       this.arpeggio([880, 1047, 1319, 1568, 2093], 0.13, 'sine', 0.08); break;
        case 'victory':            this.arpeggio([523, 659, 784, 1047, 1319, 1568, 2093], 0.16, 'triangle', 0.10); break;
      }
    } catch { /* ignore individual sound errors */ }
  }

  // ── Primitives ─────────────────────────────────────────────────────────────

  private gain(v: number): GainNode {
    const g = this.ctx!.createGain();
    g.connect(this.ctx!.destination);
    g.gain.value = v * this.vol;
    return g;
  }

  private tone(
    freqStart: number, vol: number, type: OscillatorType, duration: number,
    delayS = 0, freqEnd?: number, durationEnd?: number,
  ): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delayS;
    const dur = durationEnd ?? duration;
    const osc = this.ctx.createOscillator();
    const g = this.gain(vol);
    osc.connect(g);
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, t);
    if (freqEnd !== undefined) osc.frequency.linearRampToValueAtTime(freqEnd, t + dur);
    g.gain.setValueAtTime(vol * this.vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private sweep(f0: number, f1: number, vol: number, type: OscillatorType, dur: number): void {
    this.tone(f0, vol, type, dur, 0, f1, dur);
  }

  private arpeggio(freqs: number[], vol: number, type: OscillatorType, noteDur: number): void {
    freqs.forEach((f, i) => this.tone(f, vol, type, noteDur, i * noteDur));
  }

  private noise(vol: number, dur: number): void {
    if (!this.ctx) return;
    const sRate = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, Math.ceil(sRate * dur), sRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.gain(vol);
    g.gain.setValueAtTime(vol * this.vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    src.connect(g);
    src.start();
    src.stop(this.ctx.currentTime + dur + 0.02);
  }

  destroy(): void {
    try { this.ctx?.close(); } catch { /* ignore */ }
  }
}
