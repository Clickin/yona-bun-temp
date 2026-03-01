ALTER TABLE `sessions` ADD `csrf_token` varchar(255) NOT NULL AFTER `token_hash`;
