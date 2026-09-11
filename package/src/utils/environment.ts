// =============================================================================
// Environment / Responsive Context
// =============================================================================
//
// Every copied block carries the same environment header, because a layout note
// is only reproducible against the window it was written in: "the cards overlap"
// is a different bug at 1440px than at an emulated iPhone 390px.
//
// The numbers are read live at copy time — nothing here is cached.
//

type ViewportSize = { width: number; height: number };

export type EnvironmentInfo = {
  browser: string;
  os: string;
  userAgent: string;
  url: string;
  /** Layout viewport the page is actually painted into. */
  viewport: ViewportSize;
  /** Outer browser window, including chrome and any docked DevTools. */
  window: ViewportSize;
  screen: ViewportSize;
  dpr: number;
  /** Pinch-zoom / page-zoom scale from visualViewport, 1 when untouched. */
  scale: number;
  orientation: "portrait" | "landscape";
  maxTouchPoints: number;
  colorScheme: "dark" | "light";
  reducedMotion: boolean;
  /** Tailwind-scale bucket the current width falls in. */
  breakpoint: string;
  /** One sentence on how this viewport came to be its size. */
  responsive: string;
};

const BREAKPOINTS: { name: string; min: number }[] = [
  { name: "2xl", min: 1536 },
  { name: "xl", min: 1280 },
  { name: "lg", min: 1024 },
  { name: "md", min: 768 },
  { name: "sm", min: 640 },
  { name: "xs", min: 0 },
];

function breakpointFor(width: number): string {
  const bp = BREAKPOINTS.find((b) => width >= b.min)!;
  return bp.min === 0 ? `xs (<640px)` : `${bp.name} (≥${bp.min}px)`;
}

function detectBrowser(ua: string): string {
  // userAgentData is the accurate source where it exists; the brand list always
  // carries a deliberately bogus entry, hence the "Not" filter.
  const data = (navigator as Navigator & {
    userAgentData?: { brands?: { brand: string; version: string }[] };
  }).userAgentData;
  const brand = data?.brands?.find(
    (b) => !/not[\W_]*a?[\W_]*brand/i.test(b.brand) && b.brand !== "Chromium",
  );
  if (brand) return `${brand.brand} ${brand.version}`;

  const match =
    /(Firefox|Edg|OPR|Chrome|Safari)\/(\d+)/.exec(ua) ?? null;
  if (!match) return "unknown browser";
  const names: Record<string, string> = { Edg: "Edge", OPR: "Opera" };
  return `${names[match[1]] ?? match[1]} ${match[2]}`;
}

function detectOS(ua: string): string {
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Android/.test(ua)) return "Android";
  if (/Mac OS X/.test(ua)) return "macOS";
  if (/Windows/.test(ua)) return "Windows";
  if (/Linux/.test(ua)) return "Linux";
  return "unknown OS";
}

/** The device a mobile UA is pretending to be, when it names one. */
function emulatedDeviceName(ua: string): string | null {
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  const android = /Android[^;]*;\s*([^;)]+)/.exec(ua);
  if (android) return android[1].trim();
  if (/Android/.test(ua)) return "Android device";
  return null;
}

/**
 * Why the viewport is the size it is. Distinguishes the three cases that change
 * how feedback should be read: a real phone / device emulation, a desktop window
 * squeezed by docked DevTools, and a plain resized window.
 */
function describeResponsive(
  ua: string,
  viewport: ViewportSize,
  win: ViewportSize,
  screen: ViewportSize,
  maxTouchPoints: number,
): string {
  const uaData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } })
    .userAgentData;
  const mobileUA = uaData?.mobile ?? /Mobi|Android|iPhone|iPad|iPod/i.test(ua);

  if (mobileUA) {
    const device = emulatedDeviceName(ua);
    // Device emulation reports the emulated screen, so screen and viewport match.
    const emulated = Math.abs(screen.width - viewport.width) <= 2;
    const label = device ? `${device}` : "mobile device";
    return emulated
      ? `device emulation — ${label} at ${viewport.width}×${viewport.height}px`
      : `mobile browser — ${label}, ${viewport.width}×${viewport.height}px viewport`;
  }

  const sideGap = win.width - viewport.width;
  const bottomGap = win.height - viewport.height;

  if (sideGap > 150) {
    return `desktop — page has ${viewport.width}px of a ${win.width}px window; DevTools likely docked to the side`;
  }
  if (bottomGap > 300) {
    return `desktop — page has ${viewport.height}px of a ${win.height}px window; DevTools likely docked to the bottom`;
  }
  if (screen.width > 0 && viewport.width < screen.width * 0.9) {
    return `desktop — window narrowed to ${viewport.width}px on a ${screen.width}px screen`;
  }
  if (maxTouchPoints > 0) {
    return `touch-capable desktop at ${viewport.width}×${viewport.height}px`;
  }
  return `desktop at ${viewport.width}×${viewport.height}px, roughly full-screen`;
}

