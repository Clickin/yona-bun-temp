import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("issue form mention mirror uses dynamic StyleX scroll transform", async () => {
  const [legacy, route, style] = await Promise.all([
    readFile("../yona-original/app/views/issue/create.scala.html", "utf8"),
    readFile("src/routes/$ownerName/$projectName/issueform.tsx", "utf8"),
    readFile("src/routes/$ownerName/$projectName/-issueform.stylex.ts", "utf8"),
  ]);
  expect(legacy).toContain('data-editor-mode="content-body"');
  expect(legacy).toContain("mentionList");
  expect(route).toContain('data-stylex-owner="project-issue-form-mention-mirror"');
  expect(route).toContain("issueFormStyles.mentionMirrorTransform");
  expect(route).not.toContain("style={{ transform: `translateY(-${textareaScrollTop}px)` }}");
  expect(style).toContain("mentionMirrorTransform");
});
