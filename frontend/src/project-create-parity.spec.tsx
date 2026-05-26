import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProjectNewPage } from "./routes/-project-views";

describe("project create parity", () => {
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
