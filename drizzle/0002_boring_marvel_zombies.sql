CREATE TABLE `item_notifications` (
	`user_id` varchar(255) NOT NULL,
	`item` varchar(255) NOT NULL,
	`channel_id` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `item_notifications_user_id_item_pk` PRIMARY KEY(`user_id`,`item`)
);
