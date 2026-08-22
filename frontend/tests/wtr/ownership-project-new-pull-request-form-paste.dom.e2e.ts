import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("new pull-request form paste-help display is conditional Style-owned", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/newPullRequestForm.tsx", "utf8");
  const template = readFileSync("../yona-original/app/views/git/create.scala.html", "utf8");
  const upload = readFileSync("../yona-original/app/views/common/uploadForm.scala.html", "utf8");
  expect(template).toContain("ResourceType.PULL_REQUEST");
  expect(upload).toContain('class="help help-pastable"');
  expect(upload).toContain("common.attach.pastehere");
  expect(upload).toContain('<p class="right-txt help">');
  expect(upload).toContain("common.attach.attachIfYouSave");
  // bucket-3: uploader owners moved into the shared file-uploader's owners prop
  // (the component renders data-owner from it); the literal
  // data-owner pins matched the intermediate inline state.

  expect(route).not.toContain('<p className="right-txt help">');
});
