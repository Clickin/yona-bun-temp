CREATE TABLE `sessions` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`user_id` bigint(20) NOT NULL,
	`token_hash` varchar(255) NOT NULL,
	`created_at` datetime NOT NULL,
	`expires_at` datetime NOT NULL,
	`ip_address` varchar(255) DEFAULT 'NULL',
	`user_agent` text DEFAULT NULL
);
--> statement-breakpoint
CREATE INDEX `ix_sessions_user_id` ON `sessions` (`user_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_sessions_token_hash` ON `sessions` (`token_hash`);
--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `fk_sessions_user_id` FOREIGN KEY (`user_id`) REFERENCES `n4user`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
--> statement-breakpoint
ALTER TABLE `linked_account` ADD `provider_display_name` varchar(255) DEFAULT 'NULL';
--> statement-breakpoint
ALTER TABLE `linked_account` ADD `avatar_url` varchar(255) DEFAULT 'NULL';
--> statement-breakpoint
ALTER TABLE `linked_account` ADD CONSTRAINT `uq_linked_account_provider_user_id_provider_key` UNIQUE INDEX(`provider_user_id`,`provider_key`);
