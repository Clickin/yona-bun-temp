import * as stylex from "@stylexjs/stylex";

export const userSettingsPageColors = stylex.defineVars({
  pageSurface: "#ffffff",
});

export const userSettingsTabColors = stylex.defineVars({
  activeSurface: "#ffffff",
  activeText: "#555555",
  border: "#dddddd",
  focusSurface: "#eeeeee",
  hoverBorder: "#eeeeee",
  hoverSurface: "#f2f2f2",
  linkText: "#3592b5",
  rootText: "#333333",
});

export const userSettingsProfileColors = stylex.defineVars({
  divider: "#dddddd",
  progressSurface: "#f0f0f0",
  progressBar: "#f28149",
  rootText: "#333333",
});

export const userSettingsAvatarStyles = stylex.create({
  image: {
    maxWidth: "none",
    minWidth: "128px",
    width: "128px !important",
  },
  cropPreview: {
    maxWidth: "500px !important",
  },
});
