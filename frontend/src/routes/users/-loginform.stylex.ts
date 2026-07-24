import * as stylex from "@stylexjs/stylex";

export const loginFormColors = stylex.defineVars({
  taglineText: "#7c7c7c",
  titleHighlight: "#ff7332",
  inputBorder: "#cccccc",
  inputFocusBorder: "#f36c22",
});

export const loginFormStyles = stylex.create({
  taglineWrap: {
    textAlign: "center",
    marginTop: "0px",
    marginBottom: "26px",
    paddingTop: "80px",
  },
  title: {
    display: "inline-block",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
    fontSize: "3.3em",
    lineHeight: "42px",
    fontWeight: "400",
  },
  tagline: {
    marginTop: "10px",
    fontSize: "1.2em",
    color: loginFormColors.taglineText,
  },
  formWrap: {
    position: "relative",
    width: {
      default: "400px",
      "@media (max-width: 767px)": "95%",
    },
    margin: "54px auto 0px",
  },
  formList: {
    margin: "0px",
    padding: "0px",
  },
  textInput: {
    width: {
      default: "386px",
      "@media (max-width: 767px)": "95%",
    },
    height: "27px",
    marginBottom: "10px",
    fontSize: "12px",
    fontWeight: "700",
    borderStyle: "none",
    borderBottomColor: loginFormColors.inputBorder,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    borderRadius: "0px",
    ":focus": {
      borderBottomColor: loginFormColors.inputFocusBorder,
      outline: "none",
      boxShadow: "none",
    },
  },
  passwordInput: {
    marginBottom: "15px",
  },
  buttonRow: {
    display: "block",
    textAlign: "center",
    margin: "0px auto 20px",
  },
  submit: {
    display: "block",
    boxSizing: "border-box",
    width: "100%",
  },
  rememberMe: {
    float: "left",
    marginTop: "0px",
  },
  linksWrap: {
    float: "right",
  },
  checkbox: {
    marginLeft: "0px",
    marginTop: "4px",
  },
  actionRow: {
    lineHeight: "22px",
    overflow: "auto",
  },
  verificationHelp: {
    fontWeight: "700",
    padding: "5px",
    marginBottom: "10px",
    fontSize: "16px",
  },
});

export const loginProviderStyles = stylex.create({
  titleHighlight: { color: loginFormColors.titleHighlight },
  row: { display: "block", margin: "0px", textAlign: "center" },
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
