import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("site-admin route parity harness", () => {
  it("closes the legacy site-admin wildcard route without porting placeholders", () => {
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");
    expect(routeTreeSource).toContain("fullPath: '/sites/$pageName'");

    const routeSource = fs.readFileSync(
      path.resolve(__dirname, "routes/sites/$pageName/route.tsx"),
      "utf8",
    );
    expect(routeSource).not.toContain("PlaceholderPage");
    expect(routeSource).toContain("NotFoundPage");
    expect(routeSource).toContain("return <NotFoundPage href={`/sites/${pageName}`} />;");
  });
});
