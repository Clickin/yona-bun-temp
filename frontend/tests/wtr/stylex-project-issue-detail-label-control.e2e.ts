import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("issue detail label control owns inline-block display in StyleX", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/issue/$issueNumber.tsx", "utf8");
  const theme = readFileSync(
    "src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts",
    "utf8",
  );
  const template = readFileSync("../yona-original/app/views/issue/view.scala.html", "utf8");
  expect(template).toContain("partial_show_selected_label");
  expect(route).toContain('data-stylex-owner="project-issue-detail-label-control"');
  expect(route).not.toContain('style={{ display: "inline-block" }}');
  expect(theme).toContain("labelControl: {");
  expect(theme).toMatch(/labelControl:\s*\{[\s\S]*?display:\s*["']inline-block["']/u);
});
