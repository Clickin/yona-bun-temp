import * as stylex from "@stylexjs/stylex";

export const pullRequestDetailColors = stylex.defineVars({
  mutedText: "#777777",
  contentBorder: "#eeeeee",
  accentText: "#337581",
});

export const styles = stylex.create({
  page: { minHeight: "100%" },
  body: { minWidth: 0 },
  author: { color: pullRequestDetailColors.accentText },
  content: { minWidth: 0, borderColor: pullRequestDetailColors.contentBorder },
  state: { color: pullRequestDetailColors.mutedText },
  actions: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" },
  comments: { minWidth: 0 },
});
