CREATE TABLE IF NOT EXISTS `internal` (
	`id` varchar(100) NOT NULL,
	`value` varchar(500) NOT NULL,
	CONSTRAINT `internal_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP TABLE IF EXISTS `currency_scans`;