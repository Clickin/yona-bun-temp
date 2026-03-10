import { describe, expect, it } from "vitest";
import { consumeAuthRateLimit, resetAuthRateLimitForTests } from "./rate-limit";

describe("auth rate limit", () => {
  it("uses independent buckets per route and ip", async () => {
    await resetAuthRateLimitForTests();
    const now = new Date("2026-03-08T01:02:03.000Z");

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(consumeAuthRateLimit({ ip: "127.0.0.1", now, route: "login" })).resolves.toEqual(
        {
          ok: true,
          retryAfterSeconds: 60,
        },
      );
    }

    await expect(consumeAuthRateLimit({ ip: "127.0.0.1", now, route: "login" })).resolves.toEqual({
      ok: false,
      retryAfterSeconds: 60,
    });

    await expect(
      consumeAuthRateLimit({ ip: "127.0.0.1", now, route: "register" }),
    ).resolves.toEqual({
      ok: true,
      retryAfterSeconds: 60,
    });
    await expect(
      consumeAuthRateLimit({ ip: "127.0.0.1", now, route: "oauth-callback" }),
    ).resolves.toEqual({
      ok: true,
      retryAfterSeconds: 60,
    });
    await expect(consumeAuthRateLimit({ ip: "127.0.0.2", now, route: "login" })).resolves.toEqual({
      ok: true,
      retryAfterSeconds: 60,
    });
  });

  it("uses a separate hourly policy for forgot-password", async () => {
    await resetAuthRateLimitForTests();
    const now = new Date("2026-03-08T01:02:03.000Z");

    await expect(
      consumeAuthRateLimit({ ip: "127.0.0.1", now, route: "forgot-password" }),
    ).resolves.toEqual({
      ok: true,
      retryAfterSeconds: 3600,
    });
    await expect(
      consumeAuthRateLimit({ ip: "127.0.0.1", now, route: "forgot-password" }),
    ).resolves.toEqual({
      ok: true,
      retryAfterSeconds: 3600,
    });
    await expect(
      consumeAuthRateLimit({ ip: "127.0.0.1", now, route: "forgot-password" }),
    ).resolves.toEqual({
      ok: true,
      retryAfterSeconds: 3600,
    });
    await expect(
      consumeAuthRateLimit({ ip: "127.0.0.1", now, route: "forgot-password" }),
    ).resolves.toEqual({
      ok: false,
      retryAfterSeconds: 3600,
    });
  });

  it("does not allow concurrent bursts to overrun a bucket limit", async () => {
    await resetAuthRateLimitForTests();
    const now = new Date("2026-03-08T01:02:03.000Z");

    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        consumeAuthRateLimit({
          ip: "127.0.0.1",
          now,
          route: "login",
        }),
      ),
    );

    expect(results.filter((result) => result.ok)).toHaveLength(5);
    expect(results.filter((result) => !result.ok)).toHaveLength(5);
  });
});
