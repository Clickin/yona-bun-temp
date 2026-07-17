import * as stylex from "@stylexjs/stylex";

// user/edit_password.scala.html and the frozen Bootstrap/Yobi input cascade.
// Only dark-mode-relevant paint is variable; geometry and type stay in the route.
export const passwordSettingsColors = stylex.defineVars({
  inputBorder: "#cccccc",
  inputFocusBorder: "#f36c22",
  inputSurface: "#ffffff",
  inputText: "#555555",
});
