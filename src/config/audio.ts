/** Sound settings. M toggles mute while playing. */
export const AUDIO = {
  enabled: true,
  /** Master volume, 0..1. */
  volume: 0.35,
  /** Individual sound volumes relative to the master. */
  jumpVolume: 0.35,
  collectVolume: 0.8,
  celebrateVolume: 0.8,
} as const;
