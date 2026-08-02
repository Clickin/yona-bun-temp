import * as stylex from "@stylexjs/stylex";

export const postsTheme = stylex.defineVars({
  searchSurface: "#ffffff",
  filterText: "#666666",
  filterBorder: "#dddddd",
  filterActive: "#f36c22",
});

export const styles = stylex.create({
  search: { backgroundColor: postsTheme.searchSurface, float: "left" },
  newPostWrap: { float: "right" },
  // Frozen `_page.less` `.error-wrap` empty-state geometry and typography.
  errorWrap: { padding: "100px 0px", textAlign: "center" },
  errorIcon: {
    backgroundPosition: "-5px -160px",
    backgroundRepeat: "no-repeat",
    display: "inline-block",
    height: "82px",
    verticalAlign: "middle",
    width: "62px",
  },
  errorMessage: {
    color: "#898989",
    fontSize: "16px",
    fontWeight: "bold",
    margin: "30px 0px",
  },
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
  twoColumnMode: { marginRight: "10px", position: "relative" },
  twoColumnModeLabel: {
    display: "inline-block",
    margin: "2px !important",
    verticalAlign: "top",
  },
  keymap: { float: "left", marginLeft: "55px", padding: "10px 0" },
  keymapOpen: { display: "block" },
  paginationWrap: {
    clear: "both",
    width: "100%",
    margin: "20px 0",
    textAlign: "center",
  },
  paginationPageNums: {
    display: "inline-block",
    padding: 0,
    margin: 0,
    fontSize: 0,
    listStyle: "none",
    marginLeft: "-120px !important",
    "@media all and (max-width: 720px)": {
      marginLeft: "-120px !important",
    },
  },
  paginationPageNum: {
    display: "inline-block",
    padding: "0 10px",
    color: "#8e9094",
    fontSize: "12px",
  },
  paginationIconPageNum: {
    padding: "0 5px",
  },
  paginationIconLabel: {
    fontSize: "11px",
    color: "#f36c22",
  },
  paginationIconLabelOff: {
    color: "#8e9094",
  },
  paginationDelimiter: {
    color: "#ddd",
    padding: "0 5px",
  },
  paginationInput: {
    margin: 0,
    width: "30px",
    textAlign: "center",
    fontWeight: "bold",
    border: "1px solid #eee",
    ":hover": {
      boxShadow: "inset -1px -1px 2px rgba(0,0,0,0.1)",
      color: "#f36c22",
      borderColor: "#f36c22",
    },
    ":focus": {
      boxShadow: "inset -1px -1px 2px rgba(0,0,0,0.1)",
      color: "#f36c22",
      borderColor: "#f36c22",
    },
  },
  paginationNoSpinner: {
    MozAppearance: "textfield",
  },
  paginationIcon: (backgroundImage: string) => ({
    display: "inline-block",
    backgroundRepeat: "no-repeat",
    backgroundImage,
    verticalAlign: "middle",
  }),
  paginationPrev: {
    width: "6px",
    height: "9px",
    backgroundPosition: "-136px -139px",
    marginRight: "10px",
  },
  paginationPrevOff: {
    backgroundPosition: "-164px -2px",
  },
  paginationNext: {
    width: "6px",
    height: "9px",
    backgroundPosition: "-146px -139px",
    marginLeft: "10px",
  },
  paginationNextOff: {
    backgroundPosition: "-23px -13px",
  },
});
