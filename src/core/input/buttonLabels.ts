/**
 * What to call each button on screen, so signs can say "Hold B to bounce" to
 * someone holding a controller and "Hold SPACE" to someone at the keyboard.
 *
 * In sign text (in Tiled), write {jump}, {bark}, {use}, {climb}, {sprint}, {pause}, {move} or {switch}
 * and it's replaced with the right name for whatever the player is using.
 */
export type InputDevice = 'keyboard' | 'gamepad';
export type PromptName = 'jump' | 'bark' | 'use' | 'climb' | 'sprint' | 'pause' | 'move' | 'switch';

export const BUTTON_LABELS: Record<InputDevice, Record<PromptName, string>> = {
  keyboard: { jump: 'SPACE', bark: 'B', use: 'B', climb: '↑ ↓', sprint: 'SHIFT', pause: 'ESC', move: '← →', switch: 'TAB' },
  // Mario-style SNES layout (see core/input/gamepad/gamepadMapping.ts).
  gamepad: { jump: 'B', bark: 'A', use: 'A', climb: 'D-pad ↑ ↓', sprint: 'Y', pause: 'START', move: 'D-pad', switch: 'SELECT' },
};

/** Replace {jump} etc. with button names. Unknown {words} are left as they are. */
export function fillPrompts(text: string, device: InputDevice): string {
  const labels = BUTTON_LABELS[device];
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => labels[name as PromptName] ?? whole);
}
