import * as stylex from "@stylexjs/stylex";

export const postDetailColors = stylex.defineVars({
  action: "#51a351",
  bodyText: "#333333",
  metaText: "#999999",
  surface: "#ffffff",
});

export const styles = stylex.create({
  page: { margin: "20px auto 0px", padding: "0px 10px", width: "100%", boxSizing: "border-box" },
  header: { color: postDetailColors.bodyText },
  body: { color: postDetailColors.bodyText },
  content: { backgroundColor: postDetailColors.surface },
  actions: { margin: "10px 0px", textAlign: "right" },
  watch: {
    backgroundColor: postDetailColors.action,
    borderColor: postDetailColors.action,
    borderRadius: "4px",
    borderStyle: "solid",
    borderWidth: "1px",
    color: "#fff",
    padding: "4px 12px",
  },
});
