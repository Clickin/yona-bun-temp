import * as stylex from "@stylexjs/stylex";

export const commitFileColors = stylex.defineVars({
  border: "#ddd",
  commentText: "#666",
  meta: "#999",
  surface: "#333",
  text: "#fff",
});
export const styles = stylex.create({
  page: { margin: "20px auto 0px", padding: "0px 10px", width: "100%", boxSizing: "border-box" },
  repo: {
    backgroundColor: commitFileColors.surface,
    color: commitFileColors.text,
    padding: "10px",
  },
  breadcrumbs: {
    borderBottomColor: commitFileColors.border,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    padding: "5px 0px",
  },
  history: { overflowX: "auto" },
  // history.scala.html:152 / _page.less:4824 owns the compact comment marker.
  commentCount: {
    float: "right",
    marginRight: "8px",
    position: "relative",
    color: commitFileColors.commentText,
  },
});
