CREATE TABLE `weby_custom` (
	`id` varchar(100) NOT NULL,
	`value` varchar(255) NOT NULL,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weby_custom_id` PRIMARY KEY(`id`)
);
