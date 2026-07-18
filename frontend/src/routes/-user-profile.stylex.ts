import * as stylex from "@stylexjs/stylex";

export const userProfileColors = stylex.defineVars({
  mutedText: "#777777",
  accentText: "#337581",
  statusText: "#ffffff",
});

export const styles = stylex.create({
  profile: { color: userProfileColors.mutedText },
  info: { color: userProfileColors.accentText },
  stream: { minWidth: 0 },
  tabs: { color: userProfileColors.accentText },
  // Legacy user/view.scala.html daysAgoBtn inline declaration.
  daysAgoInput: {
    margin: "0px 5px",
    verticalAlign: "bottom",
  },
  // Legacy user/view.scala.html partial_issues subtask progress width.
  progressBar: (width: string) => ({ width }),
});
