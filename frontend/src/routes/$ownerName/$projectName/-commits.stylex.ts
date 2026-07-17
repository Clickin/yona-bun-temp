import * as stylex from "@stylexjs/stylex";

export const commitsTheme = stylex.defineVars({
  historySurface: "#ffffff",
  mutedText: "#777777",
});

export const styles = stylex.create({
  history: { backgroundColor: commitsTheme.historySurface },
  table: { color: commitsTheme.mutedText },
});
