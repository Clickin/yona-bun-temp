import * as stylex from "@stylexjs/stylex";

export const settingFormColors = stylex.defineVars({
  mutedText: "#777777",
  accentText: "#337581",
});

export const styles = stylex.create({
  pageWrapOuter: {
    minHeight: "450px",
    marginTop: "10px",
    minWidth: "1100px",
    padding: "0px !important",
  },
  projectPageWrap: {
    marginLeft: "auto",
    marginRight: "auto",
    marginTop: "20px !important",
    width: "100% !important",
    "@media (max-width: 900px)": {
      marginTop: "5px !important",
      width: "100% !important",
    },
  },
});
