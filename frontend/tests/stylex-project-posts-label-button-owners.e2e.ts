import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const routeSource = new URL("../src/routes/$ownerName/$projectName/posts.tsx", import.meta.url);
const styleSource = new URL(
  "../src/routes/$ownerName/$projectName/-posts.stylex.ts",
  import.meta.url,
);
const legacySource = new URL(
  "../../yona-original/app/views/board/list.scala.html",
  import.meta.url,
);
const appCssSource = new URL("../src/app.css", import.meta.url);

test("project posts label buttons preserve legacy reset and spacing in StyleX", async () => {
  const [route, style, legacy, appCss] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacySource, "utf8"),
    readFile(appCssSource, "utf8"),
  ]);
  expect(legacy).toContain("board-labels");
  expect(appCss).toContain(".issue-label.list-label");
  expect(appCss).not.toContain(".post-list-wrap .infos > button.issue-label.list-label");
  expect(route).toContain("styles.labelButtonReset");
  expect(route).toContain("styles.labelList");
  expect(route).toContain("styles.labelPaint");
  expect(style).toContain(
    'labelButtonReset: { border: 0, cursor: "pointer", fontFamily: "inherit" }',
  );
  expect(style).toContain('labelList: { fontWeight: "normal", padding: "2px 3px" }');
});
