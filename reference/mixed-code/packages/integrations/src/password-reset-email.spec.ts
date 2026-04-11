import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildPasswordResetUrl,
  buildPasswordResetEmailContent,
  DevLogPasswordResetEmailSender,
  EmailNotConfiguredError,
  PasswordResetRuntimeConfigError,
  readPasswordResetPublicOrigin,
  resolvePasswordResetEmailSender,
  validatePasswordResetRuntimeConfig,
} from "./password-reset-email";

const ORIGINAL_ENV = { ...process.env };

describe("password reset email", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.restoreAllMocks();
  });

  it("renders password reset content with reset url in html and text", async () => {
    const content = await buildPasswordResetEmailContent({
      expiresAt: new Date("2026-03-08T10:00:00.000Z"),
      loginId: "door",
      resetUrl: "https://yona.test/reset-password?token=abc123",
      to: "door@example.com",
    });

    expect(content.subject).toBe("Reset your Yona password");
    expect(content.html).toContain("https://yona.test/reset-password?token=abc123");
    expect(content.text).toContain("https://yona.test/reset-password?token=abc123");
  });

  it("uses the dev-log sender outside production", () => {
    process.env.NODE_ENV = "development";
    process.env.SMTP_ENABLED = "false";

    expect(resolvePasswordResetEmailSender()).toBeInstanceOf(DevLogPasswordResetEmailSender);
  });

  it("uses the configured public origin for reset links", () => {
    process.env.NODE_ENV = "production";
    process.env.YONA_PUBLIC_ORIGIN = "https://public.yona.test";

    expect(buildPasswordResetUrl("abc123")).toBe(
      "https://public.yona.test/reset-password?token=abc123",
    );
  });

  it("falls back to the local dev origin when public origin is unset outside production", () => {
    process.env.NODE_ENV = "development";
    delete process.env.YONA_PUBLIC_ORIGIN;

    expect(readPasswordResetPublicOrigin().toString()).toBe("http://localhost:3001/");
  });

  it("fails closed in production when smtp is not configured", () => {
    process.env.NODE_ENV = "production";
    process.env.SMTP_ENABLED = "false";

    expect(() => resolvePasswordResetEmailSender()).toThrow(EmailNotConfiguredError);
  });

  it("fails closed in production when the trusted public origin is missing", () => {
    process.env.NODE_ENV = "production";
    process.env.SMTP_ENABLED = "true";
    process.env.SMTP_HOST = "smtp.yona.test";
    process.env.SMTP_FROM = "noreply@yona.test";
    process.env.SMTP_USER = "mailer";
    process.env.SMTP_PASS = "secret";
    delete process.env.YONA_PUBLIC_ORIGIN;

    expect(() => validatePasswordResetRuntimeConfig()).toThrow(PasswordResetRuntimeConfigError);
  });
});
