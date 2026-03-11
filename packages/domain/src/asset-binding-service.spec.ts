import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  canManageProjectUploadTargetMock,
  finalizeTemporaryUploadRecordMock,
  readTemporaryUploadRecordMock,
  resolveUploadBindingProjectIdMock,
} = vi.hoisted(() => ({
  canManageProjectUploadTargetMock: vi.fn(),
  finalizeTemporaryUploadRecordMock: vi.fn(),
  readTemporaryUploadRecordMock: vi.fn(),
  resolveUploadBindingProjectIdMock: vi.fn(),
}));

vi.mock("@yona/db", async () => {
  const actual = await vi.importActual<typeof import("@yona/db")>("@yona/db");
  return {
    ...actual,
    canManageProjectUploadTarget: canManageProjectUploadTargetMock,
    finalizeTemporaryUploadRecord: finalizeTemporaryUploadRecordMock,
    readTemporaryUploadRecord: readTemporaryUploadRecordMock,
    resolveUploadBindingProjectId: resolveUploadBindingProjectIdMock,
  };
});

import { finalizeUploadSession } from "./asset-binding-service";

describe("asset binding service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readTemporaryUploadRecordMock.mockResolvedValue({
      assetId: 11,
      containerId: 7,
      containerType: "user",
      hash: "abc",
      ownerLoginId: "doortts",
    });
    finalizeTemporaryUploadRecordMock.mockResolvedValue({
      assetId: 11,
      containerId: 21,
      containerType: "issue_post",
      hash: "abc",
      ownerLoginId: "doortts",
    });
    resolveUploadBindingProjectIdMock.mockResolvedValue(2);
    canManageProjectUploadTargetMock.mockResolvedValue(true);
  });

  it("finalizes project-bound upload targets for authorized project managers", async () => {
    await expect(
      finalizeUploadSession(
        {
          actorId: 7,
          isAnonymous: false,
          isSiteAdmin: false,
          loginId: "doortts",
        },
        {
          resourceId: 21,
          resourceType: "issue_post",
          uploadId: "11",
        },
      ),
    ).resolves.toMatchObject({
      assetId: 11,
      containerType: "issue_post",
      uploadId: "11",
    });
  });

  it("rejects project-bound upload finalize when actor lacks project management rights", async () => {
    canManageProjectUploadTargetMock.mockResolvedValueOnce(false);
    await expect(
      finalizeUploadSession(
        {
          actorId: 7,
          isAnonymous: false,
          isSiteAdmin: false,
          loginId: "doortts",
        },
        {
          resourceId: 21,
          resourceType: "board_post",
          uploadId: "11",
        },
      ),
    ).rejects.toMatchObject({
      message: "Project upload target update is not allowed.",
    });
  });
});
