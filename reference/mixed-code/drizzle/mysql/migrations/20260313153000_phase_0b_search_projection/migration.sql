CREATE TABLE `search_document` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`document_type` varchar(32) NOT NULL,
	`document_id` bigint NOT NULL,
	`scope_kind` varchar(16) NOT NULL,
	`access_scope` varchar(32) NOT NULL,
	`organization_id` bigint,
	`project_id` bigint,
	`principal_user_id` bigint,
	`title` varchar(255) DEFAULT NULL,
	`body` longtext,
	`path` varchar(255) DEFAULT NULL,
	`document_text` longtext NOT NULL,
	`updated_date` datetime DEFAULT NULL,
	CONSTRAINT `search_document_id` PRIMARY KEY(`id`),
	CONSTRAINT `search_document_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE cascade,
	CONSTRAINT `search_document_project_id_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE cascade ON UPDATE cascade,
	CONSTRAINT `search_document_principal_user_id_n4user_id_fk` FOREIGN KEY (`principal_user_id`) REFERENCES `n4user`(`id`) ON DELETE cascade ON UPDATE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_search_document_source` ON `search_document` (`document_type`, `document_id`);
--> statement-breakpoint
CREATE INDEX `ix_search_document_scope` ON `search_document` (`scope_kind`, `organization_id`, `project_id`);
--> statement-breakpoint
CREATE INDEX `ix_search_document_access` ON `search_document` (`access_scope`, `organization_id`, `project_id`, `principal_user_id`);
--> statement-breakpoint
CREATE INDEX `ix_search_document_updated_48` ON `search_document` (`updated_date`);
--> statement-breakpoint
CREATE FULLTEXT INDEX `ft_search_document_text_49` ON `search_document` (`title`, `body`, `path`, `document_text`);
