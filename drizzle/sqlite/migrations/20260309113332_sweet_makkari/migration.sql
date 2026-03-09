CREATE TABLE `verification` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (NULL),
	`updated_at` integer DEFAULT (NULL)
);
--> statement-breakpoint
ALTER TABLE `linked_account` ADD `password` text DEFAULT 'NULL';--> statement-breakpoint
ALTER TABLE `linked_account` ADD `access_token` text DEFAULT 'NULL';--> statement-breakpoint
ALTER TABLE `linked_account` ADD `refresh_token` text DEFAULT 'NULL';--> statement-breakpoint
ALTER TABLE `linked_account` ADD `id_token` text DEFAULT 'NULL';--> statement-breakpoint
ALTER TABLE `linked_account` ADD `access_token_expires_at` integer DEFAULT (NULL);--> statement-breakpoint
ALTER TABLE `linked_account` ADD `refresh_token_expires_at` integer DEFAULT (NULL);--> statement-breakpoint
ALTER TABLE `linked_account` ADD `scope` text DEFAULT 'NULL';--> statement-breakpoint
ALTER TABLE `linked_account` ADD `created_at` integer DEFAULT (NULL);--> statement-breakpoint
ALTER TABLE `linked_account` ADD `updated_at` integer DEFAULT (NULL);--> statement-breakpoint
ALTER TABLE `user_credential` ADD `image` text DEFAULT 'NULL';--> statement-breakpoint
ALTER TABLE `user_credential` ADD `created_at` integer DEFAULT (NULL);--> statement-breakpoint
ALTER TABLE `user_credential` ADD `updated_at` integer DEFAULT (NULL);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_user_credential_email` ON `user_credential` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_user_credential_login_id` ON `user_credential` (`login_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_verification_identifier` ON `verification` (`identifier`);--> statement-breakpoint
CREATE INDEX `ix_verification_expires_at` ON `verification` (`expires_at`);
