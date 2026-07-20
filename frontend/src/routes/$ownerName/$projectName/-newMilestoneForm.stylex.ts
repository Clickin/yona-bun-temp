import * as stylex from "@stylexjs/stylex";

// milestone/create.scala.html and frozen Bootstrap/Yobi form paint.
export const newMilestoneColors = stylex.defineVars({
  actionInfo: "#49afcd",
  actionInfoBorder: "#2f96b4",
  actionSuccess: "#5bb75b",
  actionSuccessBorder: "#51a351",
  fieldBorder: "#cccccc",
  fieldFocus: "rgba(82, 168, 236, 0.8)",
  mutedText: "#666666",
  notice: "#db3a67",
});

export const newMilestoneFormStyles = stylex.create({
  actions: { textAlign: "right" },
  editorPositioned: { position: "relative" },
  editorTabContent: { overflow: "visible", position: "relative" },
  pasteHelpVisible: { display: "block" },
});
