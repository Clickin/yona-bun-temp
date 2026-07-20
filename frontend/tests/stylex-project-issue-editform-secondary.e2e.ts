import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

test.describe("project issue edit form secondary issue number", () => {
  test("owns the legacy secondary-txt color in StyleX", async () => {
    const appCss = await readFile(resolve(ROOT, "src/app.css"), "utf8");
    const styleSource = await readFile(
      resolve(
        ROOT,
        "src/routes/$ownerName/$projectName/issue/$issueNumber/-issue-editform.stylex.ts",
      ),
      "utf8",
    );
    const routeSource = await readFile(
      resolve(ROOT, "src/routes/$ownerName/$projectName/issue/$issueNumber/editform.tsx"),
      "utf8",
    );

    expect(appCss).not.toContain(".secondary-txt {");
    expect(styleSource).toContain('issueNumber: "#51aacc"');
    expect(styleSource).toContain("issueNumber: { color: issueEditColors.issueNumber }");
    expect(routeSource).toContain('data-stylex-owner="issue-editform-issue-number"');
    expect(routeSource).not.toContain('className="secondary-txt"');
  });
});
