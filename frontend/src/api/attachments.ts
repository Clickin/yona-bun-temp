import { prefixBasePath, type RuntimeConfig } from "../runtime-config";

export type UploadedAttachment = {
  id: number;
  mimeType: string;
  name: string;
  size: number;
  url: string;
};

export type UploadProgressCallback = (percentComplete: number) => void;

function readStringField(value: Record<string, unknown>, fieldName: string): string {
  const fieldValue = value[fieldName];
  return typeof fieldValue === "string" ? fieldValue : "";
}

function readNumberField(value: Record<string, unknown>, fieldName: string): number {
  const fieldValue = value[fieldName];
  if (typeof fieldValue === "number" && Number.isFinite(fieldValue)) {
    return fieldValue;
  }
  if (typeof fieldValue === "string") {
    const parsed = Number(fieldValue);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export async function uploadTemporaryAttachment(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  file: File,
  fetchImpl: typeof fetch = fetch,
  onProgress?: UploadProgressCallback,
): Promise<UploadedAttachment> {
  if (onProgress && typeof XMLHttpRequest !== "undefined") {
    return uploadTemporaryAttachmentWithProgress(runtimeConfig, csrfToken, file, onProgress);
  }

  const formData = new FormData();
  formData.set("filePath", file, file.name || "upload.bin");

  const response = await fetchImpl(prefixBasePath(runtimeConfig.basePath, "/files"), {
    body: formData,
    credentials: "include",
    headers: {
      "x-csrf-token": csrfToken,
    },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Attachment upload failed with ${response.status}.`);
  }

  return normalizeUploadedAttachment((await response.json()) as unknown);
}

function uploadTemporaryAttachmentWithProgress(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  file: File,
  onProgress: UploadProgressCallback,
): Promise<UploadedAttachment> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", prefixBasePath(runtimeConfig.basePath, "/files"));
    request.withCredentials = true;
    request.setRequestHeader("x-csrf-token", csrfToken);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.upload.onload = () => onProgress(100);
    request.onerror = () => reject(new Error("Attachment upload failed."));
    request.onabort = () => reject(new Error("Attachment upload was canceled."));
    request.onload = () => {
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(`Attachment upload failed with ${request.status}.`));
        return;
      }
      try {
        resolve(normalizeUploadedAttachment(JSON.parse(request.responseText) as unknown));
      } catch (error) {
        reject(error instanceof Error ? error : new Error("Attachment upload failed."));
      }
    };

    const formData = new FormData();
    formData.set("filePath", file, file.name || "upload.bin");
    onProgress(1);
    request.send(formData);
  });
}

function normalizeUploadedAttachment(payload: unknown): UploadedAttachment {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Attachment upload did not return metadata.");
  }

  const record = payload as Record<string, unknown>;
  const id = readNumberField(record, "id");
  if (!id) {
    throw new Error("Attachment upload did not return an attachment id.");
  }

  return {
    id,
    mimeType: readStringField(record, "mimeType"),
    name: readStringField(record, "name"),
    size: readNumberField(record, "size"),
    url: readStringField(record, "url"),
  };
}

export async function deleteTemporaryAttachment(
  runtimeConfig: RuntimeConfig,
  csrfToken: string,
  attachmentId: number,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const response = await fetchImpl(
    prefixBasePath(runtimeConfig.basePath, `/files/${encodeURIComponent(String(attachmentId))}`),
    {
      credentials: "include",
      headers: {
        "x-csrf-token": csrfToken,
      },
      method: "DELETE",
    },
  );
  if (!response.ok) {
    throw new Error(`Attachment delete failed with ${response.status}.`);
  }
}
