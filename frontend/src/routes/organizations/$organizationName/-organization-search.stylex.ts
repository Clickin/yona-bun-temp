import * as stylex from "@stylexjs/stylex";

// Frozen paint values from _temporary.less:33-51 and _page.less:6375-6519.
export const organizationSearchColors = stylex.defineVars({
  activeCategorySurface: "#51aacc",
  activeCategoryText: "#ffffff",
  avatarBorder: "#ececec",
  border: "#dddddd",
  emptyCategoryText: "#d3d2d3",
  keywordSurface: "#6bc4e9",
  linkText: "#3592b5",
  metaText: "#999999",
  resultAccent: "#f36c22",
  titleText: "#333333",
});

export const styles = stylex.create({
  page: { minHeight: "100%" },
  category: { minWidth: 0 },
  categoryList: {
    boxSizing: "border-box",
    listStyleType: "none",
    marginLeft: 0,
  },
  categoryItem: {
    fontSize: "13px",
    fontWeight: "bold",
    padding: "8px",
  },
  categoryItemActive: {
    backgroundColor: organizationSearchColors.activeCategorySurface,
    borderRadius: "6px",
    color: organizationSearchColors.activeCategoryText,
    overflow: "auto",
  },
  categoryAction: {
    backgroundColor: "transparent",
    borderStyle: "none",
    boxSizing: "border-box",
    color: "inherit",
    cursor: "pointer",
    display: "block",
    font: "inherit",
    margin: 0,
    overflow: "visible",
    padding: 0,
    textAlign: "left",
    width: "100%",
  },
  categoryActionEmpty: {
    color: organizationSearchColors.emptyCategoryText,
  },
  categoryBadgeActive: {
    color: organizationSearchColors.activeCategoryText,
  },
  searchBox: {
    borderBottomColor: organizationSearchColors.border,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    minWidth: 0,
    paddingBottom: "15px",
  },
  resultTitle: {
    fontSize: "16px",
    fontWeight: "normal",
    marginTop: "15px",
    paddingBottom: 0,
    paddingLeft: "15px",
    paddingRight: "15px",
    paddingTop: 0,
  },
  resultTitleStrong: { color: organizationSearchColors.resultAccent },
  result: { minWidth: 0 },
  list: {
    display: "block",
    listStyle: "none",
  },
  resultItem: {
    borderBottomColor: organizationSearchColors.border,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    display: "block",
    float: "none",
    margin: 0,
    padding: "15px",
    position: "relative",
  },
  resultItemProject: {
    paddingBottom: "15px",
    paddingLeft: "60px",
    paddingRight: "15px",
    paddingTop: "15px",
  },
  avatar: {
    borderColor: organizationSearchColors.avatarBorder,
    borderStyle: "solid",
    borderWidth: "1px",
    float: "left",
    height: "40px",
    marginLeft: "-55px",
    width: "40px",
  },
  avatarImage: {
    borderStyle: "none",
    height: "100%",
    verticalAlign: "top",
    width: "100%",
  },
  titleWrap: {
    fontSize: "16px",
    fontWeight: "bold",
    lineHeight: "30px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  postId: {
    color: organizationSearchColors.metaText,
    fontWeight: "normal",
  },
  title: {
    color: organizationSearchColors.titleText,
  },
  content: {
    display: "block",
    fontSize: "14px",
    paddingLeft: "20px",
  },
  contentNoPadding: {
    paddingLeft: "0px",
  },
  contentBody: {
    display: "block",
  },
  meta: {
    color: organizationSearchColors.metaText,
    fontSize: "13px",
    marginTop: "10px",
    paddingLeft: "20px",
  },
  metaNoPadding: {
    paddingLeft: "0px",
  },
  metaItem: {
    lineHeight: "20px",
    marginRight: "10px",
  },
  projectLink: {
    ":hover": { color: organizationSearchColors.linkText },
  },
  userLink: {
    color: organizationSearchColors.linkText,
    fontWeight: "bold",
  },
  keyword: {
    backgroundColor: organizationSearchColors.keywordSurface,
    padding: "2px",
  },
  empty: {
    backgroundPosition: "center 50%",
    backgroundRepeat: "no-repeat",
    marginBottom: "20px",
    marginTop: "20px",
    minHeight: "250px",
    paddingBottom: 0,
    paddingLeft: "20px",
    paddingRight: "20px",
    paddingTop: 0,
    textAlign: "center",
  },
});
