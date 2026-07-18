import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("user files header and rows own legacy static paint in StyleX", () => {
  const route = readFileSync("src/routes/user/files.tsx", "utf8");
  const legacy = readFileSync("../yona-original/app/views/user/userFiles.scala.html", "utf8");
  const less = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  expect(legacy).toContain('class="attachment-files-header row"');
  expect(legacy).toContain('class="attachment-file-detail row"');
  expect(less).toContain(".attachment-files-header");
  expect(less).toContain("padding: 10px 5px;");
  expect(less).toContain("line-height: 30px;");
  expect(route).toContain("fileHeader: {");
  expect(route).toContain("fileRow: {");
  expect(route).toContain('data-stylex-owner="user-files-header"');
  expect(route).toContain('data-stylex-owner="user-files-row"');
});
