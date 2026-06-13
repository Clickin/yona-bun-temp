import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { UserFilesPage } from "./routes/user/files/route";

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

  it("renders the legacy user files search, file rows, and pageNum pagination", () => {
    const html = renderToStaticMarkup(
      <UserFilesPage
        basePath="/yona"
        files={{
          files: [
            {
              containerId: 11,
              containerType: "ISSUE_POST",
              createdLabel: "2026-06-05 1:20 PM",
              downloadUrl: "/yona/files/77?action=download",
              id: 77,
              locationHref: "/yona/owner/projectYobi/issue/5",
              locationLabel: "/owner/projectYobi/issue/5",
              mimeType: "image/png",
              name: "screenshot.png",
              previewUrl: "/yona/files/77",
              size: 2048,
              sizeLabel: "2.0 kB",
              url: "/yona/files/77",
            },
          ],
          filter: "screen",
          page: 2,
          pageSize: 50,
          total: 51,
          totalPages: 2,
        }}
        query={{ filter: "screen", page: 2 }}
      />,
    );

    expect(html).toContain('class="page-wrap-outer"');
    expect(html).toContain('class="page-wrap"');
    expect(html).toContain('class="nav nav-tabs"');
    expect(html).toContain('href="/yona/notifications"');
    expect(html).not.toContain('href="/yona/notification"');
    expect(html).toContain('href="/yona/user/issues"');
    expect(html).toContain('href="/yona/user/files"');
    expect(html).toContain('action="/yona/user/files"');
    expect(html).toContain('class="user-file-search search search-bar"');
    expect(html).toContain('name="filter"');
    expect(html).toContain('placeholder="search.title"');
    expect(html).toContain('class="search-btn"');
    expect(html).toContain('class="attachment-files-header row"');
    expect(html).toContain(">Preview<");
    expect(html).toContain(">Filename<");
    expect(html).toContain(">Size<");
    expect(html).toContain(">Download<");
    expect(html).toContain(">Date<");
    expect(html).toContain(">Location<");
    expect(html).toContain('class="attachment-file-detail row"');
    expect(html).toContain('class="file-preview span1"');
    expect(html).toContain('href="/yona/files/77" target="_blank"');
    expect(html).toContain('<img alt="" src="/yona/files/77"/>');
    expect(html).toContain('class="span5 file-name"');
    expect(html).toContain('class="icon text-icon"');
    expect(html).toContain("screenshot.png");
    expect(html).toContain('class="span1 file-size"');
    expect(html).toContain("2.0 kB");
    expect(html).toContain('href="/yona/files/77?action=download"');
    expect(html).toContain('class="yobicon-cloud-download"');
    expect(html).toContain('class="span2 file-date"');
    expect(html).toContain("2026-06-05 1:20 PM");
    expect(html).toContain('class="span4 file-location"');
    expect(html).toContain('href="/yona/owner/projectYobi/issue/5" target="_blank"');
    expect(html).toContain('id="pagination"');
    expect(html).toContain('href="/yona/user/files?filter=screen&amp;pageNum=2"');
    expect(html).not.toContain("page=2");
    expect(html).not.toContain('href="/yona/files/77" target="_blank" rel=');
    expect(html).not.toContain(
      'href="/yona/owner/projectYobi/issue/5" target="_blank" rel=',
    );
  });
});
