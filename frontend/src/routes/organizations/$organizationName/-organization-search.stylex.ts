import * as stylex from "@stylexjs/stylex";

// group_issue_search_partial.scala.html paint tokens only.
export const organizationSearchColors = stylex.defineVars({
  mutedText: "#777777",
  activeText: "#337581",
  emptySurface: "#f7f7f7",
});

export const styles = stylex.create({
  page: { minHeight: "100%" },
  category: { color: organizationSearchColors.mutedText },
  activeCategory: { color: organizationSearchColors.activeText },
  searchBox: { minWidth: 0 },
  result: { minWidth: 0 },
  list: { minWidth: 0 },
  empty: { backgroundColor: organizationSearchColors.emptySurface },
});
