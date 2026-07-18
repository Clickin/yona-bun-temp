import * as stylex from "@stylexjs/stylex";

// project/webhooks.scala.html and frozen Bootstrap/Yobi webhook-editor paint.
export const webhooksColors = stylex.defineVars({
  actionBorder: "#0044cc",
  actionPrimary: "#006dcc",
  border: "#dddddd",
  fieldBorder: "#cccccc",
  listSurface: "#fafafa",
  mutedText: "#666666",
  white: "#ffffff",
});

export const webhooksStyles = stylex.create({
  listItemHeading: { paddingLeft: "8px" },
  truncate: {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  codeMenuHidden: { display: "none" },
});
