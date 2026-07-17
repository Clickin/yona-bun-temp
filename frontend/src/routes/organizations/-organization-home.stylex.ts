import * as stylex from "@stylexjs/stylex";

export const organizationHomeColors = stylex.defineVars({
  mutedText: "#777777",
  accentText: "#337581",
  panelSurface: "#f5f5f5",
});

export const styles = stylex.create({
  home: { color: organizationHomeColors.mutedText },
  overview: { color: organizationHomeColors.accentText },
  projects: { minWidth: 0 },
  members: { backgroundColor: organizationHomeColors.panelSurface },
});
