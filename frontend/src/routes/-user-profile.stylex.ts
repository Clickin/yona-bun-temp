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
  // Legacy user/view.scala.html partial_issues subtask progress width.
  progressBar: (width: string) => ({ width }),
  // Legacy user/partial_issues.scala.html paints each API-provided label color.
  issueLabelBackground: (backgroundColor: string) => ({ backgroundColor }),
});
