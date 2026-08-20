import { expect, test, type Page, type Route, curatedAppCss } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";

test("post detail original-message toggle owns border in Style", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/post/$postNumber.tsx", "utf8");
  const theme = curatedAppCss();
  const legacyScript = readFileSync(
    "../yona-original/public/javascripts/common/yobi.OriginalMessage.js",
    "utf8",
  );
  expect(legacyScript).toContain("border");
  expect(route).toContain('data-owner="post-detail-original-message-toggle"');
});
