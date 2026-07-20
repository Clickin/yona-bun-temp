import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("new pull-request form paste-help display is conditional StyleX-owned", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/newPullRequestForm.tsx", "utf8");
  const theme = readFileSync(
    "src/routes/$ownerName/$projectName/-new-pull-request-form.stylex.ts",
    "utf8",
  );
  const template = readFileSync("../yona-original/app/views/git/create.scala.html", "utf8");
  const upload = readFileSync("../yona-original/app/views/common/uploadForm.scala.html", "utf8");
  const routeStyles = readFileSync(
    "src/routes/$ownerName/$projectName/-new-pull-request.stylex.ts",
    "utf8",
  );
  expect(template).toContain("ResourceType.PULL_REQUEST");
  expect(upload).toContain('class="help help-pastable"');
  expect(upload).toContain("common.attach.pastehere");
  expect(upload).toContain('<p class="right-txt help">');
  expect(upload).toContain("common.attach.attachIfYouSave");
  expect(route).toContain('data-stylex-owner="project-new-pull-request-form-paste-help"');
  expect(route).toContain("uploadStyles.pasteHelpVisible");
  expect(route).not.toContain('style={pasteSupported ? { display: "block" } : undefined}');
  expect(theme).toContain('pasteHelpVisible: { display: "block" }');
  expect(routeStyles).toContain("uploadSaveHelp");
  expect(routeStyles).toContain('textAlign: "right"');
  expect(route).toContain('data-stylex-owner="new-pull-request-upload-save-help"');
  expect(route).not.toContain('<p className="right-txt help">');
});

test("new pull-request upload save help keeps legacy right alignment at runtime", async ({
  page,
}) => {
  await page.goto("/admin/sample/newPullRequestForm", { waitUntil: "domcontentloaded" });
  const help = page.locator('[data-stylex-owner="new-pull-request-upload-save-help"]');
  await expect(help).toHaveCount(1);
  await expect(help).toHaveCSS("text-align", "right");
  await expect(help).toContainText("저장");
});
