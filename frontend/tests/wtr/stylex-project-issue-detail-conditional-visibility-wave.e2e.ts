import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = "../src/routes/$ownerName/$projectName/issue/$issueNumber.tsx";
const styleSource = "../src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts";
const legacyIssue = "../yona-original/app/views/issue/view.scala.html";
const legacyKeymap = "../yona-original/app/views/help/keymap.scala.html";

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
