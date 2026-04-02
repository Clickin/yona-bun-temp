import * as React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    Link: ({ children }: { children: React.ReactNode }) => React.createElement("a", {}, children),
  };
});

vi.mock("@app/components/parity-shells", () => ({
  ContentCard: ({ children, title }: { children: React.ReactNode; title: string }) =>
    React.createElement("section", {}, [
      React.createElement("h2", { key: "title" }, title),
      React.createElement("div", { key: "body" }, children),
    ]),
}));

import { I18nProvider } from "@app/lib/i18n-react";
import {
  PullRequestMergeSection,
  PullRequestReviewSection,
} from "@app/routes/_app.$owner.$projectName.pulls.$pullRequestNumber";

describe("pull request detail route parity", () => {
  it("renders PR review comments, thread controls, merge preview, and conflict file lists", () => {
    const html = renderToString(
      <I18nProvider locale="en">
        <div>
          <PullRequestMergeSection
            mergePending={false}
            onMerge={vi.fn<() => Promise<void>>(async () => {})}
            onPreview={vi.fn<() => Promise<void>>(async () => {})}
            preview={{
              blockedReason: "merge-conflict",
              conflictedFiles: ["src/conflicted.ts", "src/other.ts"],
              mergeable: false,
            }}
            previewPending={false}
          />
          <PullRequestReviewSection
            createPending={false}
            currentLoginId="yobi"
            deletePendingCommentId={null}
            errorMessage={null}
            onCloseOrReopenThread={vi.fn<
              (threadId: number, state: "closed" | "open") => Promise<void>
            >(async () => {})}
            onCreateComment={vi.fn<
              (input: { contents: string; threadId?: number }) => Promise<void>
            >(async () => {})}
            onDeleteComment={vi.fn<(commentId: number) => Promise<void>>(async () => {})}
            replyPendingThreadId={null}
            threadPendingId={null}
            threads={[
              {
                authorLoginId: "yobi",
                authorName: "Yobi",
                comments: [
                  {
                    authorLoginId: "yobi",
                    authorName: "Yobi",
                    commentId: 71,
                    contents: "Initial review comment",
                    createdAt: new Date("2026-04-01T00:00:00.000Z"),
                  },
                  {
                    authorLoginId: "admin",
                    authorName: "Admin",
                    commentId: 72,
                    contents: "Reply review comment",
                    createdAt: new Date("2026-04-01T01:00:00.000Z"),
                  },
                ],
                commitId: "abc123",
                createdAt: new Date("2026-04-01T00:00:00.000Z"),
                lastCommentAt: new Date("2026-04-01T01:00:00.000Z"),
                participants: ["yobi", "admin"],
                path: "src/pull-request.ts",
                projectName: "yona",
                replyCount: 1,
                state: "open",
                text: "Initial review comment",
                threadId: "41",
              },
            ]}
            viewerCanWrite
          />
        </div>
      </I18nProvider>,
    );

    expect(html).toContain("Merge Preview");
    expect(html).toContain("merge-conflict");
    expect(html).toContain("src/conflicted.ts");
    expect(html).toContain("Review Threads");
    expect(html).toContain("Initial review comment");
    expect(html).toContain("Reply review comment");
    expect(html).toContain("Reply");
    expect(html).toContain("Close Thread");
    expect(html).toContain("Delete Comment");
    expect(html).toContain("New Review Comment");
  });
});
