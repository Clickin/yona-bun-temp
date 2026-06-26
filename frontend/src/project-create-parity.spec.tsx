import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  hasLegacyProjectFormErrors,
  isLegacySubversionVcs,
  normalizeLegacyProjectNameOnFocusout,
  normalizeProjectMenusForCodeToggle,
  normalizeProjectMenusForDependentCodeToggle,
  normalizeProjectOwnerScope,
  ProjectNewPage,
  validateLegacyProjectForm,
} from "./routes/-project-views";

describe("project create parity", () => {
  it("renders the legacy owner select with user and organization options", () => {
    const html = renderToStaticMarkup(
      <ProjectNewPage
        ownerOptions={[
          { organization: false, ownerName: "admin", selected: false },
          { organization: true, ownerName: "weblabs", selected: true },
        ]}
        selectedOwnerName="weblabs"
      />,
    );

    expect(html).toContain('id="project-owner"');
    expect(html).toContain('name="owner"');
    expect(html).toContain('data-toggle="select2"');
    expect(html).toContain('data-format="user"');
    expect(html).toContain('data-type="user"');
    expect(html).toContain('value="admin"');
    expect(html).toContain('data-type="group"');
    expect(html).toContain('value="weblabs" selected=""');
  });

  it("keeps the selected owner on the legacy import form link", () => {
    const html = renderToStaticMarkup(
      <ProjectNewPage
        ownerOptions={[
          { organization: false, ownerName: "admin", selected: false },
          { organization: true, ownerName: "weblabs", selected: true },
        ]}
        selectedOwnerName="weblabs"
      />,
    );

    expect(html).toContain('href="/_import?owner=weblabs"');
  });

  it("keeps the legacy create button copy while submit is pending", () => {
    const html = renderToStaticMarkup(<ProjectNewPage pending />);

    expect(html).toContain('<button class="ybtn ybtn-success" disabled="" type="submit">');
    expect(html).toContain("Create a project");
    expect(html).not.toContain("project.create");
    expect(html).not.toContain("Creating…");
  });

  it("renders legacy project scope radios instead of a select", () => {
    const html = renderToStaticMarkup(<ProjectNewPage defaultProjectScope="private" />);

    expect(html).toContain('class="unstyled project-scopes mt10"');
    expect(html).toContain('id="public"');
    expect(html).toContain('value="PUBLIC"');
    expect(html).toContain('id="protected"');
    expect(html).toContain('value="PROTECTED"');
    expect(html).toContain('id="private"');
    expect(html).toContain('checked="" value="PRIVATE"');
    expect(html).toContain("Anonymous users are able to access the project.");
    expect(html).toContain(
      "Users in the group and also users who have been explicitly granted access are able to access the project.",
    );
    expect(html).toContain(
      "Project access must be granted explicitly for each user, but basic information (name, description, etc.) can be exposed to public.",
    );
    expect(html).not.toContain("project.public.notice");
    expect(html).not.toContain("project.protected.notice");
    expect(html).not.toContain("project.private.notice");
    expect(html).not.toContain('<select name="projectScope"');
  });

  it("preserves legacy project.New client validation and coupling helpers", () => {
    expect(normalizeLegacyProjectNameOnFocusout("  alpha beta  ")).toBe("alpha-beta");
    expect(validateLegacyProjectForm({ projectName: "" })).toEqual({
      name: ["project.name.alert"],
    });
    expect(validateLegacyProjectForm({ projectName: "bad name" })).toEqual({
      name: ["project.name.alert"],
    });
    expect(validateLegacyProjectForm({ projectName: ".git" })).toEqual({
      name: ["project.name.reserved.alert"],
    });
    expect(hasLegacyProjectFormErrors(validateLegacyProjectForm({ projectName: "alpha" }))).toBe(
      false,
    );
    expect(
      normalizeProjectOwnerScope(
        [
          { organization: false, ownerName: "admin", selected: true },
          { organization: true, ownerName: "weblabs", selected: false },
        ],
        "admin",
        "protected",
      ),
    ).toEqual({ projectScope: "public", protectedVisible: false });
    expect(
      normalizeProjectOwnerScope(
        [{ organization: true, ownerName: "weblabs", selected: true }],
        "weblabs",
        "protected",
      ),
    ).toEqual({ projectScope: "protected", protectedVisible: true });
    expect(isLegacySubversionVcs("SVN")).toBe(true);
    expect(isLegacySubversionVcs("Subversion")).toBe(true);
    expect(
      normalizeProjectMenusForCodeToggle(
        {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        false,
      ),
    ).toMatchObject({ code: false, pullRequest: false, review: false });
    expect(
      normalizeProjectMenusForDependentCodeToggle(
        {
          board: true,
          code: false,
          issue: true,
          milestone: true,
          pullRequest: false,
          review: false,
        },
        "pullRequest",
        true,
      ),
    ).toMatchObject({ code: true, pullRequest: true });
  });

  it("hides protected scope for user owners like legacy project.New owner coupling", () => {
    const userHtml = renderToStaticMarkup(
      <ProjectNewPage
        ownerOptions={[{ organization: false, ownerName: "admin", selected: true }]}
        selectedOwnerName="admin"
      />,
    );
    const orgHtml = renderToStaticMarkup(
      <ProjectNewPage
        ownerOptions={[{ organization: true, ownerName: "weblabs", selected: true }]}
        selectedOwnerName="weblabs"
      />,
    );

    expect(userHtml).toContain('id="opt-protected" style="display:none"');
    expect(orgHtml).toContain('id="opt-protected"');
    expect(orgHtml).not.toContain('id="opt-protected" style="display:none"');
  });

  it("preserves owner query when redirecting the legacy new project alias", () => {
    const routeSource = readFileSync(
      join(process.cwd(), "src/routes/projects/new/route.tsx"),
      "utf8",
    );

    expect(routeSource).toContain('new URLSearchParams(window.location.search).get("owner")');
    expect(routeSource).toContain("encodeURIComponent(owner)");
    expect(routeSource).toContain("to={`/projectform${query}`}");
  });

  it("keeps project creation on the REST submit boundary with legacy error key fallback", () => {
    const routeSource = readFileSync(
      join(process.cwd(), "src/routes/projectform/route.tsx"),
      "utf8",
    );
    const viewSource = readFileSync(join(process.cwd(), "src/routes/-project-views.tsx"), "utf8");

    expect(routeSource).toContain("basePath={runtimeConfig.basePath}");
    expect(viewSource).not.toContain("action={createAction}");
    expect(viewSource).not.toContain('id="newProjectForm"\n            method="post"');
    expect(viewSource).toContain("event.preventDefault();");
    expect(viewSource).not.toContain("if (!props.onCreateProject) {");
    expect(viewSource).not.toContain('item.key === "pullRequest" && svnSelected');
    expect(viewSource).toContain(
      "validateLegacyProjectForm({ projectName: formState.projectName })",
    );
    expect(viewSource).toContain("props.onCreateProject?.({");
    expect(viewSource).toContain("projectScope: ownerScope.projectScope");
    expect(routeSource).not.toContain("Create project failed.");
    expect(routeSource).toContain('messages("error.badrequest", { fallback: "error.badrequest" })');
  });
});
