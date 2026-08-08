import * as stylex from "@stylexjs/stylex";

export const styles = stylex.create({
  errorWrap: { padding: "100px 0px", textAlign: "center" },
  errorIcon: (spriteUrl: string, iconClassName: string) =>
    // Legacy `ico-404` (error/badrequest_default.scala.html:27) has NO sprite
    // rule (_sprites.less defines only .ico-err1/.ico-err2) — the <i> renders
    // unstyled. Only ico-err* get the sprite box.
    iconClassName.includes("ico-err")
      ? {
          backgroundImage: `url(${spriteUrl})`,
          backgroundPosition: iconClassName.includes("ico-err1") ? "-5px -160px" : "-80px -160px",
          backgroundRepeat: "no-repeat",
          display: "inline-block",
          height: iconClassName.includes("ico-err1") ? "82px" : "80px",
          verticalAlign: "middle",
          width: iconClassName.includes("ico-err1") ? "62px" : "50px",
        }
      : {},
  errorMessage: {
    color: "#898989",
    fontSize: "16px",
    fontWeight: "bold",
    margin: "30px 0px",
  },
});
