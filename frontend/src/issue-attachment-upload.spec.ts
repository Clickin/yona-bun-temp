import { describe, expect, it, vi } from "vitest";
import { uploadTemporaryAttachment } from "./api/attachments";

describe("issue attachment upload", () => {
  it("posts image uploads to the legacy files endpoint with csrf metadata", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        id: "901",
        mimeType: "image/png",
        name: "paste.png",
        size: "12",
        url: "/yona/files/901",
      }),
    ) as unknown as typeof fetch;
    const file = new File(["fake image"], "paste.png", {
      type: "image/png",
    });

    const attachment = await uploadTemporaryAttachment(
      { apiBaseUrl: "/yona/api", basePath: "/yona" },
      "csrf-123",
      file,
      fetchImpl,
    );

    expect(attachment).toEqual({
      id: 901,
      mimeType: "image/png",
      name: "paste.png",
      size: 12,
      url: "/yona/files/901",
    });
    expect(fetchImpl).toHaveBeenCalledOnce();

    const [url, init] = vi.mocked(fetchImpl).mock.calls[0];
    expect(url).toBe("/yona/files");
    expect(init?.credentials).toBe("include");
    expect(init?.headers).toEqual({
      "x-csrf-token": "csrf-123",
    });
    expect(init?.method).toBe("POST");

    const body = init?.body as FormData;
    const uploadedFile = body.get("filePath");
    expect(uploadedFile).toBeInstanceOf(File);
    expect((uploadedFile as File).name).toBe("paste.png");
    expect((uploadedFile as File).type).toBe("image/png");
  });
});
