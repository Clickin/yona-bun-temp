import * as stylex from "@stylexjs/stylex";

// site/mail.scala.html, siteMngLayout.scala.html and the frozen legacy CSS cascade.
// Only route-owned paint remains variable for future dark-theme overrides.
export const siteMailColors = stylex.defineVars({
  sidebarBorder: "#eeeeee",
  sidebarActiveBorder: "#f36c22",
  sidebarHoverSurface: "#eeeeee",
  badgeSurface: "#ff7332",
  badgeBorder: "#ffffff",
  badgeShadow: "0px 1px 1px rgba(0,0,0,0.2), inset 0px 1px 1px rgba(0,0,0,0.1)",
  badgeText: "#ecf0f1",
  titleBorder: "#dddddd",
  titleText: "#4c4c4c",
  actionText: "#ffffff",
  actionSurface: "#ff7332",
  actionInteractiveSurface: "#e95e01",
  actionBorder: "#e95e01",
  actionShadow: "0px 1px 0px rgba(0, 0, 0, 0.05)",
  alertTextShadow: "0px 1px 0px rgba(255, 255, 255, 0.5)",
  successSurface: "#dff0d8",
  successBorder: "#d6e9c6",
  successText: "#468847",
  errorSurface: "#f2dede",
  errorBorder: "#eed3d7",
  errorText: "#b94a48",
});
