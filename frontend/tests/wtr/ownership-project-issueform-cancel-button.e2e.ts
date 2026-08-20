import { readFile, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = new URL("../src/routes/$ownerName/$projectName/issueform.tsx", import.meta.url);
const styleSource = new URL("../src/app.css", import.meta.url);
const legacyView = new URL(
  "../../yona-original/app/views/issue/create.scala.html",
  import.meta.url,
);
const appStyles = new URL("../src/app.css", import.meta.url);

test("issueform cancel button owns scoped Style margin", async () => {
  const [route, style, legacy, css] = await Promise.all([
    readFile(routeSource, "utf8"),
    Promise.resolve(curatedAppCss()),
    readFile(legacyView, "utf8"),
    Promise.resolve(curatedAppCss()),
  ]);
  expect(legacy).toContain(
    'href="javascript:history.back();" class="ybtn">@Messages("button.cancel")</a>',
  );

  expect(route).toContain('data-owner="project-issue-form-cancel-button"');
  expect(route).toContain("ybtn issue-form-cancel");
  expect(css).not.toContain(".issue-form-page-wrap .issue-form-cancel");
});
