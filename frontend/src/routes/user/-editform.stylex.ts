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
  avatarSurface: "#dddddd",
  fieldBorder: "#cccccc",
  fieldFocusBorder: "#ff7332",
  fieldSurface: "#ffffff",
  fieldText: "#555555",
  divider: "#dddddd",
  progressSurface: "#f0f0f0",
  progressBar: "#f28149",
  rootText: "#333333",
  uploadHoverSurface: "#e6e6e6",
});

export const userSettingsProfileStyles = stylex.create({
  form: {
    float: "left",
    margin: "0px 0px 2px",
  },
  field: {
    backgroundColor: userSettingsProfileColors.fieldSurface,
    borderColor: {
      default: userSettingsProfileColors.fieldBorder,
      ":focus": userSettingsProfileColors.fieldFocusBorder,
    },
    borderRadius: "2px",
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: "none",
    boxSizing: "content-box",
    color: userSettingsProfileColors.fieldText,
    display: "inline-block",
    fontSize: "12px",
    height: "20px",
    lineHeight: "20px",
    marginBottom: "10px",
    outline: "none",
    padding: "4px 6px",
    verticalAlign: "middle",
    width: "206px",
  },
  profileFieldRow: {
    marginTop: "10px",
  },
  resetVisited: {
    clear: "both",
    paddingTop: "5px",
  },
});

export const userSettingsAvatarStyles = stylex.create({
  wrap: {
    backgroundColor: userSettingsProfileColors.avatarSurface,
    borderRadius: "3px",
    display: "inline-block",
    height: "128px",
    overflow: "hidden",
    verticalAlign: "middle",
    width: "128px",
  },
  form: {
    borderLeftColor: userSettingsProfileColors.divider,
    borderLeftStyle: "solid",
    borderLeftWidth: "1px",
    float: "left",
    margin: "0px 0px 2px 50px",
    paddingLeft: "50px",
  },
  image: {
    display: "block",
    maxWidth: "none",
    minWidth: "128px",
    verticalAlign: "top",
    width: "128px",
  },
  cropPreview: {
    maxWidth: "500px",
  },
  hidden: { display: "none" },
  progress: {
    backgroundColor: userSettingsProfileColors.progressSurface,
    borderRadius: "5px",
    boxShadow: "inset 0px 1px 1px rgba(0, 0, 0, 0.25)",
    height: "5px",
    marginBottom: "5px",
    overflow: "hidden",
  },
  progressBar: {
    backgroundColor: userSettingsProfileColors.progressBar,
    boxShadow: "none",
    height: "100%",
  },
  progressFull: { width: "100%" },
  upload: {
    backgroundColor: {
      default: "transparent",
      ":hover": userSettingsProfileColors.uploadHoverSurface,
    },
    clear: "both",
    cursor: "pointer",
    display: "block",
    overflow: "hidden",
    position: "relative",
  },
  uploadWrap: {
    textAlign: "center",
  },
  uploadWrapMargin: {
    marginTop: "10px",
  },
  uploadInput: {
    cursor: "pointer",
    left: "5px",
    minWidth: "100px",
    opacity: 0,
    position: "absolute",
    top: 0,
    width: "100%",
    zIndex: 2,
  },
  cropVisible: { display: "block" },
  cropHeader: {
    textAlign: "center",
  },
});
