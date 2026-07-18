import * as stylex from "@stylexjs/stylex";

// Frozen `_page.less` / Bootstrap modal paint for the VCS transfer screen.
// Geometry and type remain in the route declarations; these are the only
// values intended to vary with a future dark theme.
export const projectChangeVcsTheme = stylex.defineVars({
  bubbleBackground: "#f7f7f7",
  noticeText: "#db3a67",
  noteText: "#777777",
  bottomBorder: "#e9e9e9",
  modalBackground: "#ffffff",
  backdrop: "rgba(0, 0, 0, 0.8)",
});

export const projectChangeVcsConditionalStyles = stylex.create({
  hidden: { display: "none" },
});
