import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProjectNewPage } from "./routes/-project-views";

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

  it("renders legacy project scope radios instead of a select", () => {
    const html = renderToStaticMarkup(<ProjectNewPage defaultProjectScope="private" />);

    expect(html).toContain('class="unstyled project-scopes mt10"');
    expect(html).toContain('id="public"');
    expect(html).toContain('value="PUBLIC"');
    expect(html).toContain('id="protected"');
    expect(html).toContain('value="PROTECTED"');
    expect(html).toContain('id="private"');
    expect(html).toContain('checked="" value="PRIVATE"');
    expect(html).toContain("project.public.notice");
    expect(html).toContain("project.protected.notice");
    expect(html).toContain("project.private.notice");
    expect(html).not.toContain('<select name="projectScope"');
  });
});
