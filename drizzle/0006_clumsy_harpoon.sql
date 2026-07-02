CREATE TABLE `currencies` (
	`id` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`standard_item` varchar(100) NOT NULL,
	`nation` varchar(255) NOT NULL,
	`creator_uuid` varchar(100) NOT NULL,
	`arc_per_unit_base` decimal(12,4) NOT NULL,
	`arc_per_unit_live` decimal(12,4) NOT NULL,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `currencies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `currency_scans` (
	`date` date NOT NULL,
	`scan_count` int NOT NULL DEFAULT 1,
	CONSTRAINT `currency_scans_date` PRIMARY KEY(`date`)
);
--> statement-breakpoint
ALTER TABLE `currency_history` DROP COLUMN `name`;--> statement-breakpoint
ALTER TABLE `currency_history` DROP COLUMN `standard_item`;--> statement-breakpoint
ALTER TABLE `currency_history` DROP COLUMN `nation`;--> statement-breakpoint
ALTER TABLE `currency_history` DROP COLUMN `creator_uuid`;--> statement-breakpoint
ALTER TABLE `currency_history` DROP COLUMN `scan_count`;