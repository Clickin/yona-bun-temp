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
    expect(routeSource).not.toContain("Read user files failed.");
    expect(routeSource).toContain("BadRequestPage");
    expect(routeSource).toContain('className="page-wrap-outer"');
    expect(routeSource).toContain('className="page-wrap"');
    expect(routeSource).toContain('className="nav nav-tabs"');
    expect(routeSource).toContain('className="user-file-search search search-bar"');
    expect(routeSource).toContain('className="attachment-files"');
    expect(routeSource).toContain('className="attachment-files-header row"');
    expect(routeSource).toContain('className="attachment-file-detail row"');
    expect(routeSource).toContain('id="pagination"');

    const appCss = readFileSync(join(sourceRoot, "app.css"), "utf8");
    expect(appCss).toContain(".attachment-file-detail.hover");
    expect(appCss).toContain(".attachment-file-detail:hover");
    expect(appCss).toContain("border: 1px solid #10a2e4;");
    expect(appCss).not.toContain("background: #f9f9f9;");
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
            {
              containerId: 11,
              containerType: "ISSUE_POST",
              createdLabel: "2026-06-05 1:21 PM",
              downloadUrl: "/yona/files/78?action=download",
              id: 78,
              locationHref: "/yona/owner/projectYobi/issue/5",
              locationLabel: "/owner/projectYobi/issue/5",
              mimeType: "application/pdf",
              name: "manual.pdf",
              previewUrl: "",
              size: 4096,
              sizeLabel: "4.0 kB",
              url: "/yona/files/78",
            },
            {
              containerId: 11,
              containerType: "ISSUE_POST",
              createdLabel: "2026-06-05 1:22 PM",
              downloadUrl: "/yona/files/79?action=download",
              id: 79,
              locationHref: "/yona/owner/projectYobi/issue/5",
              locationLabel: "/owner/projectYobi/issue/5",
              mimeType: "application/zip",
              name: "bundle.zip",
              previewUrl: "",
              size: 8192,
              sizeLabel: "8.0 kB",
              url: "/yona/files/79",
            },
            {
              containerId: 11,
              containerType: "ISSUE_POST",
              createdLabel: "2026-06-05 1:23 PM",
              downloadUrl: "/yona/files/80?action=download",
              id: 80,
              locationHref: "/yona/owner/projectYobi/issue/5",
              locationLabel: "/owner/projectYobi/issue/5",
              mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              name: "proposal.docx",
              previewUrl: "",
              size: 1024,
              sizeLabel: "1.0 kB",
              url: "/yona/files/80",
            },
            {
              containerId: 11,
              containerType: "ISSUE_POST",
              createdLabel: "2026-06-05 1:24 PM",
              downloadUrl: "/yona/files/81?action=download",
              id: 81,
              locationHref: "/yona/owner/projectYobi/issue/5",
              locationLabel: "/owner/projectYobi/issue/5",
              mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              name: "report.xlsx",
              previewUrl: "",
              size: 1024,
              sizeLabel: "1.0 kB",
              url: "/yona/files/81",
            },
            {
              containerId: 11,
              containerType: "ISSUE_POST",
              createdLabel: "2026-06-05 1:25 PM",
              downloadUrl: "/yona/files/82?action=download",
              id: 82,
              locationHref: "/yona/owner/projectYobi/issue/5",
              locationLabel: "/owner/projectYobi/issue/5",
              mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
              name: "slides.pptx",
              previewUrl: "",
              size: 1024,
              sizeLabel: "1.0 kB",
              url: "/yona/files/82",
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
    expect(html).toContain('placeholder="Search"');
    expect(html).not.toContain('placeholder="search.title"');
    expect(html).toContain('value=""');
    expect(html).not.toContain('value="screen"');
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
    expect(html).toContain('class="icon image-icon light-orange font-larger"');
    expect(html).toContain('class="icon pdf-icon medium-red font-larger"');
    expect(html).toContain('class="icon zip-icon null font-larger"');
    expect(html).toContain('class="icon word-icon dark-blue font-larger"');
    expect(html).toContain('class="icon excel-icon dark-green font-larger"');
    expect(html).toContain('class="icon powerpoint-icon medium-red font-larger"');
    expect(html).not.toContain('class="icon text-icon"');
    expect(html).toContain("screenshot.png");
    expect(html).toContain("manual.pdf");
    expect(html).toContain("bundle.zip");
    expect(html).toContain("proposal.docx");
    expect(html).toContain("report.xlsx");
    expect(html).toContain("slides.pptx");
    expect(html).toContain('class="span1 file-size"');
    expect(html).toContain("2.0 kB");
    expect(html).toContain(
      'class="span1 file-download"><a href="/yona/files/77?action=download"><button class="ybtn" type="button"',
    );
    expect(html).not.toContain('class="ybtn" href="/yona/files/77?action=download"');
    expect(html).toContain('class="yobicon-cloud-download"');
    expect(html).toContain('class="span2 file-date"');
    expect(html).toContain("2026-06-05 1:20 PM");
    expect(html).toContain('class="span4 file-location"');
    expect(html).toContain('href="/yona/owner/projectYobi/issue/5" target="_blank"');
    expect(html).toContain('id="pagination"');
    expect(html).toContain('href="/yona/user/files?filter=screen&amp;pageNum=2"');
    expect(html).not.toContain("page=2");
    expect(html).not.toContain('href="/yona/files/77" target="_blank" rel=');
    expect(html).not.toContain('href="/yona/owner/projectYobi/issue/5" target="_blank" rel=');
  });
});
