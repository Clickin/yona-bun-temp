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

// user/edit_emails.scala.html primary-email badge paint only.
export const emailPrimaryBadgeColors = stylex.defineVars({
  border: "rgba(0, 0, 0, 0.1)",
  surface: "#ffffff",
  text: "#0088cc",
});

// user/edit_emails.scala.html separator paint only.
export const emailDescriptionSeparatorColors = stylex.defineVars({
  bottomBorder: "#ffffff",
  topBorder: "#eeeeee",
});
