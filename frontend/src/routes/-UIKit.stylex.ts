import * as stylex from "@stylexjs/stylex";

export const styles = stylex.create({
  issueLabelBackground: (backgroundColor: string) => ({ backgroundColor }),
  issueLabelText: { color: "#fff" },
  // Mirrors yobi.OriginalMessage.js's generated original-message toggle.
  originalMessageToggle: {
    borderStyle: "none",
    borderWidth: 0,
    paddingLeft: 5,
    paddingRight: 5,
  },
  // Mirrors legacy bootstrap `.dropdown-menu > li > a` (bootstrap.css:2899);
  // menu buttons otherwise inherit `.btn-group` font-size:0 and become unclickable.
  dropdownMenuButton: {
    display: "block",
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 20,
    paddingRight: 20,
    fontSize: 14,
    lineHeight: "20px",
    color: "#333",
    whiteSpace: "nowrap",
    background: "none",
    border: 0,
    width: "100%",
    textAlign: "left",
  },
});
