import * as stylex from "@stylexjs/stylex";

export const postsTheme = stylex.defineVars({
  searchSurface: "#ffffff",
  filterText: "#666666",
  filterBorder: "#dddddd",
  filterActive: "#f36c22",
});

export const styles = stylex.create({
  search: { backgroundColor: postsTheme.searchSurface },
  filterWrap: {
    display: "block",
    height: "30px",
    marginTop: "5px",
    position: "relative",
  },
  filters: {
    borderColor: postsTheme.filterBorder,
    borderStyle: "solid",
    borderWidth: "1px",
    borderRadius: "3px",
    color: postsTheme.filterText,
    float: "right",
    marginTop: "5px",
    padding: "2px 10px",
  },
  filter: { marginRight: "10px" },
  filterLast: { marginRight: 0 },
  filterActive: { color: postsTheme.filterActive, fontWeight: "700" },
  filterIcon: { marginRight: "5px" },
  twoColumnMode: { position: "relative" },
  keymap: { marginLeft: "55px", padding: "10px 0" },
  labelPaint: (backgroundColor: string, boxShadow: string, color: string) => ({
    backgroundColor,
    boxShadow,
    color,
  }),
  keymapOpen: { display: "block" },
  labelButtonReset: { border: 0, cursor: "pointer", fontFamily: "inherit" },
  labelList: { fontWeight: "normal", padding: "2px 3px" },
});
