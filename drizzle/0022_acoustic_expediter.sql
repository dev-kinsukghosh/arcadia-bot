CREATE TABLE `s_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`timestamp` bigint NOT NULL,
	`type` varchar(100) NOT NULL,
	`message` text,
	`data` text,
	`event_hash` varchar(64) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `s_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `s_events_event_hash_unique` UNIQUE(`event_hash`)
);
--> statement-breakpoint
CREATE INDEX `timestamp_idx` ON `s_events` (`timestamp`);--> statement-breakpoint
CREATE INDEX `type_idx` ON `s_events` (`type`);