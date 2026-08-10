import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("pull-request detail owns help-modal visibility in conditional Style", () => {
  const route = readFileSync(
    "src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber.tsx",
    "utf8",
  );
  const style = readFileSync("src/app.css", "utf8");
  const template = readFileSync("../yona-original/app/views/git/view.scala.html", "utf8");

  expect(template).toContain('<div id="helpMessage" class="modal hide fade pullreq-info">');
  expect(template).toContain('<div class="right-txt">');
  expect(route).toContain('data-owner="pull-request-detail-help-modal"');
  expect(route).toContain('data-owner="pull-request-detail-help-actions"');
  expect(route).not.toContain('className="right-txt"');

  expect(route).not.toContain("style={modalStyle}");
});
