import { describe, expect, it } from "vitest";

import {
  DEFAULT_ACTIVATION_KEY,
  formatKeybind,
  keybindFromEvent,
  matchesKeybind,
  parseKeybind,
} from "./keybind";

const event = (key: string, opts: Partial<KeyboardEvent> = {}) =>
  ({
    key,
    code: key.length === 1 ? `Key${key.toUpperCase()}` : key,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    ...opts,
  }) as KeyboardEvent;

describe("parseKeybind", () => {
  it("splits modifiers from the key", () => {
    expect(parseKeybind("Mod+Shift+F")).toEqual({ mod: true, shift: true, alt: false, key: "F" });
    expect(parseKeybind("ScrollLock")).toEqual({ mod: false, shift: false, alt: false, key: "ScrollLock" });
    expect(parseKeybind("")).toBeNull();
    expect(parseKeybind("Shift")).toBeNull();
  });
});

describe("keybindFromEvent", () => {
  it("records the whole combination, not just the key", () => {
    expect(keybindFromEvent(event("F", { ctrlKey: true, shiftKey: true }))).toBe("Mod+Shift+F");
    expect(keybindFromEvent(event("F", { metaKey: true, shiftKey: true }))).toBe("Mod+Shift+F");
    expect(keybindFromEvent(event("ScrollLock"))).toBe("ScrollLock");
  });

  it("takes the letter from the physical key, so Alt-rewritten layouts still bind", () => {
    expect(keybindFromEvent({ key: "˚", code: "KeyK", altKey: true } as KeyboardEvent)).toBe("Alt+K");
  });

  it("returns null for a lone modifier", () => {
    expect(keybindFromEvent(event("Shift", { shiftKey: true }))).toBeNull();
  });
});

describe("matchesKeybind", () => {
  it("matches the default on both Cmd and Ctrl", () => {
    expect(matchesKeybind(event("F", { ctrlKey: true, shiftKey: true }), DEFAULT_ACTIVATION_KEY, false)).toBe(true);
    expect(matchesKeybind(event("F", { metaKey: true, shiftKey: true }), DEFAULT_ACTIVATION_KEY, false)).toBe(true);
  });

  it("requires every modifier of the bind and no others", () => {
    expect(matchesKeybind(event("F", { ctrlKey: true }), DEFAULT_ACTIVATION_KEY, false)).toBe(false);
    expect(matchesKeybind(event("F", { shiftKey: true }), DEFAULT_ACTIVATION_KEY, false)).toBe(false);
    expect(matchesKeybind(event("F", { ctrlKey: true, shiftKey: true, altKey: true }), DEFAULT_ACTIVATION_KEY, false)).toBe(false);
  });

  it("fires combos and named keys while typing, but not a bare printable key", () => {
    expect(matchesKeybind(event("F", { ctrlKey: true, shiftKey: true }), DEFAULT_ACTIVATION_KEY, true)).toBe(true);
    expect(matchesKeybind(event("ScrollLock"), "ScrollLock", true)).toBe(true);
    expect(matchesKeybind(event("k"), "K", true)).toBe(false);
    expect(matchesKeybind(event("k"), "K", false)).toBe(true);
  });

  it("never matches an unset bind", () => {
    expect(matchesKeybind(event("F", { ctrlKey: true, shiftKey: true }), "", false)).toBe(false);
  });
});

describe("formatKeybind", () => {
  it("spells out the combination for non-Apple platforms", () => {
    expect(formatKeybind("Mod+Shift+F")).toBe("Ctrl+Shift+F");
    expect(formatKeybind("ScrollLock")).toBe("Scroll Lock");
    expect(formatKeybind("")).toBe("None");
  });
});
