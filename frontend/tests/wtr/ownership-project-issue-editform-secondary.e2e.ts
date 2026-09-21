import { expect, test, readFile, curatedAppCss } from "../wtr-compat.ts";
test.describe("project issue edit form secondary issue number", () => {
  test("owns the legacy secondary-txt color in Style", async () => {
    const appCss = await Promise.resolve(curatedAppCss());
    const _styleSource = await Promise.resolve(curatedAppCss());
    const routeSource = await readFile(
      "src/routes/$ownerName/$projectName/issue/$issueNumber/editform.tsx",
      "utf8",
    );

    expect(appCss).not.toContain(".secondary-txt {");

    expect(routeSource).toContain('data-owner="issue-editform-issue-number"');
  });
});
