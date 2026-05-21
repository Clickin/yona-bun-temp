import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sourceRoot = join(__dirname);

describe("legacy user files route parity", () => {
  it("keeps the legacy userFiles.scala.html anchors on the /user/files route", () => {
    const routeSource = readFileSync(
      join(sourceRoot, "routes", "user", "files", "route.tsx"),
      "utf8",
    );
    const routeTree = readFileSync(join(sourceRoot, "routeTree.gen.ts"), "utf8");

    expect(routeTree).toContain("/user/files");
    expect(routeSource).toContain('createFileRoute("/user/files")');
    expect(routeSource).toContain('className="page-wrap-outer"');
    expect(routeSource).toContain('className="page-wrap"');
    expect(routeSource).toContain('className="nav nav-tabs"');
    expect(routeSource).toContain('className="user-file-search search search-bar"');
    expect(routeSource).toContain('className="attachment-files"');
    expect(routeSource).toContain('className="attachment-files-header row"');
    expect(routeSource).toContain('className="attachment-file-detail row"');
    expect(routeSource).toContain('id="pagination"');
  });
});
