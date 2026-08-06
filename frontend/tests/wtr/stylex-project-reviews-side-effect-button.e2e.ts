import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("project reviews sort side-effect button owns reset styles in StyleX", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/reviews.tsx", "utf8");
  const legacy = readFileSync("../yona-original/app/views/reviewthread/list.scala.html", "utf8");
  expect(legacy).toContain("orderBy");
  expect(legacy).toContain("orderDir");
  expect(route).toContain("sideEffectButton: {");
  expect(route).toContain('data-stylex-owner="project-reviews-sort"');
  expect(route).toContain(
    "className={`${stylex.props(styles.sort).className} ${stylex.props(styles.sideEffectButton).className} filter`}",
  );
  expect(route).not.toContain("legacyInlineSideEffectButtonStyle");
});
