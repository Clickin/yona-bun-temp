import { expect, test } from "@playwright/test";

test("mounted reverse proxy forwards session bootstrap and rpc requests", async ({ request }) => {
  const sessionResponse = await request.get("/yona/api/auth/session");
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
