import * as stylex from "@stylexjs/stylex";

export const rootColors = stylex.defineVars({
  grayText: "#ccc",
  loginDialogBorder: "rgba(0, 0, 0, 0.3)",
  loginDialogShadow: "0 3px 7px rgba(0, 0, 0, 0.3)",
  loginDialogSurface: "#ffffff",
  toastText: "#000000",
  toastSurface: "#cddc39",
  toastShadow: "1px 1px 3px #000000",
  errorText: "#e74c3c",
});

export const rootProviderStyles = stylex.create({
  logo: { fontFamily: "Roboto, sans-serif" },
  logoSvg: { verticalAlign: "middle" },
  github: {
    display: "inline-block",
    marginBottom: "3px",
    marginLeft: "-4px",
    marginTop: "3px",
    width: "30px",
  },
});

// Frozen notfound_default.scala.html + yobi.less/_page.less/_sprites.less.
export const rootNotFoundStyles = stylex.create({
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
