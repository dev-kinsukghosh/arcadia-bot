CREATE TABLE `player_shops` (
	`key` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`owner` varchar(255),
	`owner_name` varchar(255),
	`world` varchar(255),
	`plot_x` int,
	`plot_z` int,
	`currency` varchar(100),
	`balances` text,
	`sell_listings` text,
	`buy_listings` text,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `player_shops_key` PRIMARY KEY(`key`)
);
