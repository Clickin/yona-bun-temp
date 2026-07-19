import * as stylex from "@stylexjs/stylex";

export const postsTheme = stylex.defineVars({
  searchSurface: "#ffffff",
  filterText: "#666666",
  filterBorder: "#dddddd",
  filterActive: "#f36c22",
});

export const styles = stylex.create({
  search: { backgroundColor: postsTheme.searchSurface },
  // Frozen `_page.less` `.post-list-wrap` / `.notice-wrap` list geometry and surface.
  postListWrap: { listStyle: "none" },
  postNoticeWrap: {
    backgroundColor: "#f7f7f7",
    borderColor: "#cccccc",
    borderRadius: "6px",
    borderStyle: "solid",
    borderWidth: "1px",
    clear: "both",
  },
  // Frozen `_page.less` `.post-item` row shell.
  postItem: {
    borderBottomColor: "#dddddd",
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    clear: "both",
    display: "block",
    overflow: "auto",
    padding: "10px",
  },
  // Frozen `_page.less` `.post-item .avatar-wrap`.
  postAvatar: { float: "left", marginRight: "10px" },
  // Frozen `_page.less` `.post-item .title-wrap`.
  postTitleWrap: {
    display: "block",
    lineHeight: "20px",
    overflow: "hidden",
    position: "relative",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  // Frozen `_page.less` `.post-item .infos`.
  postInfos: {
    color: "#999999",
    display: "block",
    fontSize: "12px",
    lineHeight: "20px",
    overflow: "hidden",
  },
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
