// =============================================================================
// Keybind Utilities
// =============================================================================
//
// The shortcut that starts feedback mode is user-configurable (Settings →
// Feedback Shortcut). A bind is stored as a "+"-joined string of optional
// modifiers and one key, e.g. "Mod+Shift+F", "ScrollLock", "Alt+K".
//
// "Mod" is Cmd on Apple platforms and Ctrl everywhere else, which is why the
// stored value is not simply "Meta" or "Control": the same bind has to travel
// between machines.
//

export const DEFAULT_ACTIVATION_KEY = "Mod+Shift+F";

/** Keys that only modify other keys — never a bind on their own. */
const MODIFIER_KEYS = new Set([
  "Shift",
  "Control",
  "Alt",
  "Meta",
  "AltGraph",
  "CapsLock",
  "OS",
]);

export type ParsedKeybind = {
  mod: boolean;
  shift: boolean;
  alt: boolean;
  key: string;
};

export function isBindableKey(key: string): boolean {
  return key.length > 0 && !MODIFIER_KEYS.has(key);
}

function isApple(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
}

export function parseKeybind(bind: string): ParsedKeybind | null {
  if (!bind) return null;
  const parts = bind.split("+").map((part) => part.trim()).filter(Boolean);
  const key = parts.pop() ?? "";
  if (!isBindableKey(key)) return null;
  return {
    mod: parts.some((part) => /^(mod|cmd|command|meta|ctrl|control)$/i.test(part)),
    shift: parts.some((part) => /^shift$/i.test(part)),
    alt: parts.some((part) => /^(alt|option|opt)$/i.test(part)),
    key,
  };
}

/**
 * The key as it should be stored. Letters and digits come from `code` so that
 * Alt-modified binds survive layouts where Alt rewrites `key` (Alt+K → "˚").
 */
function keyNameFromEvent(e: KeyboardEvent): string {
  if (e.key.length !== 1) return e.key;
  const letter = /^Key([A-Z])$/.exec(e.code)?.[1];
  const digit = /^Digit([0-9])$/.exec(e.code)?.[1];
  return (letter ?? digit ?? e.key).toUpperCase();
}

/** The bind a keydown describes, or null if it is only a modifier. */
export function keybindFromEvent(e: KeyboardEvent): string | null {
  if (!isBindableKey(e.key)) return null;
  const parts: string[] = [];
  if (e.metaKey || e.ctrlKey) parts.push("Mod");
  if (e.shiftKey) parts.push("Shift");
  if (e.altKey) parts.push("Alt");
  parts.push(keyNameFromEvent(e));
  return parts.join("+");
}

/** Human label: "ScrollLock" → "Scroll Lock", "f" → "F", " " → "Space". */
export function formatKeyLabel(key: string): string {
  if (!key) return "None";
  if (key === " ") return "Space";
  if (key.length === 1) return key.toUpperCase();
  return key.replace(/([a-z])([A-Z])/g, "$1 $2");
}

/** Modifiers held during an event, with the separator that follows them. */
export function formatEventModifiers(e: KeyboardEvent): string {
  const apple = isApple();
  const parts: string[] = [];
  if (e.metaKey || e.ctrlKey) parts.push(apple ? "⌘" : "Ctrl");
  if (e.shiftKey) parts.push(apple ? "⇧" : "Shift");
  if (e.altKey) parts.push(apple ? "⌥" : "Alt");
  if (parts.length === 0) return "";
  return apple ? parts.join("") : `${parts.join("+")}+`;
}

/** Display label for a bind: "⌘⇧F" on Apple, "Ctrl+Shift+F" elsewhere. */
export function formatKeybind(bind: string): string {
  const parsed = parseKeybind(bind);
  if (!parsed) return "None";
  const apple = isApple();
  const parts: string[] = [];
  if (parsed.mod) parts.push(apple ? "⌘" : "Ctrl");
  if (parsed.shift) parts.push(apple ? "⇧" : "Shift");
  if (parsed.alt) parts.push(apple ? "⌥" : "Alt");
  parts.push(formatKeyLabel(parsed.key));
  return apple ? parts.join("") : parts.join("+");
}

// =============================================================================
// Hold Keys (click-through)
// =============================================================================
//
// A hold key is the opposite shape to an activation bind: one modifier, held,
// suspending feedback mode for as long as it is down. Stored as the raw
// KeyboardEvent.key ("Alt", "Shift", "Control", "Meta"), empty string for off.
//

export const DEFAULT_CLICK_THROUGH_KEY = "Alt";

/** Modifiers that can be held to suspend feedback mode. */
export const HOLD_KEYS = ["Alt", "Shift", "Control", "Meta"] as const;

export function isHoldKey(key: string): boolean {
  return (HOLD_KEYS as readonly string[]).includes(key);
}

/** The hold key a keydown describes, or null if it is not a bare modifier. */
export function holdKeyFromEvent(e: KeyboardEvent): string | null {
  return isHoldKey(e.key) ? e.key : null;
}

/** Display label: "⌥" on Apple, "Alt" elsewhere. */
export function formatHoldKey(key: string): string {
  if (!key) return "Off";
  if (!isApple()) return key === "Meta" ? "Win" : key;
  const apple: Record<string, string> = {
    Alt: "⌥",
    Shift: "⇧",
    Control: "⌃",
    Meta: "⌘",
  };
  return apple[key] ?? key;
}

/** Whether the hold key is currently down, read off any keyboard/mouse event. */
export function isHoldKeyDown(
  e: { altKey: boolean; shiftKey: boolean; ctrlKey: boolean; metaKey: boolean },
  key: string,
): boolean {
  switch (key) {
    case "Alt":
      return e.altKey;
    case "Shift":
      return e.shiftKey;
    case "Control":
      return e.ctrlKey;
    case "Meta":
      return e.metaKey;
    default:
      return false;
  }
}

function keyMatches(e: KeyboardEvent, key: string): boolean {
  if (key.length === 1) return keyNameFromEvent(e).toLowerCase() === key.toLowerCase();
  return e.key === key;
}

/**
 * Whether a keydown matches the bind.
 *
 * A bare printable key stays out of the way of typing; a combo or a named key
 * (Ctrl+Shift+F, ScrollLock, F8) fires anywhere, which is the point of picking
 * one.
 */
export function matchesKeybind(
  e: KeyboardEvent,
  bind: string,
  isTyping: boolean,
): boolean {
  const parsed = parseKeybind(bind);
  if (!parsed) return false;
  if (parsed.mod !== (e.metaKey || e.ctrlKey)) return false;
  if (parsed.shift !== e.shiftKey) return false;
  if (parsed.alt !== e.altKey) return false;
  const bare = parsed.key.length === 1 && !parsed.mod && !parsed.alt;
  if (bare && isTyping) return false;
  return keyMatches(e, parsed.key);
}
