import { readFile } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("user files header and rows own legacy static paint in StyleX", () => {
  const route = readFileSync("src/routes/user/files.tsx", "utf8");
  const legacy = readFileSync("../yona-original/app/views/user/userFiles.scala.html", "utf8");
  const less = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  expect(legacy).toContain('class="attachment-files-header row"');
  expect(legacy).toContain('class="attachment-file-detail row"');
  expect(less).toContain(".attachment-files-header");
  expect(less).toContain("padding: 10px 5px;");
  expect(less).toContain("line-height: 30px;");
  expect(route).toContain("userFilesStyles.header");
  expect(route).toContain("userFilesStyles.row");
  expect(route).toContain('data-stylex-owner="user-files-header"');
  expect(route).toContain('data-stylex-owner="user-files-row"');
});
