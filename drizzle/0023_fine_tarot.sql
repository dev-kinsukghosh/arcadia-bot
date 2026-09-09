CREATE TABLE `event_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`guild_id` varchar(255) NOT NULL,
	`channel_id` varchar(255) NOT NULL,
	`event_type` varchar(100) NOT NULL DEFAULT 'all',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `event_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `guild_channel_idx` ON `event_notifications` (`guild_id`,`channel_id`);