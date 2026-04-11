import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const {
  loadAttachmentAssetRecordMock,
  loadAttachmentProjectMembershipFactsMock,
  resolveServerRequestPrincipalMock,
} = vi.hoisted(() => ({
  loadAttachmentAssetRecordMock: vi.fn(),
  loadAttachmentProjectMembershipFactsMock: vi.fn(),
  resolveServerRequestPrincipalMock: vi.fn(),
}));

vi.mock("@yona/db", async () => {
  const actual = await vi.importActual<typeof import("@yona/db")>("@yona/db");
  return {
    ...actual,
    loadAttachmentAssetRecord: loadAttachmentAssetRecordMock,
    loadAttachmentProjectMembershipFacts: loadAttachmentProjectMembershipFactsMock,
  };
});

vi.mock("@app/lib/server-request-auth", async () => {
  const actual = await vi.importActual<typeof import("@app/lib/server-request-auth")>(
    "@app/lib/server-request-auth",
  );
  return {
    ...actual,
    resolveServerRequestPrincipal: resolveServerRequestPrincipalMock,
  };
});

import { Route as DownloadRoute } from "./$assetId/download";
import { Route as InlineRoute } from "./$assetId";

function getHandlers() {
  return {
    download: DownloadRoute.options.server!.handlers as {
      GET: (input: { params: { assetId: string }; request: Request }) => Promise<Response>;
    },
    inline: InlineRoute.options.server!.handlers as {
      GET: (input: { params: { assetId: string }; request: Request }) => Promise<Response>;
    },
  };
}

describe("/api/assets routes", () => {
  let dataRoot: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    dataRoot = await mkdtemp(join(tmpdir(), "yona-assets-"));
    process.env.YONA_DATA = dataRoot;
    await mkdir(join(dataRoot, "uploads"), { recursive: true });

    resolveServerRequestPrincipalMock.mockResolvedValue({
      authMethod: "anonymous",
      hasInvalidCredentials: false,
      ipAddress: "127.0.0.1",
      isAuthenticated: false,
      isRateLimited: false,
      retryAfterSeconds: null,
      session: null,
      shouldClearSessionCookie: false,
      user: null,
    });
    loadAttachmentProjectMembershipFactsMock.mockResolvedValue({
      isAnonymous: true,
      isOrganizationAdmin: false,
      isOrganizationMember: false,
      isProjectManager: false,
      isProjectMember: false,
    });
  });

  afterEach(async () => {
    delete process.env.YONA_DATA;
    await rm(dataRoot, { force: true, recursive: true });
  });

  it("serves inline assets with private cache headers and a disposition-specific etag", async () => {
    await writeFile(join(dataRoot, "uploads", "hash-inline"), "hello");
    loadAttachmentAssetRecordMock.mockResolvedValueOnce({
      assetId: 1,
      binding: {
        kind: "global",
        containerId: 7,
        containerType: "user_avatar",
      },
      fileName: "hello.txt",
      hash: "hash-inline",
      mimeType: "text/plain",
      size: 5,
    });

    const response = await getHandlers().inline.GET({
      params: { assetId: "1" },
      request: new Request("http://localhost/api/assets/1"),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, max-age=3600");
    expect(response.headers.get("ETag")).toBe('"hash-inline-inline"');
    expect(response.headers.get("Content-Disposition")).toContain("inline;");
    expect(response.headers.get("Vary")).toBe("Authorization, Cookie");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    await expect(response.text()).resolves.toBe("hello");
  });

  it("serves download assets with attachment disposition", async () => {
    await writeFile(join(dataRoot, "uploads", "hash-download"), "payload");
    loadAttachmentAssetRecordMock.mockResolvedValueOnce({
      assetId: 2,
      binding: {
        kind: "global",
        containerId: 8,
        containerType: "organization",
      },
      fileName: "report.pdf",
      hash: "hash-download",
      mimeType: "application/pdf",
      size: 7,
    });

    const response = await getHandlers().download.GET({
      params: { assetId: "2" },
      request: new Request("http://localhost/api/assets/2/download"),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("ETag")).toBe('"hash-download-attachment"');
    expect(response.headers.get("Content-Disposition")).toContain("attachment;");
    await expect(response.text()).resolves.toBe("payload");
  });

  it("returns a Basic challenge for anonymous requests to private project assets", async () => {
    loadAttachmentAssetRecordMock.mockResolvedValueOnce({
      assetId: 3,
      binding: {
        kind: "project",
        containerId: 9,
        containerType: "issue_post",
        organizationId: 90,
        projectId: 91,
        projectScope: "private",
      },
      fileName: "secret.txt",
      hash: "hash-private",
      mimeType: "text/plain",
      size: 6,
    });

    const response = await getHandlers().inline.GET({
      params: { assetId: "3" },
      request: new Request("http://localhost/api/assets/3"),
    });

    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe('Basic realm="Yona"');
  });

  it("returns 403 for authenticated outsiders on private project assets", async () => {
    resolveServerRequestPrincipalMock.mockResolvedValueOnce({
      authMethod: "session",
      hasInvalidCredentials: false,
      ipAddress: "127.0.0.1",
      isAuthenticated: true,
      isRateLimited: false,
      retryAfterSeconds: null,
      session: null,
      shouldClearSessionCookie: false,
      user: {
        emailAddress: "outsider@example.com",
        id: 55,
        isConfirmed: true,
        isSiteAdmin: false,
        loginId: "outsider",
        name: "Outsider",
      },
    });
    loadAttachmentProjectMembershipFactsMock.mockResolvedValueOnce({
      isAnonymous: false,
      isOrganizationAdmin: false,
      isOrganizationMember: false,
      isProjectManager: false,
      isProjectMember: false,
    });
    loadAttachmentAssetRecordMock.mockResolvedValueOnce({
      assetId: 4,
      binding: {
        kind: "project",
        containerId: 10,
        containerType: "issue_post",
        organizationId: 91,
        projectId: 92,
        projectScope: "private",
      },
      fileName: "secret.txt",
      hash: "hash-private-auth",
      mimeType: "text/plain",
      size: 6,
    });

    const response = await getHandlers().inline.GET({
      params: { assetId: "4" },
      request: new Request("http://localhost/api/assets/4"),
    });

    expect(response.status).toBe(403);
    await expect(response.text()).resolves.toBe("Forbidden");
  });

  it("normalizes missing blobs and stale bindings to 404", async () => {
    loadAttachmentAssetRecordMock.mockResolvedValueOnce({
      assetId: 5,
      binding: {
        kind: "global",
        containerId: 11,
        containerType: "user_avatar",
      },
      fileName: "ghost.png",
      hash: "hash-missing",
      mimeType: "image/png",
      size: 4,
    });

    const missingBlobResponse = await getHandlers().inline.GET({
      params: { assetId: "5" },
      request: new Request("http://localhost/api/assets/5"),
    });

    expect(missingBlobResponse.status).toBe(404);
    await expect(missingBlobResponse.text()).resolves.toBe("The file does not exist.");

    loadAttachmentAssetRecordMock.mockResolvedValueOnce(null);

    const staleBindingResponse = await getHandlers().inline.GET({
      params: { assetId: "6" },
      request: new Request("http://localhost/api/assets/6"),
    });

    expect(staleBindingResponse.status).toBe(404);
    await expect(staleBindingResponse.text()).resolves.toBe("The file does not exist.");
  });
});
