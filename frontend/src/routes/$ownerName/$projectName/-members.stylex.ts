import * as stylex from "@stylexjs/stylex";
import { globalBreakpoints } from "../../../theme.stylex";

// Frozen paint evidence: _yobiUI.less `.avatar-wrap` and
// _page.less `.members.project .member .member-id`.
export const projectMembersTheme = stylex.defineVars({
  avatarSurface: "#dddddd",
  memberIdText: "#cccccc",
  rowBorder: "#dddddd",
});

export const projectMembersStyles = stylex.create({
  // Frozen _page.less `.inner-bubble` declarations for the add-member form.
  addMemberBubble: {
    marginBottom: "10px",
    position: "relative",
  },
  // Frozen _page.less `.inner-bubble .text.uname` plus _responsive.less mobile cascade.
  addMemberInput: {
    borderRadius: "2px",
    margin: "0px",
    width: {
      default: "384px",
      [globalBreakpoints.mobile]: "inherit",
    },
  },
  errorWrap: {
    padding: "100px 0px",
    textAlign: "center",
  },
  errorIcon: (spriteUrl: string) => ({
    backgroundImage: `url(${spriteUrl})`,
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
});
