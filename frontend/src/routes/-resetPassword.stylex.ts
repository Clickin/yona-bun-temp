import * as stylex from "@stylexjs/stylex";

// Frozen paint evidence: user/resetPassword.scala.html + _page.less and validation popover rules.
export const resetPasswordTheme = stylex.defineVars({
  taglineText: "#7c7c7c",
  inputBorder: "#cccccc",
  inputFocusBorder: "#f36c22",
  validationSurface: "#ffffff",
  validationBorder: "rgba(0, 0, 0, 0.2)",
  validationShadow: "-2px 2px 1px rgba(0, 0, 0, 0.1)",
  validationArrowBorder: "rgba(0, 0, 0, 0.25)",
  validationArrowSurface: "#ffffff",
  badRequestText: "#898989",
});

export const resetPasswordStyles = stylex.create({
  validationPopoverFallback: {
    display: "block",
    maxWidth: "144px",
    position: "absolute",
  },
  validationPopoverPosition: (left: string, top: string) => ({ left, top }),
});
