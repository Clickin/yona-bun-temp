import * as stylex from "@stylexjs/stylex";

// user/userFiles.scala.html search paint only. Geometry and type stay in the route.
export const userFilesSearchColors = stylex.defineVars({
  actionSurface: "transparent",
  actionText: "#000000",
  inputSurface: "#ffffff",
  inputText: "#555555",
  rootBorder: "#cccccc",
  rootSurface: "#ffffff",
});

// user/userFiles.scala.html + frozen _page.less:7064-7143 paint only.
// Layout/type declarations stay in these route-local StyleX owners rather than theme vars.
export const userFilesColors = stylex.defineVars({
  filesText: "gray",
  headerSurface: "#f1f1f1",
  rowBorder: "#ffffff",
  rowDivider: "#eeeeee",
  rowHoverBorder: "#10a2e4",
  rowNameText: "#000000",
});

export const userFilesStyles = stylex.create({
  files: {
    color: userFilesColors.filesText,
  },
  header: {
    backgroundColor: userFilesColors.headerSurface,
    borderRadius: "5px",
    fontSize: "16px",
    fontWeight: "bold",
    marginBottom: "10px",
    marginLeft: "auto",
    padding: "10px 5px",
    textAlign: "center",
  },
  headerPreview: {
    marginLeft: "auto",
  },
  headerFileName: {
    maxWidth: "200px",
    textAlign: "center",
  },
  headerSize: {
    display: "block",
    maxWidth: "80px",
    textAlign: "right",
  },
  headerLocation: {
    textAlign: "center",
  },
  row: {
    borderBottomColor: userFilesColors.rowDivider,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    borderColor: userFilesColors.rowBorder,
    borderStyle: "solid",
    borderWidth: "1px",
    fontFamily: "Monaco, Menlo, Consolas, 'Courier New', monospace",
    lineHeight: "30px",
    marginLeft: "auto",
    padding: "5px",
  },
  rowHovered: {
    borderBottomColor: userFilesColors.rowHoverBorder,
    borderColor: userFilesColors.rowHoverBorder,
  },
  preview: {
    maxHeight: "40px",
    marginLeft: "auto",
    overflow: "hidden",
  },
  previewImage: {
    boxSizing: "border-box",
    maxWidth: "40px",
  },
  fileName: {
    color: userFilesColors.rowNameText,
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontSize: "14px",
    fontWeight: "bold",
    maxWidth: "200px",
    wordBreak: "break-all",
  },
  fileIcon: {
    "::before": {
      paddingRight: "5px",
    },
  },
  fileSize: {
    fontSize: "12px",
    maxWidth: "80px",
    textAlign: "right",
  },
  fileDownload: {
    fontSize: "16px",
    textAlign: "center",
  },
  fileDate: {
    display: "block",
    fontSize: "11px",
    textAlign: "right",
  },
  fileLocation: {
    display: "block",
    fontSize: "12px",
    overflow: "hidden",
    textAlign: "left",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
});
