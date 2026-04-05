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
import { CommitDiscussionSection } from "@app/routes/_app.$owner.$projectName.commit.$oid";

describe("commit discussion section", () => {
  it("renders commit discussions, thread actions, and reply affordances", () => {
    const noopAsync = vi.fn<() => Promise<void>>(async () => {});
    const noopCreate = vi.fn<
      (input: { contents: string; range?: Record<string, unknown> }) => Promise<void>
    >(async () => {});
    const noopDelete = vi.fn<(commentId: number) => Promise<void>>(async () => {});
    const noopReply = vi.fn<(threadId: number, contents: string) => Promise<void>>(async () => {});
    const html = renderToString(
      <I18nProvider locale="en">
        <CommitDiscussionSection
          createPending={false}
          currentLoginId="door"
          deletePendingCommentId={null}
          errorMessage={null}
          onCloseOrReopenThread={noopAsync}
          onCreateThread={noopCreate}
          onDeleteComment={noopDelete}
          onReply={noopReply}
          replyPendingThreadId={null}
          threadPendingId={null}
          threads={[
            {
              authorLoginId: "door",
              authorName: "Door TTS",
              comments: [
                {
                  authorLoginId: "door",
                  authorName: "Door TTS",
                  commentId: 91,
                  contents: "First comment",
                  createdAt: new Date("2026-04-01T00:00:00.000Z"),
                },
                {
                  authorLoginId: "nori",
                  authorName: "Nori",
                  commentId: 92,
                  contents: "Reply comment",
                  createdAt: new Date("2026-04-01T01:00:00.000Z"),
                },
              ],
              commitId: "abc123",
              createdAt: new Date("2026-04-01T00:00:00.000Z"),
              path: null,
              prevCommitId: null,
              range: null,
              state: "open",
              threadId: 90,
              threadType: "non_ranged",
            },
          ]}
          viewerCanCreate
          viewerCanManage={false}
        />
      </I18nProvider>,
    );

    expect(html).toContain("Commit Discussions");
    expect(html).toContain("First comment");
    expect(html).toContain("Reply comment");
    expect(html).toContain("Reply");
    expect(html).toContain("Close Thread");
    expect(html).toContain("Delete Comment");
    expect(html).toContain("File path");
    expect(html).toContain("Start line");
  });

  it("hides mutation controls for viewers without create or author privileges", () => {
    const noopCreate = vi.fn<
      (input: { contents: string; range?: Record<string, unknown> }) => Promise<void>
    >(async () => {});
    const html = renderToString(
      <I18nProvider locale="en">
        <CommitDiscussionSection
          createPending={false}
          currentLoginId={null}
          deletePendingCommentId={null}
          errorMessage={null}
          onCloseOrReopenThread={vi.fn<() => Promise<void>>(async () => {})}
          onCreateThread={noopCreate}
          onDeleteComment={vi.fn<(commentId: number) => Promise<void>>(async () => {})}
          onReply={vi.fn<(threadId: number, contents: string) => Promise<void>>(async () => {})}
          replyPendingThreadId={null}
          threadPendingId={null}
          threads={[
            {
              authorLoginId: "door",
              authorName: "Door TTS",
              comments: [
                {
                  authorLoginId: "door",
                  authorName: "Door TTS",
                  commentId: 91,
                  contents: "First comment",
                  createdAt: new Date("2026-04-01T00:00:00.000Z"),
                },
              ],
              commitId: "abc123",
              createdAt: new Date("2026-04-01T00:00:00.000Z"),
              path: null,
              prevCommitId: null,
              range: null,
              state: "open",
              threadId: 90,
              threadType: "non_ranged",
            },
          ]}
          viewerCanCreate={false}
          viewerCanManage={false}
        />
      </I18nProvider>,
    );

    expect(html).not.toContain("Delete Comment");
    expect(html).not.toContain("Close Thread");
    expect(html).not.toContain("Reply to thread");
    expect(html).not.toContain("New commit discussion");
  });

  it("shows moderation controls without create or reply affordances for managers", () => {
    const html = renderToString(
      <I18nProvider locale="en">
        <CommitDiscussionSection
          createPending={false}
          currentLoginId={null}
          deletePendingCommentId={null}
          errorMessage={null}
          onCloseOrReopenThread={vi.fn<() => Promise<void>>(async () => {})}
          onCreateThread={vi.fn<
            (input: { contents: string; range?: Record<string, unknown> }) => Promise<void>
          >(async () => {})}
          onDeleteComment={vi.fn<(commentId: number) => Promise<void>>(async () => {})}
          onReply={vi.fn<(threadId: number, contents: string) => Promise<void>>(async () => {})}
          replyPendingThreadId={null}
          threadPendingId={null}
          threads={[
            {
              authorLoginId: "door",
              authorName: "Door TTS",
              comments: [
                {
                  authorLoginId: "door",
                  authorName: "Door TTS",
                  commentId: 91,
                  contents: "First comment",
                  createdAt: new Date("2026-04-01T00:00:00.000Z"),
                },
              ],
              commitId: "abc123",
              createdAt: new Date("2026-04-01T00:00:00.000Z"),
              path: null,
              prevCommitId: null,
              range: null,
              state: "open",
              threadId: 90,
              threadType: "non_ranged",
            },
          ]}
          viewerCanCreate={false}
          viewerCanManage
        />
      </I18nProvider>,
    );

    expect(html).toContain("Delete Comment");
    expect(html).toContain("Close Thread");
    expect(html).not.toContain("Reply to thread");
    expect(html).not.toContain("New commit discussion");
  });
});