export function getEnvironmentInfo(): EnvironmentInfo | null {
  if (typeof window === "undefined") return null;

  const ua = navigator.userAgent;
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const win = { width: window.outerWidth, height: window.outerHeight };
  const scr = { width: window.screen?.width ?? 0, height: window.screen?.height ?? 0 };
  const maxTouchPoints = navigator.maxTouchPoints ?? 0;

  return {
    browser: detectBrowser(ua),
    os: detectOS(ua),
    userAgent: ua,
    url: window.location.href,
    viewport,
    window: win,
    screen: scr,
    dpr: window.devicePixelRatio,
    scale: window.visualViewport?.scale ?? 1,
    orientation: viewport.width >= viewport.height ? "landscape" : "portrait",
    maxTouchPoints,
    colorScheme: window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light",
    reducedMotion: !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    breakpoint: breakpointFor(viewport.width),
    responsive: describeResponsive(ua, viewport, win, scr, maxTouchPoints),
  };
}

type EnvDetail = "compact" | "standard" | "detailed" | "forensic";

/**
 * Markdown environment block. Compact collapses to a single quoted line; every
 * other level gets the full section so coordinates elsewhere in the output have
 * a frame to be read against.
 */
export function formatEnvironment(detailLevel: EnvDetail = "standard"): string {
  const env = getEnvironmentInfo();
  if (!env) return "";

  if (detailLevel === "compact") {
    return `> ${env.browser} · ${env.os} · ${env.viewport.width}×${env.viewport.height} · ${env.breakpoint}\n`;
  }

  let out = "### Environment\n";
  out += `- Browser: ${env.browser} on ${env.os}\n`;
  out += `- Viewport: \`${env.viewport.width}×${env.viewport.height}px\` · DPR \`${env.dpr}\` · ${env.orientation}\n`;
  out += `- Window: \`${env.window.width}×${env.window.height}px\` · Screen: \`${env.screen.width}×${env.screen.height}px\`\n`;
  out += `- Responsive: ${env.responsive}\n`;
  out += `- Breakpoint: \`${env.breakpoint}\`\n`;
  out += `- Prefers: ${env.colorScheme} scheme, reduced motion ${env.reducedMotion ? "on" : "off"}\n`;

  if (detailLevel === "detailed" || detailLevel === "forensic") {
    if (env.maxTouchPoints > 0) out += `- Touch points: ${env.maxTouchPoints}\n`;
    if (env.scale !== 1) out += `- Page scale: \`${env.scale}\`\n`;
  }

  if (detailLevel === "forensic") {
    out += `- URL: ${env.url}\n`;
    out += `- User Agent: ${env.userAgent}\n`;
    out += `- Timestamp: ${new Date().toISOString()}\n`;
  }

  out += "\n";
  return out;
}

/**
 * Insert the environment block directly under a document's first heading, so a
 * copy carries exactly one — whatever mix of feedback, layout and rearrange
 * sections follows it.
 */
export function withEnvironment(
  markdown: string,
  detailLevel: EnvDetail = "standard",
): string {
  const block = formatEnvironment(detailLevel);
  if (!block) return markdown;
  const firstBreak = markdown.indexOf("\n");
  if (firstBreak === -1) return `${markdown}\n\n${block}`;
  return `${markdown.slice(0, firstBreak + 1)}\n${block}${markdown.slice(firstBreak + 1)}`;
}
