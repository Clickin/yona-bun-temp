import * as stylex from "@stylexjs/stylex";

// Frozen `_page.less` `.form-wrap.new-project` paint declarations. Geometry,
// typography, and responsive layout remain route-local declarations/contextual
// legacy classes; only dark-mode-eligible surfaces and text colors are tokens.
export const projectFormTheme = stylex.defineVars({
  advancedBackground: "#fafafa",
  scopeNoteText: "#777777",
  errorSurface: "#ffffff",
  errorBorder: "#cccccc",
});
