import * as stylex from "@stylexjs/stylex";

export const settingFormColors = stylex.defineVars({
  mutedText: "#777777",
  accentText: "#337581",
});

export const styles = stylex.create({
  page: { minHeight: "100%" },
  shell: { minWidth: 0, color: settingFormColors.mutedText },
});
