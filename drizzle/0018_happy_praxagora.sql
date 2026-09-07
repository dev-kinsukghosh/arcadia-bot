CREATE TABLE `events_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`event_data` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `events_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wars_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`war_time` boolean NOT NULL DEFAULT false,
	`active_wars_count` int NOT NULL DEFAULT 0,
	`war_data` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wars_history_id` PRIMARY KEY(`id`)
);
