import * as stylex from "@stylexjs/stylex";

// partial_view_file.scala.html paint tokens; geometry stays in the route styles.
export const codeFileColors = stylex.defineVars({
  metadataText: "#555555",
  markdownBorder: "#cccccc",
  binaryMutedText: "#999999",
});

export const styles = stylex.create({
  fileWrap: {
    display: "block",
    width: "100%",
  },
  fileHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "10px",
    marginBottom: "10px",
  },
  fileInfo: {
    color: codeFileColors.metadataText,
    minWidth: 0,
  },
  fileActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "5px",
    justifyContent: "flex-end",
  },
  imageWrap: {
    padding: "10px",
  },
  image: {
    maxWidth: "100%",
  },
  binaryFile: {
    display: "block",
    width: "100%",
  },
  binarySize: {
    display: "block",
    marginBottom: "20px",
    color: codeFileColors.binaryMutedText,
    fontSize: "13px",
  },
  markdown: {
    border: `1px solid ${codeFileColors.markdownBorder}`,
    borderTop: "none",
    padding: "0 20px 15px 20px",
  },
  code: {
    border: "none",
    margin: "0",
    padding: "0",
    lineHeight: "16px",
  },
});
