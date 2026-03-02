export interface ResetPasswordTemplateInput {
  resetLink: string;
  expiresAt?: Date | string;
}

export interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

export function buildResetPasswordTemplate(input: ResetPasswordTemplateInput): EmailTemplate {
  const expiration =
    input.expiresAt === undefined
      ? "This link expires according to server policy."
      : `This link expires at ${String(input.expiresAt)}.`;

  const subject = "Reset your Yona password";
  const text = [
    "You requested a password reset for your Yona account.",
    `Use this link to continue: ${input.resetLink}`,
    expiration,
    "If you did not request this, ignore this message.",
  ].join("\n");
  const html = [
    "<p>You requested a password reset for your Yona account.</p>",
    `<p><a href="${input.resetLink}">Reset password</a></p>`,
    `<p>${expiration}</p>`,
    "<p>If you did not request this, ignore this message.</p>",
  ].join("");

  return { subject, text, html };
}
