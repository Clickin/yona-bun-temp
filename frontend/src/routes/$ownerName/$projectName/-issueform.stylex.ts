import * as stylex from "@stylexjs/stylex";

// Paint-only owners for the frozen issue/create cascade. Layout, editor
// geometry, and type remain in the route and contextual legacy classes.
export const projectIssueFormTheme = stylex.defineVars({
  errorText: "#db3a67",
});

export const issueFormStyles = stylex.create({
  editorTabContent: { position: "relative", overflow: "visible" },
  assigneePicker: { width: "100%" },
  milestonePicker: { width: "100%" },
  labelPicker: { display: "inline-block" },
  labelBackground: (backgroundColor: string) => ({ backgroundColor }),
  uploadProgressBar: (width: string) => ({ width }),
});
