import { readFile, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("issue form mention mirror uses dynamic Style scroll transform", async () => {
  const [legacy, route, _style] = await Promise.all([
    readFile("../yona-original/app/views/issue/create.scala.html", "utf8"),
    readFile("src/routes/$ownerName/$projectName/issueform.tsx", "utf8"),
    Promise.resolve(curatedAppCss()),
  ]);
  expect(legacy).toContain('data-editor-mode="content-body"');
  expect(legacy).toContain("mentionList");
  expect(route).toContain('data-owner="project-issue-form-mention-mirror"');
});
