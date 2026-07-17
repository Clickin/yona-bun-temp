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

// user/edit_emails.scala.html pending secondary-email row paint only.
export const emailSecondaryRowColors = stylex.defineVars({
  actionBorder: "rgba(0, 0, 0, 0.15)",
  actionInteractiveBorder: "rgba(0, 0, 0, 0.25)",
  actionInteractiveSurface: "#f1f1f1",
  actionInteractiveText: "#292929",
  actionShadow: "rgba(0, 0, 0, 0.05)",
  actionSurface: "#ffffff",
  actionText: "#333333",
  dangerBorder: "#b13427",
  dangerInteractiveSurface: "#b13427",
  dangerSurface: "#c93426",
  dangerText: "#ffffff",
  warningText: "#f36c22",
});
