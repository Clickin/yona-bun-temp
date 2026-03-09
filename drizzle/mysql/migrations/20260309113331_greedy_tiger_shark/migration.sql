CREATE TABLE `verification` (
	`id` bigint AUTO_INCREMENT PRIMARY KEY,
	`identifier` varchar(255) NOT NULL,
	`value` varchar(255) NOT NULL,
	`expires_at` datetime NOT NULL,
	`created_at` datetime DEFAULT (NULL),
	`updated_at` datetime DEFAULT (NULL),
	CONSTRAINT `uq_verification_identifier` UNIQUE INDEX(`identifier`)
);
--> statement-breakpoint
ALTER TABLE `linked_account` ADD `password` varchar(255) DEFAULT 'NULL';--> statement-breakpoint
ALTER TABLE `linked_account` ADD `access_token` longtext DEFAULT (NULL);--> statement-breakpoint
ALTER TABLE `linked_account` ADD `refresh_token` longtext DEFAULT (NULL);--> statement-breakpoint
ALTER TABLE `linked_account` ADD `id_token` longtext DEFAULT (NULL);--> statement-breakpoint
ALTER TABLE `linked_account` ADD `access_token_expires_at` datetime DEFAULT (NULL);--> statement-breakpoint
ALTER TABLE `linked_account` ADD `refresh_token_expires_at` datetime DEFAULT (NULL);--> statement-breakpoint
ALTER TABLE `linked_account` ADD `scope` varchar(255) DEFAULT 'NULL';--> statement-breakpoint
ALTER TABLE `linked_account` ADD `created_at` datetime DEFAULT (NULL);--> statement-breakpoint
ALTER TABLE `linked_account` ADD `updated_at` datetime DEFAULT (NULL);--> statement-breakpoint
ALTER TABLE `user_credential` ADD `image` varchar(255) DEFAULT 'NULL';--> statement-breakpoint
ALTER TABLE `user_credential` ADD `created_at` datetime DEFAULT (NULL);--> statement-breakpoint
ALTER TABLE `user_credential` ADD `updated_at` datetime DEFAULT (NULL);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_user_credential_email` ON `user_credential` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_user_credential_login_id` ON `user_credential` (`login_id`);--> statement-breakpoint
CREATE INDEX `ix_verification_expires_at` ON `verification` (`expires_at`);
