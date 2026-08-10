import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("records pull request changes owner boundary", () => {
  const route = readFileSync(
    "src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes.tsx",
    "utf8",
  );
  expect(route).toContain('data-owner="pull-request-changes-diffs"');
  expect(route).toContain('data-owner="pull-request-changes-author"');
  expect(readFileSync("../yona-original/app/views/git/partial_list.scala.html", "utf8")).toContain(
    "post-list-wrap",
  );
});

test("pull request change commit hashes replace the legacy blue text consumer", () => {
  const route = readFileSync(
    "src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes.tsx",
    "utf8",
  );
  const legacy = readFileSync("../yona-original/app/views/git/viewChanges.scala.html", "utf8");
  const common = readFileSync("../yona-original/app/assets/stylesheets/less/_common.less", "utf8");
  const variables = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_variables.less",
    "utf8",
  );

  expect(legacy).toContain('class="blue-txt mr10 commit-hash"');
  expect(common).toContain(".blue-txt      { color:@blue;}");
  expect(variables).toContain("@blue   : #5DBBE0;");
  expect(route).not.toContain('className="blue-txt mr10 commit-hash"');
  expect(route).toContain('data-owner="pull-request-changes-commit-hash"');
});

test("pull request changes owns right-aligned review actions and upload help", () => {
  const route = readFileSync(
    "src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes.tsx",
    "utf8",
  );
  const theme =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const legacy = readFileSync("../yona-original/app/views/git/viewChanges.scala.html", "utf8");
  const threadForm = readFileSync(
    "../yona-original/app/views/partial_comment_form_on_thread.scala.html",
    "utf8",
  );
  const uploadForm = readFileSync(
    "../yona-original/app/views/common/uploadForm.scala.html",
    "utf8",
  );
  const common = readFileSync("../yona-original/app/assets/stylesheets/less/_common.less", "utf8");

  expect(legacy).toContain('class="author-info right-txt"');
  expect(threadForm).toContain('<div class="right-txt">');
  expect(uploadForm).toContain('<p class="right-txt help">');
  expect(common).toContain(".right-txt     { text-align:right; }");
  expect(route).toContain('data-owner="pull-request-changes-thread-actions"');
  expect(route).toContain('data-owner="pull-request-changes-comment-actions"');
  expect(route).toContain('data-owner="pull-request-changes-review-actions"');
  // The upload-help owner is passed as a prop (helpOwner=) to the shared upload form; the
  // literal data-owner string moved out of this route. Bucket-3 stale-pin fix.
  expect(route).toContain('helpOwner="pull-request-changes-upload-help"');
});
