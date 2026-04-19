import { expect, test, type APIRequestContext } from "@playwright/test";

async function getWithStartupRetry(request: APIRequestContext, path: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      const response = await request.get(path, { timeout: 5_000 });
      if (response.status() !== 502) {
        return response;
      }
      lastError = new Error(`Received 502 for ${path}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

test("mounted reverse proxy forwards session bootstrap and rpc requests", async ({ request }) => {
  const sessionResponse = await getWithStartupRetry(request, "/yona/api/auth/session");
  expect(sessionResponse.status()).toBe(200);
  expect(sessionResponse.headers()["x-csrf-token"]).toBeTruthy();
  await expect(sessionResponse.json()).resolves.toEqual({
    session: null,
    user: null,
  });

  const rpcResponse = await request.post(
    "/yona/rpc/yona.pilot.v1.PilotService/ListProjects",
    {
      data: {},
      headers: {
        "content-type": "application/json",
      },
    },
  );
  expect(rpcResponse.status()).toBe(200);
  const rpcBody = await rpcResponse.text();
  expect(rpcBody).toContain('"projectName":"yona"');
});
