import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("issue detail modal consumers own route-scoped geometry in StyleX", async () => {
  const route = readFileSync(
    "../src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  const style = readFileSync(
    "../src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts",
    "utf8",
  );
  const legacy = readFileSync("../yona-original/app/views/issue/view.scala.html", "utf8");
  const voters = readFileSync(
    "../yona-original/app/views/issue/partial_voter_list.scala.html",
    "utf8",
  );
  const less = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const css = readFileSync("../src/app.css", "utf8");

  // Legacy Scala HTML/JS is output DOM/UX evidence; internal behavior stays React state/events/components + TanStack Router/Query.
  expect(legacy).toContain('id="deleteConfirm"');
  expect(legacy).toContain('@help.keymap("issueDetail"');
  expect(voters).toContain("modal");
  expect(route).toContain('data-stylex-owner="issue-detail-history-modal"');
  expect(route).toContain('data-stylex-owner="issue-detail-voters-modal"');
  expect(route).toContain('data-stylex-owner="issue-detail-keymap-modal"');
  expect(route).toContain('data-stylex-owner="issue-detail-delete-confirm-modal"');
  expect(route).toContain('data-stylex-owner="issue-detail-comment-delete-modal"');
  expect((route.match(/data-stylex-owner="issue-detail-[^"]*-modal"/g) ?? []).length).toBe(5);
  expect(style).toContain('width: "min(480px, calc(100vw - 32px))"');
  expect(style).toContain('width: "640px"');
  expect(style).toContain('marginLeft: "-320px"');
  expect(less).toContain(".keymap-help");
  expect(less).toContain("line-height:30px");
  expect(css).not.toContain(".issue-detail-page .modal");
  expect(css).not.toContain(".issue-detail-page .keymap-help");
  expect(css).not.toContain('.posting-history > button[data-toggle="modal"]');
  expect(css).not.toContain('.voter-list li > button[data-toggle="modal"]');
  expect(css).not.toContain('.vote-description-people[data-toggle="modal"]');
  expect(css).toContain(".hide {");
  expect(css).toContain(".modal");
});
