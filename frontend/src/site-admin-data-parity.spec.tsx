import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("site-admin data management parity", () => {
  it("preserves the legacy /sites/data shell anchors", () => {
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");
    expect(routeTreeSource).toContain("fullPath: '/sites/$pageName'");

    const routePath = path.resolve(__dirname, "routes/sites/$pageName/route.tsx");
    expect(fs.existsSync(routePath)).toBe(true);
    const routeSource = fs.readFileSync(routePath, "utf8");
    expect(routeSource).toContain('pageName === "data"');
    expect(routeSource).toContain("SiteDataRoute");
    expect(routeSource).toContain("SiteAdminDataPage");
    expect(routeSource).toContain('activePageName="data"');
    expect(routeSource).toContain(
      'className="ybtn ybtn-primary" href={appHref(runtimeConfig, "/sites/export")}',
    );
    expect(routeSource).toContain('href={appHref(runtimeConfig, "/sites/export")}');
    expect(routeSource).toContain('action={appHref(runtimeConfig, "/sites/import")}');
    expect(routeSource).not.toContain('data-deferred="site.data.export"');
    expect(routeSource).not.toContain('data-deferred="site.data.import"');
    expect(routeSource).toContain('encType="multipart/form-data"');
    expect(routeSource).toContain('name="csrfToken"');
    expect(routeSource).toContain('name="data"');
    expect(routeSource).toContain('type="submit"');
    expect(routeSource).toContain("site.data.import");
    expect(routeSource).toContain("site.data.warning1");
    expect(routeSource).toContain("site.data.warning2");
    expect(routeSource).toContain("site.data.warning3");
  });
});
