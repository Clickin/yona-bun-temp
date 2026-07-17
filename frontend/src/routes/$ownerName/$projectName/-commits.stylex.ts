import * as stylex from "@stylexjs/stylex";

export const commitsTheme = stylex.defineVars({
  historySurface: "#ffffff",
});

export const styles = stylex.create({
  history: { backgroundColor: commitsTheme.historySurface },
});
