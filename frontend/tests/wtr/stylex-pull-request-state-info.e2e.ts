import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("pull request state info owns scoped alert paint in StyleX", async () => {
  const detail = readFileSync(
    "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber.tsx",
    "utf8",
  );
  const changes = readFileSync(
    "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes.tsx",
    "utf8",
  );
  const style = readFileSync(
    "../src/routes/$ownerName/$projectName/pullRequest/-pull-request-detail.stylex.ts",
    "utf8",
  );
  const view = readFileSync(
    new URL("../../yona-original/app/views/git/view.scala.html", import.meta.url),
    "utf8",
  );
  const changesView = readFileSync(
    new URL("../../yona-original/app/views/git/viewChanges.scala.html", import.meta.url),
    "utf8",
  );
  const partial = readFileSync(
    new URL("../../yona-original/app/views/git/partial_state.scala.html", import.meta.url),
    "utf8",
  );
  const css = readFileSync("../src/app.css", "utf8");

  expect(view).toContain('class="pullRequest-stateInfo"');
  expect(changesView).toContain("@partial_state(project, pull,");
  expect(partial).toContain('class="alert alert-success"');
  expect(partial).toContain('class="alert alert-error"');
  expect(detail).toContain("styles.alertSuccess");
  expect(detail).toContain("styles.alertError");
  expect(detail).toContain("styles.alertWarning");
  expect(changes).toContain('data-stylex-owner="pull-request-changes-state"');
  expect(style).toContain('marginTop: "15px"');
  expect(style).toContain('fontSize: "13px"');
  expect(style).toContain('color: "#468847"');
  expect(style).toContain('color: "#b94a48"');
  expect(style).toContain('color: "#c09853"');
  expect(css).not.toContain(".pullRequest-stateInfo {");
  expect(css).not.toContain(".pullRequest-stateInfo .alert {");
  expect(css).not.toContain(".pullRequest-stateInfo .alert i {");
  expect(css).not.toContain(".pullRequest-stateInfo .alert.alert-success");
  expect(css).not.toContain(".pullRequest-stateInfo .alert.alert-error");
  expect(css).not.toContain(".pullRequest-stateInfo .alert.alert-warnning");
});
