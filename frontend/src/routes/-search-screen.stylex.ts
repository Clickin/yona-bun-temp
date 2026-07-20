import * as stylex from "@stylexjs/stylex";

export const styles = stylex.create({
  errorWrap: { padding: "100px 0px", textAlign: "center" },
  errorIcon: (spriteUrl: string, iconClassName: string) => ({
    backgroundImage: `url(${spriteUrl})`,
    backgroundPosition: iconClassName.includes("ico-err1") ? "-5px -160px" : "-80px -160px",
    backgroundRepeat: "no-repeat",
    display: "inline-block",
    height: iconClassName.includes("ico-err1") ? "82px" : "80px",
    verticalAlign: "middle",
    width: iconClassName.includes("ico-err1") ? "62px" : "50px",
  }),
  errorMessage: {
    color: "#898989",
    fontSize: "16px",
    fontWeight: "bold",
    margin: "30px 0px",
  },
});
