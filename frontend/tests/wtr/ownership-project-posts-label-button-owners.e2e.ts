import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = new URL("../src/routes/$ownerName/$projectName/posts.tsx", import.meta.url);
const styleSource = new URL("../src/app.css", import.meta.url);
const legacySource = new URL(
  "../../yona-original/app/views/board/list.scala.html",
  import.meta.url,
);
const appCssSource = new URL("../src/app.css", import.meta.url);

test("project posts label buttons preserve legacy reset and spacing", async () => {
  const [route, style, legacy, appCss] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacySource, "utf8"),
    readFile(appCssSource, "utf8"),
  ]);
  expect(legacy).toContain("board-labels");
  expect(appCss).toContain(".issue-label.list-label");
  expect(appCss).not.toContain(".post-list-wrap .infos > button.issue-label.list-label");
  // The label button keeps the legacy class string and the shared issueLabelStyle paint
  // inline (parity metrics pin the exact inline declarations in project-posts.e2e.ts);
  // the old route-local Style label keys were retired with the shared IssueLabel move.
  expect(route).toContain('className="label issue-label list-label active"');
  expect(route).toContain("issueLabelStyle(label.color)");
  expect(route).toContain("border: 0");
  expect(style).not.toContain("labelPaint");
  expect(appCss).toContain("padding: 2px 3px");
  expect(appCss).toContain("font-weight: normal");
});
