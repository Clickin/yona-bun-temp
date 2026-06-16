import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const repoTypesSource = readFileSync("crates/persistence/src/repo_types.rs", "utf8");
const legacyExternalTypesSource = readFileSync(
  "crates/persistence/src/repo_types/legacy_external.rs",
  "utf8",
);

test("keeps legacy external persistence DTOs in a narrow repo_types module", () => {
  assert.match(repoTypesSource, /mod legacy_external;/u);
  assert.match(repoTypesSource, /pub use legacy_external::\*/u);
  assert.doesNotMatch(
    repoTypesSource,
    /pub struct IssueCommentNotificationReceiverRecord/u,
  );
  assert.match(
    legacyExternalTypesSource,
    /pub struct IssueCommentNotificationReceiverRecord/u,
  );
});
