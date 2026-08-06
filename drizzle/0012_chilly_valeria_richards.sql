CREATE TABLE `towny_history` (
	`name` varchar(255) NOT NULL,
	`type` varchar(50) NOT NULL,
	`date` date NOT NULL,
	`residents` int NOT NULL,
	`chunks` int NOT NULL,
	`towns_count` int NOT NULL DEFAULT 0,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `towny_history_name_type_date_pk` PRIMARY KEY(`name`,`type`,`date`)
);
