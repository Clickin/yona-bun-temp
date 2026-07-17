import * as stylex from "@stylexjs/stylex";

export const commitsTheme = stylex.defineVars({
  historySurface: "#ffffff",
  mutedText: "#777777",
});

export const styles = stylex.create({
  branchPicker: { width: "220px" },
  branchButton: {
    fontFamily: "inherit",
    fontSize: "inherit",
    fontWeight: "inherit",
    textAlign: "left",
    width: "100%",
  },
  // `.select2-drop.branches { width: auto !important; }` is the winning
  // frozen legacy declaration; StyleX owns only the stateful display toggle.
  branchDropdown: { display: "block" },
  tabs: { marginBottom: "20px" },
  history: { backgroundColor: commitsTheme.historySurface },
  table: { color: commitsTheme.mutedText },
});
