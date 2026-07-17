import * as stylex from "@stylexjs/stylex";

export const projectSearchTheme = stylex.defineVars({ resultSurface: "#ffffff" });

export const styles = stylex.create({
  results: { backgroundColor: projectSearchTheme.resultSurface },
});
