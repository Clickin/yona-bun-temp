import * as stylex from "@stylexjs/stylex";

export const postDetailColors = stylex.defineVars({
  action: "#51a351",
  bodyText: "#333333",
  metaText: "#999999",
  surface: "#ffffff",
});

export const styles = stylex.create({
  labelBackground: (backgroundColor: string) => ({ backgroundColor }),
  page: { margin: "20px auto 0px", padding: "0px 10px", width: "100%", boxSizing: "border-box" },
  header: { color: postDetailColors.bodyText },
  body: { color: postDetailColors.bodyText },
  author: { display: "block", margin: "10px 20px" },
  content: { backgroundColor: postDetailColors.surface },
  actions: { margin: "10px 0px", textAlign: "right" },
  comments: {
    clear: "both",
    display: "block",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
  },
  sidebar: { padding: "15px 0px 0px 52px" },
  footer: { fontSize: 0, marginTop: 20, textAlign: "right" },
  watch: {
    backgroundColor: postDetailColors.action,
    borderColor: postDetailColors.action,
    borderRadius: "4px",
    borderStyle: "solid",
    borderWidth: "1px",
    color: "#fff",
    padding: "4px 12px",
  },
  editorTabContent: { overflow: "visible", position: "relative" },
  originalMessageToggle: { border: 0, paddingLeft: 5, paddingRight: 5 },
  deleteModalVisible: { display: "block" },
  commentBodyHidden: { display: "none" },
  commentEditorVisible: { display: "block" },
  tasklistProgress: { width: 0 },
  keymapWrapper: { marginLeft: 55, padding: "10px 0px" },
  mobileMetadata: { fontSize: "0.7em" },
});
