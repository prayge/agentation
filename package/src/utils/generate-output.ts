import {
  OutputDetailLevel,
  ReactComponentMode,
} from "../components/page-toolbar-css";
import { Annotation } from "../types";

export const OUTPUT_TO_REACT_MODE: Record<
  OutputDetailLevel,
  ReactComponentMode
> = {
  compact: "off",
  standard: "filtered",
  detailed: "smart",
  forensic: "all",
};

export const OUTPUT_DETAIL_OPTIONS: {
  value: OutputDetailLevel;
  label: string;
  /** What this level actually puts in the copied markdown. */
  description: string;
}[] = [
  {
    value: "compact",
    label: "Compact",
    description:
      "One line per note — element, source file, your comment. No positions, no styles, no React names. Good for a quick punch list.",
  },
  {
    value: "standard",
    label: "Standard",
    description:
      "Each note with its DOM path, source file and React component name. The default: enough for an agent to find the element and change it.",
  },
  {
    value: "detailed",
    label: "Detailed",
    description:
      "Standard plus CSS classes, pixel position and size, and the text around the element. Reach for this when spacing or layout is the problem.",
  },
  {
    value: "forensic",
    label: "Forensic",
    description:
      "Everything: full DOM path, computed styles, accessibility info, neighbouring elements, plus URL, user agent and timestamp. Largest output, slowest to read.",
  },
];

export function generateOutput(
  annotations: Annotation[],
  pathname: string,
  detailLevel: OutputDetailLevel = "standard",
): string {
  if (annotations.length === 0) return "";

  let output = `## Page Feedback: ${pathname}\n`;
  if (detailLevel === "forensic") output += `\n---\n`;
  output += "\n";

  annotations.forEach((a, i) => {
    if (detailLevel === "compact") {
      output += `${i + 1}. **${a.element}**${a.sourceFile ? ` (${a.sourceFile})` : ""}: ${a.comment}`;
      if (a.selectedText) {
        output += ` (re: "${a.selectedText.slice(0, 30)}${a.selectedText.length > 30 ? "..." : ""}")`;
      }
      output += "\n";
    } else if (detailLevel === "forensic") {
      output += `### ${i + 1}. ${a.element}\n`;
      if (a.isMultiSelect && a.fullPath) {
        output += `*Forensic data shown for first element of selection*\n`;
      }
      if (a.fullPath) {
        output += `**Full DOM Path:** ${a.fullPath}\n`;
      }
      if (a.cssClasses) {
        output += `**CSS Classes:** ${a.cssClasses}\n`;
      }
      if (a.boundingBox) {
        output += `**Position:** x:${Math.round(a.boundingBox.x)}, y:${Math.round(a.boundingBox.y)} (${Math.round(a.boundingBox.width)}×${Math.round(a.boundingBox.height)}px)\n`;
      }
      output += `**Annotation at:** ${a.x.toFixed(1)}% from left, ${Math.round(a.y)}px from top\n`;
      if (a.selectedText) {
        output += `**Selected text:** "${a.selectedText}"\n`;
      }
      if (a.nearbyText && !a.selectedText) {
        output += `**Context:** ${a.nearbyText.slice(0, 100)}\n`;
      }
      if (a.computedStyles) {
        output += `**Computed Styles:** ${a.computedStyles}\n`;
      }
      if (a.accessibility) {
        output += `**Accessibility:** ${a.accessibility}\n`;
      }
      if (a.nearbyElements) {
        output += `**Nearby Elements:** ${a.nearbyElements}\n`;
      }
      if (a.sourceFile) {
        output += `**Source:** ${a.sourceFile}\n`;
      }
      if (a.reactComponents) {
        output += `**React:** ${a.reactComponents}\n`;
      }
      output += `**Feedback:** ${a.comment}\n\n`;
    } else {
      // standard and detailed
      output += `### ${i + 1}. ${a.element}\n`;
      output += `**Location:** ${a.elementPath}\n`;
      if (a.sourceFile) {
        output += `**Source:** ${a.sourceFile}\n`;
      }
      if (a.reactComponents) {
        output += `**React:** ${a.reactComponents}\n`;
      }
      if (detailLevel === "detailed") {
        if (a.cssClasses) {
          output += `**Classes:** ${a.cssClasses}\n`;
        }
        if (a.boundingBox) {
          output += `**Position:** ${Math.round(a.boundingBox.x)}px, ${Math.round(a.boundingBox.y)}px (${Math.round(a.boundingBox.width)}×${Math.round(a.boundingBox.height)}px)\n`;
        }
      }
      if (a.selectedText) {
        output += `**Selected text:** "${a.selectedText}"\n`;
      }
      if (detailLevel === "detailed" && a.nearbyText && !a.selectedText) {
        output += `**Context:** ${a.nearbyText.slice(0, 100)}\n`;
      }
      output += `**Feedback:** ${a.comment}\n\n`;
    }
  });

  return output.trim();
}
