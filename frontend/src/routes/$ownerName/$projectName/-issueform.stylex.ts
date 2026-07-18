import * as stylex from "@stylexjs/stylex";

// Paint-only owners for the frozen issue/create cascade. Layout, editor
// geometry, and type remain in the route and contextual legacy classes.
export const projectIssueFormTheme = stylex.defineVars({
  errorText: "#db3a67",
});

export const issueFormStyles = stylex.create({
  editorTabContent: { position: "relative", overflow: "visible" },
  markdownTab: {
    display: "block",
    boxSizing: "border-box",
    minHeight: "29px",
    padding: "4px 15px",
    marginRight: "2px",
    color: "#3592b5",
    font: "inherit",
    fontWeight: "bold",
    lineHeight: "20px",
    cursor: "pointer",
    appearance: "none",
    backgroundColor: "transparent",
    border: "1px solid transparent",
    borderRadius: "4px 4px 0 0",
  },
  markdownTabActive: {
    color: "#555",
    cursor: "default",
    backgroundColor: "#fff",
    borderColor: "#ddd #ddd transparent",
  },
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
