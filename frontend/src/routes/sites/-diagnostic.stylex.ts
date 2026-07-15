import * as stylex from "@stylexjs/stylex";

// site/diagnostic.scala.html, siteMngLayout.scala.html and the frozen legacy CSS cascade.
// Keep only route-owned paint at the dark-mode override boundary.
export const siteDiagnosticColors = stylex.defineVars({
  sidebarBorder: "#eeeeee",
  sidebarActiveBorder: "#f36c22",
  sidebarHoverSurface: "#eeeeee",
  badgeSurface: "#ff7332",
  badgeBorder: "#ffffff",
  badgeShadow: "0px 1px 1px rgba(0, 0, 0, 0.2), inset 0px 1px 1px rgba(0, 0, 0, 0.1)",
  badgeText: "#ecf0f1",
  titleBorder: "#dddddd",
  titleText: "#4c4c4c",
  errorText: "#333333",
  errorSurface: "#f5f5f5",
  errorBorder: "rgba(0, 0, 0, 0.15)",
});
