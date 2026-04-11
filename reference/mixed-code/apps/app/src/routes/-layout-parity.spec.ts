import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const cases = [
  {
    file: "./search.tsx",
    shell: "SiteShell",
  },
  {
    file: "./organizations/$organizationName/settings.tsx",
    shell: "OrganizationShell",
  },
  {
    file: "./$owner/$projectName/index.tsx",
    shell: "ProjectShell",
  },
  {
    file: "./$owner/$projectName/issues/index.tsx",
    shell: "ProjectShell",
  },
  {
    file: "./$owner/$projectName/issues/$issueNumber.tsx",
    shell: "ProjectShell",
  },
  {
    file: "./$owner/$projectName/discussions/index.tsx",
    shell: "ProjectShell",
  },
  {
    file: "./$owner/$projectName/discussions/$postNumber.tsx",
    shell: "ProjectShell",
  },
  {
    file: "./$owner/$projectName/pulls/index.tsx",
    shell: "ProjectShell",
  },
  {
    file: "./$owner/$projectName/pulls/$pullRequestNumber.tsx",
    shell: "ProjectShell",
  },
  {
    file: "./$owner/$projectName/code.tsx",
    shell: "ProjectShell",
  },
  {
    file: "./$owner/$projectName/branches.tsx",
    shell: "ProjectShell",
  },
  {
    file: "./$owner/$projectName/commit/$oid.tsx",
    shell: "ProjectShell",
  },
  {
    file: "./$owner/$projectName/settings.tsx",
    shell: "ProjectShell",
  },
] as const;

describe("route layout parity", () => {
  it("moves remaining in-scope routes off the temporary panel baseline", () => {
    for (const testCase of cases) {
      const source = readFileSync(fileURLToPath(new URL(testCase.file, import.meta.url)), "utf8");

      expect(source).toContain(testCase.shell);
      expect(source).not.toContain("panel-grid");
      expect(source).not.toContain("login-panel");
    }
  });
});
