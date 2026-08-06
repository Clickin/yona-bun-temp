import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("project issues owns milestone tag and empty avatar paint with route-local StyleX", async () => {
  const routeSource = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/issues.tsx", import.meta.url),
    "utf8",
  );
  const styleSource = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/-issues.stylex.ts", import.meta.url),
    "utf8",
  );
  const legacySource = readFileSync(
    new URL("../../yona-original/app/views/issue/partial_list.scala.html", import.meta.url),
    "utf8",
  );
  const legacyLess = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  const appCss = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");

  expect(legacySource).toContain('class="mileston-tag"');
  expect(legacySource).toContain('class="empty-avatar-wrap">&nbsp;</div>');
  expect(legacyLess).toContain(".empty-avatar-wrap");
  expect(legacyLess).toContain(".mileston-tag");
  expect(routeSource).toContain('data-stylex-owner="project-issues-milestone-tag"');
  expect(routeSource).toContain('data-stylex-owner="project-issues-empty-avatar"');
  expect(styleSource).toContain('emptyAvatar: { height: "32px", width: "32px" }');
  expect(styleSource).toContain('maxWidth: "135px"');
  expect(styleSource).toContain('textOverflow: "ellipsis"');
  expect(styleSource).toContain('fontSize: "11px"');
  expect(styleSource).toContain('borderRadius: "6px"');
  expect(appCss).not.toContain(".issue-list-page .empty-avatar-wrap");
  expect(appCss).not.toContain(".issue-list-page .mileston-tag");
});
