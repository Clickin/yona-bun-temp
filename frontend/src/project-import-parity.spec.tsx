import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProjectImportPage } from "./routes/-project-views";

describe("project import parity", () => {
  it("renders the legacy git import form shell with owner handoff", () => {
    const html = renderToStaticMarkup(
      <ProjectImportPage
        ownerOptions={[
          { organization: false, ownerName: "admin", selected: false },
          { organization: true, ownerName: "weblabs", selected: true },
        ]}
        selectedOwnerName="weblabs"
      />,
    );

    expect(html).toContain('class="page-wrap-outer"');
    expect(html).toContain('class="project-page-wrap"');
    expect(html).toContain('class="form-wrap new-project"');
    expect(html).toContain('id="importGit"');
    expect(html).toContain('class="frm-wrap"');
    expect(html).toContain('id="url"');
    expect(html).toContain('name="url"');
    expect(html).toContain('id="useRepoAuth"');
    expect(html).toContain('id="repoAuth"');
    expect(html).toContain('name="authId"');
    expect(html).toContain('name="authPw"');
    expect(html).toContain('id="project-owner"');
    expect(html).toContain('value="weblabs" selected=""');
    expect(html).toContain('id="project-name"');
    expect(html).toContain('id="description"');
    expect(html).toContain('class="unstyled project-scopes mt10"');
    expect(html).toContain('id="vcs"');
    expect(html).toContain('name="vcs"');
    expect(html).toContain('value="GIT"');
    expect(html).toContain('id="menuSettingCode"');
    expect(html).toContain('id="menuSettingPullRequest"');
    expect(html).toContain('class="actions mt20"');
    expect(html).toContain('href="/projectform?owner=weblabs"');
  });

  it("mounts the legacy _import route without a placeholder page", () => {
    const routeSource = readFileSync(join(process.cwd(), "src/routes/[_]import/route.tsx"), "utf8");

    expect(routeSource).toContain('createFileRoute("/_import")');
    expect(routeSource).toContain("readProjectCreateFormOptionsRest");
    expect(routeSource).toContain("ProjectImportPage");
    expect(routeSource).not.toContain("PlaceholderPage");
  });
});
