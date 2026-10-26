import { presetFor, type GamepadMapping, type PadSnapshot } from './gamepadMapping';

/**
 * Remembers the buttons chosen on the Controller Setup screen, per controller,
 * in this browser (localStorage). Storage can be unavailable (private
 * windows), so every access is guarded and the game works without it.
 */
const STORAGE_KEY = 'melodys-adventures.controllers.v1';

let cache: Record<string, GamepadMapping> | undefined;

function load(): Record<string, GamepadMapping> {
  if (cache) return cache;
  try {
    const text = window.localStorage.getItem(STORAGE_KEY);
    cache = text ? (JSON.parse(text) as Record<string, GamepadMapping>) : {};
  } catch {
    cache = {};
  }
  return cache;
}

function store(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache ?? {}));
  } catch {
    // Not saved (e.g. private window) - it still works until the page closes.
  }
}

/** The buttons for this controller: your own setup if you did one, otherwise the ready-made layout. */
export function mappingFor(pad: Pick<PadSnapshot, 'id' | 'mapping'>): GamepadMapping {
  return load()[pad.id] ?? presetFor(pad);
}

export function hasCustomMapping(padId: string): boolean {
  return !!load()[padId];
}

export function saveCustomMapping(padId: string, mapping: GamepadMapping): void {
  load()[padId] = mapping;
  store();
}

export function clearCustomMapping(padId: string): void {
  delete load()[padId];
  store();
}
