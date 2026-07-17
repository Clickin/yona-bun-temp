import * as stylex from "@stylexjs/stylex";

export const userProfileColors = stylex.defineVars({
  mutedText: "#777777",
  accentText: "#337581",
  statusText: "#ffffff",
});

export const styles = stylex.create({
  profile: { color: userProfileColors.mutedText },
  info: { color: userProfileColors.accentText },
  stream: { minWidth: 0 },
  tabs: { color: userProfileColors.accentText },
});
