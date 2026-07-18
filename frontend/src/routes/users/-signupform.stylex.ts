import * as stylex from "@stylexjs/stylex";

export const signupFormColors = stylex.defineVars({
  actionText: "#5c5c5c",
  taglineText: "#7c7c7c",
  popoverArrowBorder: "#999999",
  inputBorder: "#cccccc",
  accent: "#f36c22",
  popoverSurface: "#ffffff",
  popoverShadow: "-2px 2px 1px rgba(0, 0, 0, 0.1)",
  popoverBorder: "rgba(0, 0, 0, 0.2)",
  popoverArrowShadow: "rgba(0, 0, 0, 0.25)",
});

export const signupFormDynamicStyles = stylex.create({
  validationPopoverPosition: (left: string, top: string) => ({ left, top }),
});
