import { AUDIO } from '@/config/audio';

export type SoundName = 'jump' | 'collect' | 'celebrate' | 'powerup' | 'powerdown' | 'smash' | 'bonk' | 'strain' | 'sniff' | 'reveal';

/**
 * Tiny synthesized sound effects (Web Audio beeps), so we have audio feedback
 * without any sound files yet. When real sounds exist, load them in BootScene
 * and switch play() over to Phaser's sound manager - callers won't change.
 */
class Sfx {
  private ctx?: AudioContext;
  muted = !AUDIO.enabled;

  play(name: SoundName): void {
    if (this.muted) return;
    try {
      switch (name) {
        case 'jump':
          this.tone({ from: 320, to: 620, duration: 0.12, type: 'triangle', volume: AUDIO.jumpVolume });
          break;
        case 'collect':
          this.tone({ from: 880, to: 880, duration: 0.07, type: 'square', volume: AUDIO.collectVolume * 0.5 });
          this.tone({ from: 1320, to: 1320, duration: 0.12, type: 'square', volume: AUDIO.collectVolume * 0.5, delay: 0.07 });
          break;
        case 'celebrate':
          [523, 659, 784, 1047].forEach((f, i) =>
            this.tone({ from: f, to: f, duration: 0.16, type: 'triangle', volume: AUDIO.celebrateVolume, delay: i * 0.12 }),
          );
          [523, 659, 784].forEach((f) =>
            this.tone({ from: f, to: f, duration: 0.6, type: 'sine', volume: AUDIO.celebrateVolume * 0.6, delay: 0.5 }),
          );
          break;
        case 'powerup':
          [392, 523, 659, 784, 1047].forEach((f, i) =>
            this.tone({ from: f, to: f * 1.02, duration: 0.12, type: 'square', volume: AUDIO.celebrateVolume * 0.45, delay: i * 0.06 }),
          );
          this.tone({ from: 200, to: 900, duration: 0.45, type: 'sawtooth', volume: AUDIO.celebrateVolume * 0.2 });
          break;
        case 'powerdown':
          this.tone({ from: 700, to: 150, duration: 0.5, type: 'triangle', volume: AUDIO.celebrateVolume * 0.6 });
          break;
        case 'smash':
          this.noise(0.35, AUDIO.collectVolume * 0.9);
          this.tone({ from: 180, to: 40, duration: 0.3, type: 'square', volume: AUDIO.collectVolume * 0.5 });
          break;
        case 'bonk':
          this.tone({ from: 220, to: 70, duration: 0.18, type: 'square', volume: AUDIO.collectVolume * 0.6 });
          break;
        case 'sniff':
          // Three quick sniffs.
          [0, 0.16, 0.32].forEach((d) => this.noise(0.09, AUDIO.collectVolume * 0.35, d, 2400));
          break;
        case 'reveal':
          [1047, 1319, 1568].forEach((f, i) =>
            this.tone({ from: f, to: f, duration: 0.14, type: 'sine', volume: AUDIO.collectVolume * 0.5, delay: i * 0.07 }),
          );
          break;
        case 'strain':
          this.tone({ from: 140, to: 110, duration: 0.22, type: 'sawtooth', volume: AUDIO.jumpVolume * 0.5 });
          break;
      }
    } catch {
      // Audio is a nice-to-have; never let it break the game.
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  private context(): AudioContext | undefined {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return undefined;
      this.ctx = new Ctor();
    }
    // Browsers start audio suspended until the player presses something.
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** A burst of white noise (crashes, smashes). */
  private noise(duration: number, volume: number, delay = 0, highpass = 0): void {
    const ctx = this.context();
    if (!ctx) return;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2;
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buffer;
    gain.gain.value = AUDIO.volume * volume;
    if (highpass > 0) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = highpass;
      src.connect(filter).connect(gain).connect(ctx.destination);
    } else {
      src.connect(gain).connect(ctx.destination);
    }
    src.start(ctx.currentTime + delay);
  }

  private tone(o: { from: number; to: number; duration: number; type: OscillatorType; volume: number; delay?: number }): void {
    const ctx = this.context();
    if (!ctx) return;
    const start = ctx.currentTime + (o.delay ?? 0);
    const end = start + o.duration;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = o.type;
    osc.frequency.setValueAtTime(o.from, start);
    osc.frequency.exponentialRampToValueAtTime(o.to, end);

    const peak = AUDIO.volume * o.volume;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(end + 0.02);
  }
}

/** Shared instance - there's only one set of speakers. */
export const sfx = new Sfx();
