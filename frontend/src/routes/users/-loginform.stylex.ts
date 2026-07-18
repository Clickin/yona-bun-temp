import * as stylex from "@stylexjs/stylex";

export const loginFormColors = stylex.defineVars({
  taglineText: "#7c7c7c",
  inputBorder: "#cccccc",
  inputFocusBorder: "#f36c22",
});

export const loginProviderStyles = stylex.create({
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
