CREATE TABLE `al_sam` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nation_name` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `al_sam_id` PRIMARY KEY(`id`),
	CONSTRAINT `al_sam_nation_name_unique` UNIQUE(`nation_name`)
);
