import * as stylex from "@stylexjs/stylex";

// Paint-only owners for the frozen issue/create cascade. Layout, editor
// geometry, and type remain in the route and contextual legacy classes.
export const projectIssueFormTheme = stylex.defineVars({
  errorText: "#db3a67",
});

export const issueFormStyles = stylex.create({
  editorTabContent: { position: "relative", overflow: "visible" },
  editorTextarea: {
    overflow: "hidden",
    overflowWrap: "break-word",
    resize: "none",
  },
  editorTextareaHeight: (height: string) => ({ height }),
  assigneePicker: { width: "100%" },
  milestonePicker: { width: "100%" },
  labelPicker: { display: "inline-block" },
  labelBackground: (backgroundColor: string) => ({ backgroundColor }),
  uploadProgress: {
    backgroundColor: "#f0f0f0",
    boxShadow: "inset 0 1px 1px rgb(0 0 0 / 25%)",
    display: "inline-block",
    height: "7px",
    margin: "0",
    overflow: "hidden",
    verticalAlign: "middle",
    width: "100px",
  },
  uploadProgressBar: (width: string) => ({
    backgroundColor: "#f36c22",
    display: "block",
    height: "100%",
    width,
  }),
  mentionMirrorTransform: (transform: string) => ({ transform }),
  mentionPopupPosition: (left: number, top: number) => ({ left, top }),
});
