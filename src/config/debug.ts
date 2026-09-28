/** Development/debug switches. */
export const DEBUG = {
  /** Show the debug overlay when the game starts (in dev builds). */
  showOverlayOnStart: import.meta.env.DEV,
  /** Also draw physics bodies when the overlay is visible. */
  drawPhysicsBodies: true,
} as const;
