CREATE TABLE `api_endpoints` (
	`endpoint` varchar(255) NOT NULL,
	`status_code` int NOT NULL,
	`sample_response` text,
	`discovered_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `api_endpoints_endpoint` PRIMARY KEY(`endpoint`)
);
