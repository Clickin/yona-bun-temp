import * as stylex from "@stylexjs/stylex";
import { globalBreakpoints } from "../../../theme.stylex";

export const organizationSettingColors = stylex.defineVars({
  bubbleSurface: "#f7f7f7",
  fieldBorder: "#cccccc",
  logoPoint: "#51aacc",
  saveBorder: "#ff7332",
  saveSurface: "#ff7332",
  saveText: "#ffffff",
  warningText: "#f36c22",
  leftBorder: "#ffffff",
  rightBorder: "#d4d4d4",
});

export const organizationSettingStyles = stylex.create({
  logo: (backgroundImage: string) => ({
    backgroundImage,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    backgroundSize: "cover",
    borderRadius: "10px",
    display: "inline-block",
    width: { default: "260px", [globalBreakpoints.mobile]: "100px" },
    height: { default: "188px", [globalBreakpoints.mobile]: "100px" },
  }),
  settingBox: { float: "left", width: "399px" },
  settingBoxLeft: {
    paddingRight: "20px",
    borderRightStyle: "solid",
    borderRightWidth: "1px",
    borderRightColor: organizationSettingColors.leftBorder,
  },
  settingBoxRight: {
    paddingLeft: { default: "20px", [globalBreakpoints.mobile]: "0px" },
    borderLeftStyle: { default: "solid", [globalBreakpoints.mobile]: "none" },
    borderLeftWidth: { default: "1px", [globalBreakpoints.mobile]: "0px" },
    borderLeftColor: organizationSettingColors.rightBorder,
  },
  logoDesc: {
    display: "inline-block",
    width: "120px",
    fontSize: "12px",
    marginLeft: "10px",
    verticalAlign: "top",
  },
  point: {
    color: organizationSettingColors.logoPoint,
    fontWeight: "bold",
    textTransform: "uppercase",
    display: "block",
    clear: "both",
  },
  descsItem: { marginTop: "10px" },
  descsLast: { marginTop: "25px" },
  fieldGeometry: { width: "380px" },
  textareaGeometry: {
    width: { default: "380px", [globalBreakpoints.mobile]: "inherit" },
    height: "80px",
    marginBottom: "0px",
    resize: "vertical",
  },
  topBox: { paddingTop: "20px" },
});
