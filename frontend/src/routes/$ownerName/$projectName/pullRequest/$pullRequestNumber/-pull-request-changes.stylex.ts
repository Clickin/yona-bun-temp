import * as stylex from "@stylexjs/stylex";

export const pullRequestChangesColors = stylex.defineVars({
  surface: "#fff",
  diffSurface: "#333",
  meta: "#999",
  accent: "#49afcd",
});
export const styles = stylex.create({
  page: { margin: "20px auto 0px", padding: "0px 10px", width: "100%", boxSizing: "border-box" },
  browse: { width: "100%" },
  author: { color: pullRequestChangesColors.meta, marginTop: "20px" },
  diffs: {
    backgroundColor: pullRequestChangesColors.diffSurface,
    color: pullRequestChangesColors.surface,
    overflowX: "auto",
  },
  reviewTabs: { marginBottom: "10px" },
  editorTabContent: { position: "relative", overflow: "visible" },
  originalMessageToggle: { border: 0, paddingLeft: 5, paddingRight: 5 },
  diffMeta: { cursor: "pointer" },
  threadReviewForm: { display: "block" },
  visibleForm: { display: "block" },
  commentDeleteModalVisible: { display: "block" },
});
