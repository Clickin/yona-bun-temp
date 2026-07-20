import * as stylex from "@stylexjs/stylex";

// Values mirror the frozen git/edit.scala.html LESS cascade. Only paint values
// that can change with a future theme are variables; layout stays colocated.
export const pullRequestEditColors = stylex.defineVars({
  inputBorder: "#cccccc",
  inputText: "#555555",
  editorBorder: "#dddddd",
  uploadSurface: "#f5f5f5",
  attachmentDivider: "#e0e0e0",
  modalBorder: "#bebebe",
  modalDismiss: "#898989",
  modalDescription: "#555555",
});

export const styles = stylex.create({
  errorWrap: { padding: "100px 0px", textAlign: "center" },
  errorIcon: (backgroundImage: string) => ({
    backgroundImage,
    backgroundPosition: "-80px -160px",
    backgroundRepeat: "no-repeat",
    display: "inline-block",
    height: "80px",
    verticalAlign: "middle",
    width: "50px",
  }),
  errorMessage: {
    color: "#898989",
    fontSize: "16px",
    fontWeight: "bold",
    margin: "30px 0px",
  },
  form: { margin: "0px" },
  selectors: {
    display: "block",
    marginBottom: "20px",
    minHeight: "55px",
    position: "relative",
  },
  fieldTitle: { display: "block", fontWeight: "700" },
  arrow: {
    color: "#7e7e7e",
    fontSize: "32px",
    left: "50%",
    marginLeft: "-16px",
    position: "absolute",
    textAlign: "center",
    top: "20px",
  },
  title: {
    borderColor: pullRequestEditColors.inputBorder,
    borderStyle: "solid",
    borderWidth: "1px",
    color: pullRequestEditColors.inputText,
    width: "97%",
  },
  editorWrap: { position: "relative" },
  editorTabContent: { overflow: "visible", position: "relative" },
  editor: {
    borderColor: pullRequestEditColors.editorBorder,
    borderStyle: "solid",
    borderWidth: "1px",
    height: "300px",
  },
  uploader: {
    backgroundColor: pullRequestEditColors.uploadSurface,
    borderRadius: "5px",
    padding: "10px",
  },
  uploadSaveHelp: { textAlign: "right" },
  attachmentDivider: {
    borderTopColor: pullRequestEditColors.attachmentDivider,
    borderTopStyle: "solid",
    borderTopWidth: "1px",
  },
  actions: { marginTop: "20px", position: "relative", textAlign: "center" },
  mergeResult: { position: "relative" },
  conflictModal: {
    borderColor: pullRequestEditColors.modalBorder,
    borderStyle: "solid",
    borderWidth: "10px",
    display: "block",
    padding: "16px 20px",
    width: "500px",
  },
  conflictDismiss: { color: pullRequestEditColors.modalDismiss },
  conflictDescription: { color: pullRequestEditColors.modalDescription },
  conflictActions: { textAlign: "center" },
});
