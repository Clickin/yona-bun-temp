import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@web/routes/api/repos/[repoId]/files/+server";
import { apiApp } from "$lib/server/hono/api-app";

vi.mock("$lib/server/hono/api-app", () => ({
  apiApp: {
    fetch: vi.fn(),
  },
}));

describe("GET /api/repos/[repoId]/files", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards event request to apiApp", async () => {
    vi.mocked(apiApp.fetch).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    const request = new Request(
      "http://localhost/api/repos/1001/files?branch=main&path=README.md",
      {
        method: "GET",
      },
    );

    const response = await GET({
      params: { repoId: "1001" },
      request,
      url: new URL(request.url),
    } as Parameters<typeof GET>[0]);

    expect(apiApp.fetch).toHaveBeenCalledWith(request, expect.objectContaining({ request }));
    expect(response.status).toBe(200);
  });

  it("creates fallback request from url when request is absent", async () => {
    vi.mocked(apiApp.fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "missing" }), { status: 400 }),
    );

    const url = new URL("http://localhost/api/repos/1001/files?branch=main&path=README.md");
    const response = await GET({
      params: { repoId: "1001" },
      url,
    } as Parameters<typeof GET>[0]);

    const [forwardedRequest] = vi.mocked(apiApp.fetch).mock.calls[0] ?? [];
    expect(forwardedRequest).toBeInstanceOf(Request);
    expect((forwardedRequest as Request).method).toBe("GET");
    expect((forwardedRequest as Request).url).toBe(url.toString());
    expect(response.status).toBe(400);
  });
});
