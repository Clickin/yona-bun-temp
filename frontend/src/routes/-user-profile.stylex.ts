import * as stylex from "@stylexjs/stylex";

export const userProfileColors = stylex.defineVars({
  mutedText: "#777777",
  accentText: "#337581",
  statusText: "#ffffff",
});

export const styles = stylex.create({
  // Legacy user/view.scala.html renders the API-provided avatar as a background image.
  avatarBackground: (backgroundImage: string) => ({ backgroundImage }),
  profile: { color: userProfileColors.mutedText },
  info: { color: userProfileColors.accentText },
  stream: { minWidth: 0 },
  tabs: { color: userProfileColors.accentText },
  // Legacy user/view.scala.html daysAgoBtn inline declaration.
  daysAgoInput: {
    margin: "0px 5px",
    verticalAlign: "bottom",
  },
  // Legacy user/partial_projectlist.scala.html project info wrapper spacing.
  projectInfo: {
    marginLeft: "10px",
  },
  projectRow: {
    borderBottom: "1px solid #dcdcdc",
    overflow: "hidden",
    padding: "15px 0px 10px",
  },
  projectHeader: {
    fontSize: "20px",
    fontWeight: "700",
    marginBottom: "5px",
    marginLeft: "10px",
  },
  projectDescription: {
    color: "#bababa",
    marginLeft: "10px",
    maxHeight: "100px",
    maxWidth: "647px",
    overflowY: "auto",
    textOverflow: "ellipsis",
  },
  projectNameTag: {
    color: "#999999",
    fontSize: "11px",
    marginLeft: "10px",
  },
  projectStats: {
    marginTop: "0px",
    textAlign: "right",
  },
  // Legacy user/view.scala.html partial_issues subtask progress width.
  progressBar: (width: string) => ({ width }),
  // Legacy user/partial_issues.scala.html paints each API-provided label color.
  issueLabelBackground: (backgroundColor: string) => ({ backgroundColor }),
  // Legacy common/twoColumnModeCheckboxArea.scala.html and showSubtasksCheckbox.scala.html
  // require a positioned anchor for the React-owned popover.
  popoverAnchor: { position: "relative" },
});
