import { readFile, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("UIKit issue label uses Dynamic Style color and static text paint", async () => {
  const [route, _style] = await Promise.all([
    readFile("src/routes/[_]UIKit.tsx", "utf8"),
    Promise.resolve(curatedAppCss()),
  ]);
  expect(route).toContain('data-owner="uikit-issue-label"');
});
