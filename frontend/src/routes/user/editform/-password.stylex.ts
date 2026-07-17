import * as stylex from "@stylexjs/stylex";

// user/edit_password.scala.html and the frozen Bootstrap/Yobi input cascade.
// Only dark-mode-relevant paint is variable; geometry and type stay in the route.
export const passwordSettingsColors = stylex.defineVars({
  inputBorder: "#cccccc",
  inputFocusBorder: "#f36c22",
  inputSurface: "#ffffff",
  inputText: "#555555",
});

// _yobiUI.less .ybtn paint. Geometry and type stay in the route.
export const passwordActionColors = stylex.defineVars({
  border: "rgba(0, 0, 0, 0.15)",
  interactiveBorder: "rgba(0, 0, 0, 0.25)",
  interactiveSurface: "#f1f1f1",
  interactiveText: "#292929",
  primaryBorder: "#e95e01",
  primarySurface: "#ff7332",
  primarySurfaceInteractive: "#e95e01",
  primaryText: "#ffffff",
  shadow: "rgba(0, 0, 0, 0.05)",
  surface: "#ffffff",
  text: "#333333",
});

// bootstrap.css hr paint, kept separate from action paint for dark-mode overrides.
export const passwordSeparatorColors = stylex.defineVars({
  bottomBorder: "#ffffff",
  topBorder: "#eeeeee",
});
