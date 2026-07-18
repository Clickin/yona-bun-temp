import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const routeSource = new URL("../src/routes/$ownerName/$projectName/issueform.tsx", import.meta.url);
const styleSource = new URL(
  "../src/routes/$ownerName/$projectName/-issueform.stylex.ts",
  import.meta.url,
);
const legacySource = new URL(
  "../../yona-original/app/views/issue/create.scala.html",
  import.meta.url,
);

test("issue form title suggestion category uses Dynamic StyleX color", async () => {
  const [route, style, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(legacy).toContain("issueForm");
  expect(route).toContain('data-stylex-owner="project-issueform-title-suggestion-category"');
  expect(route).toContain('normalizedColor(suggestion.labelColor ?? "")');
  expect(route).not.toContain('style={{ color: normalizedColor(suggestion.labelColor ?? "") }}');
  expect(style).toContain("labelBackground: (backgroundColor: string)");
});
