import { expect, test, readFile } from "../wtr-compat.ts";

test.describe("project issue edit form secondary issue number", () => {
  test("owns the legacy secondary-txt color in Style", async () => {
    const appCss = await readFile("src/app.css", "utf8");
    const styleSource = await readFile("src/app.css", "utf8");
    const routeSource = await readFile(
      "src/routes/$ownerName/$projectName/issue/$issueNumber/editform.tsx",
      "utf8",
    );

    expect(appCss).not.toContain(".secondary-txt {");

    expect(routeSource).toContain('data-owner="issue-editform-issue-number"');
  });
});
