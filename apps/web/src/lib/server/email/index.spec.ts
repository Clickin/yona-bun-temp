import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EmailNotConfiguredError,
  EmailProviderNotImplementedError,
  resolveEmailProvider,
  type ResetPasswordNotificationInput,
} from "./index";

const resetInput: ResetPasswordNotificationInput = {
  to: "user@example.com",
  resetLink: "https://example.com/reset?token=dev-token",
  expiresAt: "2026-03-02T00:00:00.000Z",
};

describe("resolveEmailProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses dev log provider in development even when SMTP is disabled", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const provider = resolveEmailProvider({ nodeEnv: "development", smtpEnabled: false });

    await expect(provider.sendResetPasswordNotification(resetInput)).resolves.toBeUndefined();

    const logs = infoSpy.mock.calls.map((args) => args.join(" ")).join("\n");
    expect(logs).toContain("[email:dev-log] subject=");
    expect(logs).toContain("Reset your Yona password");
    expect(logs).toContain("[email:dev-log] text=");
    expect(logs).toContain("https://example.com/reset?token=dev-token");
    expect(logs).not.toContain("[email:dev-log] html=");
  });

  it("throws EmailNotConfiguredError in production when SMTP is disabled", async () => {
    const provider = resolveEmailProvider({ nodeEnv: "production", smtpEnabled: false });

    const error = await provider
      .sendResetPasswordNotification(resetInput)
      .catch((caught) => caught as Error);

    expect(error).toBeInstanceOf(EmailNotConfiguredError);
    expect(error).toMatchObject({ code: "EMAIL_NOT_CONFIGURED" });
  });

  it("throws a distinct not-implemented error in production when SMTP is enabled", async () => {
    const provider = resolveEmailProvider({ nodeEnv: "production", smtpEnabled: true });

    const error = await provider
      .sendResetPasswordNotification(resetInput)
      .catch((caught) => caught as Error);

    expect(error).toBeInstanceOf(EmailProviderNotImplementedError);
    expect(error).toMatchObject({ code: "EMAIL_PROVIDER_NOT_IMPLEMENTED" });
    expect(error).not.toBeInstanceOf(EmailNotConfiguredError);
  });
});
