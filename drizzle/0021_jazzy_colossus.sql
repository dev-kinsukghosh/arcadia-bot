CREATE TABLE `api_snapshots` (
	`endpoint` varchar(100) NOT NULL,
	`data` text NOT NULL,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `api_snapshots_endpoint` PRIMARY KEY(`endpoint`)
);
