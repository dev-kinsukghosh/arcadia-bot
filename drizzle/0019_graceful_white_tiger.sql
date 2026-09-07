CREATE TABLE `player_profiles` (
	`uuid` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`display_name` varchar(255),
	`rank` varchar(100),
	`town_id` varchar(255),
	`town_name` varchar(255),
	`nation_id` varchar(255),
	`nation_name` varchar(255),
	`empire` varchar(255),
	`first_seen` timestamp NOT NULL DEFAULT (now()),
	`last_seen` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `player_profiles_uuid` PRIMARY KEY(`uuid`)
);
