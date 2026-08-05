import * as stylex from "@stylexjs/stylex";

// Value-identical on both legacy sources: organization/members.scala.html and
// project/members.scala.html enrolled-user cells (frozen LESS cascade).
export const enrollmentAvatarWrap = stylex.create({
  root: {
    float: "left",
    marginRight: "10px",
  },
});

export const enrollmentDetails = stylex.create({
  root: {
    float: "left",
    width: "60px",
  },
});
