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
  existingLink: "#f36c22",
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
  existing: { marginLeft: "10px", textAlign: "center" },
  existingMessage: { fontSize: "120%" },
  existingRow: { textAlign: "center" },
  existingIcon: { display: "inline-block" },
  existingSource: { verticalAlign: "middle" },
  existingArrow: { display: "inline-block", verticalAlign: "middle" },
  existingLink: { color: forkColors.existingLink, verticalAlign: "middle" },
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
  // F7 app-fix: legacy fork.scala.html:59 renders the cancel anchor as a plain
  // .ybtn (margin 0 in the dist port); the 5px margin was app-only and pushed
  // cancelGap 4 -> 9 (_yobiUI.less:733 .ybtn margin-left:.3em is not ported).
  cancel: { color: "#333" },
  // F7 app-fix: legacy .radio-btn { margin: 2px !important } (_common.less:178-180)
  // overrides the UA radio margin; the dist port omits it so pin it here.
  radio: { color: forkColors.radioText, margin: "2px" },
  helpInline: { color: forkColors.helpInlineText },
  // F7 app-fix: legacy clone.scala.html progress screen geometry — .page-wrap-outer
  // min-height:450px + margin-top:10px (_page.less:617-620), responsive
  // padding:0 10px / .project-page-wrap margin-top:5px !important
  // (_responsive.less:612-619), and bootstrap legend (bootstrap.css:989-1000).
  clonePage: {
    boxSizing: "border-box",
    marginTop: "10px",
    minHeight: "450px",
    padding: "0px 10px",
    width: "100%",
  },
  cloneProjectPage: { marginTop: "5px", width: "100%" },
  cloneLegend: {
    border: "0px",
    borderBottomColor: "#e5e5e5",
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    color: "#333333",
    display: "block",
    fontSize: "21px",
    lineHeight: "40px",
    marginBottom: "20px",
    padding: "0px",
    width: "100%",
  },
});
