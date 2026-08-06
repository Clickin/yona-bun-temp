import { expect, test } from "../wtr-compat.ts";
import { readFile } from "../wtr-compat.ts";

test("issueform error states share route-local StyleX geometry", async () => {
  const source = await readFile(
    new URL("../src/routes/$ownerName/$projectName/issueform.tsx", import.meta.url),
    "utf8",
  );
  const appCss = await readFile(new URL("../src/app.css", import.meta.url), "utf8");
  const legacy = await readFile(
    new URL("../../yona-original/app/views/issue/create.scala.html", import.meta.url),
    "utf8",
  );
  expect(legacy).toContain("error");
  expect(source).toContain("issue-form-load-error");
  expect(source).toContain('data-stylex-owner="project-issue-form-load-error"');
  expect(source).toContain('data-stylex-owner="project-issue-form-error"');
  expect(source).toContain('clear: "both"');
  expect(source).toContain('marginTop: "10px"');
  expect(source).toContain('fontWeight: "700"');
  expect(appCss).not.toContain(".issue-form-load-error");
  expect(appCss).not.toContain(".issue-form-page-wrap .issue-form-error");
});
