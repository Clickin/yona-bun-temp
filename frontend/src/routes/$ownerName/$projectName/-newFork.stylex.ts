import * as stylex from "@stylexjs/stylex";

export const forkColors = stylex.defineVars({
  action: "#49afcd",
  helpSurface: "#f5f5f5",
  helpText: "#333333",
  inputBorder: "#cccccc",
  inputText: "#555555",
  labelText: "#333333",
  radioText: "#333333",
  helpInlineText: "#b94a48",
});

export const styles = stylex.create({
  page: { margin: "20px auto 0px", padding: "0px 10px", width: "100%", boxSizing: "border-box" },
  form: { margin: "0px" },
  heading: { paddingTop: "10px" },
  help: {
    backgroundColor: forkColors.helpSurface,
    borderRadius: "4px",
    color: forkColors.helpText,
    marginBottom: "20px",
    padding: "19px",
  },
  helpImage: { border: "1px solid #ddd", padding: "4px", verticalAlign: "middle" },
  helpMessages: { marginLeft: "20px" },
  group: { marginBottom: "20px" },
  label: {
    color: forkColors.labelText,
    display: "inline-block",
    fontWeight: "400",
    marginRight: "20px",
    textAlign: "right",
    verticalAlign: "top",
    width: "140px",
  },
  controls: { display: "inline-block", verticalAlign: "top" },
  input: {
    borderColor: forkColors.inputBorder,
    borderStyle: "solid",
    borderWidth: "1px",
    color: forkColors.inputText,
    padding: "4px",
  },
  action: {
    backgroundColor: forkColors.action,
    borderColor: forkColors.action,
    borderRadius: "4px",
    borderStyle: "solid",
    borderWidth: "1px",
    color: "#fff",
    display: "inline-block",
    padding: "4px 12px",
    textDecoration: "none",
  },
  cancel: { color: "#333", marginLeft: "5px" },
  radio: { color: forkColors.radioText },
  helpInline: { color: forkColors.helpInlineText },
});
