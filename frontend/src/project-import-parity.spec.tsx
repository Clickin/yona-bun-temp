import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProjectImportPage, validateLegacyProjectForm } from "./routes/-project-views";

describe("project import parity", () => {
  it("renders the legacy git import form shell with owner handoff", () => {
    const html = renderToStaticMarkup(
      <ProjectImportPage
        csrfToken="csrf-123"
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
    expect(html).not.toContain('action="/_import"');
    expect(html).not.toContain('method="post"');
    expect(html).toContain('class="frm-wrap"');
    expect(html).toContain('name="csrfToken"');
    expect(html).toContain('value="csrf-123"');
    expect(html).toContain('id="url"');
    expect(html).toContain('name="url"');
    expect(html).toContain('id="useRepoAuth"');
    expect(html).toContain('id="repoAuth"');
    expect(html).toContain('class="row-fluid"');
    expect(html).toContain('<dl class="span6"><dt>Access ID</dt><dd>');
    expect(html).toContain('name="authId"');
    expect(html).toContain('placeholder="Entered information will not be stored anywhere."');
    expect(html).toContain('<dl class="span6"><dt>Access Password</dt><dd>');
    expect(html).toContain('name="authPw"');
    expect(html).not.toContain('placeholder="Login ID"');
    expect(html).not.toContain('placeholder="Password"');
    expect(html).toContain('id="project-owner"');
    expect(html).toContain('value="weblabs" selected=""');
    expect(html).toContain('id="project-name"');
    expect(html).toContain(
      'placeholder="Enter name in alphabetnumerical or symbol characters(_-.)"',
    );
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

  it("keeps legacy _import empty URL client validation message key", () => {
    expect(validateLegacyProjectForm({ projectName: "imported", url: "" })).toEqual({
      url: ["project.import.error.empty.url"],
    });
    expect(validateLegacyProjectForm({ projectName: "imported", url: "   " })).toEqual({
      url: ["project.import.error.empty.url"],
    });
    expect(
      validateLegacyProjectForm({ projectName: "imported", url: "https://example/repo.git" }),
    ).toEqual({});
  });

  it("mounts the legacy _import route without a placeholder page", () => {
    const routeSource = readFileSync(join(process.cwd(), "src/routes/[_]import/route.tsx"), "utf8");

    expect(routeSource).toContain('createFileRoute("/_import")');
    expect(routeSource).not.toContain("Read project import options failed.");
    expect(routeSource).toContain("BadRequestPage");
    expect(routeSource).toContain("readProjectCreateFormOptionsRest");
    expect(routeSource).toContain("importProjectRest");
    expect(routeSource).toContain("onImportProject");
    expect(routeSource).toContain("useNavigate");
    expect(routeSource).toContain("prefixBasePath");
    expect(routeSource).not.toContain("navigateToAppHref");
    expect(routeSource).toContain("ProjectImportPage");
    expect(routeSource).toContain("csrfToken={csrfToken}");
    expect(routeSource).not.toContain("Project import mutation is deferred.");
    expect(routeSource).not.toContain("PlaceholderPage");

    const viewSource = readFileSync(join(process.cwd(), "src/routes/-project-views.tsx"), "utf8");
    expect(viewSource).toContain("validateLegacyProjectForm({");
    expect(viewSource).toContain("url: formState.url");
    expect(viewSource).toContain('field="url"');
    expect(viewSource).toContain("project.import.error.empty.url");
  });
});
