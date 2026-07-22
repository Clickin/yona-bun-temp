import * as stylex from "@stylexjs/stylex";

// organization/group_board_list.scala.html and board-list paint.
export const organizationBoardsColors = stylex.defineVars({
  border: "#dddddd",
  mutedText: "#666666",
  postIdText: "#999999",
  titleText: "#333333",
});

// Frozen `_page.less` `.error-wrap` and `_sprites.less` `.ico-err1`.
export const organizationBoardsEmptyStyles = stylex.create({
  errorWrap: {
    padding: "100px 0px",
    textAlign: "center",
  },
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
});

// Frozen `_common.less` pagination declarations and `_sprites.less` states.
export const organizationBoardsPaginationStyles = stylex.create({
  paginationWrap: {
    clear: "both",
    margin: "20px 0",
    textAlign: "center",
    width: "100%",
  },
  paginationPageNums: {
    display: "inline-block",
    fontSize: 0,
    listStyle: "none",
    margin: 0,
    marginLeft: "-120px !important",
    padding: 0,
    "@media all and (max-width: 720px)": { marginLeft: "-120px !important" },
  },
  paginationPageNum: {
    color: "#8e9094",
    display: "inline-block",
    fontSize: "12px",
    padding: "0 10px",
  },
  paginationIconPageNum: { padding: "0 5px" },
  paginationIconLabel: { color: "#f36c22", fontSize: "11px" },
  paginationIconLabelOff: { color: "#8e9094" },
  paginationDelimiter: { color: "#ddd", padding: "0 5px" },
  paginationInput: {
    border: "1px solid #eee",
    fontWeight: "bold",
    margin: 0,
    textAlign: "center",
    width: "30px",
    ":hover": {
      borderColor: "#f36c22",
      boxShadow: "inset -1px -1px 2px rgba(0,0,0,0.1)",
      color: "#f36c22",
    },
    ":focus": {
      borderColor: "#f36c22",
      boxShadow: "inset -1px -1px 2px rgba(0,0,0,0.1)",
      color: "#f36c22",
    },
  },
  paginationNoSpinner: { MozAppearance: "textfield" },
  paginationIcon: (backgroundImage: string) => ({
    backgroundImage,
    backgroundRepeat: "no-repeat",
    display: "inline-block",
    verticalAlign: "middle",
  }),
  paginationPrev: {
    backgroundPosition: "-136px -139px",
    height: "9px",
    marginRight: "10px",
    width: "6px",
  },
  paginationPrevOff: { backgroundPosition: "-164px -2px" },
  paginationNext: {
    backgroundPosition: "-146px -139px",
    height: "9px",
    marginLeft: "10px",
    width: "6px",
  },
  paginationNextOff: { backgroundPosition: "-23px -13px" },
});
