CREATE TABLE `player_heads` (
	`uuid` varchar(36) NOT NULL,
	`username` varchar(255) NOT NULL,
	`png_data` mediumblob NOT NULL,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `player_heads_uuid` PRIMARY KEY(`uuid`)
);
