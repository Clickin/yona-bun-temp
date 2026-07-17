import * as stylex from "@stylexjs/stylex";

// user/edit_emails.scala.html add-email paint only. Geometry and type stay in the route.
export const emailAddColors = stylex.defineVars({
  actionBorder: "#e95e01",
  actionInteractiveSurface: "#e95e01",
  actionShadow: "rgba(0, 0, 0, 0.05)",
  actionSurface: "#ff7332",
  actionText: "#ffffff",
  inputBorder: "#cccccc",
  inputFocusBorder: "#f36c22",
  inputSurface: "#ffffff",
  inputText: "#555555",
});

// user/edit_emails.scala.html table paint only. Geometry and type stay in the route.
export const emailTableColors = stylex.defineVars({
  rowBorder: "#dddddd",
});
