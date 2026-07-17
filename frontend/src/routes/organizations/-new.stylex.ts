import * as stylex from "@stylexjs/stylex";

// organization/create.scala.html and the frozen Bootstrap/Yobi form cascade.
// Only dark-mode-relevant paint is variable; geometry and type stay in new.tsx.
export const organizationNewColors = stylex.defineVars({
  actionBorder: "rgba(0, 0, 0, 0.15)",
  actionHoverBorder: "rgba(0, 0, 0, 0.25)",
  actionHoverSurface: "#f1f1f1",
  actionHoverText: "#292929",
  actionShadow: "0 1px 0 rgba(0, 0, 0, 0.05)",
  actionSurface: "#ffffff",
  actionText: "#333333",
  divider: "#e5e5e5",
  fieldBorder: "#cccccc",
  fieldFocusBorder: "#f36c22",
  fieldSurface: "#ffffff",
  fieldText: "#555555",
  primaryBorder: "#e95e01",
  primarySurface: "#ff7332",
  primaryText: "#ffffff",
  warningText: "#f36c22",
});
