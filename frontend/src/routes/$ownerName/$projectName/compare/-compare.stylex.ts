import * as stylex from "@stylexjs/stylex";

export const compareColors = stylex.defineVars({
  added: "#eaffea",
  deleted: "#ffecec",
  empty: "#f5f5f5",
  meta: "#999999",
  title: "#333333",
});

export const styles = stylex.create({
  page: { margin: "20px auto 0px", padding: "0px 10px", width: "100%", boxSizing: "border-box" },
  browse: { width: "100%" },
  commitInfo: { color: compareColors.title, margin: "10px 0px" },
  empty: {
    backgroundColor: compareColors.empty,
    borderRadius: "4px",
    padding: "8px 35px 8px 14px",
  },
  diffStatBar: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "16px",
  },
  diffStatBadgeChanged: {
    backgroundColor: "#f0f0f0",
    color: "#333333",
    padding: "2px 10px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: 600,
  },
  diffStatBadgeAdd: {
    backgroundColor: "#e6ffec",
    color: "#1f883d",
    padding: "2px 10px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: 600,
  },
  diffStatBadgeDelete: {
    backgroundColor: "#ffebe9",
    color: "#cf222e",
    padding: "2px 10px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: 600,
  },
  fileDiffCard: {
    marginBottom: "16px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#d0d7de",
    borderRadius: "6px",
    overflow: "hidden",
  },
  fileHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f6f8fa",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "#d0d7de",
    padding: "8px 16px",
    cursor: "pointer",
    userSelect: "none",
  },
  fileHeaderTitle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    fontWeight: 600,
  },
  fileToggleIcon: {
    fontSize: "12px",
    color: "#57606a",
    marginRight: "6px",
  },
});
