import type { CSSProperties } from "react";

export function issueLabelStyle(color?: string): CSSProperties | undefined {
  if (!color) {
    return undefined;
  }
  return {
    backgroundColor: color,
    boxShadow: `inset 2px 0 0px ${color}`,
    color: issueLabelTextColor(color),
  };
}

function issueLabelTextColor(color: string) {
  const rgb = parseIssueLabelColor(color);
  const colorSpace = rgb.r * 0.21 + rgb.g * 0.72 + rgb.b * 0.07;
  return colorSpace > 192 ? "dimgray" : "white";
}

function parseIssueLabelColor(color: string) {
  const normalized = color.trim().toLowerCase();
  const rgbMatch = normalized.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/u);
  if (rgbMatch) {
    return {
      r: Number(rgbMatch[1]),
      g: Number(rgbMatch[2]),
      b: Number(rgbMatch[3]),
    };
  }

  const hex = normalized.startsWith("#") ? normalized.slice(1) : normalized;
  if (/^[0-9a-f]{6}$/u.test(hex)) {
    return {
      r: Number.parseInt(hex.slice(0, 2), 16),
      g: Number.parseInt(hex.slice(2, 4), 16),
      b: Number.parseInt(hex.slice(4, 6), 16),
    };
  }

  return { b: 255, g: 255, r: 255 };
}
