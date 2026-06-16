import assert from "node:assert/strict";
import { test } from "node:test";

import { evaluateParityGate } from "../../tools/yona-parity-gate.mjs";

test("lint cleanup surfaces keep explicit legacy parity gate coverage", () => {
  const result = evaluateParityGate({
    changedFiles: [
      "docs/provenance/legacy-porting-progress.md",
      "docs/provenance/phase-0b/issue.md",
      "frontend/src/markdown-renderer.spec.tsx",
      "frontend/src/routes/$owner/$projectName/issue/labelsform/route.tsx",
      "frontend/src/routes/-auth-views.tsx",
      "frontend/src/routes/-board-views.tsx",
      "frontend/src/routes/-code-views.tsx",
      "frontend/src/routes/-issue-views.tsx",
      "frontend/src/routes/-markdown-renderer.tsx",
      "frontend/src/routes/-milestone-views.tsx",
      "frontend/src/routes/-organization-views.tsx",
      "frontend/src/routes/-project-views.tsx",
      "frontend/src/routes/-pull-request-views.tsx",
      "frontend/src/routes/-restricted-view.tsx",
      "frontend/src/routes/-search-views.tsx",
      "frontend/src/routes/-syntax-highlighting.tsx",
      "frontend/src/routes/-ui-kit-views.tsx",
      "frontend/src/routes/-workspace-views.tsx",
      "frontend/src/routes/notification/route.tsx",
      "frontend/src/routes/user/editform/notifications/route.tsx",
      "frontend/src/routes/sites/$pageName/route.tsx",
      "tests/parity/issue-auth-repository-organization-project-pull-request-search-workspace-notification-site-admin-board-markdown.test.mjs",
    ],
    repoRoot: process.cwd(),
  });

  assert.equal(result.verdict, "pass");
  assert.deepEqual(result.unmappedImplementationFiles, []);
});
