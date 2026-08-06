import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("commit detail owns the generated original-message toggle border in StyleX", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/commit/$commitId.tsx", "utf8");
  const stylex = readFileSync(
    "src/routes/$ownerName/$projectName/commit/-commit-detail.stylex.ts",
    "utf8",
  );
  const legacyScript = readFileSync(
    "../yona-original/public/javascripts/common/yobi.OriginalMessage.js",
    "utf8",
  );
  const legacyTemplate = readFileSync("../yona-original/app/views/code/diff.scala.html", "utf8");

  expect(legacyScript).toContain(".css('border', 0)");
  expect(legacyTemplate).toContain("@common.comment");
  expect(route).toContain('data-stylex-owner="commit-detail-original-message-toggle"');
  expect(route).not.toContain("style={{ border: 0 }}");
  expect(stylex).toContain("originalMessageToggle: {");
  expect(stylex).toContain('borderWidth: "0px"');
});
