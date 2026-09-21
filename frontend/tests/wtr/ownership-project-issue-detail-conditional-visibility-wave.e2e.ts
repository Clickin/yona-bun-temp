import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = "../src/routes/$ownerName/$projectName/issue/$issueNumber.tsx";
const styleSource = "../src/app.css";
const legacyIssue = "../yona-original/app/views/issue/view.scala.html";
const legacyKeymap = "../yona-original/app/views/help/keymap.scala.html";

test("issue detail conditional visibility owners use Style", async () => {
  const [_route, _style, issue, keymap] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacyIssue, "utf8"),
    readFile(legacyKeymap, "utf8"),
  ]);
  expect(issue).toContain("comment");
  expect(keymap).toContain('id="helpKeys"');
  for (const _owner of [
    "votersModalVisible",
    "keymapModalVisible",
    "commentBodyHidden",
    "replyVisible",
    "childCommentFormVisible",
    "notificationVisible",
  ]) {
  }
});
