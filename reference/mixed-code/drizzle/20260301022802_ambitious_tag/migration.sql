-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `assignee` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`user_id` bigint(20) DEFAULT NULL,
	`project_id` bigint(20) DEFAULT NULL
);
--> statement-breakpoint
CREATE TABLE `attachment` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`name` varchar(255) DEFAULT 'NULL',
	`hash` varchar(255) DEFAULT 'NULL',
	`container_type` varchar(20) DEFAULT 'NULL',
	`mime_type` varchar(255) DEFAULT 'NULL',
	`size` bigint(20) DEFAULT NULL,
	`container_id` bigint(20) NOT NULL,
	`created_date` datetime DEFAULT NULL,
	`owner_login_id` varchar(255) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `comment_thread` (
	`dtype` varchar(10) NOT NULL,
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`author_id` bigint(20) DEFAULT NULL,
	`author_login_id` varchar(255) DEFAULT 'NULL',
	`author_name` varchar(255) DEFAULT 'NULL',
	`state` varchar(6) DEFAULT 'NULL',
	`created_date` datetime DEFAULT NULL,
	`pull_request_id` bigint(20) DEFAULT NULL,
	`project_id` bigint(20) DEFAULT NULL,
	`prev_commit_id` varchar(255) DEFAULT 'NULL',
	`commit_id` varchar(255) DEFAULT 'NULL',
	`path` varchar(255) DEFAULT 'NULL',
	`start_side` varchar(1) DEFAULT 'NULL',
	`start_line` int(11) DEFAULT NULL,
	`start_column` int(11) DEFAULT NULL,
	`end_side` varchar(1) DEFAULT 'NULL',
	`end_line` int(11) DEFAULT NULL,
	`end_column` int(11) DEFAULT NULL
);
--> statement-breakpoint
CREATE TABLE `comment_thread_n4user` (
	`comment_thread_id` bigint(20) NOT NULL,
	`n4user_id` bigint(20) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `commit_comment` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`project_id` bigint(20) DEFAULT NULL,
	`path` varchar(255) DEFAULT 'NULL',
	`line` int(11) DEFAULT NULL,
	`side` varchar(1) DEFAULT 'NULL',
	`contents` longtext DEFAULT NULL,
	`created_date` datetime DEFAULT NULL,
	`author_id` bigint(20) DEFAULT NULL,
	`author_login_id` varchar(255) DEFAULT 'NULL',
	`author_name` varchar(255) DEFAULT 'NULL',
	`commit_id` varchar(255) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `email` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`user_id` bigint(20) DEFAULT NULL,
	`email` varchar(255) DEFAULT 'NULL',
	`valid` tinyint(1) DEFAULT false,
	`token` varchar(255) DEFAULT 'NULL',
	CONSTRAINT `uq_email_email_valid` UNIQUE INDEX(`email`,`valid`)
);
--> statement-breakpoint
CREATE TABLE `favorite_issue` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`user_id` bigint(20) DEFAULT NULL,
	`issue_id` bigint(20) DEFAULT NULL,
	CONSTRAINT `uq_favorite_issue_user_id_issue_id_1` UNIQUE INDEX(`user_id`,`issue_id`)
);
--> statement-breakpoint
CREATE TABLE `favorite_organization` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`user_id` bigint(20) DEFAULT NULL,
	`organization_id` bigint(20) DEFAULT NULL,
	`organization_name` varchar(255) DEFAULT 'NULL',
	CONSTRAINT `uq_favorite_organization_user_id_organization_id_1` UNIQUE INDEX(`user_id`,`organization_id`)
);
--> statement-breakpoint
CREATE TABLE `favorite_project` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`user_id` bigint(20) DEFAULT NULL,
	`project_id` bigint(20) DEFAULT NULL,
	`owner` varchar(255) DEFAULT 'NULL',
	`project_name` varchar(255) DEFAULT 'NULL',
	CONSTRAINT `uq_favorite_project_user_id_project_id_1` UNIQUE INDEX(`user_id`,`project_id`)
);
--> statement-breakpoint
CREATE TABLE `issue` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`title` varchar(255) DEFAULT 'NULL',
	`body` longtext DEFAULT NULL,
	`created_date` datetime DEFAULT NULL,
	`updated_date` datetime DEFAULT NULL,
	`author_id` bigint(20) DEFAULT NULL,
	`author_login_id` varchar(255) DEFAULT 'NULL',
	`author_name` varchar(255) DEFAULT 'NULL',
	`project_id` bigint(20) DEFAULT NULL,
	`number` bigint(20) DEFAULT NULL,
	`num_of_comments` int(11) DEFAULT NULL,
	`state` int(11) DEFAULT NULL,
	`due_date` datetime DEFAULT NULL,
	`milestone_id` bigint(20) DEFAULT NULL,
	`assignee_id` bigint(20) DEFAULT NULL,
	`history` longtext DEFAULT NULL,
	`parent_id` bigint(20) DEFAULT NULL,
	`weight` tinyint(2) DEFAULT 0,
	`updated_by_author_id` bigint(20) DEFAULT NULL,
	`is_draft` tinyint(1) DEFAULT false,
	CONSTRAINT `uq_issue_1` UNIQUE INDEX(`project_id`,`number`)
);
--> statement-breakpoint
CREATE TABLE `issue_comment` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`contents` longtext DEFAULT NULL,
	`created_date` datetime DEFAULT NULL,
	`author_id` bigint(20) DEFAULT NULL,
	`author_login_id` varchar(255) DEFAULT 'NULL',
	`author_name` varchar(255) DEFAULT 'NULL',
	`issue_id` bigint(20) DEFAULT NULL,
	`project_id` bigint(20) NOT NULL,
	`parent_comment_id` bigint(20) DEFAULT NULL
);
--> statement-breakpoint
CREATE TABLE `issue_comment_voter` (
	`issue_comment_id` bigint(20) NOT NULL,
	`user_id` bigint(20) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `issue_event` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`created` datetime DEFAULT NULL,
	`sender_login_id` varchar(255) DEFAULT 'NULL',
	`sender_email` varchar(255) DEFAULT 'NULL',
	`issue_id` bigint(20) DEFAULT NULL,
	`event_type` varchar(34) DEFAULT 'NULL',
	`old_value` longtext DEFAULT NULL,
	`new_value` longtext DEFAULT NULL
);
--> statement-breakpoint
CREATE TABLE `issue_issue_label` (
	`issue_id` bigint(20) NOT NULL,
	`issue_label_id` bigint(20) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `issue_label` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`category_id` bigint(20) DEFAULT NULL,
	`color` varchar(255) DEFAULT 'NULL',
	`name` varchar(255) DEFAULT 'NULL',
	`project_id` bigint(20) DEFAULT NULL
);
--> statement-breakpoint
CREATE TABLE `issue_label_category` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`project_id` bigint(20) DEFAULT NULL,
	`name` varchar(255) DEFAULT 'NULL',
	`is_exclusive` tinyint(1) DEFAULT false
);
--> statement-breakpoint
CREATE TABLE `issue_sharer` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`created` date DEFAULT 'NULL',
	`login_id` varchar(255) DEFAULT 'NULL',
	`user_id` bigint(20) DEFAULT NULL,
	`issue_id` bigint(20) DEFAULT NULL
);
--> statement-breakpoint
CREATE TABLE `issue_voter` (
	`issue_id` bigint(20) NOT NULL,
	`user_id` bigint(20) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `label` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`category` varchar(255) DEFAULT 'NULL',
	`name` varchar(255) DEFAULT 'NULL',
	CONSTRAINT `uq_label_1` UNIQUE INDEX(`category`,`name`)
);
--> statement-breakpoint
CREATE TABLE `linked_account` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`user_credential_id` bigint(20) DEFAULT NULL,
	`provider_user_id` varchar(255) DEFAULT 'NULL',
	`provider_key` varchar(255) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `mention` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`resource_type` varchar(20) DEFAULT 'NULL',
	`resource_id` varchar(255) DEFAULT 'NULL',
	`user_id` bigint(20) DEFAULT NULL
);
--> statement-breakpoint
CREATE TABLE `milestone` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`title` varchar(255) DEFAULT 'NULL',
	`due_date` datetime DEFAULT NULL,
	`contents` longtext DEFAULT NULL,
	`state` int(11) DEFAULT NULL,
	`project_id` bigint(20) DEFAULT NULL,
	CONSTRAINT `uq_milestone_1` UNIQUE INDEX(`project_id`,`title`)
);
--> statement-breakpoint
CREATE TABLE `n4user` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`name` varchar(255) DEFAULT 'NULL',
	`login_id` varchar(255) DEFAULT 'NULL',
	`password` varchar(255) DEFAULT 'NULL',
	`password_salt` varchar(255) DEFAULT 'NULL',
	`email` varchar(255) DEFAULT 'NULL',
	`remember_me` tinyint(1) DEFAULT false,
	`state` varchar(7) DEFAULT 'NULL',
	`last_state_modified_date` datetime DEFAULT NULL,
	`created_date` datetime DEFAULT NULL,
	`lang` varchar(255) DEFAULT 'NULL',
	`token` varchar(255) DEFAULT 'NULL',
	`is_guest` tinyint(1) DEFAULT false,
	`english_name` varchar(255) DEFAULT 'NULL',
	CONSTRAINT `uq_n4user_1` UNIQUE INDEX(`login_id`),
	CONSTRAINT `uq_n4user_token` UNIQUE INDEX(`token`)
);
--> statement-breakpoint
CREATE TABLE `notification_event` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`title` varchar(255) DEFAULT 'NULL',
	`sender_id` bigint(20) DEFAULT NULL,
	`created` datetime DEFAULT NULL,
	`resource_type` varchar(20) DEFAULT 'NULL',
	`resource_id` varchar(255) DEFAULT 'NULL',
	`event_type` varchar(34) DEFAULT 'NULL',
	`old_value` longtext DEFAULT NULL,
	`new_value` longtext DEFAULT NULL
);
--> statement-breakpoint
CREATE TABLE `notification_event_n4user` (
	`notification_event_id` bigint(20) NOT NULL,
	`n4user_id` bigint(20) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notification_mail` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`notification_event_id` bigint(20) DEFAULT NULL
);
--> statement-breakpoint
CREATE TABLE `organization` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`name` varchar(255) DEFAULT 'NULL',
	`created` datetime DEFAULT NULL,
	`descr` varchar(255) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `organization_user` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`user_id` bigint(20) DEFAULT NULL,
	`organization_id` bigint(20) DEFAULT NULL,
	`role_id` bigint(20) DEFAULT NULL
);
--> statement-breakpoint
CREATE TABLE `original_email` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`message_id` varchar(255) DEFAULT 'NULL',
	`resource_type` varchar(20) DEFAULT 'NULL',
	`resource_id` varchar(255) DEFAULT 'NULL',
	`handled_date` datetime DEFAULT NULL,
	CONSTRAINT `uq_original_email_message_id` UNIQUE INDEX(`message_id`),
	CONSTRAINT `uq_original_email_1` UNIQUE INDEX(`resource_type`,`resource_id`)
);
--> statement-breakpoint
CREATE TABLE `play_evolutions` (
	`id` int(11) NOT NULL,
	`hash` varchar(255) NOT NULL,
	`applied_at` timestamp NOT NULL DEFAULT current_timestamp(),
	`apply_script` text DEFAULT NULL,
	`revert_script` text DEFAULT NULL,
	`state` varchar(255) DEFAULT 'NULL',
	`last_problem` text DEFAULT NULL
);
--> statement-breakpoint
CREATE TABLE `posting` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`title` varchar(255) DEFAULT 'NULL',
	`body` longtext DEFAULT NULL,
	`created_date` datetime DEFAULT NULL,
	`updated_date` datetime DEFAULT NULL,
	`author_id` bigint(20) DEFAULT NULL,
	`author_login_id` varchar(255) DEFAULT 'NULL',
	`author_name` varchar(255) DEFAULT 'NULL',
	`project_id` bigint(20) DEFAULT NULL,
	`number` bigint(20) DEFAULT NULL,
	`num_of_comments` int(11) DEFAULT NULL,
	`notice` tinyint(1) DEFAULT false,
	`readme` tinyint(1) DEFAULT false,
	`history` longtext DEFAULT NULL,
	`parent_id` bigint(20) DEFAULT NULL,
	`updated_by_author_id` bigint(20) DEFAULT NULL,
	CONSTRAINT `uq_posting_1` UNIQUE INDEX(`project_id`,`number`)
);
--> statement-breakpoint
CREATE TABLE `posting_comment` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`contents` longtext DEFAULT NULL,
	`created_date` datetime DEFAULT NULL,
	`author_id` bigint(20) DEFAULT NULL,
	`author_login_id` varchar(255) DEFAULT 'NULL',
	`author_name` varchar(255) DEFAULT 'NULL',
	`posting_id` bigint(20) DEFAULT NULL,
	`project_id` bigint(20) NOT NULL,
	`parent_comment_id` bigint(20) DEFAULT NULL
);
--> statement-breakpoint
CREATE TABLE `posting_issue_label` (
	`posting_id` bigint(20) NOT NULL,
	`issue_label_id` bigint(20) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `project` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`name` varchar(255) DEFAULT 'NULL',
	`overview` varchar(255) DEFAULT 'NULL',
	`vcs` varchar(255) DEFAULT 'NULL',
	`siteurl` varchar(255) DEFAULT 'NULL',
	`owner` varchar(255) DEFAULT 'NULL',
	`created_date` datetime DEFAULT NULL,
	`last_issue_number` bigint(20) DEFAULT NULL,
	`last_posting_number` bigint(20) DEFAULT NULL,
	`original_project_id` bigint(20) DEFAULT NULL,
	`last_pushed_date` datetime DEFAULT NULL,
	`default_reviewer_count` int(11) DEFAULT NULL,
	`is_using_reviewer_count` tinyint(1) DEFAULT false,
	`organization_id` bigint(20) DEFAULT NULL,
	`project_scope` varchar(9) DEFAULT 'NULL',
	`previous_owner_login_id` varchar(255) DEFAULT 'NULL',
	`previous_name` varchar(255) DEFAULT 'NULL',
	`previous_name_changed_time` bigint(20) DEFAULT NULL,
	`is_code_accessible_member_only` tinyint(1) DEFAULT false
);
--> statement-breakpoint
CREATE TABLE `project_label` (
	`project_id` bigint(20) NOT NULL,
	`label_id` bigint(20) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `project_menu_setting` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`project_id` bigint(20) DEFAULT NULL,
	`code` tinyint(1) DEFAULT false,
	`issue` tinyint(1) DEFAULT false,
	`pull_request` tinyint(1) DEFAULT false,
	`review` tinyint(1) DEFAULT false,
	`milestone` tinyint(1) DEFAULT false,
	`board` tinyint(1) DEFAULT false
);
--> statement-breakpoint
CREATE TABLE `project_pushed_branch` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`pushed_date` datetime DEFAULT NULL,
	`name` varchar(255) DEFAULT 'NULL',
	`project_id` bigint(20) DEFAULT NULL
);
--> statement-breakpoint
CREATE TABLE `project_transfer` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`sender_id` bigint(20) DEFAULT NULL,
	`destination` varchar(255) DEFAULT 'NULL',
	`project_id` bigint(20) DEFAULT NULL,
	`requested` datetime DEFAULT NULL,
	`confirm_key` varchar(255) DEFAULT 'NULL',
	`accepted` tinyint(1) DEFAULT false,
	`new_project_name` varchar(255) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `project_user` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`user_id` bigint(20) DEFAULT NULL,
	`project_id` bigint(20) DEFAULT NULL,
	`role_id` bigint(20) DEFAULT NULL
);
--> statement-breakpoint
CREATE TABLE `project_visitation` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`project_id` bigint(20) DEFAULT NULL,
	`recently_visited_projects_id` bigint(20) DEFAULT NULL,
	`visited` datetime DEFAULT NULL,
	CONSTRAINT `uq_project_visitation_1` UNIQUE INDEX(`project_id`,`recently_visited_projects_id`)
);
--> statement-breakpoint
CREATE TABLE `property` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`name` varchar(25) DEFAULT 'NULL',
	`value` varchar(255) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `pull_request` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`title` varchar(255) DEFAULT 'NULL',
	`body` longtext DEFAULT NULL,
	`to_project_id` bigint(20) DEFAULT NULL,
	`from_project_id` bigint(20) DEFAULT NULL,
	`to_branch` varchar(255) DEFAULT 'NULL',
	`from_branch` varchar(255) DEFAULT 'NULL',
	`contributor_id` bigint(20) DEFAULT NULL,
	`receiver_id` bigint(20) DEFAULT NULL,
	`created` datetime DEFAULT NULL,
	`updated` datetime DEFAULT NULL,
	`received` datetime DEFAULT NULL,
	`state` int(11) DEFAULT NULL,
	`is_conflict` tinyint(1) DEFAULT false,
	`is_merging` tinyint(1) DEFAULT false,
	`last_commit_id` varchar(255) DEFAULT 'NULL',
	`merged_commit_id_from` varchar(255) DEFAULT 'NULL',
	`merged_commit_id_to` varchar(255) DEFAULT 'NULL',
	`number` bigint(20) DEFAULT NULL
);
--> statement-breakpoint
CREATE TABLE `pull_request_commit` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`pull_request_id` bigint(20) DEFAULT NULL,
	`commit_id` varchar(255) DEFAULT 'NULL',
	`author_date` datetime DEFAULT NULL,
	`created` datetime DEFAULT NULL,
	`commit_message` longtext DEFAULT NULL,
	`commit_short_id` varchar(255) DEFAULT 'NULL',
	`author_email` varchar(255) DEFAULT 'NULL',
	`state` varchar(7) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `pull_request_event` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`sender_login_id` varchar(255) DEFAULT 'NULL',
	`pull_request_id` bigint(20) DEFAULT NULL,
	`event_type` varchar(34) DEFAULT 'NULL',
	`created` datetime DEFAULT NULL,
	`old_value` longtext DEFAULT NULL,
	`new_value` longtext DEFAULT NULL
);
--> statement-breakpoint
CREATE TABLE `pull_request_reviewers` (
	`pull_request_id` bigint(20) NOT NULL,
	`user_id` bigint(20) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recently_visited_projects` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`user_id` bigint(20) DEFAULT NULL
);
--> statement-breakpoint
CREATE TABLE `recent_issue` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`user_id` bigint(20) DEFAULT NULL,
	`issue_id` bigint(20) DEFAULT NULL,
	`posting_id` bigint(20) DEFAULT NULL,
	`title` varchar(255) DEFAULT 'NULL',
	`url` varchar(255) DEFAULT 'NULL',
	`created_date` datetime DEFAULT NULL,
	CONSTRAINT `uq_recent_issue_user_id_issue_id_1` UNIQUE INDEX(`user_id`,`issue_id`),
	CONSTRAINT `uq_recent_issue_user_id_posting_id_1` UNIQUE INDEX(`user_id`,`posting_id`)
);
--> statement-breakpoint
CREATE TABLE `recent_project` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`user_id` bigint(20) DEFAULT NULL,
	`owner` varchar(255) DEFAULT 'NULL',
	`project_id` bigint(20) DEFAULT NULL,
	`project_name` varchar(255) DEFAULT 'NULL',
	CONSTRAINT `uq_recent_project_1` UNIQUE INDEX(`user_id`,`project_id`)
);
--> statement-breakpoint
CREATE TABLE `review_comment` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`contents` longtext DEFAULT NULL,
	`created_date` datetime DEFAULT NULL,
	`author_id` bigint(20) DEFAULT NULL,
	`author_login_id` varchar(255) DEFAULT 'NULL',
	`author_name` varchar(255) DEFAULT 'NULL',
	`thread_id` bigint(20) DEFAULT NULL
);
--> statement-breakpoint
CREATE TABLE `role` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`name` varchar(255) DEFAULT 'NULL',
	`active` tinyint(1) DEFAULT false
);
--> statement-breakpoint
CREATE TABLE `site_admin` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`admin_id` bigint(20) DEFAULT NULL
);
--> statement-breakpoint
CREATE TABLE `title_head` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`project_id` bigint(20) DEFAULT NULL,
	`head_keyword` varchar(255) DEFAULT 'NULL',
	`frequency` int(11) DEFAULT NULL
);
--> statement-breakpoint
CREATE TABLE `unwatch` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`user_id` bigint(20) DEFAULT NULL,
	`resource_type` varchar(20) DEFAULT 'NULL',
	`resource_id` varchar(255) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `user_credential` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`user_id` bigint(20) DEFAULT NULL,
	`login_id` varchar(255) DEFAULT 'NULL',
	`email` varchar(255) DEFAULT 'NULL',
	`name` varchar(255) DEFAULT 'NULL',
	`active` tinyint(1) DEFAULT false,
	`email_validated` tinyint(1) DEFAULT false
);
--> statement-breakpoint
CREATE TABLE `user_enrolled_organization` (
	`user_id` bigint(20) NOT NULL,
	`organization_id` bigint(20) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_enrolled_project` (
	`user_id` bigint(20) NOT NULL,
	`project_id` bigint(20) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_project_notification` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`user_id` bigint(20) DEFAULT NULL,
	`project_id` bigint(20) DEFAULT NULL,
	`notification_type` varchar(34) DEFAULT 'NULL',
	`allowed` tinyint(1) DEFAULT false,
	CONSTRAINT `uq_user_project_notification_1` UNIQUE INDEX(`project_id`,`user_id`,`notification_type`)
);
--> statement-breakpoint
CREATE TABLE `user_setting` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`user_id` bigint(20) DEFAULT NULL,
	`login_default_page` varchar(255) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `user_verification` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`user_id` bigint(20) DEFAULT NULL,
	`login_id` varchar(255) DEFAULT 'NULL',
	`verification_code` varchar(255) DEFAULT 'NULL',
	`timestamp` bigint(20) DEFAULT NULL
);
--> statement-breakpoint
CREATE TABLE `watch` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`user_id` bigint(20) DEFAULT NULL,
	`resource_type` varchar(20) DEFAULT 'NULL',
	`resource_id` varchar(255) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `webhook` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`project_id` bigint(20) DEFAULT NULL,
	`payload_url` varchar(2000) DEFAULT 'NULL',
	`secret` varchar(250) DEFAULT 'NULL',
	`created_at` datetime DEFAULT NULL,
	`git_push` tinyint(1) DEFAULT false,
	`webhook_type` tinyint(1) DEFAULT true
);
--> statement-breakpoint
CREATE TABLE `webhook_thread` (
	`id` bigint(20) AUTO_INCREMENT NOT NULL,
	`webhook_id` bigint(20) DEFAULT NULL,
	`resource_type` varchar(20) DEFAULT 'NULL',
	`resource_id` varchar(255) DEFAULT 'NULL',
	`thread_id` varchar(2000) DEFAULT 'NULL',
	`created_at` datetime DEFAULT NULL
);
--> statement-breakpoint
CREATE INDEX `ix_issue_comment_author_id` ON `issue_comment` (`author_id`);--> statement-breakpoint
CREATE INDEX `ix_posting_comment_posting_22` ON `posting_comment` (`posting_id`);--> statement-breakpoint
CREATE INDEX `ix_organization_user_role_20` ON `organization_user` (`role_id`);--> statement-breakpoint
CREATE INDEX `ix_email_user_6` ON `email` (`user_id`);--> statement-breakpoint
CREATE INDEX `ix_posting_project_21` ON `posting` (`project_id`);--> statement-breakpoint
CREATE INDEX `ix_issue_event_issue_11` ON `issue_event` (`issue_id`);--> statement-breakpoint
CREATE INDEX `ix_n4user_email` ON `n4user` (`email`);--> statement-breakpoint
CREATE INDEX `ix_user_project_notification_project_45` ON `user_project_notification` (`project_id`);--> statement-breakpoint
CREATE INDEX `ix_favorite_organization_user_1` ON `favorite_organization` (`user_id`);--> statement-breakpoint
CREATE INDEX `ix_webhook_thread_webhook_1` ON `webhook_thread` (`webhook_id`);--> statement-breakpoint
CREATE INDEX `ix_posting_comment_author_id` ON `posting_comment` (`author_id`);--> statement-breakpoint
CREATE INDEX `ix_user_verification_user_1` ON `user_verification` (`user_id`);--> statement-breakpoint
CREATE INDEX `ix_attachment_created_date` ON `attachment` (`created_date`);--> statement-breakpoint
CREATE INDEX `ix_linked_account_user_credential_1` ON `linked_account` (`user_credential_id`);--> statement-breakpoint
CREATE INDEX `ix_issue_milestone_8` ON `issue` (`milestone_id`);--> statement-breakpoint
CREATE INDEX `ix_project_transfer_project_27` ON `project_transfer` (`project_id`);--> statement-breakpoint
CREATE INDEX `ix_favorite_issue_user_1` ON `favorite_issue` (`user_id`);--> statement-breakpoint
CREATE INDEX `ix_webhook_project_47` ON `webhook` (`project_id`);--> statement-breakpoint
CREATE INDEX `ix_mention_resource_type` ON `mention` (`resource_type`);--> statement-breakpoint
CREATE INDEX `ix_issue_author_id_state` ON `issue` (`author_id`,`state`);--> statement-breakpoint
CREATE INDEX `ix_watch_resource_id_resource_type` ON `watch` (`resource_id`,`resource_type`);--> statement-breakpoint
CREATE INDEX `ix_project_user_user_28` ON `project_user` (`user_id`);--> statement-breakpoint
CREATE INDEX `ix_assignee_project_2` ON `assignee` (`project_id`);--> statement-breakpoint
CREATE INDEX `ix_site_admin_admin_42` ON `site_admin` (`admin_id`);--> statement-breakpoint
CREATE INDEX `ix_webhook_webhook_type` ON `webhook` (`webhook_type`);--> statement-breakpoint
CREATE INDEX `ix_pull_request_toProject_33` ON `pull_request` (`to_project_id`);--> statement-breakpoint
CREATE INDEX `ix_favorite_project_project_2` ON `favorite_project` (`project_id`);--> statement-breakpoint
CREATE INDEX `ix_comment_thread_pullRequest_3` ON `comment_thread` (`pull_request_id`);--> statement-breakpoint
CREATE INDEX `ix_issue_created_date` ON `issue` (`created_date`);--> statement-breakpoint
CREATE INDEX `ix_milestone_project_16` ON `milestone` (`project_id`);--> statement-breakpoint
CREATE INDEX `ix_project_user_role_30` ON `project_user` (`role_id`);--> statement-breakpoint
CREATE INDEX `ix_recent_issue_user_1` ON `recent_issue` (`user_id`);--> statement-breakpoint
CREATE INDEX `ix_commit_comment_project_5` ON `commit_comment` (`project_id`);--> statement-breakpoint
CREATE INDEX `ix_notification_mail_notificationEvent_17` ON `notification_mail` (`notification_event_id`);--> statement-breakpoint
CREATE INDEX `ix_title_head_head_keyword` ON `title_head` (`head_keyword`);--> statement-breakpoint
CREATE INDEX `ix_pull_request_contributor_35` ON `pull_request` (`contributor_id`);--> statement-breakpoint
CREATE INDEX `ix_user_credential_user_id_1` ON `user_credential` (`user_id`);--> statement-breakpoint
CREATE INDEX `ix_issue_weight` ON `issue` (`weight`);--> statement-breakpoint
CREATE INDEX `ix_issue_comment_issue_10` ON `issue_comment` (`issue_id`);--> statement-breakpoint
CREATE INDEX `ix_project_organization_24` ON `project` (`organization_id`);--> statement-breakpoint
CREATE INDEX `ix_unwatch_user_43` ON `unwatch` (`user_id`);--> statement-breakpoint
CREATE INDEX `ix_organization_user_user_18` ON `organization_user` (`user_id`);--> statement-breakpoint
CREATE INDEX `ix_pull_request_number` ON `pull_request` (`number`);--> statement-breakpoint
CREATE INDEX `ix_project_visitation_recentlyVisitedProjects_32` ON `project_visitation` (`recently_visited_projects_id`);--> statement-breakpoint
CREATE INDEX `ix_notification_event_created` ON `notification_event` (`created`);--> statement-breakpoint
CREATE INDEX `ix_issue_label_category_12` ON `issue_label` (`category_id`);--> statement-breakpoint
CREATE INDEX `ix_issue_sharer_user_id` ON `issue_sharer` (`user_id`);--> statement-breakpoint
CREATE INDEX `ix_user_project_notification_user_44` ON `user_project_notification` (`user_id`);--> statement-breakpoint
CREATE INDEX `ix_issue_label_project_13` ON `issue_label` (`project_id`);--> statement-breakpoint
CREATE INDEX `ix_original_email_resource_id` ON `original_email` (`resource_id`);--> statement-breakpoint
CREATE INDEX `ix_issue_sharer_issue_id` ON `issue_sharer` (`issue_id`);--> statement-breakpoint
CREATE INDEX `ix_issue_parent_id` ON `issue_comment` (`parent_comment_id`);--> statement-breakpoint
CREATE INDEX `ix_posting_comment_project_id` ON `posting_comment` (`project_id`);--> statement-breakpoint
CREATE INDEX `ix_attachment_owner_login_id` ON `attachment` (`owner_login_id`);--> statement-breakpoint
CREATE INDEX `ix_posting_parent_id` ON `posting` (`parent_id`);--> statement-breakpoint
CREATE INDEX `ix_n4user_is_guest` ON `n4user` (`is_guest`);--> statement-breakpoint
CREATE INDEX `ix_issue_project_7` ON `issue` (`project_id`);--> statement-breakpoint
CREATE INDEX `ix_favorite_organization_organization_2` ON `favorite_organization` (`organization_id`);--> statement-breakpoint
CREATE INDEX `ix_webhook_thread_resource_2` ON `webhook_thread` (`resource_type`,`resource_id`);--> statement-breakpoint
CREATE INDEX `ix_project_transfer_sender_26` ON `project_transfer` (`sender_id`);--> statement-breakpoint
CREATE INDEX `ix_project_menu_setting_project_25` ON `project_menu_setting` (`project_id`);--> statement-breakpoint
CREATE INDEX `ix_issue_is_draft_2` ON `issue` (`is_draft`,`author_login_id`,`project_id`);--> statement-breakpoint
CREATE INDEX `ix_posting_parent_id` ON `posting_comment` (`parent_comment_id`);--> statement-breakpoint
CREATE INDEX `ix_user_verification_user_2` ON `user_verification` (`login_id`,`verification_code`);--> statement-breakpoint
CREATE INDEX `ix_recently_visited_projects_user_40` ON `recently_visited_projects` (`user_id`);--> statement-breakpoint
CREATE INDEX `ix_issue_comment_voter_user_id` ON `issue_comment_voter` (`user_id`);--> statement-breakpoint
CREATE INDEX `ix_mention_user_15` ON `mention` (`user_id`);--> statement-breakpoint
CREATE INDEX `ix_issue_assignee_9` ON `issue` (`assignee_id`);--> statement-breakpoint
CREATE INDEX `ix_pull_request_commit_pullRequest_37` ON `pull_request_commit` (`pull_request_id`);--> statement-breakpoint
CREATE INDEX `ix_watch_user_46` ON `watch` (`user_id`);--> statement-breakpoint
CREATE INDEX `ix_assignee_user_1` ON `assignee` (`user_id`);--> statement-breakpoint
CREATE INDEX `ix_user_setting_user_1` ON `user_setting` (`user_id`);--> statement-breakpoint
CREATE INDEX `ix_favorite_issue_project_2` ON `favorite_issue` (`issue_id`);--> statement-breakpoint
CREATE INDEX `ix_webhook_git_push_only` ON `webhook` (`git_push`);--> statement-breakpoint
CREATE INDEX `ix_review_comment_thread_41` ON `review_comment` (`thread_id`);--> statement-breakpoint
CREATE INDEX `ix_project_pushed_branch_project_39` ON `project_pushed_branch` (`project_id`);--> statement-breakpoint
CREATE INDEX `ix_favorite_project_user_1` ON `favorite_project` (`user_id`);--> statement-breakpoint
CREATE INDEX `ix_project_user_project_29` ON `project_user` (`project_id`);--> statement-breakpoint
CREATE INDEX `ix_title_head_project_id` ON `title_head` (`project_id`);--> statement-breakpoint
CREATE INDEX `ix_issue_label_category_project_14` ON `issue_label_category` (`project_id`);--> statement-breakpoint
CREATE INDEX `ix_pull_request_event_pullRequest_38` ON `pull_request_event` (`pull_request_id`);--> statement-breakpoint
CREATE INDEX `ix_pull_request_fromProject_34` ON `pull_request` (`from_project_id`);--> statement-breakpoint
CREATE INDEX `ix_comment_thread_project_4` ON `comment_thread` (`project_id`);--> statement-breakpoint
CREATE INDEX `ix_issue_parent_id` ON `issue` (`parent_id`);--> statement-breakpoint
CREATE INDEX `ix_project_originalProject_23` ON `project` (`original_project_id`);--> statement-breakpoint
CREATE INDEX `ix_recent_issue_issue_2` ON `recent_issue` (`user_id`,`issue_id`);--> statement-breakpoint
CREATE INDEX `ix_issue_voter_user_id` ON `issue_voter` (`user_id`);--> statement-breakpoint
CREATE INDEX `ix_pull_request_receiver_36` ON `pull_request` (`receiver_id`);--> statement-breakpoint
CREATE INDEX `ix_project_visitation_project_31` ON `project_visitation` (`project_id`);--> statement-breakpoint
CREATE INDEX `ix_issue_sharer_login_id` ON `issue_sharer` (`login_id`);--> statement-breakpoint
CREATE INDEX `ix_issue_is_draft_1` ON `issue` (`weight`,`is_draft`,`number`,`created_date`);--> statement-breakpoint
CREATE INDEX `ix_issue_comment_project_id` ON `issue_comment` (`project_id`);--> statement-breakpoint
CREATE INDEX `ix_unwatch_resource_id_resource_type` ON `unwatch` (`resource_id`,`resource_type`);--> statement-breakpoint
CREATE INDEX `ix_recent_issue_posting_3` ON `recent_issue` (`user_id`,`posting_id`);--> statement-breakpoint
CREATE INDEX `ix_attachment_container` ON `attachment` (`container_type`,`container_id`);--> statement-breakpoint
CREATE INDEX `ix_organization_user_organization_19` ON `organization_user` (`organization_id`);--> statement-breakpoint
ALTER TABLE `issue_label` ADD CONSTRAINT `fk_issue_label_category_12` FOREIGN KEY (`category_id`) REFERENCES `issue_label_category`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `issue_label` ADD CONSTRAINT `fk_issue_label_project_13` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `project_transfer` ADD CONSTRAINT `fk_project_transfer_project_27` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `project_transfer` ADD CONSTRAINT `fk_project_transfer_sender_26` FOREIGN KEY (`sender_id`) REFERENCES `n4user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `project_user` ADD CONSTRAINT `fk_project_user_project_29` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `project_user` ADD CONSTRAINT `fk_project_user_role_30` FOREIGN KEY (`role_id`) REFERENCES `role`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `project_user` ADD CONSTRAINT `fk_project_user_user_28` FOREIGN KEY (`user_id`) REFERENCES `n4user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `unwatch` ADD CONSTRAINT `fk_unwatch_user_43` FOREIGN KEY (`user_id`) REFERENCES `n4user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `user_verification` ADD CONSTRAINT `fk_user_verification_user` FOREIGN KEY (`user_id`) REFERENCES `n4user`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `issue_label_category` ADD CONSTRAINT `fk_issue_label_category_project_14` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `pull_request_reviewers` ADD CONSTRAINT `fk_pull_request_reviewers_n4user_02` FOREIGN KEY (`user_id`) REFERENCES `n4user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `pull_request_reviewers` ADD CONSTRAINT `fk_pull_request_reviewers_pull_request_01` FOREIGN KEY (`pull_request_id`) REFERENCES `pull_request`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `issue_event` ADD CONSTRAINT `fk_issue_event_issue_11` FOREIGN KEY (`issue_id`) REFERENCES `issue`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `issue_comment_voter` ADD CONSTRAINT `fk_issue_comment_voter_issue_comment_01` FOREIGN KEY (`issue_comment_id`) REFERENCES `issue_comment`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `issue_comment_voter` ADD CONSTRAINT `fk_issue_comment_voter_n4user_02` FOREIGN KEY (`user_id`) REFERENCES `n4user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `project_pushed_branch` ADD CONSTRAINT `fk_project_pushed_branch_project_39` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `project_visitation` ADD CONSTRAINT `fk_project_visitation_project_31` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `project_visitation` ADD CONSTRAINT `fk_project_visitation_recentlyVisitedProjects_32` FOREIGN KEY (`recently_visited_projects_id`) REFERENCES `recently_visited_projects`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `webhook_thread` ADD CONSTRAINT `fk_webhook_thread_webhook` FOREIGN KEY (`webhook_id`) REFERENCES `webhook`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `milestone` ADD CONSTRAINT `fk_milestone_project_16` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `issue_comment` ADD CONSTRAINT `fk_issue_comment_issue_10` FOREIGN KEY (`issue_id`) REFERENCES `issue`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `issue_comment` ADD CONSTRAINT `fk_issue_comment_parent_id_01` FOREIGN KEY (`parent_comment_id`) REFERENCES `issue_comment`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `user_enrolled_organization` ADD CONSTRAINT `fk_user_enrolled_organization_n4user_01` FOREIGN KEY (`user_id`) REFERENCES `n4user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `user_enrolled_organization` ADD CONSTRAINT `fk_user_enrolled_organization_organization_02` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `site_admin` ADD CONSTRAINT `fk_site_admin_admin_42` FOREIGN KEY (`admin_id`) REFERENCES `n4user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `notification_mail` ADD CONSTRAINT `fk_notification_mail_notificationEvent_17` FOREIGN KEY (`notification_event_id`) REFERENCES `notification_event`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `email` ADD CONSTRAINT `fk_email_user_6` FOREIGN KEY (`user_id`) REFERENCES `n4user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `linked_account` ADD CONSTRAINT `fk_linked_account_user_1` FOREIGN KEY (`user_credential_id`) REFERENCES `user_credential`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `user_enrolled_project` ADD CONSTRAINT `fk_user_enrolled_project_n4user_01` FOREIGN KEY (`user_id`) REFERENCES `n4user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `user_enrolled_project` ADD CONSTRAINT `fk_user_enrolled_project_project_02` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `posting_issue_label` ADD CONSTRAINT `fk_posting_issue_label_issue_label_02` FOREIGN KEY (`issue_label_id`) REFERENCES `issue_label`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `posting_issue_label` ADD CONSTRAINT `fk_posting_issue_label_posting_01` FOREIGN KEY (`posting_id`) REFERENCES `posting`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `issue` ADD CONSTRAINT `fk_issue_assignee_9` FOREIGN KEY (`assignee_id`) REFERENCES `assignee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `issue` ADD CONSTRAINT `fk_issue_milestone_8` FOREIGN KEY (`milestone_id`) REFERENCES `milestone`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `issue` ADD CONSTRAINT `fk_issue_parent_id_01` FOREIGN KEY (`parent_id`) REFERENCES `issue`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `issue` ADD CONSTRAINT `fk_issue_project_7` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `commit_comment` ADD CONSTRAINT `fk_commit_comment_project_5` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `organization_user` ADD CONSTRAINT `fk_organization_user_organization_19` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `organization_user` ADD CONSTRAINT `fk_organization_user_role_20` FOREIGN KEY (`role_id`) REFERENCES `role`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `organization_user` ADD CONSTRAINT `fk_organization_user_user_18` FOREIGN KEY (`user_id`) REFERENCES `n4user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `recent_project` ADD CONSTRAINT `fk_recent_project_project_2` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `pull_request` ADD CONSTRAINT `fk_pull_request_contributor_35` FOREIGN KEY (`contributor_id`) REFERENCES `n4user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `pull_request` ADD CONSTRAINT `fk_pull_request_fromProject_34` FOREIGN KEY (`from_project_id`) REFERENCES `project`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `pull_request` ADD CONSTRAINT `fk_pull_request_receiver_36` FOREIGN KEY (`receiver_id`) REFERENCES `n4user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `pull_request` ADD CONSTRAINT `fk_pull_request_toProject_33` FOREIGN KEY (`to_project_id`) REFERENCES `project`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `issue_issue_label` ADD CONSTRAINT `fk_issue_issue_label_issue_01` FOREIGN KEY (`issue_id`) REFERENCES `issue`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `issue_issue_label` ADD CONSTRAINT `fk_issue_issue_label_issue_label_02` FOREIGN KEY (`issue_label_id`) REFERENCES `issue_label`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `mention` ADD CONSTRAINT `fk_mention_user_15` FOREIGN KEY (`user_id`) REFERENCES `n4user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `comment_thread` ADD CONSTRAINT `fk_comment_thread_project_4` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `comment_thread` ADD CONSTRAINT `fk_comment_thread_pullRequest_3` FOREIGN KEY (`pull_request_id`) REFERENCES `pull_request`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `issue_sharer` ADD CONSTRAINT `fk_issue_sharer_issue` FOREIGN KEY (`issue_id`) REFERENCES `issue`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `issue_sharer` ADD CONSTRAINT `fk_issue_sharer_user` FOREIGN KEY (`user_id`) REFERENCES `n4user`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `project_menu_setting` ADD CONSTRAINT `fk_project_menu_setting_project_25` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `assignee` ADD CONSTRAINT `fk_assignee_project_2` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `assignee` ADD CONSTRAINT `fk_assignee_user_1` FOREIGN KEY (`user_id`) REFERENCES `n4user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `issue_voter` ADD CONSTRAINT `fk_issue_voter_issue_01` FOREIGN KEY (`issue_id`) REFERENCES `issue`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `issue_voter` ADD CONSTRAINT `fk_issue_voter_n4user_02` FOREIGN KEY (`user_id`) REFERENCES `n4user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `webhook` ADD CONSTRAINT `fk_webhook_project_47` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `user_project_notification` ADD CONSTRAINT `fk_user_project_notification_project_45` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `user_project_notification` ADD CONSTRAINT `fk_user_project_notification_user_44` FOREIGN KEY (`user_id`) REFERENCES `n4user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `comment_thread_n4user` ADD CONSTRAINT `fk_comment_thread_n4user_comment_thread_01` FOREIGN KEY (`comment_thread_id`) REFERENCES `comment_thread`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `comment_thread_n4user` ADD CONSTRAINT `fk_comment_thread_n4user_n4user_02` FOREIGN KEY (`n4user_id`) REFERENCES `n4user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `recent_issue` ADD CONSTRAINT `fk_recent_issue_issue` FOREIGN KEY (`issue_id`) REFERENCES `issue`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `recent_issue` ADD CONSTRAINT `fk_recent_issue_user` FOREIGN KEY (`user_id`) REFERENCES `n4user`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `favorite_issue` ADD CONSTRAINT `fk_favorite_issue_issue` FOREIGN KEY (`issue_id`) REFERENCES `issue`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `favorite_issue` ADD CONSTRAINT `fk_favorite_issue_user` FOREIGN KEY (`user_id`) REFERENCES `n4user`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `pull_request_event` ADD CONSTRAINT `fk_pull_request_event_pullRequest_38` FOREIGN KEY (`pull_request_id`) REFERENCES `pull_request`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `favorite_project` ADD CONSTRAINT `fk_favorite_project_project` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `favorite_project` ADD CONSTRAINT `fk_favorite_project_user` FOREIGN KEY (`user_id`) REFERENCES `n4user`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `user_credential` ADD CONSTRAINT `fk_user_credential_user` FOREIGN KEY (`user_id`) REFERENCES `n4user`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `project_label` ADD CONSTRAINT `fk_project_label_label_02` FOREIGN KEY (`label_id`) REFERENCES `label`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `project_label` ADD CONSTRAINT `fk_project_label_project_01` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `watch` ADD CONSTRAINT `fk_watch_user_46` FOREIGN KEY (`user_id`) REFERENCES `n4user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `project` ADD CONSTRAINT `fk_project_organization_24` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `project` ADD CONSTRAINT `fk_project_originalProject_23` FOREIGN KEY (`original_project_id`) REFERENCES `project`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `posting_comment` ADD CONSTRAINT `fk_posting_comment_parent_id_01` FOREIGN KEY (`parent_comment_id`) REFERENCES `posting_comment`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `posting_comment` ADD CONSTRAINT `fk_posting_comment_posting_22` FOREIGN KEY (`posting_id`) REFERENCES `posting`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `user_setting` ADD CONSTRAINT `fk_user_setting_user` FOREIGN KEY (`user_id`) REFERENCES `n4user`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `title_head` ADD CONSTRAINT `fk_title_head_project` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `posting` ADD CONSTRAINT `fk_posting_parent_id_01` FOREIGN KEY (`parent_id`) REFERENCES `posting`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `posting` ADD CONSTRAINT `fk_posting_project_21` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `recently_visited_projects` ADD CONSTRAINT `fk_recently_visited_projects_user_40` FOREIGN KEY (`user_id`) REFERENCES `n4user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `review_comment` ADD CONSTRAINT `fk_review_comment_thread_41` FOREIGN KEY (`thread_id`) REFERENCES `comment_thread`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `notification_event_n4user` ADD CONSTRAINT `fk_notification_event_n4user_n4user_02` FOREIGN KEY (`n4user_id`) REFERENCES `n4user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `notification_event_n4user` ADD CONSTRAINT `fk_notification_event_n4user_notification_event_01` FOREIGN KEY (`notification_event_id`) REFERENCES `notification_event`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `favorite_organization` ADD CONSTRAINT `fk_favorite_organization_organization` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `favorite_organization` ADD CONSTRAINT `fk_favorite_organization_user` FOREIGN KEY (`user_id`) REFERENCES `n4user`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `pull_request_commit` ADD CONSTRAINT `fk_pull_request_commit_pullRequest_37` FOREIGN KEY (`pull_request_id`) REFERENCES `pull_request`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
*/