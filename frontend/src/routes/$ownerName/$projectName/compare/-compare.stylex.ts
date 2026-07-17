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
  diffBody: { overflowX: "auto" },
  empty: {
    backgroundColor: compareColors.empty,
    borderRadius: "4px",
    padding: "8px 35px 8px 14px",
  },
});
