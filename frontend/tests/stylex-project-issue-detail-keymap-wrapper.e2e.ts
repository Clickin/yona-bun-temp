import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("issue detail keymap wrapper owns legacy spacing in StyleX", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/issue/$issueNumber.tsx", "utf8");
  const theme = readFileSync(
    "src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts",
    "utf8",
  );
  const keymap = readFileSync("../yona-original/app/views/help/keymap.scala.html", "utf8");
  expect(keymap).toContain('style="padding:10px 0; margin-left: 55px;"');
  expect(route).toContain('data-stylex-owner="issue-detail-keymap-wrapper"');
  expect(route).not.toContain('style={{ padding: "10px 0", marginLeft: "55px" }}');
  expect(theme).toContain('keymapWrapper: { marginLeft: 55, padding: "10px 0px" }');
});
