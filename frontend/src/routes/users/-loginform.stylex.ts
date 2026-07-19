import * as stylex from "@stylexjs/stylex";

export const loginFormColors = stylex.defineVars({
  taglineText: "#7c7c7c",
  titleHighlight: "#ff7332",
  inputBorder: "#cccccc",
  inputFocusBorder: "#f36c22",
});

export const loginProviderStyles = stylex.create({
  titleHighlight: { color: loginFormColors.titleHighlight },
  row: { display: "block", margin: 0, textAlign: "center" },
  titleLine: { marginBottom: "10px", marginTop: "12px" },
  button: { display: "block", marginBottom: "10px", marginTop: "10px" },
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
