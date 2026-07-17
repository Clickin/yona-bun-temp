import * as stylex from "@stylexjs/stylex";

export const codeBranchTheme = stylex.defineVars({
  headerSurface: "#ffffff",
});

export const styles = stylex.create({
  header: { backgroundColor: codeBranchTheme.headerSurface },
});
