import * as stylex from "@stylexjs/stylex";

export const projectSearchTheme = stylex.defineVars({ resultSurface: "#ffffff" });

export const styles = stylex.create({
  results: { backgroundColor: projectSearchTheme.resultSurface },
  searchCategory: { fontWeight: "bold" },
  searchCategoryEmpty: { color: "#d3d2d3" },
  searchBox: { paddingBottom: "15px", borderBottom: "1px solid #ddd" },
  searchResultTitle: {
    fontSize: "16px",
    marginTop: "15px",
    fontWeight: "normal",
    padding: "0 15px",
  },
  searchList: { listStyle: "none", display: "block" },
  searchListItem: {
    position: "relative",
    display: "block",
    float: "none",
    margin: "0",
    padding: "15px",
    borderBottom: "1px solid #ddd",
  },
  searchListProjectItem: { padding: "15px 15px 15px 60px" },
  emptyResult: { minHeight: "32px", padding: "10px 0", color: "#777" },
});
