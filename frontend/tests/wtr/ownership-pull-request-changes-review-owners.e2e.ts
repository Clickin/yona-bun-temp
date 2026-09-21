import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: node:fs/promises readFile has no browser equivalent; the
// compat readFileSync is a sync XHR over the same middleware. Promise-wrap it
// so the spec's await/Promise.all call sites keep their shape.
const readFile = (path: string | URL, encoding?: string | null): Promise<string> =>
  Promise.resolve(readFileSync(path, encoding ?? "utf8"));

const routeSource =
  "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes.tsx";
const styleSource = "../src/app.css";
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

test("pull-request changes review owners use conditional Style", async () => {
  const [route, _style, legacy, editor, less] = await Promise.all([
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

  expect(route).not.toContain("style={codeStyle}");
});
