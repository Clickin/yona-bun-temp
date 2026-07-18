import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const routeSource = new URL("../src/routes/$ownerName/$projectName/issueform.tsx", import.meta.url);
const styleSource = new URL(
  "../src/routes/$ownerName/$projectName/-issueform.stylex.ts",
  import.meta.url,
);
const legacyView = new URL(
  "../../yona-original/app/views/issue/create.scala.html",
  import.meta.url,
);
const appStyles = new URL("../src/app.css", import.meta.url);

test("issueform cancel button owns scoped StyleX margin", async () => {
  const [route, style, legacy, css] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacyView, "utf8"),
    readFile(appStyles, "utf8"),
  ]);
  expect(legacy).toContain(
    'href="javascript:history.back();" class="ybtn">@Messages("button.cancel")</a>',
  );
  expect(style).toContain("cancelButton");
  expect(style).toContain('marginLeft: "0px"');
  expect(route).toContain('data-stylex-owner="project-issue-form-cancel-button"');
  expect(route).toContain("ybtn issue-form-cancel");
  expect(css).not.toContain(".issue-form-page-wrap .issue-form-cancel");
});
