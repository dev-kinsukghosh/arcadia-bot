CREATE TABLE `convoy_items` (
	`item` varchar(255) NOT NULL,
	`buy_price` decimal(10,4) NOT NULL,
	`sell_price` decimal(10,4) NOT NULL,
	`stock` int NOT NULL,
	`max_stock` int NOT NULL,
	`rarity` varchar(100) NOT NULL,
	`times_seen` int NOT NULL DEFAULT 1,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `convoy_items_item` PRIMARY KEY(`item`)
);
