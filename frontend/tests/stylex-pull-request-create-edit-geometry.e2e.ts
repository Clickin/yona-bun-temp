import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("pull request create/edit selector geometry uses StyleX", async () => {
  const create = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/newPullRequestForm.tsx", import.meta.url),
    "utf8",
  );
  const edit = readFileSync(
    new URL(
      "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/editform.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const css = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");
  const legacyCreate = readFileSync(
    new URL("../../yona-original/app/views/git/create.scala.html", import.meta.url),
    "utf8",
  );
  const legacyEdit = readFileSync(
    new URL("../../yona-original/app/views/git/edit.scala.html", import.meta.url),
    "utf8",
  );
  const less = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  for (const source of [legacyCreate, legacyEdit]) expect(source).toContain("pull-request-wrap");
  expect(less).toContain(".pull-request-wrap");
  expect(create).toContain('data-stylex-owner="new-pull-request-selectors"');
  expect(create).toContain('data-stylex-owner="new-pull-request-arrow"');
  expect(edit).toContain("stylex.props(sx.selectors)");
  expect(edit).toContain("stylex.props(sx.arrow)");
  expect(css).not.toContain(".pull-request-wrap {");
  expect(css).not.toContain(".pull-request-wrap .field-title {");
  expect(css).not.toContain(".pull-request-wrap .arrow {");
  expect(css).toContain(".pull-request-wrap .select2-container > button.select2-choice");
});
