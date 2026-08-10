import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("issue form mention mirror uses dynamic Style scroll transform", async () => {
  const [legacy, route, style] = await Promise.all([
    readFile("../yona-original/app/views/issue/create.scala.html", "utf8"),
    readFile("src/routes/$ownerName/$projectName/issueform.tsx", "utf8"),
    readFile("src/app.css", "utf8"),
  ]);
  expect(legacy).toContain('data-editor-mode="content-body"');
  expect(legacy).toContain("mentionList");
  expect(route).toContain('data-owner="project-issue-form-mention-mirror"');
});
