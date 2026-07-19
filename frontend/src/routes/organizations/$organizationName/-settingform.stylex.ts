import * as stylex from "@stylexjs/stylex";

export const organizationSettingColors = stylex.defineVars({
  bubbleSurface: "#f7f7f7",
  fieldBorder: "#cccccc",
  logoPoint: "#51aacc",
  saveBorder: "#ff7332",
  saveSurface: "#ff7332",
  saveText: "#ffffff",
  warningText: "#f36c22",
});

export const organizationSettingStyles = stylex.create({
  logo: (backgroundImage: string) => ({
    backgroundImage,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    backgroundSize: "cover",
    borderRadius: "10px",
    display: "inline-block",
    width: "260px",
    height: "188px",
  }),
  settingBox: { float: "left", width: "399px" },
  settingBoxLeft: { paddingRight: "20px", borderRight: "1px solid #ffffff" },
  settingBoxRight: { paddingLeft: "20px", borderLeft: "1px solid #d4d4d4" },
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
  textareaGeometry: { width: "380px", height: "80px", marginBottom: "0px", resize: "vertical" },
  topBox: { paddingTop: "20px" },
});
