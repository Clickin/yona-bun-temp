import * as stylex from "@stylexjs/stylex";

// user/edit_token.scala.html and the frozen Yobi button cascade.
// Only dark-mode-relevant paint is variable; geometry and type stay in the route.
export const tokenSettingsColors = stylex.defineVars({
  actionBorder: "#e95e01",
  actionShadow: "0 1px 0 rgba(0, 0, 0, 0.05)",
  actionSurface: "#ff7332",
  actionInteractiveSurface: "#e95e01",
  actionText: "#ffffff",
});
