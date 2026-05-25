import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { resolveRuntimeConfig } from "./runtime-config";
import { CodeCommitDetailPage, type CodeCommitDetailViewModel } from "./routes/-code-views";
import type { ProjectDetailViewModel } from "./routes/-view-models";

const runtimeConfig = resolveRuntimeConfig({ basePath: "/yona" });

const projectDetail: ProjectDetailViewModel = {
  enrollmentRequested: false,
  isFavorited: false,
  organizationName: "",
  overview: "",
  ownerName: "owner",
  projectName: "projectYobi",
  projectScope: "public",
  showCode: true,
  viewerCanEnroll: false,
  viewerCanUpdate: true,
};

const commitDetail: CodeCommitDetailViewModel = {
  branches: [{ name: "main" }],
  breadcrumbs: [],
  commit: {
    authorDate: "2026-05-25",
    authorEmail: "author@example.com",
    authorName: "Author",
    commentCount: 0,
    commitId: "be6a8cc1c1ecfe9489fb51e4869af15a13fc2cd2",
    commitShortId: "be6a8cc",
    message: "Update file",
    shortMessage: "Update file",
  },
  files: [
    {
      path: "src/main.rs",
      patch: [
        "diff --git a/src/main.rs b/src/main.rs",
        "index 1111111..2222222 100644",
        "--- a/src/main.rs",
        "+++ b/src/main.rs",
        "@@ -1,2 +1,3 @@",
        " fn main() {",
        '-    println!("old");',
        '+    println!("new");',
        '+    println!("another");',
        " }",
      ].join("\n"),
    },
  ],
  noHead: false,
  ownerName: "owner",
  parentCommit: { commitId: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", commitShortId: "aaaaaaa" },
  path: "",
  permissions: {
    canComment: true,
    canUpdateThreadState: true,
  },
  projectName: "projectYobi",
  selectedBranch: "main",
  threads: [],
};

describe("CodeCommitDetailPage", () => {
  it("renders legacy commit diff file stats and inline comment anchors", () => {
    const html = renderToStaticMarkup(
      <CodeCommitDetailPage
        commitDetail={commitDetail}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain("src/main.rs");
    expect(html).toContain('class="diff-stats"');
    expect(html).toContain('class="num-added">+2</span>');
    expect(html).toContain('class="num-deleted">-1</span>');
    expect(html).toContain("line-comment-trigger");
    expect(html).toContain('data-line="2"');
  });
});
