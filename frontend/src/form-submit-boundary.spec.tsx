import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type AllowedFormPost = {
  file: string;
  marker: string;
  reason: string;
};

const allowedFormPosts: AllowedFormPost[] = [
  {
    file: "routes/-project-views.tsx",
    marker: 'id="importGit"',
    reason: "project Git import still uses the direct multipart import route",
  },
  {
    file: "routes/sites/$pageName/route.tsx",
    marker: 'action={appHref(runtimeConfig, "/sites/import")}',
    reason: "site data import still uses the direct multipart import route",
  },
  {
    file: "routes/-board-views.tsx",
    marker: "id={`comment-editform-${comment.id}`}",
    reason: "board comment edit keeps direct fallback when the optional REST callback is absent",
  },
  {
    file: "routes/-board-views.tsx",
    marker: 'className="child-comment-input-form"',
    reason: "board child comment keeps direct fallback when the optional REST callback is absent",
  },
  {
    file: "routes/-board-views.tsx",
    marker: 'id="comment-form"',
    reason: "board root comment keeps direct fallback when the optional REST callback is absent",
  },
  {
    file: "routes/-issue-views.tsx",
    marker: 'className="child-comment-input-form"',
    reason: "issue child comment keeps direct fallback when the optional REST callback is absent",
  },
  {
    file: "routes/-issue-views.tsx",
    marker: 'id="comment-form"',
    reason: "issue root comment keeps direct fallback when the optional REST callback is absent",
  },
  {
    file: "routes/-issue-views.tsx",
    marker: "id={`comment-editform-${props.commentId}`}",
    reason: "issue comment edit keeps direct fallback when the optional REST callback is absent",
  },
  {
    file: "routes/-pull-request-views.tsx",
    marker: "id={`comment-editform-${comment.id}`}",
    reason:
      "pull request review comment edit keeps direct fallback when the optional callback is absent",
  },
  {
    file: "routes/-pull-request-views.tsx",
    marker: 'className="write-comment-form"',
    reason: "pull request thread reply keeps direct fallback when the optional callback is absent",
  },
  {
    file: "routes/-pull-request-views.tsx",
    marker: 'id="review-form"',
    reason:
      "pull request block review form keeps direct fallback when the optional callback is absent",
  },
  {
    file: "routes/-pull-request-views.tsx",
    marker: 'className="review-form code-review-form inline-review-form"',
    reason:
      "pull request inline review form keeps direct fallback when the optional callback is absent",
  },
  {
    file: "routes/-pull-request-views.tsx",
    marker: 'id="comment-form"',
    reason:
      "pull request non-ranged comment keeps direct fallback when the optional callback is absent",
  },
  {
    file: "routes/-code-views.tsx",
    marker: 'className="review-form code-review-form"',
    reason: "commit inline discussion keeps direct fallback when the optional callback is absent",
  },
  {
    file: "routes/-code-views.tsx",
    marker: 'className="review-form board-comment-form"',
    reason:
      "commit non-ranged discussion keeps direct fallback when the optional callback is absent",
  },
  {
    file: "routes/-code-views.tsx",
    marker: "id={`comment-editform-${comment.id}`}",
    reason: "commit discussion edit keeps direct fallback when the optional callback is absent",
  },
  {
    file: "routes/-code-views.tsx",
    marker: 'className="review-form thread-comment-form"',
    reason:
      "commit discussion thread reply keeps direct fallback when the optional callback is absent",
  },
];

const formPostPattern = /(?:^|\s)method="post"/g;

function readRouteSource(relativePath: string) {
  return fs.readFileSync(path.resolve(__dirname, relativePath), "utf8");
}

function listRouteFiles(directory = path.resolve(__dirname, "routes")): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return listRouteFiles(entryPath);
    }
    if (!entry.isFile() || !entry.name.endsWith(".tsx")) {
      return [];
    }
    return [path.relative(__dirname, entryPath)];
  });
}

function lineNumberForIndex(source: string, index: number) {
  return source.slice(0, index).split("\n").length;
}

describe("React form submit boundary", () => {
  it("allows native POST only for documented direct import and optional comment fallback forms", () => {
    const actual = listRouteFiles().flatMap((file) => {
      const source = readRouteSource(file);
      return Array.from(source.matchAll(formPostPattern), (match) => ({
        file,
        index: match.index ?? 0,
        line: lineNumberForIndex(source, match.index ?? 0),
        source,
      }));
    });

    expect(
      actual.map((item) => `${item.file}:${item.line}`),
      `Update allowedFormPosts with a concrete reason when a native POST form is intentionally kept.`,
    ).toHaveLength(allowedFormPosts.length);

    for (const allowed of allowedFormPosts) {
      const source = readRouteSource(allowed.file);
      const [beforeMarker, ...afterMarker] = source.split(allowed.marker);
      expect(afterMarker, allowed.reason).not.toHaveLength(0);
      const markerIndex = beforeMarker.length;
      const window = source.slice(Math.max(0, markerIndex - 700), markerIndex + 900);
      expect(window, allowed.reason).toMatch(formPostPattern);
    }
  });

  it("keeps REST-owned create/settings/member/milestone forms free of native POST fallback", () => {
    const restOwnedFiles = [
      "routes/-auth-views.tsx",
      "routes/-organization-views.tsx",
      "routes/-workspace-settings-view.tsx",
      "routes/-milestone-views.tsx",
      "routes/$owner/$projectName/issue/labelsform/route.tsx",
    ];

    for (const file of restOwnedFiles) {
      const source = readRouteSource(file);
      expect(source, file).not.toMatch(formPostPattern);
    }
  });
});
