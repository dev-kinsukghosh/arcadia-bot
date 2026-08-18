CREATE TABLE `guild_options` (
	`guild_id` varchar(255) NOT NULL,
	`option_id` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `guild_options_guild_id_option_id_pk` PRIMARY KEY(`guild_id`,`option_id`)
);
