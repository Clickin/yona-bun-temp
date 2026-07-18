import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("post detail share link hidden state is StyleX-owned", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/post/$postNumber.tsx", "utf8");
  const theme = readFileSync(
    "src/routes/$ownerName/$projectName/post/-post-detail.stylex.ts",
    "utf8",
  );
  const template = readFileSync(
    "../yona-original/app/views/board/partial_comments.scala.html",
    "utf8",
  );
  expect(template).toContain('class="share-link" style="display: none"');
  expect(route).toContain('data-stylex-owner="post-detail-share-link"');
  expect(route).not.toContain('style={{ display: "none" }}');
  expect(theme).toContain('shareLinkHidden: { display: "none" }');
});
