import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, rename, rm, stat } from "node:fs/promises";
import { join } from "node:path";

function hasErrorCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (hasErrorCode(error, "ENOENT")) {
      return false;
    }

    throw error;
  }
}

async function moveTempUploadIntoPlace(tempPath: string, finalPath: string): Promise<void> {
  try {
    await rename(tempPath, finalPath);
    return;
  } catch (error) {
    if (!(await fileExists(finalPath))) {
      throw error;
    }
  }

  await rm(tempPath, { force: true });
}

export async function persistUploadStream(input: {
  maxBytes?: number;
  stream: ReadableStream<Uint8Array<ArrayBufferLike>>;
  uploadRoot: string;
}): Promise<{
  hash: string;
  size: number;
}> {
  await mkdir(input.uploadRoot, { recursive: true });

  const tempPath = join(input.uploadRoot, `.upload-${randomUUID()}.tmp`);
  const tempFile = await open(tempPath, "wx");
  const hash = createHash("sha256");
  const reader = input.stream.getReader();

  let committed = false;
  let tempFileClosed = false;
  let size = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      if (!value || value.byteLength === 0) {
        continue;
      }

      size += value.byteLength;
      if (input.maxBytes !== undefined && size > input.maxBytes) {
        throw new Error("File too large.");
      }

      hash.update(value);
      await tempFile.write(value);
    }

    await tempFile.close();
    tempFileClosed = true;

    const digest = hash.digest("hex");
    await moveTempUploadIntoPlace(tempPath, join(input.uploadRoot, digest));
    committed = true;

    return {
      hash: digest,
      size,
    };
  } finally {
    reader.releaseLock();

    if (!tempFileClosed) {
      await tempFile.close();
    }

    if (!committed) {
      await rm(tempPath, { force: true });
    }
  }
}

export async function persistUploadBlob(input: {
  file: File;
  maxBytes?: number;
  uploadRoot: string;
}): Promise<{
  hash: string;
  size: number;
}> {
  return persistUploadStream({
    maxBytes: input.maxBytes,
    stream: input.file.stream(),
    uploadRoot: input.uploadRoot,
  });
}
