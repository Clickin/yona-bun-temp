import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { render, toPlainText } from "@react-email/render";
import nodemailer from "nodemailer";

export interface PasswordResetEmailInput {
  expiresAt: Date;
  loginId: string;
  resetUrl: string;
  to: string;
}

export interface PasswordResetEmailContent {
  html: string;
  subject: string;
  text: string;
}

export interface PasswordResetEmailSender {
  sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<void>;
}

const DEFAULT_DEV_PUBLIC_ORIGIN = "http://localhost:3001";

export class EmailNotConfiguredError extends Error {
  public readonly code = "EMAIL_NOT_CONFIGURED";

  constructor(message = "SMTP is not configured. Email sending is unavailable.") {
    super(message);
    this.name = "EmailNotConfiguredError";
  }
}

export class PasswordResetRuntimeConfigError extends Error {
  public readonly code = "PASSWORD_RESET_RUNTIME_CONFIG_INVALID";

  constructor(message: string) {
    super(message);
    this.name = "PasswordResetRuntimeConfigError";
  }
}

interface PasswordResetEmailEnv {
  nodeEnv: string;
  smtpEnabled: boolean;
  smtpFrom: string;
  smtpHost: string;
  smtpPass: string;
  smtpPort: number;
  smtpUser: string;
}

function readEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function parseBooleanFlag(value: string): boolean {
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function parsePublicOrigin(value: string): URL {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new PasswordResetRuntimeConfigError("YONA_PUBLIC_ORIGIN must be a valid absolute URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new PasswordResetRuntimeConfigError(
      "YONA_PUBLIC_ORIGIN must use the http or https protocol.",
    );
  }

  return url;
}

function readPasswordResetEmailEnv(): PasswordResetEmailEnv {
  const smtpPort = Number.parseInt(readEnv("SMTP_PORT") || "587", 10);

  return {
    nodeEnv: readEnv("NODE_ENV") || "development",
    smtpEnabled: parseBooleanFlag(readEnv("SMTP_ENABLED")),
    smtpFrom: readEnv("SMTP_FROM"),
    smtpHost: readEnv("SMTP_HOST"),
    smtpPass: readEnv("SMTP_PASS"),
    smtpPort: Number.isFinite(smtpPort) ? smtpPort : 587,
    smtpUser: readEnv("SMTP_USER"),
  };
}

export function readPasswordResetPublicOrigin(): URL {
  const nodeEnv = readEnv("NODE_ENV") || "development";
  const configuredOrigin = readEnv("YONA_PUBLIC_ORIGIN");

  if (configuredOrigin) {
    return parsePublicOrigin(configuredOrigin);
  }

  if (nodeEnv === "production") {
    throw new PasswordResetRuntimeConfigError(
      "YONA_PUBLIC_ORIGIN is required in production for self-serve password reset.",
    );
  }

  return new URL(DEFAULT_DEV_PUBLIC_ORIGIN);
}

export function buildPasswordResetUrl(token: string): string {
  return new URL(
    `/reset-password?token=${encodeURIComponent(token)}`,
    readPasswordResetPublicOrigin(),
  ).toString();
}

function formatExpiration(value: Date): string {
  return value.toISOString();
}

function PasswordResetEmailTemplate(props: PasswordResetEmailInput) {
  return (
    <Html lang="en">
      <Head />
      <Preview>Reset your Yona password</Preview>
      <Body
        style={{
          backgroundColor: "#f4f4f5",
          fontFamily: "Arial, sans-serif",
          padding: "24px 0",
        }}
      >
        <Container
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            margin: "0 auto",
            maxWidth: "520px",
            padding: "32px",
          }}
        >
          <Section>
            <Text style={{ fontSize: "20px", fontWeight: "700", margin: "0 0 16px" }}>
              Reset your Yona password
            </Text>
            <Text style={{ color: "#52525b", fontSize: "14px", margin: "0 0 16px" }}>
              A password reset was requested for the account <strong>{props.loginId}</strong>.
            </Text>
            <Button
              href={props.resetUrl}
              style={{
                backgroundColor: "#111827",
                borderRadius: "8px",
                color: "#ffffff",
                display: "inline-block",
                fontSize: "14px",
                padding: "12px 18px",
                textDecoration: "none",
              }}
            >
              Reset password
            </Button>
            <Text style={{ color: "#52525b", fontSize: "14px", margin: "20px 0 0" }}>
              This link expires at {formatExpiration(props.expiresAt)}.
            </Text>
            <Text style={{ color: "#52525b", fontSize: "14px", margin: "12px 0 0" }}>
              If you did not request this, you can ignore this message.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export async function buildPasswordResetEmailContent(
  input: PasswordResetEmailInput,
): Promise<PasswordResetEmailContent> {
  const html = await render(<PasswordResetEmailTemplate {...input} />);
  return {
    html,
    subject: "Reset your Yona password",
    text: toPlainText(html),
  };
}

export class DevLogPasswordResetEmailSender implements PasswordResetEmailSender {
  public async sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<void> {
    const content = await buildPasswordResetEmailContent(input);

    console.info("[email:dev-log] Reset password email");
    console.info("[email:dev-log] to=", input.to);
    console.info("[email:dev-log] subject=", content.subject);
    console.info("[email:dev-log] text=", content.text);
  }
}

export class SmtpPasswordResetEmailSender implements PasswordResetEmailSender {
  public async sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<void> {
    const env = readPasswordResetEmailEnv();
    const transporter = nodemailer.createTransport({
      auth: {
        pass: env.smtpPass,
        user: env.smtpUser,
      },
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
    });
    const content = await buildPasswordResetEmailContent(input);

    await transporter.sendMail({
      from: env.smtpFrom,
      html: content.html,
      subject: content.subject,
      text: content.text,
      to: input.to,
    });
  }
}

export function resolvePasswordResetEmailSender(): PasswordResetEmailSender {
  const env = readPasswordResetEmailEnv();

  if (env.nodeEnv !== "production") {
    return new DevLogPasswordResetEmailSender();
  }

  if (!env.smtpEnabled || !env.smtpHost || !env.smtpFrom || !env.smtpUser || !env.smtpPass) {
    throw new EmailNotConfiguredError();
  }

  return new SmtpPasswordResetEmailSender();
}

export function validatePasswordResetRuntimeConfig(): void {
  readPasswordResetPublicOrigin();
  resolvePasswordResetEmailSender();
}

export async function sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<void> {
  const sender = resolvePasswordResetEmailSender();
  await sender.sendPasswordResetEmail(input);
}
