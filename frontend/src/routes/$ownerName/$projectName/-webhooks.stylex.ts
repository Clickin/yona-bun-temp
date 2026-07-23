import * as stylex from "@stylexjs/stylex";

// project/webhooks.scala.html and frozen Bootstrap/Yobi webhook-editor paint.
export const webhooksColors = stylex.defineVars({
  actionBorder: "#0044cc",
  actionPrimary: "#006dcc",
  border: "#dddddd",
  fieldBorder: "#cccccc",
  listSurface: "#fafafa",
  mutedText: "#666666",
  white: "#ffffff",
});

export const webhooksStyles = stylex.create({
  // Frozen `_page.less` `.error-wrap` and `_sprites.less` `.ico-err1` empty-state paint.
  errorWrap: { padding: "100px 0px", textAlign: "center" },
  errorIcon: (spriteUrl: string) => ({
    backgroundImage: `url(${spriteUrl})`,
    backgroundPosition: "-5px -160px",
    backgroundRepeat: "no-repeat",
    display: "inline-block",
    height: "82px",
    verticalAlign: "middle",
    width: "62px",
  }),
  errorMessage: {
    color: "#898989",
    fontSize: "16px",
    fontWeight: "bold",
    margin: "30px 0px",
  },
  listItemHeading: { paddingLeft: "8px" },
  payloadHeading: { marginRight: "20px" },
  truncate: {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  codeMenuHidden: { display: "none" },
});
