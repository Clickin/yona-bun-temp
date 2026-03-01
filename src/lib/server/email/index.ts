import { buildResetPasswordTemplate, type ResetPasswordTemplateInput } from './templates';

export interface ResetPasswordNotificationInput extends ResetPasswordTemplateInput {
	to: string;
}

export interface EmailProvider {
	sendResetPasswordNotification(input: ResetPasswordNotificationInput): Promise<void>;
}

export class EmailNotConfiguredError extends Error {
	public readonly code = 'EMAIL_NOT_CONFIGURED';

	constructor(message = 'SMTP is not configured. Email sending is unavailable.') {
		super(message);
		this.name = 'EmailNotConfiguredError';
	}
}

export class EmailProviderNotImplementedError extends Error {
	public readonly code = 'EMAIL_PROVIDER_NOT_IMPLEMENTED';

	constructor(message = 'SMTP transport provider is not implemented in this task.') {
		super(message);
		this.name = 'EmailProviderNotImplementedError';
	}
}

export class DevLogEmailProvider implements EmailProvider {
	public async sendResetPasswordNotification(input: ResetPasswordNotificationInput): Promise<void> {
		const template = buildResetPasswordTemplate(input);

		console.info('[email:dev-log] Reset password email');
		console.info('[email:dev-log] to=', input.to);
		console.info('[email:dev-log] subject=', template.subject);
		console.info('[email:dev-log] text=', template.text);
	}
}

export class NotConfiguredEmailProvider implements EmailProvider {
	private readonly message: string;

	constructor(message = 'SMTP is not configured. Email sending is unavailable.') {
		this.message = message;
	}

	public async sendResetPasswordNotification(): Promise<void> {
		throw new EmailNotConfiguredError(this.message);
	}
}

export class UnimplementedSmtpEmailProvider implements EmailProvider {
	public async sendResetPasswordNotification(): Promise<void> {
		throw new EmailProviderNotImplementedError();
	}
}

export interface EmailProviderOptions {
	nodeEnv?: string;
	smtpEnabled?: boolean;
}

function parseBooleanFlag(value: string | undefined): boolean {
	if (value === undefined) {
		return false;
	}

	return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

export function resolveEmailProvider(options: EmailProviderOptions = {}): EmailProvider {
	const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV ?? 'development';
	const smtpEnabled = options.smtpEnabled ?? parseBooleanFlag(process.env.SMTP_ENABLED);

	if (nodeEnv === 'development') {
		return new DevLogEmailProvider();
	}

	if (!smtpEnabled) {
		return new NotConfiguredEmailProvider();
	}

	return new UnimplementedSmtpEmailProvider();
}
