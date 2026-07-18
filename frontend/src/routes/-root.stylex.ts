import * as stylex from "@stylexjs/stylex";

export const rootColors = stylex.defineVars({
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
