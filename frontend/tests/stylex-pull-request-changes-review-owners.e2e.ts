import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const routeSource = new URL(
  "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes.tsx",
  import.meta.url,
);
const styleSource = new URL(
  "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/-pull-request-changes.stylex.ts",
  import.meta.url,
);
const legacySource = new URL(
  "../../yona-original/app/views/git/viewChanges.scala.html",
  import.meta.url,
);
const legacyEditor = new URL(
  "../../yona-original/app/views/partial_comment_form_on_thread.scala.html",
  import.meta.url,
);
const legacyStyle = new URL(
  "../../yona-original/app/assets/stylesheets/less/_page.less",
  import.meta.url,
);

test("pull-request changes review owners use conditional StyleX", async () => {
  const [route, style, legacy, editor, less] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacySource, "utf8"),
    readFile(legacyEditor, "utf8"),
    readFile(legacyStyle, "utf8"),
  ]);

  expect(legacy).toContain(
    'class="codediff-wrap mt10 @if(pull.commentThreads.size == 0) {diffs-only}"',
  );
  expect(less).toContain(".review-wrap { display:none; }");
  expect(editor).toContain("style=height:100px");
  expect(route).toContain("styles.diffCodeHidden");
  expect(route).toContain("styles.reviewTextarea");
  expect(route).not.toContain("style={codeStyle}");
  expect(route).not.toContain('textareaStyle={{ height: "100px" }}');
  expect(style).toContain('diffCodeHidden: { display: "none" }');
  expect(style).toContain('reviewTextarea: { height: "100px" }');
});
