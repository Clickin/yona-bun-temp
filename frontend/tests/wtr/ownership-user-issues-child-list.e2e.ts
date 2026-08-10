import { readFile } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("user issues owns the visible child-issue list state in Style", () => {
  const route = readFileSync("src/routes/user/issues.tsx", "utf8");
  const style =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const listTemplate = readFileSync(
    "../yona-original/app/views/issue/my_partial_list.scala.html",
    "utf8",
  );

  expect(listTemplate).toContain('<div class="child-issue-list hide">');
  expect(route).toContain('data-owner="user-issues-child-list-visible"');
});
