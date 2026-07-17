import * as stylex from "@stylexjs/stylex";

export const searchColors = stylex.defineVars({
  border: "#ddd",
  inputBorder: "#ccc",
  inputText: "#555",
  link: "#3592b5",
  surface: "#fff",
});
export const styles = stylex.create({
  breadcrumb: { margin: "0px auto" },
  page: { margin: "20px auto 0px", padding: "0px 10px", width: "100%", boxSizing: "border-box" },
  category: {
    borderRightColor: searchColors.border,
    borderRightStyle: "solid",
    borderRightWidth: "1px",
  },
  searchBox: {
    backgroundColor: searchColors.surface,
    borderColor: searchColors.inputBorder,
    borderStyle: "solid",
    borderWidth: "1px",
    padding: "5px",
  },
  searchInput: {
    borderStyle: "none",
    borderWidth: "0px",
    color: searchColors.inputText,
    width: "100%",
  },
  result: { borderTopColor: searchColors.border, borderTopStyle: "solid", borderTopWidth: "1px" },
});
