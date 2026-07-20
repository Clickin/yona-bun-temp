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
