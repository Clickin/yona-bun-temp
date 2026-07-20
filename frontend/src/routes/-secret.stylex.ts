import * as stylex from "@stylexjs/stylex";

// Frozen paint evidence: welcome/secret.scala.html inline logo and _page.less form paint.
export const secretTheme = stylex.defineVars({
  logoText: "#ffffff",
  logoSurface: "#f36c22",
  fieldBorder: "#cccccc",
  fieldFocusBorder: "#f36c22",
});

export const secretNotFoundStyles = stylex.create({
  errorWrap: { padding: "100px 0px", textAlign: "center" },
  errorIcon: (spriteUrl: string) => ({
    backgroundImage: `url(${spriteUrl})`,
    backgroundPosition: "-80px -160px",
    backgroundRepeat: "no-repeat",
    display: "inline-block",
    height: "80px",
    verticalAlign: "middle",
    width: "50px",
  }),
  errorMessage: {
    color: "#898989",
    fontSize: "16px",
    fontWeight: "bold",
    margin: "30px 0px",
  },
});
