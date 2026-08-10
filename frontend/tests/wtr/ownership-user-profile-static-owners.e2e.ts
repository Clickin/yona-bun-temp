import { readFile } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("user profile static avatar/name/edit owners use route-local Style", () => {
  const route = readFileSync("src/routes/$user.tsx", "utf8");
  const legacy = readFileSync("../yona-original/app/views/user/view.scala.html", "utf8");
  const less = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  expect(legacy).toContain('class="whoami-wrap"');
  expect(legacy).toContain('class="name"');
  expect(less).toContain("width:200px; height:200px;");
  expect(less).toContain("font-size:18px;");
  expect(less).toContain("text-align:right;");
});
