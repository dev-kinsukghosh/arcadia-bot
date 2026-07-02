CREATE TABLE `blacklist` (
	`user_id` varchar(255) NOT NULL,
	`reason` varchar(255),
	`blacklisted_by` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `blacklist_user_id` PRIMARY KEY(`user_id`)
);