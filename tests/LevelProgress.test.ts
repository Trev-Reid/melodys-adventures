import { describe, expect, it } from 'vitest';
import { LevelProgress, formatTime } from '../src/gameplay/LevelProgress';

describe('LevelProgress', () => {
  it('completes exactly when the last item is collected', () => {
    const p = new LevelProgress(3);
    expect(p.collect()).toBe(false);
    expect(p.collect()).toBe(false);
    expect(p.collect()).toBe(true);
    expect(p.complete).toBe(true);
    expect(p.collect()).toBe(false);
    expect(p.collected).toBe(3);
  });

  it('stops the timer on completion', () => {
    const p = new LevelProgress(1);
    p.tick(1000);
    p.collect();
    p.tick(5000);
    expect(p.elapsedMs).toBe(1000);
  });

  it('formats times as m:ss.t', () => {
    expect(formatTime(0)).toBe('0:00.0');
    expect(formatTime(83450)).toBe('1:23.4');
    expect(formatTime(600000)).toBe('10:00.0');
  });
});
