import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CodeBrowserPage } from "./routes/-code-views";
import type { CodeBrowserViewModel, ProjectDetailViewModel } from "./routes/-view-models";

const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };

const projectDetail: ProjectDetailViewModel = {
  enrollmentRequested: false,
  isFavorited: false,
  organizationName: "",
  overview: "Code browser routing",
  ownerName: "owner",
  projectName: "projectYobi",
  projectScope: "public",
  viewerCanEnroll: false,
  viewerCanUpdate: true,
};

function renderCodeFile(file: NonNullable<CodeBrowserViewModel["file"]>) {
  return renderToStaticMarkup(
    React.createElement(CodeBrowserPage, {
      code: {
        branches: [{ name: "main" }],
        breadcrumbs: [],
        entries: [],
        file,
        noHead: false,
        ownerName: "owner",
        path: file.path,
        projectName: "projectYobi",
        selectedBranch: "main",
      },
      detail: projectDetail,
      runtimeConfig,
    }),
  );
}

describe("project code browser routing", () => {
  it("keeps the project code route inside the project route tree", () => {
    const codeRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/code/route.tsx"),
      "utf8",
    );
    const codeIndexRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/code/index.tsx"),
      "utf8",
    );
    const routeTreeSource = fs.readFileSync(path.resolve(__dirname, "routeTree.gen.ts"), "utf8");

    expect(codeRouteSource).toContain("createFileRoute");
    expect(codeRouteSource).toContain("/$owner/$projectName/code");
    expect(codeIndexRouteSource).toContain("CodeBrowserRouteView");
    expect(routeTreeSource).toContain("fullPath: '/$owner/$projectName/code'");
    expect(routeTreeSource).toContain("OwnerProjectNameCodeRouteRoute");
  });

  it("renders legacy raw/open/image file action anchors", () => {
    const textHtml = renderCodeFile({
      isBinary: false,
      isTooLarge: false,
      mimeType: "text/x-rust",
      name: "main.rs",
      path: "src/main.rs",
      size: 13,
      text: "fn main() {}\n",
    });

    expect(textHtml).toContain('href="/yona/owner/projectYobi/rawcode/main/src/main.rs"');
    expect(textHtml).toContain('href="/yona/owner/projectYobi/code/main/download"');
    expect(textHtml).toContain('id="open-in-browser"');
    expect(textHtml).toContain('href="/yona/owner/projectYobi/files/main/src/main.rs"');
    expect(textHtml).toContain(">Raw</a>");
    expect(textHtml).toContain(">Open</a>");

    const imageHtml = renderCodeFile({
      isBinary: true,
      isTooLarge: false,
      mimeType: "image/png",
      name: "logo.png",
      path: "assets/logo.png",
      size: 16,
      text: "",
    });

    expect(imageHtml).toContain('id="showImage"');
    expect(imageHtml).toContain('src="/yona/owner/projectYobi/image/main/assets/logo.png"');
    expect(imageHtml).toContain('href="/yona/owner/projectYobi/files/main/assets/logo.png"');

    const binaryHtml = renderCodeFile({
      isBinary: true,
      isTooLarge: false,
      mimeType: "application/octet-stream",
      name: "archive.bin",
      path: "bin/archive.bin",
      size: 7,
      text: "",
    });

    expect(binaryHtml).toContain('id="showFile"');
    expect(binaryHtml).toContain('href="/yona/owner/projectYobi/files/main/bin/archive.bin"');
    expect(binaryHtml).toContain(">Download</a>");
  });
});
