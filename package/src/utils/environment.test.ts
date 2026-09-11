import { describe, it, expect, afterEach, vi } from "vitest";
import { getEnvironmentInfo, formatEnvironment, withEnvironment } from "./environment";

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

/** Point window/navigator/screen at a made-up device for one assertion. */
function setEnv(opts: {
  ua: string;
  inner: [number, number];
  outer: [number, number];
  screen: [number, number];
  touch?: number;
}) {
  vi.stubGlobal("navigator", {
    userAgent: opts.ua,
    maxTouchPoints: opts.touch ?? 0,
  });
  Object.defineProperty(window, "innerWidth", { value: opts.inner[0], configurable: true });
  Object.defineProperty(window, "innerHeight", { value: opts.inner[1], configurable: true });
  Object.defineProperty(window, "outerWidth", { value: opts.outer[0], configurable: true });
  Object.defineProperty(window, "outerHeight", { value: opts.outer[1], configurable: true });
  Object.defineProperty(window, "screen", {
    value: { width: opts.screen[0], height: opts.screen[1] },
    configurable: true,
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("getEnvironmentInfo", () => {
  it("names the browser and OS from a desktop UA", () => {
    setEnv({ ua: DESKTOP_UA, inner: [1440, 900], outer: [1512, 944], screen: [1512, 982] });
    const env = getEnvironmentInfo()!;
    expect(env.browser).toBe("Chrome 141");
    expect(env.os).toBe("macOS");
    expect(env.breakpoint).toBe("xl (≥1280px)");
  });

  it("reads device emulation as emulation, not as a narrow desktop", () => {
    setEnv({ ua: IPHONE_UA, inner: [393, 852], outer: [1512, 944], screen: [393, 852], touch: 5 });
    const env = getEnvironmentInfo()!;
    expect(env.responsive).toContain("device emulation");
    expect(env.responsive).toContain("iPhone");
    expect(env.orientation).toBe("portrait");
    expect(env.breakpoint).toBe("xs (<640px)");
  });

  it("calls out DevTools docked to the side", () => {
    setEnv({ ua: DESKTOP_UA, inner: [900, 900], outer: [1512, 944], screen: [1512, 982] });
    expect(getEnvironmentInfo()!.responsive).toContain("DevTools likely docked to the side");
  });

  it("calls out a narrowed window when the browser chrome is not the cause", () => {
    setEnv({ ua: DESKTOP_UA, inner: [1000, 900], outer: [1010, 944], screen: [1512, 982] });
    const res = getEnvironmentInfo()!.responsive;
    expect(res).toContain("window narrowed to 1000px");
    expect(res).not.toContain("DevTools");
  });
});

describe("formatEnvironment / withEnvironment", () => {
  it("collapses to one line at compact and a section otherwise", () => {
    setEnv({ ua: DESKTOP_UA, inner: [1440, 900], outer: [1512, 944], screen: [1512, 982] });
    expect(formatEnvironment("compact").split("\n").filter(Boolean)).toHaveLength(1);
    expect(formatEnvironment("standard")).toContain("### Environment");
    expect(formatEnvironment("forensic")).toContain("User Agent:");
    expect(formatEnvironment("standard")).not.toContain("User Agent:");
  });

  it("inserts exactly one block, under the first heading", () => {
    setEnv({ ua: DESKTOP_UA, inner: [1440, 900], outer: [1512, 944], screen: [1512, 982] });
    const doc = withEnvironment("## Page Feedback: /pricing\n\n### 1. Button\nfix it\n", "standard");
    expect(doc.split("### Environment")).toHaveLength(2);
    expect(doc.indexOf("### Environment")).toBeGreaterThan(doc.indexOf("## Page Feedback"));
    expect(doc.indexOf("### Environment")).toBeLessThan(doc.indexOf("### 1. Button"));
  });
});
