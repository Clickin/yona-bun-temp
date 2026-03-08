import { describe, expect, it } from "vitest";
import { Route } from "./callback";

function getCallbackHandler() {
  return (
    Route.options.server!.handlers as {
      GET: (input: { params: { provider: string } }) => Promise<Response>;
    }
  ).GET;
}

describe("/api/auth/provider/$provider/callback route", () => {
  it("keeps supported providers reserved until OAuth migration lands", async () => {
    const response = await getCallbackHandler()({
      params: {
        provider: "github",
      },
    });

    expect(response.status).toBe(501);
    await expect(response.json()).resolves.toEqual({
      error:
        "OAuth callback contract is reserved in apps/app, but provider exchange is still pending migration.",
      provider: "github",
    });
  });

  it("rejects unsupported providers with 400", async () => {
    const response = await getCallbackHandler()({
      params: {
        provider: "gitlab",
      },
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Unsupported OAuth provider.",
      provider: "gitlab",
    });
  });
});
