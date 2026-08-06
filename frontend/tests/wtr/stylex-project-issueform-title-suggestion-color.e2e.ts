import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = "../src/routes/$ownerName/$projectName/issueform.tsx";
const styleSource = "../src/routes/$ownerName/$projectName/-issueform.stylex.ts";
const legacySource = "../yona-original/app/views/issue/create.scala.html";

test("issue form title suggestion category uses Dynamic StyleX color", async () => {
  const [route, style, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(legacy).toContain("issueForm");
  expect(route).toContain('data-stylex-owner="project-issue-form-title-suggestion-category"');
  expect(route).toContain('normalizedColor(suggestion.labelColor ?? "")');
  expect(route).not.toContain('style={{ color: normalizedColor(suggestion.labelColor ?? "") }}');
  expect(style).toContain("labelBackground: (backgroundColor: string)");
});
