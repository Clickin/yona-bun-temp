import { describe, expect, it } from "vitest";
import { createApp } from "./main";

describe("createApp", () => {
  it("builds the file-based router from runtime config", () => {
    const app = createApp({
      runtimeConfig: {
        apiBaseUrl: "/yona/api",
        basePath: "/yona",
        rpcBaseUrl: "/yona/rpc",
      },
    });

    expect(app.runtimeConfig.basePath).toBe("/yona");
    expect(app.router.options.basepath).toBe("/yona");
    expect(app.title).toBe("Yona Rust Frontend");
  });
});
