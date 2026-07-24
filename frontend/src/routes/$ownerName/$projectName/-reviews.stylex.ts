import * as stylex from "@stylexjs/stylex";

// reviewthread/list.scala.html and git/partial_reviewlist.scala.html paint.
export const reviewsColors = stylex.defineVars({
  border: "#dddddd",
  mutedText: "#666666",
  tabText: "#3592b5",
  titleText: "#333333",
  white: "#ffffff",
  emptyText: "#898989",
});

export const reviewsLayout = stylex.create({
  filters: {
    float: "right",
  },
  exportAction: {
    float: "left",
    padding: "10px",
  },
  reviewTitleWrap: {
    display: "block",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  reviewTitle: { overflowWrap: "normal" },
  emptyState: {
    padding: "100px 0px",
    textAlign: "center",
  },
  emptyIcon: {
    backgroundPosition: "-5px -160px",
    backgroundRepeat: "no-repeat",
    display: "inline-block",
    height: "82px",
    verticalAlign: "middle",
    width: "62px",
  },
  emptyMessage: {
    color: reviewsColors.emptyText,
    fontSize: "16px",
    fontWeight: "700",
    margin: "30px 0px",
  },
});

export const reviewsDynamicStyles = stylex.create({
  emptyIconSprite: (spriteUrl: string) => ({
    backgroundImage: `url(${spriteUrl})`,
  }),
});
