-- P0-B local deterministic existing-DB adopt fixture.
--
-- Source: representative legacy Yona table/data shape from yona-original test
-- fixture identifiers, loaded on top of the current manifest-backed SQLite schema.
-- This is not an unmodified MariaDB/MySQL production dump; it stays checked in
-- as the external-service-free fallback beside the ignored local dump smoke.

INSERT INTO `role` (`id`, `name`, `active`) VALUES
  (1, 'manager', 1),
  (2, 'member', 1);

INSERT INTO `n4user` (
  `id`, `name`, `login_id`, `password`, `password_salt`, `email`,
  `remember_me`, `state`, `last_state_modified_date`, `created_date`, `lang`,
  `token`, `is_guest`, `english_name`
) VALUES
  (1, 'Yobi Admin', 'admin', 'legacy-password-hash', 'legacy-salt',
   'admin@example.com', 0, 'ACTIVE', 1700000000000, 1700000000000, 'ko',
   'legacy-admin-token', 0, 'Yobi Admin'),
  (2, 'Yobi User', 'yobi', 'legacy-password-hash-2', 'legacy-salt-2',
   'yobi@example.com', 0, 'ACTIVE', 1700000001000, 1700000001000, 'ko',
   'legacy-yobi-token', 0, 'Yobi User');

INSERT INTO `user_credential` (
  `id`, `user_id`, `login_id`, `email`, `name`, `active`, `email_validated`,
  `image`, `created_at`, `updated_at`
) VALUES
  (1, 1, 'admin', 'admin@example.com', 'Yobi Admin', 1, 1, NULL,
   1700000000000, 1700000000000),
  (2, 2, 'yobi', 'yobi@example.com', 'Yobi User', 1, 1, NULL,
   1700000001000, 1700000001000);

INSERT INTO `project` (
  `id`, `name`, `overview`, `vcs`, `siteurl`, `owner`, `created_date`,
  `last_issue_number`, `last_posting_number`, `original_project_id`,
  `last_pushed_date`, `default_reviewer_count`, `is_using_reviewer_count`,
  `organization_id`, `project_scope`, `previous_owner_login_id`,
  `previous_name`, `previous_name_changed_time`, `is_code_accessible_member_only`
) VALUES
  (1, 'projectYobi', 'Legacy-like project fixture for existing DB adopt.',
   'GIT', NULL, 'admin', 1700000010000, 1, 1, NULL, NULL, 1, 0, NULL,
   'public', NULL, NULL, NULL, 0);

INSERT INTO `project_user` (`id`, `user_id`, `project_id`, `role_id`) VALUES
  (1, 1, 1, 1),
  (2, 2, 1, 2);

INSERT INTO `issue` (
  `id`, `title`, `body`, `created_date`, `updated_date`, `author_id`,
  `author_login_id`, `author_name`, `project_id`, `number`, `num_of_comments`,
  `state`, `due_date`, `milestone_id`, `assignee_id`, `history`, `parent_id`,
  `weight`, `updated_by_author_id`, `is_draft`
) VALUES
  (1, 'Existing DB adopt issue', 'Preserved during validate_only then adopt.',
   1700000020000, 1700000025000, 1, 'admin', 'Yobi Admin', 1, 1, 1, 0,
   NULL, NULL, NULL, NULL, NULL, 0, 1, 0);

INSERT INTO `issue_comment` (
  `id`, `contents`, `created_date`, `author_id`, `author_login_id`,
  `author_name`, `issue_id`, `project_id`, `parent_comment_id`
) VALUES
  (1, 'Legacy-like issue comment preserved across adopt.', 1700000030000,
   2, 'yobi', 'Yobi User', 1, 1, NULL);

INSERT INTO `posting` (
  `id`, `title`, `body`, `created_date`, `updated_date`, `author_id`,
  `author_login_id`, `author_name`, `project_id`, `number`, `num_of_comments`,
  `notice`, `readme`, `history`, `parent_id`, `updated_by_author_id`
) VALUES
  (1, 'Existing DB adopt posting', 'Board data also remains untouched.',
   1700000040000, 1700000045000, 1, 'admin', 'Yobi Admin', 1, 1, 0,
   0, 0, NULL, NULL, 1);

INSERT INTO `play_evolutions` (
  `id`, `hash`, `applied_at`, `apply_script`, `revert_script`, `state`,
  `last_problem`
) VALUES
  (32, 'legacy-final-evolution-hash', 1700000050000, '-- legacy apply',
   '-- legacy revert', 'applied', NULL);
