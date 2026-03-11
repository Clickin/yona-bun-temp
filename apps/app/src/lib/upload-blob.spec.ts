import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { persistUploadBlob, persistUploadStream } from "./upload-blob";

describe("persistUploadBlob", () => {
  let uploadRoot: string;

  beforeEach(async () => {
    uploadRoot = await mkdtemp(join(tmpdir(), "yona-upload-blob-"));
  });

  afterEach(async () => {
    await rm(uploadRoot, { force: true, recursive: true });
  });

  it("streams an uploaded file into a hashed blob path", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const expectedHash = createHash("sha256").update(bytes).digest("hex");

    const result = await persistUploadBlob({
      file: new File([bytes], "avatar.png", { type: "image/png" }),
      uploadRoot,
    });

    expect(result).toEqual({ hash: expectedHash, size: bytes.byteLength });
    await expect(readFile(join(uploadRoot, expectedHash))).resolves.toEqual(Buffer.from(bytes));
  });

  it("reuses an existing hashed blob path without leaving temp files behind", async () => {
    const bytes = new Uint8Array([9, 8, 7, 6]);
    const expectedHash = createHash("sha256").update(bytes).digest("hex");

    await persistUploadBlob({
      file: new File([bytes], "first.bin", { type: "application/octet-stream" }),
      uploadRoot,
    });

    const result = await persistUploadBlob({
      file: new File([bytes], "second.bin", { type: "application/octet-stream" }),
      uploadRoot,
    });

    expect(result).toEqual({ hash: expectedHash, size: bytes.byteLength });
    await expect(readFile(join(uploadRoot, expectedHash))).resolves.toEqual(Buffer.from(bytes));
    await expect(readdir(uploadRoot)).resolves.toEqual([expectedHash]);
  });

  it("rejects oversized streams and cleans up temp files", async () => {
    const first = new Uint8Array([1, 2, 3]);
    const second = new Uint8Array([4, 5, 6]);

    await expect(
      persistUploadStream({
        maxBytes: 4,
        stream: new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(first);
            controller.enqueue(second);
            controller.close();
          },
        }),
        uploadRoot,
      }),
    ).rejects.toThrow("File too large.");

    await expect(readdir(uploadRoot)).resolves.toEqual([]);
  });
});
