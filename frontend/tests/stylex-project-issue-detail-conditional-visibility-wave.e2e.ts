import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const routeSource = new URL(
  "../src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
  import.meta.url,
);
const styleSource = new URL(
  "../src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts",
  import.meta.url,
);
const legacyIssue = new URL("../../yona-original/app/views/issue/view.scala.html", import.meta.url);
const legacyKeymap = new URL(
  "../../yona-original/app/views/help/keymap.scala.html",
  import.meta.url,
);

test("issue detail conditional visibility owners use StyleX", async () => {
  const [route, style, issue, keymap] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacyIssue, "utf8"),
    readFile(legacyKeymap, "utf8"),
  ]);
  expect(issue).toContain("comment");
  expect(keymap).toContain('id="helpKeys"');
  for (const owner of [
    "votersModalVisible",
    "keymapModalVisible",
    "commentBodyHidden",
    "replyVisible",
    "childCommentFormVisible",
    "notificationVisible",
  ]) {
    expect(route).toContain(`styles.${owner}`);
    expect(style).toContain(`${owner}:`);
  }
  expect(route).not.toContain('style={open ? { display: "block" } : undefined}');
  expect(route).not.toContain('style={commentEditOpen ? { display: "none" } : undefined}');
  expect(route).not.toContain('style={replyVisible ? { display: "block" } : undefined}');
});
