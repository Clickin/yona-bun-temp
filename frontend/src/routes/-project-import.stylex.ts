import * as stylex from "@stylexjs/stylex";

export const projectImportColors = stylex.defineVars({
  mutedText: "#777777",
  accentText: "#337581",
  warningText: "#f36c22",
});

export const styles = stylex.create({
  page: {
    color: projectImportColors.mutedText,
    width: "100%",
    maxWidth: "100vw",
    boxSizing: "border-box",
  },
  form: {
    minWidth: 0,
    width: {
      default: "700px",
      "@media (max-width: 767px)": "100%",
    },
    maxWidth: "100%",
    boxSizing: "border-box",
  },
  repoAuthVisible: { display: "block" },
  protectedScopeHidden: { display: "none" },
  selectContainer: { width: "220px" },
  requiredMarker: { color: projectImportColors.warningText },
  selectButton: {
    fontFamily: "inherit",
    fontSize: "inherit",
    fontWeight: "inherit",
    textAlign: "left",
    width: "100%",
  },
  selectDropOpen: { display: "block", width: "220px" },
  advanced: { color: projectImportColors.accentText },
  rightLabel: { textAlign: "right" },
});
