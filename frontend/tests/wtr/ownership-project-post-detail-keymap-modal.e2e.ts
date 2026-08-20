import { expect, test, type Page, type Route, curatedAppCss } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";

test("post detail keymap modal visibility is conditional Style-owned", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/post/$postNumber.tsx", "utf8");
  const theme = curatedAppCss();
  const template = readFileSync("../yona-original/app/views/board/view.scala.html", "utf8");
  const keymap = readFileSync("../yona-original/app/views/help/keymap.scala.html", "utf8");
  expect(template).toContain("keymap");
  expect(keymap).toContain("keymap-help");
  expect(route).toContain('data-owner="post-detail-keymap-modal"');
});
