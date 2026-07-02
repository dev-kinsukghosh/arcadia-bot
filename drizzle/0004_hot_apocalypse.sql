CREATE TABLE `currency_history` (
	`currency_id` varchar(100) NOT NULL,
	`date` date NOT NULL,
	`name` varchar(255) NOT NULL,
	`standard_item` varchar(100) NOT NULL,
	`nation` varchar(255) NOT NULL,
	`creator_uuid` varchar(100) NOT NULL,
	`arc_per_unit_base` decimal(12,4) NOT NULL,
	`arc_per_unit_live` decimal(12,4) NOT NULL,
	`avg_arc_per_unit_base` decimal(12,4) NOT NULL,
	`avg_arc_per_unit_live` decimal(12,4) NOT NULL,
	`scan_count` int NOT NULL DEFAULT 1,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `currency_history_currency_id_date_pk` PRIMARY KEY(`currency_id`,`date`)
);
