import { prefixBasePath, type RuntimeConfig } from "../runtime-config";

export type UploadedAttachment = {
  id: number;
  mimeType: string;
  name: string;
  size: number;
  url: string;
};

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
): Promise<UploadedAttachment> {
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

  const payload = (await response.json()) as unknown;
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
