/** Camera behaviour, kept separate so it can be tuned without touching scenes. */
export const CAMERA = {
  /**
   * Follow smoothing, 0..1 (fraction of the gap closed each frame).
   * Lower = smoother/lazier, 1 = locked to the player.
   */
  lerpX: 0.1,
  lerpY: 0.08,
  /** Dead zone (virtual px) in the middle of the screen where the camera doesn't move. */
  deadzoneWidth: 120,
  deadzoneHeight: 80,
  /**
   * Shift the camera so the player sits a bit below centre, showing more sky
   * ahead. Measured from her feet.
   */
  followOffsetY: 98,
  zoom: 1,
} as const;
