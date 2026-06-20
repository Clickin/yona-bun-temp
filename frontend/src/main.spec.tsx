import { describe, expect, it } from "vitest";
import { createApp } from "./main";

describe("createApp", () => {
  it("builds the file-based router from runtime config", () => {
    const app = createApp({
      runtimeConfig: {
        apiBaseUrl: "/yona/api",
        basePath: "/yona",
      },
    });

    expect(app.runtimeConfig.basePath).toBe("/yona");
    expect(app.router.options.basepath).toBe("/yona");
    expect(app.title).toBe("Yona");
  });

  it("uses the runtime site name as the app title fallback", () => {
    const app = createApp({
      runtimeConfig: {
        apiBaseUrl: "/yona/api",
        basePath: "/yona",
        siteName: "Legacy Yona",
      },
    });

    expect(app.title).toBe("Legacy Yona");
  });
});
