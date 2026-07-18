import * as stylex from "@stylexjs/stylex";

// project/issuelabels.scala.html and frozen label-editor paint.
export const labelsFormColors = stylex.defineVars({
  actionBorder: "#2f96b4",
  actionInfo: "#49afcd",
  actionPrimary: "#006dcc",
  border: "#dddddd",
  fieldBorder: "#cccccc",
  listSurface: "#fafafa",
  mutedText: "#666666",
  notice: "#db3a67",
  white: "#ffffff",
});

export const labelsFormDynamicStyles = stylex.create({
  labelNameBackground: (backgroundColor: string) => ({ backgroundColor }),
  presetColorBackground: (backgroundColor: string) => ({ backgroundColor }),
  newLabelBackground: (backgroundColor: string) => ({ backgroundColor }),
  colorInputBoxShadow: (color: string) => ({ boxShadow: `inset 25px 0 0 ${color}` }),
  typeaheadPosition: (minWidth: string | undefined, top: string | undefined) => ({
    display: "block",
    left: 0,
    minWidth,
    position: "absolute",
    top,
  }),
});

export const labelsFormStyles = stylex.create({
  typeaheadAnchor: { position: "relative" },
  presetColorsVisible: { display: "inline-block" },
  changeVcsMenuHidden: { display: "none" },
  categorySuggestionButton: {
    backgroundColor: "transparent",
    border: 0,
    display: "block",
    padding: "3px 20px",
    textAlign: "left",
    width: "100%",
  },
});
