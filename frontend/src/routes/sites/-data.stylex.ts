import * as stylex from "@stylexjs/stylex";

// site/data.scala.html, siteMngLayout.scala.html and the frozen legacy LESS cascade.
// Only route-owned paint remains variable so a future dark theme has a narrow override boundary.
export const siteDataColors = stylex.defineVars({
  sidebarBorder: "#eeeeee",
  sidebarLinkHoverSurface: "#eeeeee",
  badgeSurface: "#ff7332",
  badgeBorder: "#ffffff",
  badgeShadow: "0px 1px 1px rgba(0, 0, 0, 0.2), inset 0px 1px 1px rgba(0, 0, 0, 0.1)",
  badgeText: "#ecf0f1",
  warningText: "#db3a67",
  titleBorder: "#dddddd",
  titleText: "#4c4c4c",
  actionText: "#ffffff",
  actionSurface: "#ff7332",
  actionInteractiveSurface: "#e95e01",
  actionBorder: "#e95e01",
  actionShadow: "0px 1px 0px rgba(0, 0, 0, 0.05)",
});
