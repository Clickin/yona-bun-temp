import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("post detail original-message toggle owns border in StyleX", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/post/$postNumber.tsx", "utf8");
  const theme = readFileSync(
    "src/routes/$ownerName/$projectName/post/-post-detail.stylex.ts",
    "utf8",
  );
  const legacyScript = readFileSync(
    "../yona-original/public/javascripts/common/yobi.OriginalMessage.js",
    "utf8",
  );
  expect(legacyScript).toContain("border");
  expect(route).toContain('data-stylex-owner="post-detail-original-message-toggle"');
  expect(route).not.toContain("style={{ border: 0 }}");
  expect(theme).toContain(
    'originalMessageToggle: {\n    borderStyle: "none",\n    borderWidth: 0,',
  );
});
