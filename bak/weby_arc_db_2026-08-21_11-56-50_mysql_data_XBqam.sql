/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-11.4.4-MariaDB, for Linux (x86_64)
--
-- Host: localhost    Database: weby_arc_db
-- ------------------------------------------------------
-- Server version	11.4.4-MariaDB-log

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `__drizzle_migrations`
--

DROP TABLE IF EXISTS `__drizzle_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `__drizzle_migrations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `hash` text NOT NULL,
  `created_at` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `__drizzle_migrations`
--

LOCK TABLES `__drizzle_migrations` WRITE;
/*!40000 ALTER TABLE `__drizzle_migrations` DISABLE KEYS */;
INSERT INTO `__drizzle_migrations` VALUES
(1,'205564e865e69deed6fed306cb11e55c5c354cb9cac23410d611b65b51e05b1c',1782629609776),
(2,'d7ad43ed924c92e46030c9862f5b32e9604c9902663954d86ca26944bd1b63c1',1782969509135),
(3,'d50f959705fb5b73f10d102ae0fdc7fdf9dff429c415f7f4f83d461be9286e2b',1782971146483),
(4,'2a722727468d39d86b26d52ca343571ae085fa245d15006db3eeedb066163656',1782985260927),
(5,'bc67c0c37b96d58da024592af3b0dced92d9b6899399e27008004983bff0c6f9',1782987049479),
(6,'a95c350c6161f694dc16be794d5d7ce67c1f8987d1cd05b7b4c3feb736c969c2',1782987266335),
(7,'cfc29441d1b22b8bcac5d71bd3f10c8b624ea1d061fb124c7e4241ba32ba48ba',1782987883947),
(8,'63a7ea1a336ee4892531b12ff83fecf3b9bac75bc4f42e3e5f84e8f2abb4d276',1782988244512),
(9,'f735221e1599402e60d894ff17031949dff158441725b635ab4478cef4b30bad',1782989816805),
(10,'2f1b81d9846ca10e75492da3741f53bdacb8bb0c7251e275f150cca11e17f77d',1785956382650),
(11,'1a77ee74c70ff5f49e20fd507824c3ec956d811fa3b6df7fc6a5390985bfad75',1786007422870),
(12,'17ab08d4c922abe69507dcab4f23850c3d89beb959ed29bccf36ca9ba45688e2',1786009033131),
(13,'01d179b09de0ee5570604cd2a81fb0d930058bcc36e58cde41261b38e7a1c7c5',1786011247170),
(14,'ff895188392567a04a194b962d79e2027d04af119e82124be220194ad2167360',1786511321430),
(15,'a68d588c8712ea026e29f099145e634662e9bd5fe68b74be132ccac92002f3f4',1786974865830),
(16,'962171cf854ce668635d13e1b073f4cc0fda6924b991f0ef9ba1af948288ca9a',1787306101167);
/*!40000 ALTER TABLE `__drizzle_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `blacklist`
--

DROP TABLE IF EXISTS `blacklist`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `blacklist` (
  `user_id` varchar(255) NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `blacklisted_by` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `blacklist`
--

LOCK TABLES `blacklist` WRITE;
/*!40000 ALTER TABLE `blacklist` DISABLE KEYS */;
/*!40000 ALTER TABLE `blacklist` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `convoy_items`
--

DROP TABLE IF EXISTS `convoy_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `convoy_items` (
  `item` varchar(255) NOT NULL,
  `buy_price` decimal(10,4) NOT NULL,
  `sell_price` decimal(10,4) NOT NULL,
  `stock` int(11) NOT NULL,
  `max_stock` int(11) NOT NULL,
  `rarity` varchar(100) NOT NULL,
  `times_seen` int(11) NOT NULL DEFAULT 1,
  `current_p` tinyint(1) NOT NULL DEFAULT 0,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`item`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `convoy_items`
--

LOCK TABLES `convoy_items` WRITE;
/*!40000 ALTER TABLE `convoy_items` DISABLE KEYS */;
INSERT INTO `convoy_items` VALUES
('ACACIA_LOG',3.5000,0.2000,120,500,'COMMON',492,0,'2026-08-21 07:26:59'),
('ALLIUM',6.0000,0.5000,80,250,'RARE',192,1,'2026-08-21 09:26:59'),
('AMETHYST_SHARD',14.0000,0.2000,60,200,'RARE',182,0,'2026-08-21 08:26:59'),
('ANDESITE',1.0000,0.1500,50,250,'RARE',172,0,'2026-08-19 17:28:54'),
('AZURE_BLUET',6.0000,0.5000,80,250,'RARE',193,0,'2026-08-21 09:26:59'),
('BIRCH_LOG',3.5000,0.2000,120,500,'COMMON',485,0,'2026-08-21 07:26:59'),
('BLACK_DYE',2.8000,0.2500,120,300,'COMMON',7,0,'2026-08-21 09:26:59'),
('BLUE_DYE',2.8000,0.2500,120,300,'COMMON',10,1,'2026-08-21 09:26:59'),
('BLUE_ORCHID',6.0000,0.5000,80,250,'RARE',206,0,'2026-08-20 22:26:59'),
('BREAD',6.0000,0.1000,80,200,'COMMON',475,0,'2026-08-21 00:26:59'),
('BROWN_DYE',2.8000,0.2500,120,300,'COMMON',6,0,'2026-08-21 05:26:59'),
('CALCITE',1.0000,0.1500,50,250,'RARE',188,0,'2026-08-19 16:02:35'),
('CARROT',4.5000,0.1000,100,200,'COMMON',578,0,'2026-08-21 08:26:59'),
('COAL',7.5000,0.1000,120,500,'COMMON',579,0,'2026-08-21 07:26:59'),
('COAST_ARMOR_TRIM_SMITHING_TEMPLATE',600.0000,4.0000,10,12,'LEGENDARY',147,0,'2026-08-21 09:26:59'),
('COBBLESTONE',2.5000,0.0100,200,400,'COMMON',456,0,'2026-08-21 03:26:59'),
('COD',5.5000,0.3000,120,300,'COMMON',483,1,'2026-08-21 09:26:59'),
('CORNFLOWER',6.0000,0.5000,80,250,'RARE',192,0,'2026-08-21 03:26:59'),
('CYAN_DYE',2.8000,0.2500,120,300,'COMMON',9,0,'2026-08-21 09:26:59'),
('DANDELION',6.0000,0.5000,80,250,'RARE',191,0,'2026-08-21 09:26:59'),
('DARK_OAK_LOG',3.5000,0.2000,120,500,'COMMON',496,0,'2026-08-21 06:26:59'),
('DIAMOND',75.0000,6.0000,20,40,'LEGENDARY',453,0,'2026-08-21 01:26:59'),
('DIORITE',1.0000,0.1500,50,250,'RARE',206,0,'2026-08-19 17:28:54'),
('DIRT',2.0000,0.0200,200,400,'COMMON',473,1,'2026-08-21 09:26:59'),
('DUNE_ARMOR_TRIM_SMITHING_TEMPLATE',600.0000,4.0000,10,12,'LEGENDARY',122,0,'2026-08-21 09:26:59'),
('EMERALD',70.0000,5.5000,20,40,'LEGENDARY',441,0,'2026-08-21 06:26:59'),
('ENCHANTED_GOLDEN_APPLE',2500.0000,20.0000,4,4,'LEGENDARY',154,0,'2026-08-21 09:26:59'),
('EYE_ARMOR_TRIM_SMITHING_TEMPLATE',600.0000,4.0000,10,12,'LEGENDARY',128,0,'2026-08-21 02:26:59'),
('FEATHER',4.0000,0.2500,100,1000,'COMMON',471,0,'2026-08-19 17:28:54'),
('GLOWSTONE_DUST',16.0000,0.4000,60,180,'RARE',164,0,'2026-08-21 03:26:59'),
('GRANITE',1.0000,0.1500,50,250,'RARE',301,0,'2026-08-19 21:08:54'),
('GRAVEL',2.6000,0.0100,150,300,'COMMON',481,1,'2026-08-21 09:26:59'),
('GRAY_DYE',2.8000,0.2500,120,300,'COMMON',7,0,'2026-08-21 09:26:59'),
('GREEN_DYE',2.8000,0.2500,120,300,'COMMON',6,1,'2026-08-21 09:26:59'),
('GUNPOWDER',2.0000,0.3300,40,200,'RARE',199,0,'2026-08-20 09:24:58'),
('HONEY_BOTTLE',14.0000,1.2000,60,200,'RARE',222,1,'2026-08-21 09:26:59'),
('HOST_ARMOR_TRIM_SMITHING_TEMPLATE',600.0000,4.0000,10,12,'LEGENDARY',142,0,'2026-08-21 04:26:59'),
('JUNGLE_LOG',3.5000,0.2000,120,500,'COMMON',489,1,'2026-08-21 09:26:59'),
('LAPIS_LAZULI',11.0000,0.2000,100,100,'RARE',212,0,'2026-08-21 08:26:59'),
('LEATHER',4.0000,0.2500,100,1000,'COMMON',468,0,'2026-08-19 21:08:54'),
('LIGHT_BLUE_DYE',2.8000,0.2500,120,300,'COMMON',9,0,'2026-08-21 09:26:59'),
('LIGHT_GRAY_DYE',2.8000,0.2500,120,300,'COMMON',7,0,'2026-08-21 09:26:59'),
('LILAC',7.5000,0.6000,60,200,'RARE',179,0,'2026-08-21 06:26:59'),
('LILY_OF_THE_VALLEY',6.0000,0.5000,80,250,'RARE',206,0,'2026-08-21 05:26:59'),
('LIME_DYE',2.8000,0.2500,120,300,'COMMON',5,0,'2026-08-21 04:26:59'),
('MAGENTA_DYE',2.8000,0.2500,120,300,'COMMON',9,1,'2026-08-21 09:26:59'),
('MAGMA_BLOCK',1.0000,0.1500,50,250,'RARE',161,0,'2026-08-19 17:02:35'),
('MOSSY_COBBLESTONE',1.0000,0.1500,50,250,'RARE',193,0,'2026-08-19 14:02:35'),
('NETHERITE_SCRAP',150.0000,12.0000,8,12,'LEGENDARY',138,0,'2026-08-21 08:26:59'),
('OAK_LOG',3.5000,0.2000,120,500,'COMMON',472,0,'2026-08-21 05:26:59'),
('OBSIDIAN',16.0000,1.0000,100,500,'RARE',207,0,'2026-08-19 21:08:54'),
('ORANGE_DYE',2.8000,0.2500,120,300,'COMMON',7,1,'2026-08-21 09:26:59'),
('ORANGE_TULIP',6.0000,0.5000,80,250,'RARE',193,0,'2026-08-21 07:26:59'),
('OXEYE_DAISY',6.0000,0.5000,80,250,'RARE',202,0,'2026-08-21 09:26:59'),
('PEONY',7.5000,0.6000,60,200,'RARE',191,1,'2026-08-21 09:26:59'),
('PINK_DYE',2.8000,0.2500,120,300,'COMMON',6,0,'2026-08-21 09:26:59'),
('PINK_TULIP',6.0000,0.5000,80,250,'RARE',187,0,'2026-08-21 08:26:59'),
('PITCHER_PLANT',10.0000,0.8000,40,120,'RARE',190,0,'2026-08-21 09:26:59'),
('POPPY',6.0000,0.5000,80,250,'RARE',209,1,'2026-08-21 09:26:59'),
('POTATO',4.5000,0.1000,100,200,'COMMON',568,0,'2026-08-21 09:26:59'),
('PURPLE_DYE',2.8000,0.2500,120,300,'COMMON',8,0,'2026-08-21 07:26:59'),
('QUARTZ_BLOCK',1.0000,0.1500,50,250,'RARE',183,0,'2026-08-19 20:08:53'),
('RAISER_ARMOR_TRIM_SMITHING_TEMPLATE',600.0000,4.0000,10,12,'LEGENDARY',148,0,'2026-08-20 16:26:59'),
('RAW_COPPER',12.0000,0.2000,80,150,'RARE',164,0,'2026-08-21 05:26:59'),
('RAW_GOLD',22.0000,1.0000,40,50,'RARE',185,0,'2026-08-21 09:26:59'),
('RAW_IRON',14.0000,0.2000,60,100,'RARE',186,0,'2026-08-21 05:26:59'),
('REDSTONE',11.0000,0.2000,100,100,'RARE',4,0,'2026-08-20 23:26:59'),
('RED_DYE',2.8000,0.2500,120,300,'COMMON',6,0,'2026-08-21 06:26:59'),
('RED_TULIP',6.0000,0.5000,80,250,'RARE',180,0,'2026-08-21 06:26:59'),
('RIB_ARMOR_TRIM_SMITHING_TEMPLATE',600.0000,4.0000,10,12,'LEGENDARY',130,0,'2026-08-20 19:26:59'),
('ROSE_BUSH',7.5000,0.6000,60,200,'RARE',194,0,'2026-08-21 05:26:59'),
('SALMON',5.5000,0.3000,120,300,'COMMON',465,0,'2026-08-21 08:26:59'),
('SAND',2.6000,0.0500,150,300,'COMMON',468,0,'2026-08-21 09:26:59'),
('SENTRY_ARMOR_TRIM_SMITHING_TEMPLATE',600.0000,4.0000,10,12,'LEGENDARY',156,0,'2026-08-21 07:26:59'),
('SHAPER_ARMOR_TRIM_SMITHING_TEMPLATE',600.0000,4.0000,10,12,'LEGENDARY',152,1,'2026-08-21 09:26:59'),
('SILENCE_ARMOR_TRIM_SMITHING_TEMPLATE',600.0000,4.0000,10,12,'LEGENDARY',143,0,'2026-08-21 07:26:59'),
('SLIME_BALL',18.0000,1.5000,40,120,'RARE',181,0,'2026-08-21 04:26:59'),
('SMOOTH_BASALT',1.0000,0.1500,50,250,'RARE',200,0,'2026-08-20 09:24:58'),
('SNOUT_ARMOR_TRIM_SMITHING_TEMPLATE',600.0000,4.0000,10,12,'LEGENDARY',127,1,'2026-08-21 09:26:59'),
('SPIRE_ARMOR_TRIM_SMITHING_TEMPLATE',10000.0000,4.0000,1,12,'LEGENDARY',228,0,'2026-08-19 21:08:54'),
('SPRUCE_LOG',3.5000,0.2000,120,500,'COMMON',488,0,'2026-08-21 08:26:59'),
('STICK',1.5000,0.0100,400,1500,'COMMON',4,0,'2026-08-21 08:26:59'),
('SUGAR_CANE',4.5000,0.1000,100,200,'COMMON',478,1,'2026-08-21 09:26:59'),
('SUNFLOWER',7.5000,0.6000,60,200,'RARE',189,1,'2026-08-21 09:26:59'),
('TIDE_ARMOR_TRIM_SMITHING_TEMPLATE',600.0000,4.0000,10,12,'LEGENDARY',123,1,'2026-08-21 09:26:59'),
('TORCHFLOWER',10.0000,0.8000,40,120,'RARE',192,1,'2026-08-21 09:26:59'),
('TUFF',1.0000,0.1500,50,250,'RARE',176,0,'2026-08-19 13:02:35'),
('VEX_ARMOR_TRIM_SMITHING_TEMPLATE',600.0000,4.0000,10,12,'LEGENDARY',124,0,'2026-08-21 06:26:59'),
('WARD_ARMOR_TRIM_SMITHING_TEMPLATE',600.0000,4.0000,10,12,'LEGENDARY',127,0,'2026-08-21 04:26:59'),
('WAYFINDER_ARMOR_TRIM_SMITHING_TEMPLATE',600.0000,4.0000,10,12,'LEGENDARY',133,0,'2026-08-21 08:26:59'),
('WHEAT',4.5000,0.0500,100,200,'COMMON',573,0,'2026-08-21 09:26:59'),
('WHITE_DYE',2.8000,0.2500,120,300,'COMMON',5,0,'2026-08-21 06:26:59'),
('WHITE_TULIP',6.0000,0.5000,80,250,'RARE',199,0,'2026-08-21 08:26:59'),
('WILD_ARMOR_TRIM_SMITHING_TEMPLATE',600.0000,4.0000,10,12,'LEGENDARY',147,0,'2026-08-21 08:26:59'),
('WITHER_ROSE',10.0000,0.8000,30,80,'RARE',196,0,'2026-08-21 09:26:59'),
('YELLOW_DYE',2.8000,0.2500,120,300,'COMMON',6,0,'2026-08-21 08:26:59');
/*!40000 ALTER TABLE `convoy_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `currencies`
--

DROP TABLE IF EXISTS `currencies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `currencies` (
  `id` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `standard_item` varchar(100) NOT NULL,
  `nation` varchar(255) NOT NULL,
  `creator_uuid` varchar(100) NOT NULL,
  `arc_per_unit_base` decimal(12,4) NOT NULL,
  `arc_per_unit_live` decimal(12,4) NOT NULL,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `creator_name` varchar(255) NOT NULL DEFAULT 'Unknown',
  `active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `currencies`
--

LOCK TABLES `currencies` WRITE;
/*!40000 ALTER TABLE `currencies` DISABLE KEYS */;
INSERT INTO `currencies` VALUES
('bill','Bill','LAPIS_LAZULI','Ecuador','fd91a82c-1ef1-45cc-b85d-2fb578445c68',0.0000,0.0000,'2026-08-20 09:27:40','Kuvviine',1),
('fern','Fern','COPPER_INGOT','EcoNation','fd91a82c-1ef1-45cc-b85d-2fb578445c68',0.0000,0.0000,'2026-08-20 09:27:40','Kuvviine',1),
('fimble','Fimble','BONE','Testaria','fd91a82c-1ef1-45cc-b85d-2fb578445c68',0.0000,0.0000,'2026-08-20 09:27:40','Kuvviine',1),
('glorp','Glorp','IRON_INGOT','Ignisia','fd91a82c-1ef1-45cc-b85d-2fb578445c68',0.0000,0.0000,'2026-08-20 09:27:40','Kuvviine',1),
('gnoma','gnoma','IRON_INGOT','Gnomerstan','50379de8-a0f5-4664-8492-3c9a190a21a6',0.0000,0.0000,'2026-08-20 09:27:40','T3mp0st',1),
('koin','Koin','IRON_INGOT','TripleA','fd91a82c-1ef1-45cc-b85d-2fb578445c68',0.0000,0.0000,'2026-08-20 09:27:40','Kuvviine',1),
('mun','Mun','GOLD_INGOT','Ecotest','fd91a82c-1ef1-45cc-b85d-2fb578445c68',0.0000,0.0000,'2026-08-20 09:27:40','Kuvviine',1),
('newgnomer','newgnomer','GOLD_INGOT','GNOMESRISE','50379de8-a0f5-4664-8492-3c9a190a21a6',0.0000,0.0000,'2026-08-20 09:27:40','T3mp0st',1),
('notsu','Notsu','QUARTZ','Shikairo','208fd40d-919e-464f-afc5-15ce9d2f20ea',0.0000,0.0000,'2026-08-20 09:27:40','QuieroShika',1),
('usdollar','USDollar','GOLD_INGOT','Nation','77f41c4e-872e-4d95-b8c1-d15d43cae3da',0.0000,0.0000,'2026-08-20 09:27:40','FreddyDaSch1zo',1);
/*!40000 ALTER TABLE `currencies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `currency_history`
--

DROP TABLE IF EXISTS `currency_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `currency_history` (
  `currency_id` varchar(100) NOT NULL,
  `date` date NOT NULL,
  `arc_per_unit_base` decimal(12,4) NOT NULL,
  `arc_per_unit_live` decimal(12,4) NOT NULL,
  `avg_arc_per_unit_base` decimal(12,4) NOT NULL,
  `avg_arc_per_unit_live` decimal(12,4) NOT NULL,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`currency_id`,`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `currency_history`
--

LOCK TABLES `currency_history` WRITE;
/*!40000 ALTER TABLE `currency_history` DISABLE KEYS */;
INSERT INTO `currency_history` VALUES
('bill','2026-08-20',0.0000,0.0000,0.0000,0.0000,'2026-08-20 09:27:40'),
('bill','2026-08-21',0.0000,0.0000,0.0000,0.0000,'2026-08-21 00:27:51'),
('fern','2026-07-02',10.0000,7.4803,10.0000,6.7744,'2026-07-02 23:37:49'),
('fern','2026-07-03',10.0000,7.0491,10.0000,7.3091,'2026-07-03 23:37:50'),
('fern','2026-07-04',10.0000,6.7016,10.0000,6.8359,'2026-07-04 23:48:43'),
('fern','2026-07-05',10.0000,6.6112,10.0000,6.6376,'2026-07-05 23:48:43'),
('fern','2026-07-06',10.0000,6.5093,10.0000,6.5053,'2026-07-06 23:48:43'),
('fern','2026-07-07',10.0000,6.5766,10.0000,6.5509,'2026-07-07 23:48:44'),
('fern','2026-07-08',10.0000,6.5965,10.0000,6.5892,'2026-07-08 23:48:44'),
('fern','2026-07-09',10.0000,6.8535,10.0000,6.6461,'2026-07-09 23:48:44'),
('fern','2026-07-10',10.0000,7.8844,10.0000,7.3300,'2026-07-10 23:48:45'),
('fern','2026-07-11',10.0000,7.9709,10.0000,7.9385,'2026-07-11 23:48:45'),
('fern','2026-07-12',10.0000,8.4775,10.0000,8.1428,'2026-07-12 23:48:45'),
('fern','2026-07-13',10.0000,10.7884,10.0000,9.4424,'2026-07-13 23:48:46'),
('fern','2026-07-14',10.0000,10.9047,10.0000,10.8107,'2026-07-14 23:48:46'),
('fern','2026-07-15',10.0000,11.2427,10.0000,11.1212,'2026-07-15 23:48:46'),
('fern','2026-07-16',10.0000,11.3164,10.0000,11.2934,'2026-07-16 23:48:47'),
('fern','2026-07-17',10.0000,11.2975,10.0000,11.3111,'2026-07-17 23:48:47'),
('fern','2026-07-18',10.0000,11.2514,10.0000,11.2755,'2026-07-18 23:48:48'),
('fern','2026-07-19',10.0000,6.4986,10.0000,9.3269,'2026-07-19 23:48:49'),
('fern','2026-07-20',10.0000,6.1290,10.0000,6.4320,'2026-07-20 23:48:49'),
('fern','2026-07-21',10.0000,6.3860,10.0000,6.2869,'2026-07-21 23:48:49'),
('fern','2026-07-22',10.0000,6.4650,10.0000,6.4336,'2026-07-22 23:48:49'),
('fern','2026-07-23',10.0000,6.4898,10.0000,6.4796,'2026-07-23 23:48:49'),
('fern','2026-07-24',10.0000,6.4902,10.0000,6.4912,'2026-07-24 23:18:50'),
('fern','2026-07-25',10.0000,6.4970,10.0000,6.4947,'2026-07-25 23:48:51'),
('fern','2026-07-26',10.0000,6.4991,10.0000,6.4973,'2026-07-26 23:48:50'),
('fern','2026-07-27',10.0000,6.4997,10.0000,6.4991,'2026-07-27 20:18:51'),
('fern','2026-07-28',10.0000,6.4999,10.0000,6.4997,'2026-07-28 13:18:53'),
('fern','2026-07-29',10.0000,6.5000,10.0000,6.4999,'2026-07-29 08:48:52'),
('fern','2026-07-30',10.0000,6.5000,10.0000,6.5000,'2026-07-30 00:18:52'),
('fern','2026-07-31',10.0000,6.5000,10.0000,6.5000,'2026-07-31 00:18:53'),
('fern','2026-08-01',10.0000,6.5000,10.0000,6.5000,'2026-08-01 00:12:38'),
('fern','2026-08-02',10.0000,6.5000,10.0000,6.5000,'2026-08-02 00:17:57'),
('fern','2026-08-03',10.0000,6.5000,10.0000,6.5000,'2026-08-03 00:17:58'),
('fern','2026-08-04',10.0000,6.5000,10.0000,6.5000,'2026-08-04 00:17:58'),
('fern','2026-08-05',10.0000,6.5000,10.0000,6.5000,'2026-08-05 00:27:22'),
('fern','2026-08-06',10.0000,6.5000,10.0000,6.5000,'2026-08-06 00:26:13'),
('fern','2026-08-07',10.0000,6.5000,10.0000,6.5000,'2026-08-07 00:05:28'),
('fern','2026-08-08',10.0000,6.5000,10.0000,6.5000,'2026-08-08 00:05:26'),
('fern','2026-08-09',10.0000,6.5000,10.0000,6.5000,'2026-08-09 12:09:10'),
('fern','2026-08-10',10.0000,6.5000,10.0000,6.5000,'2026-08-10 00:09:08'),
('fern','2026-08-11',10.0000,6.5000,10.0000,6.5000,'2026-08-11 00:09:09'),
('fern','2026-08-12',10.0000,6.5000,10.0000,6.5000,'2026-08-12 00:09:08'),
('fern','2026-08-13',10.0000,6.5000,10.0000,6.5000,'2026-08-13 00:23:02'),
('fern','2026-08-14',10.0000,6.5000,10.0000,6.5000,'2026-08-14 00:23:02'),
('fern','2026-08-15',10.0000,6.5000,10.0000,6.5000,'2026-08-15 00:23:00'),
('fern','2026-08-16',10.0000,6.5000,10.0000,6.5000,'2026-08-16 00:23:01'),
('fern','2026-08-17',10.0000,6.5000,10.0000,6.5000,'2026-08-17 00:23:00'),
('fern','2026-08-18',10.0000,6.5000,10.0000,6.5000,'2026-08-18 00:28:35'),
('fern','2026-08-19',10.0000,6.5000,10.0000,6.5000,'2026-08-19 00:06:58'),
('fern','2026-08-20',0.0000,0.0000,0.0000,0.0000,'2026-08-20 09:27:40'),
('fern','2026-08-21',0.0000,0.0000,0.0000,0.0000,'2026-08-21 00:27:51'),
('fimble','2026-08-20',0.0000,0.0000,0.0000,0.0000,'2026-08-20 09:27:40'),
('fimble','2026-08-21',0.0000,0.0000,0.0000,0.0000,'2026-08-21 00:27:51'),
('glorp','2026-08-20',0.0000,0.0000,0.0000,0.0000,'2026-08-20 09:27:40'),
('glorp','2026-08-21',0.0000,0.0000,0.0000,0.0000,'2026-08-21 00:27:51'),
('gnoma','2026-08-20',0.0000,0.0000,0.0000,0.0000,'2026-08-20 09:27:40'),
('gnoma','2026-08-21',0.0000,0.0000,0.0000,0.0000,'2026-08-21 00:27:51'),
('koin','2026-08-20',0.0000,0.0000,0.0000,0.0000,'2026-08-20 09:27:40'),
('koin','2026-08-21',0.0000,0.0000,0.0000,0.0000,'2026-08-21 00:27:51'),
('mun','2026-08-20',0.0000,0.0000,0.0000,0.0000,'2026-08-20 09:27:40'),
('mun','2026-08-21',0.0000,0.0000,0.0000,0.0000,'2026-08-21 00:27:51'),
('newgnomer','2026-08-20',0.0000,0.0000,0.0000,0.0000,'2026-08-20 09:27:40'),
('newgnomer','2026-08-21',0.0000,0.0000,0.0000,0.0000,'2026-08-21 00:27:51'),
('notsu','2026-08-20',0.0000,0.0000,0.0000,0.0000,'2026-08-20 09:27:40'),
('notsu','2026-08-21',0.0000,0.0000,0.0000,0.0000,'2026-08-21 00:27:51'),
('usdollar','2026-08-20',0.0000,0.0000,0.0000,0.0000,'2026-08-20 09:27:40'),
('usdollar','2026-08-21',0.0000,0.0000,0.0000,0.0000,'2026-08-21 00:27:51');
/*!40000 ALTER TABLE `currency_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `guild_options`
--

DROP TABLE IF EXISTS `guild_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `guild_options` (
  `guild_id` varchar(255) NOT NULL,
  `option_id` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`guild_id`,`option_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `guild_options`
--

LOCK TABLES `guild_options` WRITE;
/*!40000 ALTER TABLE `guild_options` DISABLE KEYS */;
INSERT INTO `guild_options` VALUES
('1500632591982788628','pemoji','2026-08-17 18:57:10'),
('1509609728375001109','pemoji','2026-08-17 18:57:02');
/*!40000 ALTER TABLE `guild_options` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `internal`
--

DROP TABLE IF EXISTS `internal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `internal` (
  `id` varchar(100) NOT NULL,
  `value` varchar(500) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `internal`
--

LOCK TABLES `internal` WRITE;
/*!40000 ALTER TABLE `internal` DISABLE KEYS */;
INSERT INTO `internal` VALUES
('currency_scans','19|2026-08-21');
/*!40000 ALTER TABLE `internal` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_notifications`
--

DROP TABLE IF EXISTS `item_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `item_notifications` (
  `user_id` varchar(255) NOT NULL,
  `item` varchar(255) NOT NULL,
  `channel_id` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`user_id`,`item`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_notifications`
--

LOCK TABLES `item_notifications` WRITE;
/*!40000 ALTER TABLE `item_notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `item_notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `nguild_data`
--

DROP TABLE IF EXISTS `nguild_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `nguild_data` (
  `guild_id` varchar(255) NOT NULL,
  `currency` varchar(255) NOT NULL,
  PRIMARY KEY (`guild_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nguild_data`
--

LOCK TABLES `nguild_data` WRITE;
/*!40000 ALTER TABLE `nguild_data` DISABLE KEYS */;
INSERT INTO `nguild_data` VALUES
('1441435700099809331','crescent'),
('1509609728375001109','ducat'),
('1521686649245925550','antler_koruna'),
('1528519690929049642','liff_leaf');
/*!40000 ALTER TABLE `nguild_data` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `player_heads`
--

DROP TABLE IF EXISTS `player_heads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `player_heads` (
  `uuid` varchar(36) NOT NULL,
  `username` varchar(255) NOT NULL,
  `png_data` mediumblob NOT NULL,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `player_heads`
--

LOCK TABLES `player_heads` WRITE;
/*!40000 ALTER TABLE `player_heads` DISABLE KEYS */;
INSERT INTO `player_heads` VALUES
('02257e3a-3def-464b-95d5-33049ba6250c','SharperPuma1974','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0¸IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾Â#¯1Ïx¾Ìó\'Äóc›çG<–x~dó|üïFğ¿Áÿnÿ»üïFµx¾Äó\'ó˜ñ|Éæù1âù øßà7‚ÿİşw#øß*ó|ıá~=Ï×y¾Ìó7?Áóµ¾Àóe¯W{ÏÏäù øßà7‚ÿİşw#øß\r½ÜÃÏ˜çÃâù*!Ÿ?ø‘¯çùZ]àùyÕ÷üLŸLóüH<?ÿ»üïFğ¿Áÿnÿ»Qÿøû?çG/ÿ<?ï÷f¯Äóµ¾À¿Æ‹=äA<?ßùÄóÓşü;x>şw#øßà7‚ÿİşwC/÷ˆÓæùøåoştş5vï¹ƒã×İÄ¿Æğçó|üïFğ¿Áÿnÿ»üï†^áQ×˜çÃæùRø×HU#ñüE	‚ÿİşw#øßà7‚ÿİ¨ÙÌó%/•çç¿÷sy~Œx~^í=?ƒç\'Ó<?­%ÏÁÿnÿ»üïFğ¿Áÿnü#\06JY‰š\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('03ba9ca4-1496-4561-ba66-4c685709698c','ChibiPink','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ÑIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾é\'ı–y>ÇOñü,wÏóüÌvó¯±ŞÛåùY?Åó³Ü=ÏóAğ¿Áÿnÿ»üïFğ¿•`~üÏOfãùé›üG˜?Áó³Ü=ÏóAğ¿Áÿnÿ»üïFğ¿õ•¾óoy~ô¹çù)]ÏóÓ-ükä4ò¯ñJßù·<ÿ»üïFğ¿Áÿnÿ»QãíÉós³zŸ‡>øşCœÚâù¹óÂÀóóoÿH‚ÿİşw#øßà7‚ÿİ¨¼\0¿úñåùQˆçç½¿ıÉük|÷û?‚çÇiŸÇ¼Ç÷ó|üïFğ¿Áÿnÿ»üï†N.N˜çc±±Ãóóª/Ãóó:?şƒüküÖÛ¿+ÏÏıÏÏòhçƒà7‚ÿİşw#øßà7ª1ÏÏb¶ÁóóJ§^ççQwôükzyŸ¿jOäù9:ºÄóAğ¿Áÿnÿ»üïFğ¿z±7û&ó||íû~\0ÏÏá+‹ÿL›lŸüÎoãù øßà7‚ÿİşw#øß–}E}ş@\0\0\0\0IEND®B`‚','2026-08-17 13:23:05'),
('06afa24e-71cc-4858-9daa-1874f7309e45','Levniv','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0xIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾ã+4ÏÇ5Û•çç¾ı‰ççšíÊósßşÀó“ÏÏu›•çç¾Ã‰çƒà7‚ÿİşw#øßà7*/ø‘ÁóÁó\'ş5şw#øßà7‚ÿİşw£ò™ÿ×«<?÷íO<_â_ƒà7‚ÿİşw#øßà7ªø×/€yşÄó\'¯àI‚ÿİşw#øßà7‚ÿİ¨æ_çîZòü¼ö£¶ù×xÜKŸkµÍó<ÿ»üïFğ¿Áÿnÿ»¡w|ÅSæùxÜ]GüküıKş5^ü¦ÿ\Z½aÁóAğ¿Áÿnÿ»üïFğ¿ÌóóØ<?\'ë%Ÿ¸ƒçË<¯~ËÀósa:Æ¿Áÿnÿ»üïFğ¿Áÿn0ÿ{üïFğ¿Áÿnÿ»üïÆ?9ì+*£e>f\0\0\0\0IEND®B`‚','2026-08-17 14:00:53'),
('08f82bea-7604-4361-8170-f99f2324f687','FoulSewerGremlin','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ÇIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¶/{	óa×<_ÇÅ\"‚ÿİşw#øßà7‚ÿİ¨¼\0í¸y~êugx~Æß¹ç§>ü&ŸvîÏOÙÿ\nÿ»üïFğ¿Áÿnÿ»QyÊ®x~|Ú<?zÔœçG{‡<?eWü øßà7‚ÿİşw#øßÊpîAÆósšæù©Ë¯ëf<_;›<?çÆwæù9İı0ÏÁÿnÿ»üïFğ¿ÁÿnÔvÜ<?³ímİwÈó3-–<?ëß8Ëó³ù2·ğüÌ®ÙæùZñüüïFğ¿Áÿnÿ»üï†òk_Õ<¿ğOäù™†äùy«/ø>Ÿ©M<?¿ğ™ïÃóSûàùy³7{ÏÁÿnÿ»üïFğ¿ÁÿnÔ_ûå\'ñü¼Ù×ı&ÏÏİß÷š<?{—.ñ¯ñŠ¯<?×¿ÇoóüüÚG¿ÏÁÿnÿ»üïFğ¿Áÿn(¿öUÍóó ÷åùªÏ×‰Sü«\\<Ïó5<_ÏøN‚ÿİşw#øßà7‚ÿİøG)HŞa\nû\0\0\0\0IEND®B`‚','2026-08-17 14:00:00'),
('0c6de75c-4b33-48e4-98d9-1826ab941233','graavemoss','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0£IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯şìş˜y>öø×ø‹?ÿsş5îºçŸ®»çgg{›çƒà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7*/À÷ÃwòßáÒ3îãùy¥×5‚ÿİşw#øßà7‚ÿİ¨¼\0÷Œ§ğ¯ñêy4ÿ\Z¿ÿø\'ğ¯ñJ¼\ZÏÁÿnÿ»üïFğ¿ÁÿnèæÓ×šçãİ^ÿUy~~à×ÿççÕóhş5~ÿñOàùy‰=œççïñ‚ÿİşw#øßà7‚ÿİ¨¼\0yøCy~Şìğˆçç%rÏÏß>ù6Ÿ—xĞÃy~^ò×ğüüİ3ÂóAğ¿Áÿnÿ»üïFğ¿úÙı1ó|üáOş ÏÏ-×œæùÙÜÙáùyüSÆó³{éˆççÒÁŠççÑ¯úJ<ÿ»üïFğ¿Áÿnÿ»ñ,Ÿ8İöÃ–—\0\0\0\0IEND®B`‚','2026-08-17 14:00:00'),
('0c7f5604-a9ad-494b-983c-6e793f41de2c','KayleeForScale','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ËIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾Â¼¶ùW¸ñ1æù9¼´Ï¿Ææ±mŸ;+ÿ\nÿ»üïFğ¿Áÿnÿ»Qy~ç›~ççµ>ä]y~ßpŠ;+ÏÏï|Óòü¼Ö‡¼+ÏÁÿnÿ»üïFğ¿Áÿnè±¯ô\næù¸ñÑ·ğ?ÉO¸çƒà7‚ÿİşw#øßà7êæÎ&ÏÏ·½Òkò?É;ÜõS<ÿ»üïFğ¿Áÿnÿ»Q[sŸ—ø”/à_ãï¾èÓø×x‰Oùş5^æu_–çƒà7‚ÿİşw#øßà7êÿäi<?ßúÍßÏóóı_ó$Ÿk^ã¥ø×xÍÇ|&ÏÏ»Ô#y~>úã>œçƒà7‚ÿİşw#øßà7ê¯½Æ+óü<öuÅóówûÇx~Ÿòxş5^ê}_çç^÷:Ÿ{Wæù øßà7‚ÿİşw#øßúqóCŸŸ¹ï6ŸO^€‡ñ¯ñéx~†ûnãùù¸ù!ÏÁÿnÿ»üïFğ¿Áÿnü#óÄ:–åu#(\0\0\0\0IEND®B`‚','2026-08-17 13:55:01'),
('0ca7f882-f080-43e8-9eeb-52c79141ca52','Xtvr','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0+IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯vuÇ<\'ä?Âé\'ø×8wñ\"ÏÏ…Kx>şw#øßà7‚ÿİşw£ò¤ï{Ÿs/òüô}Ï\0‚ÿİşw#øßà7‚ÿİ¨ü†aø@ğ¿Áÿnÿ»üïFğ¿êêùß‹à7‚ÿİşw#øßà7ÅüïEğ¿Áÿnÿ»üïFğ¿õÚS7óáŞó·ó¯qí©›ù@ğ¿Áÿnÿ»üïFğ¿êêùW§ÿL]íùW øßà7‚ÿİşw#øßÊ¿RW{ş!øßà7‚ÿİşw#øßzÌÉ$\n\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('0d868afb-3c3e-4afa-a2ba-a25edb16e7cf','tsukiCat11','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾Ûk?Èüø˜zş5¾êk~ˆÿ\0ÿ»üïFğ¿Áÿnÿ»¡w{í™…OşÔå?Óá7ò¯@ğ¿Áÿnÿ»üïFğ¿úóŸúdó||ñ—?ÏÏjHŸyük¬†äù™÷ÁóóÉÿî<ÿ»üïFğ¿Áÿnÿ»¡7…Ìó1ïƒçg5$ÏÏ¼ş5VCòüÌûàùY\rÉóAğ¿Áÿnÿ»üïFğ¿õp5ñüÜuöÎã_ã®³—ø×8¶½ÉóAğ¿Áÿnÿ»üïFğ¿õÒş!ÏÏ/üá“y~>óı_ççË¿ê[ù×øøù@ŸÏıößàùy³W}ÏÁÿnÿ»üïFğ¿ÁÿnT^€ë®¿çç_ı±<?9ñ¯ñÆ¯şXŸë®¿‚ÿİşw#øßà7‚ÿİĞ¥\'şùß‹à7‚ÿİşw#øßà7şÓÎ=|îr£˜\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('0eaadc8d-b9f3-4606-aa6f-16fe45c410cc','rula_ashvure','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ğIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯~îÇ~¼y>Nœ>Éósòš3<?\'Oâù¹pş<ÿ\Zî;ËósñÜ‚ÿİşw#øßà7‚ÿİ¨{ì£ø×8yêÏÏÉk¯åù9yíµ<?î½—ÿ\0ÿ»üïFğ¿Áÿnÿ»QyN:ÅósòÚkù×xÊãÇóóğÇ>–ççäµ×òü<…Çñ|üïFğ¿Áÿnÿ»üïF=yêÏÏ}ÔÇó¯ñ[¿õk<?î½—ççŞù=ø×ø–¯ùr‚ÿİşw#øßà7‚ÿİĞ/ıÔOšçãäµ×òüœ¾ö:ş5Îİ{ÏÏék¯ã_ãÜ½÷ğ|üïFğ¿Áÿnÿ»üïFı³ßûCŸWxWåùùÓßşŸ7}§wâù¹pï½<?úÛ¿ÃóóğÇ<šççÏ~ïy>şw#øßà7‚ÿİşw£8}’‡?æÑ<?çî½‡‡?æÑ<?ÎŸçù9qú$ÏÁÿnÿ»üïFğ¿ÁÿnÔøÛ\'ğ¯qñÜŸWxWå_ãÏ~ïy~Nœ>Éóóû‚ÿİşw#øßà7‚ÿİøG+ÃG«ÔO­ä\0\0\0\0IEND®B`‚','2026-08-17 13:23:05'),
('0f9c578b-b544-4a20-90e7-61a301218185','unsaintlydisk','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0rIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯ÖZÍÿ^ÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»Qße~’ÿy×Wã_ãËüwx~>şí_‹çç3¿óçx>şw#øßà7‚ÿİşw£îçŠççKß¯ğü|âw4ş#\\¸pççËüwøW øßà7‚ÿİşw#øßzÀÈóó¡ß1ò¯ñ¨G=Šçç¾à[y~yzÎóóÍ?úã<?oø†oÈóAğ¿Áÿnÿ»üïFğ¿Ìóa›çg÷ûÅóó›÷½-ÿ\Zß÷ßÌóóSÿp‘çGÏÁÿnÿ»üïFğ¿Áÿn0ÏÇ~àÛğü<êQâ?ÓŸøDŸOıÖŸâù øßà7‚ÿİşw#øß¦×.Ÿç%\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('125a6f13-2d95-473a-bf18-3349fd216a3c','Torchurous','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0«IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯~Æ‡½ùWØXÌx~æ³ççÂîÏÏÆbÆ¿ÆÑrÍóAğ¿Áÿnÿ»üïFğ¿•`c1ã?ÓÑrÍó³±˜ñ¯@ğ¿Áÿnÿ»üïFğ¿•¥£åšççh¹æù9y|‹çgµy~æ³ççh¹æù øßà7‚ÿİşw#øßº±˜ñü|òÇ|ÿ>ó¿–çgc1ã?\0Áÿnÿ»üïFğ¿Áÿnè‹>şÍóñ·ÿş5~ğ;¾Œw}¿Oà_ã%_üá<ÿ»üïFğ¿Áÿnÿ»Q–kŸÿêoâùyŸwış#üÃ}[<??ÿÓßËóóm_òQ<ÿ»üïFğ¿Áÿnÿ»Q?÷½ßƒçg|ÄKğüÜpÓÃx¾Ö<_[3ŸnzÏÏu7^Ãóó¹ïı<ÿ»üïFğ¿Áÿnÿ»!ÿÙOš\rşSíñ¯@ğ¿Áÿnÿ»üïFğ¿ÿâø:[¢$V‘\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('17bbbb2a-8faf-4241-a4cc-33c082d4ad37','MrVaryFunny','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0IIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯æ/‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßÊ¿Ò7½ÿ*òü«|Ó›ñ|}È/ğüüïFğ¿Áÿnÿ»üï†¾éÍ0ÿƒüñßÌóóÊ¯|;ÏÁÿnÿ»üïFğ¿ÁÿnT^€şyóüè‡òü|Óû?OÿÑŸs›<?ßüæâù øßà7‚ÿİşw#øß\r}Ó›aşùã?¾™çç•_ùv‚ÿİşw#øßà7‚ÿİ¨ü+ıÉİÏÏ+]?òß€à7‚ÿİşw#øßà7ôMo†ùğ\'wwük¼Òõ#ÿşw#øßà7‚ÿİşwãnï 2ö«\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('194d9ce9-fb2f-4022-b9e4-b9b9271b0509','SquadDR','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯ÿÅó¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üï†[æ?À?Zù×¸é\'şüïFğ¿Áÿnÿ»üï†Îÿâùß‹à7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw£ò¯tÓ;NügºãG+ÿ\nÿ»üïFğ¿Áÿnÿ»¡ó¿¸cşÄ«<ü£‡ğ€à7‚ÿİşw#øßà7*ÿAòÂ‚ÿİşw#øßà7‚ÿİøGµ¢xè¤Ä°\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('19998a20-b0f1-4fd6-9914-0a6115b53a21','Kitsune_Yua','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0£IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯®—£y>ºRy~Ô™çgXMüktóÊó5ò|mâù øßà7‚ÿİşw#øß\ry°y~:/›çK“y~Ü‰çGüëxäù!øßà7‚ÿİşw#øßJÇ¿Š×æùy¾\ZÏWÒóüÄœçK<_ÿ»üïFğ¿Áÿnÿ»QÍó—+óüÈâùÿ:æùÊÏWÌy~şw#øßà7‚ÿİşw£æ>Ï×üklooó¯q°¿Ï¿ÆÆ¸ÍóAğ¿Áÿnÿ»üïFğ¿ÊåÚ<¯ğê¯ÊóóÊGG<?_÷—Í¿ÆG¼ìKóüüñÆÏÏŸışò|üïFğ¿Áÿnÿ»üïFÕÑÏÏ÷~×wñüüÂË¼Ïæ=ÏWÏÏƒô$Ÿı«¿âùÑÑÏÁÿnÿ»üïFğ¿ÁÿnÈ¶y~öy¾¶7ù±x¾ÚÄó“uƒçƒà7‚ÿİşw#øßà7şDÇR´0/%\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('19f8cd04-c513-455e-8715-f6bf3dea5204','Just_tax','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0„IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯~˜çcÁó7çù›#?óü¬Åóµ´x~0ÏÁÿnÿ»üïFğ¿ÁÿnÔ…x¾>´™ççCüG˜ñü½o&ÏÏ7„x>şw#øßà7‚ÿİşwC_\næùØàù›óüÍÅóg¯5Ïß’çoÉóEğ¿Áÿnÿ»üïFğ¿uÅ şuÌ¿ÊZ<_Kó|-%‚ÿİşw#øßà7‚ÿİ¨s¿ÏÛÚæùùªı}ş5æ¼\0æùú¤­mŸÏ<Üçù øßà7‚ÿİşw#øßºÁó÷Uûû<?ï—æùQÏŸy~ló|I<?+/‚ÿİşw#øßà7‚ÿİ¨Gü+‰çËNş#¬ÏÏÏÁÿnÿ»üïFğ¿ÁÿnÔâù3ÏÏ7H<?âù›ñü­xşÄóµ2ÏÁÿnÿ»üïFğ¿Áÿnü#¾6Èığh\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('1a075a69-686c-43a8-9502-878afa22a348','Tower40','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0WIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾ØCo2ÿ{üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿ÁÿnT^€¿ü¹¯á_ãü‰Wæù988àùéûçgkk‹ççàà€çƒà7‚ÿİşw#øßà7´ş‡Ÿ0ÏÇ};¯ÀóÓZãù9::âùy˜ŸÀóó²oñQüküåÏ}\rÏÁÿnÿ»üïFğ¿ÁÿnÔ§êÑ<?Ëûîãù)¥ğü?~œçëçë‰w<”çg\\ÿÏÏğ¸Ÿäù øßà7‚ÿİşw#øß\rİu×æ_aŸëÿ’ÿÿ»üïFğ¿Áÿnÿ»QO]ücş#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİøG‡-0Ô•‹Û™\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('1a90a148-5314-4652-81d0-939a4ed8da91','georgeat4k','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ZIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯>ôÁ2ÿ{üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFåø‘Ïøş\'y§Ïû*‚ÿİşw#øßà7‚ÿİĞ-7ßhqœø×øÕ¯ÿ2ş5ŞğÃ?®«<ÿ»üïFğ¿Áÿnÿ»QyŞë½ß‡çç/¾û‹y~f›ük¼8÷òü¼Ü{2ÏÏşÀ÷ñ|üïFğ¿Áÿnÿ»üïFåx«·z+Ÿ{~åKx~.İ};ÿ\Z7^/Ÿ·z«·âùùÁø>‚ÿİşw#øßà7‚ÿİĞßıø÷š…ÙÆ&ÿ™ÖG‡ü+üïFğ¿Áÿnÿ»üïÆ?\0½\"]°Ï’\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('1c22341f-c421-4ff4-a46b-53d9e97a5bba','marivelle','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ÅIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾Á«½¢y>fóçç%qÏÏÁáÿv×9Ÿõjàù øßà7‚ÿİşw#øß:›÷<?/ùˆ[x~x~¶67ø×88<âùyÉGÜÂóó·O¾çƒà7‚ÿİşw#øßà7ê™ã›<?wÜs‘ç§”ä?ÂşÑ’ççü¥%ÏÏ™ã›<ÿ»üïFğ¿Áÿnÿ»Qñà›x~—<?‡G<?ûGKş5¶7<?[›<?[›‚ÿİşw#øßà7‚ÿİ¨‡KŸ/üæä_c÷·¿†ã¯ıQük|ê¿+ÏÁÿnÿ»üïFğ¿Áÿn0ÏGkççûÿÎ<?oµû\rüküÌñãùy÷—ÏO)…çƒà7‚ÿİşw#øßà7ê7îGğ¯qínòáÚİäù+<?_÷éÁóAğ¿Áÿnÿ»üïFğ¿u£ïx~öïëy~^™ÿ¯Ì7ñüìÿÏ×±ÍÊóAğ¿Áÿnÿ»üïFğ¿ÿç*Fæ[ÁOÂ\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('1c22cccd-82f6-4832-94ab-d784e64edf49','brutusthetourist','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ÏIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯~û‡¿Œy>Îî\r<?×ŸñüœÛx~f}áù¹°·æùyĞ5<?O¹ççƒà7‚ÿİşw#øßà7êÁrâ?ÂÖ¼òü¬&ŸZ‚‡_·ÉóAğ¿Áÿnÿ»üïFğ¿uŞŸsûÏÏçÍ¿ÆÎfÇ¿Æ¹½ççp5ñ|üïFğ¿Áÿnÿ»üïFÓ<?×Ÿóü¬&Ÿlæù¹wwÅóÓ…x~6ç•ç§ïÏÁÿnÿ»üïFğ¿ÁÿnÔ·zıWâùùÍßÿsŸ½Ã‘çç=ŞêÕy~~ôÿçgk^y~VÏÏÛ¿îKğ|üïFğ¿Áÿnÿ»üïF]íñü¼××üÏÏ|Ö“xş¾‚ççßôUy~>÷ï?ççÛ>ç‘<?·ÿØñ|üïFğ¿Áÿnÿ»üïFmìğ¿Áúhçƒà7‚ÿİşw#øßà7tÛ~ y>¼8Ãó£åYŸõÑÏÏlc‡çÇ‹3<?Zå_à7‚ÿİşw#øßà7şÏT½lƒfk\0\0\0\0IEND®B`‚','2026-08-17 14:19:36'),
('1d17505e-9c46-411b-9258-006fbd111acf','crazycar2357','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0tIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾Ók?Ì<×ŸÚäù¹ı¾ş5Z&ÏÏõ\'7y~jÏÏùı5ÏÁÿnÿ»üïFğ¿ÁÿnÔÍyÇó³w8ğüÜ|ÍÏÏájäù¹°·æù9\\<?‡«‰‚ÿİşw#øßà7‚ÿİĞıä«˜ÿ½şw#øßà7‚ÿİşw£8¶àùyÔëşÏÏ{½æ)ŸOıì—æ_ã?û¯y~¾çwÏóü<ñ7_çƒà7‚ÿİşw#øßà7ô„ßx]ó¿Áÿnÿ»üïFğ¿ÁÿnTş•z‡y~v“ø×xêæùyØMâ_à7‚ÿİşw#øßà7*ÿJ»I<?O½Ãük<ì&ñ€à7‚ÿİşw#øßà7*ÿAv“øo@ğ¿Áÿnÿ»üïFğ¿ÿg¼2\"T¬L«\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('1e968111-eab5-202d-b8f3-3629f661e12b','NPC4','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0êIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾Äƒ™ç£%ÏWQğümâù™¦Æó<?]-<?6ÏÁÿnÿ»üïFğ¿ÁÿnÔ–ü«4\'ÏÏÆ¼çùÙ™ÏO<?ç÷×<?éÆóAğ¿Áÿnÿ»üïFğ¿•à‹>â½y~ú®çùYÌwx~–‡{<_%x~.Ş{7ÏÏ—ÿø/ò|üïFğ¿Áÿnÿ»üï†~à³>Ä<‹ÙŒçg¹^óü”2ãù¹¸w‘çç–k¯áùyÆ3Ì¿Áÿnÿ»üïFğ¿ÁÿnÔÅlÆóó6ŸòU<?oñÆ_Ìóó¾¯t;ÏÏ-×^ÃóóM¿~’ççç~ù§x~~ğ³?”çƒà7‚ÿİşw#øßà7ôøfæù¸æºy~ºÙ1ŸŸÿÍßä_ãíŞø5x~î¸í)<?O¿çÏÁÿnÿ»üïFğ¿ÁÿnÔƒqâùîx:ÏÏ3îØçùÙ*ÿ\Z¿òkÌósİ\r<?¢ãù øßà7‚ÿİşw#øßzë]÷òüd&ÏÏéãÇø×XÏÏb6çù9\\6Ÿõ8ğ|üïFğ¿Áÿnÿ»üïÆ?cÉZ0`Øªï\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('1fcede36-353b-4240-ae8e-7dc92445b7f3','DIO7809','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0\rIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯şğÛ>È<§Kğü¿ş4ÏÏC¾Ãó‹ã<?ş«Éó³·¹ÃósËNÏóAğ¿Áÿnÿ»üïFğ¿õá7]ÃóóroõÚ<?ëÇ?…çg¸ş¡<?İ©ëy~^ââ]<?{GÇy~.]8ÇóAğ¿Áÿnÿ»üïFğ¿õúÓ§y~ÖOx\nÏÏãŸrÏÏ\rG÷ğü½*ÏÏoıñ]<?¯óÊ<_å4ÏÁÿnÿ»üïFğ¿ÁÿnTÄóõûşŸ=÷<?÷­<?=zÏÏë|Ğ\'òüüÖ·~)ÏÏ£nN‚ÿİşw#øßà7‚ÿİ¨Ú­<?{ô<?oûİÃóóÃoû Ÿ§ñü½Ñ}ÿ\Z¿ş><ÿ»üïFğ¿Áÿnÿ»QÏ]:âù9xÓãùy›æùy§·¯<?_şéŸÌóó6ûm<?oöXñüœûÅÏãù øßà7‚ÿİşw#øßzûîŠçç}ßğ\ry~î‰\'ó|İ°àùùø¯úVŸ/ü‹-Ÿ·yıGğü|ç~\ZÏÁÿnÿ»üïFğ¿ÁÿnÈó3æù9v†çëÄÿ!Ìó·{Àóué,ÏÁÿnÿ»üïFğ¿Áÿnü#bçS­<’;\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('208fd40d-919e-464f-afc5-15ce9d2f20ea','QuieroShika','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0…IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯şÆ—|€ùß‹à7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7êÎÃ_çço~á—y~Şâm_›ÿL?÷“¿ÍóóRoöÆ<ÿ»üïFğ¿Áÿnÿ»¡/x«70ÏÇÏ<şÉ<?ëaÍóó«_ÿIük¼á‡	ÏÏ¬Ÿñü¼ÕcÁóAğ¿Áÿnÿ»üïFğ¿õgÿdŸ¯şîåùyï{Wş#,Olòü|Ó7ü ÏÏG¿÷;ò|üïFğ¿Áÿnÿ»üïF}å37ğü¼ôK¿ÏÏWşÀñüÛxuş5¾òÌóóÒ~	ŸW>sÏÁÿnÿ»üïFğ¿ÁÿnT^€|úòü¼şæûğáõ7Ş‡çgzúò¯@ğ¿Áÿnÿ»üïFğ¿ÿ¬*VÃ6M\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('23d04fdc-bc16-4cc4-96ee-4b6811486dca','Bowicon','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0/IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯æ/‚ÿİşw#øßà7‚ÿİ¨ü+Ùæ?“$şşw#øßà7‚ÿİşwC€y>ló?‰$‚ÿİşw#øßà7‚ÿİ¨ü+Iâù±Í¿†$Ûü+üïFğ¿Áÿnÿ»üï†\0ó|Øæù9ÿ‘§ùÏtêkÏñüHâù øßà7‚ÿİşw#øß\ræù8÷§øŸäô×çù øßà7‚ÿİşw#øßÊpÏ~òü\\·ügºg?ùW øßà7‚ÿİşw#øß\ræ_áïßûÿ™^ü»/ò¯@ğ¿Áÿnÿ»üïFğ¿ÿR?#9}Ê\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('23f0e5d4-58c8-4100-90f4-cbf89032aba6','PhearedPhantom','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0HIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯şÄ|n%Ÿ¿ËäùñzÍ‚ÿİşw#øßà7‚ÿİ¨7J<?OÉäùñzÍós+ÏßKñüçù»—çoÅóEğ¿Áÿnÿ»üïFğ¿Ìóñ¿¿äù{Gşcü-Ïß_ò|üïFğ¿Áÿnÿ»üï†\0ó|Øæù¹ç{x~®¿şzŸc}Ïóó›ôG<?/û²/Ëó#‰çƒà7‚ÿİşw#øßà7*ÿJûûûük\\\ZŸíímşüïFğ¿Áÿnÿ»üï†\0ó¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnü#Ë£&eTU~\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('243fa96a-81ee-40d9-baa9-c4a65a524059','aniiwoww','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ÖIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯~ĞÛ}–ù°µqœƒ£]şüïFğ¿Áÿnÿ»üïFå¸áÌ-<?w½çggs‡çgûøÏÏŸ¼ËósÃ™[x~î:{ÏÁÿnÿ»üïFğ¿ÁÿnÔ­ã<?ÛÇ7x~nàŸíã<?Û;<?7œ¹…çgûøÏÏÖáq‚ÿİşw#øßà7‚ÿİĞ_~í+›çã·ïú(Ÿ÷}¿GñŸék¾â¯x~ö÷x>şw#øßà7‚ÿİşwC÷_e_üıïç_ãO~ë{ù×x¥×yOş5ŞôÕßçƒà7‚ÿİşw#øßà7ê/şş÷óü|Ïw~\'ÏÏ‡ø\'ğüÔÅÿ\ZÛ§x~¾şë¿Œçç½Ş÷}y>şw#øßà7‚ÿİşw£ò<â%ÂóuıÏÏ´<à_åúŸG¼ÄCøW øßà7‚ÿİşw#øßúš/ûæ<?³Ã]ŸßışoàùêÍ¿Æï~ÿ7ğüäá.ÏÏk¾ì›ó|üïFğ¿Áÿnÿ»üïÆ?6;e¬R4\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('24624cdd-cc6d-4a02-9f60-97539b4dbb01','colnon_','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ÃIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯nn0ÏÇ5×>ˆçç¾{ŸÁósÍµâùY.÷y~ö÷.ğü\\síƒx~î»÷<ÿ»üïFğ¿Áÿnÿ»Q¯¹öA<??ñã?Èóó°Ç¿&Ï×¯lóümó|½Ñ%Ÿ§>æy~Şîíß•çƒà7‚ÿİşw#øßà7êr¹Ïóó°?zM¯ãüëÜ÷xş5öG¯Éó³\\ãù øßà7‚ÿİşw#øßú‹¿ğs<_ôš<_»üÇØå_åáçx>şw#øßà7‚ÿİşw£9sšçë<Ïß)¿ûÏˆó<_gÎœæù øßà7‚ÿİşw#øßzìØ‚çÇ¼\0OáùzĞ‹g<Æ<_\'x¾[ğ|üïFğ¿Áÿnÿ»üïFåùşU?Å¿Ê]çx¾îâ_ƒà7‚ÿİşw#øßà7ê¥KKŸ—øñüüôM{<§ù×ø«Øçùyë;vx~şîÒ’çƒà7‚ÿİşw#øßà7ş.;?-VlL\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('24b12eb4-3fc6-4516-bdcb-a180d81270ee','Direbonesai8529','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0¾IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯>ùc›çã}n,ÏÏ{NÿÀóó:ÿ\Z¿õtóü¼ÎCÄ¿Áÿnÿ»üïFğ¿ÁÿnÔ·ûÛ›x~¾ñáOäùùÓ;‚ççŞ£à_ã`LŸ{‚‚ÿİşw#øßà7‚ÿİ¨_ö {x~Şï/Oñü¼Û‰s<?—Æƒqàù¹4vü+üïFğ¿Áÿnÿ»üï†^òõ_Ü<Ë¿{*ÏÏùıçç‡Şåÿ\ZïòCy~Nm÷<?_ÿæ›<ÿ»üïFğ¿Áÿnÿ»Q¿ìA÷ğü¼Ë<?«eòaµLŸó<›<ÿ»üïFğ¿Áÿnÿ»Q?òïNòü]äù9²ùpdóüÌùW!øßà7‚ÿİşw#øß\rıÊû6ÏÇÅ£Æósë…‘çç¡\'ÿ\ZO»Ğx~|²ãù9±Qx>şw#øßà7‚ÿİşw£^:\Zy~‚çïäFá?ÂÉÂó$ÏÏ¥£äù øßà7‚ÿİşw#øß©ÈQğÁW\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('2903071a-b49a-20b1-8045-3ef7604a3a36','NPC1','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0êIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾Äƒ™ç£%ÏWQğümâù™¦Æó<?]-<?6ÏÁÿnÿ»üïFğ¿ÁÿnÔ–ü«4\'ÏÏÆ¼çùÙ™ÏO<?ç÷×<?éÆóAğ¿Áÿnÿ»üïFğ¿•à‹>â½y~ú®çùYÌwx~–‡{<_%x~.Ş{7ÏÏ—ÿø/ò|üïFğ¿Áÿnÿ»üï†~à³>Ä<‹ÙŒçg¹^óü”2ãù¹¸w‘çç–k¯áùyÆ3Ì¿Áÿnÿ»üïFğ¿ÁÿnÔÅlÆóó6ŸòU<?oñÆ_Ìóó¾¯t;ÏÏ-×^ÃóóM¿~’ççç~ù§x~~ğ³?”çƒà7‚ÿİşw#øßà7ôøfæù¸æºy~ºÙ1ŸŸÿÍßä_ãíŞø5x~î¸í)<?O¿çÏÁÿnÿ»üïFğ¿ÁÿnÔƒqâùîx:ÏÏ3îØçùÙ*ÿ\Z¿òkÌósİ\r<?¢ãù øßà7‚ÿİşw#øßzë]÷òüd&ÏÏéãÇø×XÏÏb6çù9\\6Ÿõ8ğ|üïFğ¿Áÿnÿ»üïÆ?cÉZ0`Øªï\0\0\0\0IEND®B`‚','2026-08-17 13:02:26'),
('2b10f0c9-fd8a-491e-bf6e-97c9140957cf','NecromancerMorii','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0¯IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯>êQ2ÿîºë.ş5n¸áşüïFğ¿Áÿnÿ»üïFå_é®»îâùÙßßç_ã®»îâù¹á†øW øßà7‚ÿİşw#øßÊp×]wñüìïïóaŸçç®»îâù¹á†x>şw#øßà7‚ÿİşwCÛÛÛæùØßßçùyÏ÷|Oş3}ï÷~/ÏÏöö6ÏÁÿnÿ»üïFğ¿Áÿn0ÏÇ{¾ç{òü<úÑæ?ÓğŸïıŞïåù øßà7‚ÿİşw#øß\ræùĞ›‹çÇ7ÏÏ¼Ãğ¯ñj?öj<?zŠx~üóæù øßà7‚ÿİşw#øßÊğ\'ßƒççí^çíø×8sæÏÏÏ¼ÎÏğüüÄ…Ÿàùù^¾—çƒà7‚ÿİşw#øßà7´½½mıı}ş5ô¤\'ñü;vŒççÚk¯å_c{{›çƒà7‚ÿİşw#øßà7ş»ü?3a0÷\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('2b4436c1-2509-20c8-9390-44f3934172db','NPC4','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ÁIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯Şù-odŸƒÏ×Öœçë`Å¿ÊÖœçë`Åóµ5çù øßà7‚ÿİşw#øßÊÁŠçkkÎóu°âùÚšóü,‡CŸ/ÀÖœçë`ÅóAğ¿Áÿnÿ»üïFğ¿•­9Ï×ÁŠçkkÎó³y~½ö\'ñ¯1üá×ó¯@ğ¿Áÿnÿ»üïFğ¿u9ò|õ<Ã!ÏÏ±×ş$ŸÙlÆó³wé\"Ï×Ë¾/Ïşò;y>şw#øßà7‚ÿİşw£Î_ù#x~®}é·åùyô=†çç¯ŞhÆóUæ<?¯õMŸÆóó„oy<ÏÏ½<_ÿ»üïFğ¿Áÿnÿ»¡ûEó|¨t<?Eæù*s¯¶âùRáù™¦‰ç§ñ|üïFğ¿Áÿnÿ»üïF­µò|•ÏW[ñü´§]ä_£<hÁóS‹x~Öë5ÏÁÿnÿ»üïFğ¿ÁÿnT^¶âù*sŸò şuÊœÙŒç‡à7‚ÿİşw#øßà7ş¨@g>Ã…\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('2c670fa5-b8cd-2066-9dc4-4923c85192ce','NPC1','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0êIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾Äƒ™ç£%ÏWQğümâù™¦Æó<?]-<?6ÏÁÿnÿ»üïFğ¿ÁÿnÔ–ü«4\'ÏÏÆ¼çùÙ™ÏO<?ç÷×<?éÆóAğ¿Áÿnÿ»üïFğ¿•à‹>â½y~ú®çùYÌwx~–‡{<_%x~.Ş{7ÏÏ—ÿø/ò|üïFğ¿Áÿnÿ»üï†~à³>Ä<‹ÙŒçg¹^óü”2ãù¹¸w‘çç–k¯áùyÆ3Ì¿Áÿnÿ»üïFğ¿ÁÿnÔÅlÆóó6ŸòU<?oñÆ_Ìóó¾¯t;ÏÏ-×^ÃóóM¿~’ççç~ù§x~~ğ³?”çƒà7‚ÿİşw#øßà7ôøfæù¸æºy~ºÙ1ŸŸÿÍßä_ãíŞø5x~î¸í)<?O¿çÏÁÿnÿ»üïFğ¿ÁÿnÔƒqâùîx:ÏÏ3îØçùÙ*ÿ\Z¿òkÌósİ\r<?¢ãù øßà7‚ÿİşw#øßzë]÷òüd&ÏÏéãÇø×XÏÏb6çù9\\6Ÿõ8ğ|üïFğ¿Áÿnÿ»üïÆ?cÉZ0`Øªï\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('2d7fde2e-36a5-4963-908d-3cfdf688d8cd','Ad_Astrum1121','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0˜IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯Nşçæ?@\\wÿò{øW øßà7‚ÿİşw#øßÊ×]Ç¿†vvø×øówòü¼æu×ñüä=÷ğ|üïFğ¿Áÿnÿ»üïFë®ã_ãwÇ}ŸM*ÿ´³Ãó<_ÿ»üïFğ¿Áÿnÿ»!ïí™çãwÎßÉó³yêÿ™Ï_äùy­S7ò|üïFğ¿Áÿnÿ»üï†^ãÃ_Ò<»ßúş5¾óÜmük¼ïé[ø×øº\'ş\rÏÁÿnÿ»üïFğ¿ÁÿnèŞ{ï5ÏÇ5×\\Ãósß}÷ñüÜ¶0ÿ\Z/ı7Oæù©¯şê<?/9›ñ|üïFğ¿Áÿnÿ»üïF½æškx~.œıŸk®y\'ŸÛöïå¿Áÿnÿ»üïFğ¿ÁÿnèŞ{ï5ÏÇ5×\\Ãósß}÷ñüÜ¶0ÿ\rşw#øßà7‚ÿİşwã¢=^_s(\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('2ed97783-c069-471f-b8ea-6c19d43ecd44','crazypwned','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ïIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯~Éë½˜y>†fŸE\'ŸLşC,\'óüñüüïFğ¿Áÿnÿ»üïFwÁós|.Ÿ)“çÇˆç\'ÍóÕlş5–“y>şw#øßà7‚ÿİşw£¾ÂKŸ»ŸvççîÃc<?Uü«<_³àùé‹y>şw#øßà7‚ÿİşw£Şó´<?oû·ñü<î—_†çgëÚ-Ÿ§?­çùÙÙYğüüéãnãùYÌ‚çƒà7‚ÿİşw#øßà7ê›¾ùšçç?Çóõè×ÏÏİ·ÏÏñíÏÏOüáSy~ö‡Æóó˜Ó3‚ÿİşw#øßà7‚ÿİ¨÷üÅ½<?O¹íá<_¿÷—<??ğ’¯Âóóöûgx~~ãÂóó+oñú<?ŸøñßÄóAğ¿Áÿnÿ»üïFğ¿õAoÁóuê)çgëá<_ü”ŸÕö‚ççÍn¼“çgó±¯Àószñm<ÿ»üïFğ¿Áÿnÿ»¡OúúW7ÏÇ§Í7x~öï]óüÄÆƒx~Z3ÏO-âùY®FŸKû+‚ÿİşw#øßà7‚ÿİøGqÇVq.¨&o\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('2fd25f72-7462-4de7-a343-7cce3f2ca6db','Harushinonomiya','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ŠIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾õ½¯ù_àu>èá<ÿ»üïFğ¿Áÿnÿ»QùoòuÏø\0ş5>æçƒà7‚ÿİşw#øßà7*ÿÉ^ïÓ^Šççà=y~Nüò‡ñüÜùZŸÎóAğ¿Áÿnÿ»üïFğ¿•à;¿øƒùÏô—Ë\'òüÜùZŸÎ¿Áÿnÿ»üïFğ¿ÁÿnT^€oûààùù±#óüüê÷~;ÿ\ZŸ|í—ñü¼Ã†x~şèøËñ|üïFğ¿Áÿnÿ»üïF½ã®?çù¹ôª¯Ìó³ñÄ[ù°qê:ŸKz0ÏÏøÇ<ÿ»üïFğ¿Áÿnÿ»¡W~å×3ÏÇıâ·òüüÊã;Ÿ7zÌÈ¿Æ¯<¾ãùy£ÇŒ<?¯ò¦ÈóAğ¿Áÿnÿ»üïFğ¿ò…§šÿ½şw#øßà7‚ÿİşwã0…3ÏNºZ\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('313d1e4d-1639-4800-91ad-f5c152baa493','07928YR','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0\0éIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯æ/‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßÊàÖø×P)ük¸5ş5T\nÏÁÿnÿ»üïFğ¿Áÿn0ÿ{üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïÆ?Ó‘bÏR\'Ÿ\0\0\0\0IEND®B`‚','2026-08-19 18:06:44'),
('31f1d1be-848d-42a7-af38-17517fde34ba','AnimaSoul','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0\\IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯~Ã§ü’ùğĞ×,ÿ\ZOûõÇñ€à7‚ÿİşw#øßà7ôK¿ñó¿Áÿnÿ»üïFğ¿ÁÿnèÓ^éÕÍÿ^ÿ»üïFğ¿Áÿnÿ»Qy>óççmûÆ<?/½sÈ¿Æ_ïmòüüäã~™ççs_ù5x>şw#øßà7‚ÿİşwC¿ôÏ0ÏÇïê»ñ?É«áğ|üïFğ¿Áÿnÿ»üï†>ğeŞÌ</õÆÎÿ$óË_ÏóAğ¿Áÿnÿ»üïFğ¿•ÿ «¿şlş5æ/ıÙü øßà7‚ÿİşw#øßzçjâùy)şuxÏiş5^Š;WÏÁÿnÿ»üïFğ¿Áÿnü#Ë@*„QØ]»\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('338ea3a7-2eaf-49f6-81f5-b1a86dd7f3ac','Ivy_Maus','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0İIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯~ÚŸş™y>J×ñü”®ãùyè÷¾>ÏÏ;¿Å+ñü|á‰/àùiãÈóÓÆ‘çƒà7‚ÿİşw#øßà7êkşÎ%Ÿ®v<?]íx~~ñ¶çç‡îOx~^÷æK<?ã4òüŒÓÈóAğ¿Áÿnÿ»üïFğ¿z…G?Ø<âù)<?%‚–ÉóÓ2y~2ÍóAğ¿Áÿnÿ»üïFğ¿µeòüÜvqÍó³µµÅóóÄßø5Ÿ×|ó×ãù¹wÉóuppÄósã±ÏÁÿnÿ»üïFğ¿Áÿn0ÏÇ+½Ò+ñüüñÿ1ÏO{úÓù×øÌ—üQŸ7Ûy{Ÿo‰‡ó|üïFğ¿Áÿnÿ»üïFüdŸúˆGğü¼ò+¿2ÏÏ|ÿ÷ó¯ñ·ús¯=¯c›<?ÿ»üïFğ¿Áÿnÿ»Q)…çgzò“ù×ˆ»ïæ_ãÌ«ş8ÏÏÑæóü|ù—?çƒà7‚ÿİşw#øßà74İz«y~2ùW‰à_%“•®ãù øßà7‚ÿİşw#øß9³UËˆ·»A\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('353885e2-60b1-4e5c-86f2-4b0cf81b9591','lelercreator','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0gIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯şúw¹ùß‹à7‚ÿİşw#øßà7*/À‹¿ú[ò?ÉßÿşÏò|üïFğ¿Áÿnÿ»üï†îyÊ“Ìÿ^ÿ»üïFğ¿Áÿnÿ»QùW:}8ñŸéÜfå_à7‚ÿİşw#øßà7êj¹æùùïÿ~ş5>í]ß‹/øÁïá_ã½Şıİy>şw#øßà7‚ÿİşw£~Ï÷?Ï$ş5âÆSükHâ_ã{¾ÿûy>şw#øßà7‚ÿİşw£ò|ä}ÏÏŞŞ>ÏO.×ük¼÷»¼+ÏÏÎÎ6ÏÏ×|ó7ó|üïFğ¿Áÿnÿ»üï†şü7Û</}óÍ<?qb‹ÿLyñ€çç¯o¿çƒà7‚ÿİşw#øßà7şwô-&9æù^\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('37ebaaa6-6630-4d86-a637-76867457d001','Mukiroklama','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯Ú6ÿ\Zÿ°Éª;ä_à7‚ÿİşw#øßà7dÛ<?ÿ°Éÿ(/vÈóAğ¿Áÿnÿ»üïFğ¿òßo˜ÿ½şw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7*/À;¿ûƒx~¾óKŸÊ¦÷ıÄ‡ñüüğ÷?ƒçƒà7‚ÿİşw#øßà7ä¿ß0ÏÏ7îğ?Ê‡îñ|üïFğ¿Áÿnÿ»üï†µ7ÿ{üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnü#­óÅ¶™eÌ\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('38d779ae-928d-46ed-74a3-2d1d42e5ae5a','alex_bo_balex','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0êIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾Äƒ™ç£%ÏWQğümâù™¦Æó<?]-<?6ÏÁÿnÿ»üïFğ¿ÁÿnÔ–ü«4\'ÏÏÆ¼çùÙ™ÏO<?ç÷×<?éÆóAğ¿Áÿnÿ»üïFğ¿•à‹>â½y~ú®çùYÌwx~–‡{<_%x~.Ş{7ÏÏ—ÿø/ò|üïFğ¿Áÿnÿ»üï†~à³>Ä<‹ÙŒçg¹^óü”2ãù¹¸w‘çç–k¯áùyÆ3Ì¿Áÿnÿ»üïFğ¿ÁÿnÔÅlÆóó6ŸòU<?oñÆ_Ìóó¾¯t;ÏÏ-×^ÃóóM¿~’ççç~ù§x~~ğ³?”çƒà7‚ÿİşw#øßà7ôøfæù¸æºy~ºÙ1ŸŸÿÍßä_ãíŞø5x~î¸í)<?O¿çÏÁÿnÿ»üïFğ¿ÁÿnÔƒqâùîx:ÏÏ3îØçùÙ*ÿ\Z¿òkÌósİ\r<?¢ãù øßà7‚ÿİşw#øßzë]÷òüd&ÏÏéãÇø×XÏÏb6çù9\\6Ÿõ8ğ|üïFğ¿Áÿnÿ»üïÆ?cÉZ0`Øªï\0\0\0\0IEND®B`‚','2026-08-17 17:07:36'),
('38df29a8-b491-4c8e-b81e-7b56e1b7f7c1','Slayer834','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0‰IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯^sÍ5æùˆŸù|Îó<?’x~¦iâùY¯×<?¶y>şw#øßà7‚ÿİşw£–Rx~lóüHâùéûçGÏmIü+üïFğ¿Áÿnÿ»üïFåØØØàùÙÚÚâù™Ïç<?¶y~f³ÿ\Z«ÕŠçƒà7‚ÿİşw#øßà7j×u<?µVŸ?ÿê7åùyƒÏù#Ÿ_û¬Wá_ãÅ?ø\'y~j­<ÿ»üïFğ¿Áÿnÿ»¡‡<ä!æùxâw¼ÿ“<êı~„çƒà7‚ÿİşw#øßà7tã7šçã)Oy\nÏÏ‡¿áËòü|Óç¼ÿ\ZòY?Ãóóí¿û8Ÿ›nº‰çƒà7‚ÿİşw#øßà74üæ\'›ÿ½şw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7ş×1/·ÓØí\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('39b2c471-2856-4f71-bdd7-77a07b54d028','Dufoxm','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0©IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯Ú6ÿşû\'ù×xÈ«_à?\0Áÿnÿ»üïFğ¿ÁÿnÈ¶y>şô§ÄósæÌ	ş3={‘ççßÆ<ÿ»üïFğ¿Áÿnÿ»¡?ùIÌóq/?Åó3›Ïy~±ı®ük<yÿy~Ö«ÏÏµ¼\rÏÁÿnÿ»üïFğ¿ÁÿnT^€ky¯Ïßö	ş5¯Ş„ÿ\0ÿ»üïFğ¿Áÿnÿ»Qy^ñmÌ¿ÆÓÿ$ÿ\Z¯ø6æ_ãOJ<ÿ»üïFğ¿Áÿnÿ»Qy~ì‡~˜ççåoşPŸÛÇŸàùY­V<_¿’ççÏoÿFŸÍy~şw#øßà7‚ÿİşwC¶Íóñ§?%Ÿ3gNğü<äÕ/ğ¯ñôß?ÉósöìEŸW|ó|üïFğ¿Áÿnÿ»üï†l›…?ı)ñüüİ~ÿ\Z/ñª_ÂóóŠocşşw#øßà7‚ÿİşwãwæG?ÚÎp\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('3a4f28ad-e7ba-48ca-b642-f8bd189a88c7','Ryokasz','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ÂIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯~à×¿¯ùW8ö<ÏÏ©3§ø×8ö<ÏÏ©3§øW øßà7‚ÿİşw#øßÊp¸wÈó³>\\óüì/öù×X¬y~g‡<?›;›<ÿ»üïFğ¿Áÿnÿ»Qy~¦iâùÇ‰ÿÓ4ñüLÓÄósxxÈóAğ¿Áÿnÿ»üïFğ¿u}´æùù¬›Ëóuÿ*ç/­x¾n¹™¯ß{\ZÏÁÿnÿ»üïFğ¿ÁÿnÔ£Ã%ÿ\Z·~Æ·ñü<øó>€ÿLG‡K‚ÿİşw#øßà7‚ÿİ¨¼\0û£Êóó1[[<?7½ØCx~æwãùùĞoù\rş5º—‚ÿİşw#øßà7‚ÿİĞÅ?ú6ó|üÑ{~!ÏÏÉ“\'y~õÕÌósî®s<?ço|ŸíímŸãwı:ÏÁÿnÿ»üïFğ¿ÁÿnT^€“\'Oòü<ê«?˜\r¯;“çgcg“‚ÿİşw#øßà7‚ÿİøGçO_ÅŠñ\0\0\0\0IEND®B`‚','2026-08-18 18:06:44'),
('3a8da466-a1e2-4e19-b19f-18f90d111e7a','CandyMaya','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ÊIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯Î±ùWø†7|[Ÿİı%ÏÏÁ%¯›nZğü|Ø¯ş$ÿ\nÿ»üïFğ¿Áÿnÿ»¡96ÏÇ\'¾Üëğü<èÔ	Ÿİı%ÏÏ}÷M<?×\\Sy~Æçç‹şü7x>şw#øßà7‚ÿİşwCŸóØ76ÏÇÖ1şU.ñ|İwqŸççšÛ<?ukâù™*ÏÁÿnÿ»üïFğ¿ÁÿnÔ›nZğüìî/y~.ñ|­\'ş#Ùx~n¹i›çƒà7‚ÿİşw#øßà7êw,y~~ÿ¿ã_ã\'ú;y~ï¸“çç=>ü3ø×ˆ£—àù øßà7‚ÿİşw#øßúû÷üÏÏ“|ÿLOò9şUîù;‚ÿİşw#øßà7‚ÿİ¨Oò9Ÿ_û•?ãùyä›=ççÂŸş9ÿ\ZÏ¨ßÃóó¤_x,ÏÏ¼Ñ+ğ|üïFğ¿Áÿnÿ»üï†>ç±olúôwä¿Ãú®»y~¾û;çƒà7‚ÿİşw#øßà7ş²ˆXu~>â\r\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('3f26eb91-179b-4484-a6b1-b0dff8659f6f','UnitedParas','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯şÍŸ>Á<ÛÇ6ùŸdÿÒ!ÏÁÿnÿ»üïFğ¿ÁÿnÔíc›<?³yÏÿÿ»üïFğ¿Áÿnÿ»Q£ÿ\ZûGügÚÚŞà_à7‚ÿİşw#øßà7j¶äù9Xñá§İÃósÓC¯ãù9Ø?âùéºÊóAğ¿Áÿnÿ»üïFğ¿õ®Ûïãù¹ù!×ó¯±Z®ù×˜/fük¬Ö<ÿ»üïFğ¿Áÿnÿ»Qû¾çùé<__ûâùyŸÏù[Ÿ®ïx~¾éÅóó‘_÷DŸıİ‰çƒà7‚ÿİşw#øßà7ê±“[<?\'6FŸ¿…çëéO¸ƒ¿…çëÄÆÈósç‹à7‚ÿİşw#øßà7ôWô8ó|\\8»ÇóÓõ•ÿLã0ñüÜôky>şw#øßà7‚ÿİşwã:f7ÑMa—\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('42c26dd5-4762-48ec-a30a-6fe271fe6ce0','ecoust','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0+IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯~÷w·y>Şë½Ş‹ÿßó=ßÃ¿Áÿnÿ»üïFğ¿ÁÿnÈ¶ùWÄÛük|Ï÷|ÏÁÿnÿ»üïFğ¿ÁÿnTşƒ|÷w7ÿ™Şû½ß›çƒà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw£~Ï÷|ÏÏ{½×{ñüØæ?“$şşw#øßà7‚ÿİşw£ò|Ï÷|ÏÏ{¿÷{óßá»¿û»y>şw#øßà7‚ÿİşwãAy	™9é\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('4397520f-d17f-4ead-97b7-c546b8746207','DrBlqck','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ÏIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯>áÉO1ÏÇ“î»—çgùSŸËóóáßõçük|ıû¼<ÏÏâm>“çç‘×\\ËóAğ¿Áÿnÿ»üïFğ¿õI÷İËósöhçgºãnŸ¶^ó¯±{Çİ<?G{<_÷ñüüïFğ¿Áÿnÿ»üïF]şÔçòüLwÜÍ¿ÆÉk®á?ÂôŸÄó³¼éz‚ÿİşw#øßà7‚ÿİĞÃúPó|ìğü´lüw8vìÏÁÿnÿ»üïFğ¿ÁÿnT^€–ççüKükä´æù‰iÅóó ×~gşşw#øßà7‚ÿİşwC×_½y>nºñzş5~÷G¾™çÇãÏÏk½ûÇò¯qÇwó|üïFğ¿Áÿnÿ»üïFåøå_ù5Ÿá[¾’çÇË=‹çëgßöMx~úúXŸñçù øßà7‚ÿİşw#øßº¹XğülıÕğüø\r^Šç\'yşd¯“oòÊ<?zÜOñül.<ÿ»üïFğ¿Áÿnÿ»ñÍUëÚ6Xæ\0\0\0\0IEND®B`‚','2026-08-14 16:23:00'),
('442713de-deb5-474d-8358-70c86fa7bc42','Enkidouh','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ÆIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯^{íµæù¸téÏÏjµâ?Ó|>çù9yò$ÏÁÿnÿ»üïFğ¿Áÿn¨ë:ó|ŒãÈóóè÷øVş5Ê|‹ø¶wåù)¥ğ|üïFğ¿Áÿnÿ»üï†n¸áó|œx³/çùéáù)İÿ\Z«sOçù©Ã=<?gíËy>şw#øßà7‚ÿİşw£Şğ?ÃóóŸõò<?ßô	¿Îó£Yå_£;v†ççC¾ì]x~¾ís^ƒçƒà7‚ÿİşw#øßà7êKâùz™vÏÏç}ÁÃy~>ãÓÂ¿Æ·~ñKò|µûx~µİx>şw#øßà7‚ÿİşwCg^æmÌ€~ş5.>á·ø@ğ¿Áÿnÿ»üïFğ¿uû¡¯Àó3Û¹çço¾åİùñÁ<?/õAßÏó3íò|üïFğ¿Áÿnÿ»üïFı ıÏÏwóQükÌf3ñ¯°^¯Íó±Ş»‡ççƒô#<ÿ»üïFğ¿Áÿnÿ»ñaş>,Ïü`•\0\0\0\0IEND®B`‚','2026-08-19 00:06:43'),
('4477d239-f017-49e1-8854-ad14b3603322','SomySenior','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ÕIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾ë›½¾ùWØ[®x~vsş5ö–+ŸÅœ‚ÿİşw#øßà7‚ÿİ¨/­ÿ\Z;×çù9¿wÈ¿ÆÉ3Çù×Ø8¹àù øßà7‚ÿİşw#øß\ZÏÏ=÷y~v—<?×Ÿ<Æó#‰çg½x~î8¿Çóóğ8ÍóAğ¿Áÿnÿ»üïFğ¿õ®İ=Ÿƒëvx~–+Ÿ[WûüGØºv‹ççö{/ğ|üïFğ¿Áÿnÿ»üïF½g§çùù›Ç?‡\\{‚§ß{‘—zğõ<ÿ»üïFğ¿Áÿnÿ»Q÷–+Ÿ7{WæùùÛÇı,ÏÏ‡¿Ş›ñü|ıoü!ÏÏÍ§îãùyÉÇ¾%ÏÏãôD‚ÿİşw#øßà7‚ÿİ¨¼\0oôš¯ÆósİÎ/ğüllnòü|â[¾ÏÏŸßõŸ—zéWãùyÜ“ÈóAğ¿Áÿnÿ»üïFğ¿úå/øDó¯°±¹Éó³}r‡ı{<?G‡‡ü+üïFğ¿Áÿnÿ»üïÆ?\r²I£_é:ï\0\0\0\0IEND®B`‚','2026-08-17 13:23:09'),
('44e46f69-2647-4d36-b3f6-e71678fb42b3','CARTERPROGAMER','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0oIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯şÆ½‚y>N]»Á¿Æù{x~N]»Á„ó÷ñ|üïFğ¿Áÿnÿ»üïFå8ïÿÎß{Ä\"‚ÿİşw#øßà7‚ÿİ¨¼\0¯ûòïÀÿ$¿ùç?ÆóAğ¿Áÿnÿ»üïFğ¿ò¯}©ùß‹à7‚ÿİşw#øßà7ôò~Œy>~á§~‚ççKŞû­y~¾âóßŸûôoçùù¤ïşiŸ7{›·ãù øßà7‚ÿİşw#øßúg_÷><_~ÏÏÍÇƒÿ7ŸkıŸ?ûº÷áù øßà7‚ÿİşw#øß\rù×¾Ôü¸ø„Ûø×8ñè[ø@ğ¿Áÿnÿ»üïFğ¿•ÿ \'}ÿ\rşw#øßà7‚ÿİşwã»ã*m.?SÊ\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('453c70e7-99cb-4b46-9184-fc8052387c9c','eggoyesso','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\04IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾óÛ¾›ùß‹à7‚ÿİşw#øßà7*/Àß?ã6ş\'yñİÂóAğ¿Áÿnÿ»üïFğ¿•@ÿüïFğ¿Áÿnÿ»üïFåˆŸGÿîKóü<á5ÿšGÿîKóü<á5ÿš‚ÿİşw#øßà7‚ÿİ¨¼\0Á¿FDğ!\"øW øßà7‚ÿİşw#øßÊ ‰ççÉ¯ów<?’ø×xòëüÏ$şşw#øßà7‚ÿİşw£òHâ‚ÿİşw#øßà7‚ÿİ¨¼\0¸îZş øßà7‚ÿİşw#øßl¹ÎâMn\0\0\0\0IEND®B`‚','2026-08-17 14:00:54'),
('45fe7378-53c9-4044-bf99-6bef6f827a58','AndyRaccoon','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ĞIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾Ã;¼ƒùWx$çx~î½÷^ş5®½öZŸ\'qš‚ÿİşw#øßà7‚ÿİ¨¼\07ß|3ÏÏ_>ş€ççe¯½–¿<˜óü<æ17óüÜ~ûí<ÿ»üïFğ¿Áÿnÿ»Qx~·ÿÏÏë][y~.ò¯òz×N<?oÿ+Ÿƒƒ9ÏÁÿnÿ»üïFğ¿ÁÿnÔ—İZñüÜ¾xÏÏ=¥çù¹\'ò¯ñøò0Ÿq1ğü¼,Oçù øßà7‚ÿİşw#øßzb³òü<m=ñüt]ÏósÏÎ£ø0ÿ\nÿ»üïFğ¿Áÿnÿ»Qÿb}=ÏÏw~ç·ğü¼ÜË½#ÏÏ[½ÕKò¯ñ3?ó·<?ñ?Êóó¾ïûA<ÿ»üïFğ¿Áÿnÿ»¡wy—÷4ÿ\n¯yê>Ÿ/ø¾ßâ_ãÓŞãux~~÷ü5ü+üïFğ¿Áÿnÿ»üï†¾å#ŞÌ<wÜwÀ¿Æ\rgükÜuvÉ¿Æ\rg<ÿ»üïFğ¿Áÿnÿ»ñ´FÖƒ;ó\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('467de96f-ae84-49d7-8eb3-2bad90bba02f','LeviathanTheFish','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ÒIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯æù¸öÚkùÏtppÀósxxÈ¿Áÿnÿ»üïFğ¿ÁÿnT^€Sïÿk<?ç¿ı\rx~¶¶¶øğ ş#ŸÇ}ÁKò|üïFğ¿Áÿnÿ»üïF½öÚkù×ègæù¹õÖßç_ã†_ÍÍM‚ÿİşw#øßà7‚ÿİ¨çÎãùy·7¹‰ççÇ¾•WxÅ÷æù¹óÎ§ğü¼ñ›ÜÄóó-_ÍóCğ¿Áÿnÿ»üïFğ¿ÚÜÜ4ÏÇáá!ÿ\Z¯ü*ïÇ¿ÆÿÑwğ¯qó-¯ÅóAğ¿Áÿnÿ»üïFğ¿õä©—çùùÃ¿ùIŸ—zä§ñüü«ÄóüüÍ“¾€ççÍ_÷my>şw#øßà7‚ÿİşw£ŞxãÃy~rãIŸÏ¼	ÏÏK½Ôş5nÚIŸ‡Üx’ççÆÎóAğ¿Áÿnÿ»üïFğ¿ºù–×2ÏÇÛ~ÓOñü”c<_‡ßÿ3ükl¾û[ñü´K<_?ù!oÃóAğ¿Áÿnÿ»üïFğ¿ÿMó8Ó¯bˆK\0\0\0\0IEND®B`‚','2026-08-14 16:22:59'),
('46885d03-ac87-45b3-9d6d-3b0ff2d3496a','Wermis','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ŞIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾ÜÃO˜…­¾ò¯c?ñüÏÏjœx>şw#øßà7‚ÿİşw£^:XòüÛšóüÏÏf_y~„x~†‰çg«¯ü+üïFğ¿Áÿnÿ»üïFõÏÏ¿Ö«ğü\\wÍŸºØæù™–û<?ËõÈóséÒ.ÏÏ·üîŸğ|üïFğ¿Áÿnÿ»üï†¾íıŞÄ<ÇçùYÌ:?ñü,‡çËü«\\º´ËóAğ¿Áÿnÿ»üïFğ¿õØ±ã<?ïğJïÆóóv_ÿ<?ïü\nÍóséÒ.ÏÏ/=ñµy~~â#^ŒççÇşäx>şw#øßà7‚ÿİşwC_ı¯iNßÈ¿Æoÿåãy~$¯×z™Çğ¯q×¹;y>şw#øßà7‚ÿİşw£2ŠççÎswòüÜ{Ç’çg;:ş5şò¯ŸÂósíÍŸ½Ã‘çƒà7‚ÿİşw#øßà7j›ççüŞÈósİMŸ½Ã‘ÍççÒÁÈó³³Ùñ|üïFğ¿Áÿnÿ»üïÆ?iQ¹İ¤	V\0\0\0\0IEND®B`‚','2026-08-15 17:23:04'),
('48f6bae4-f11d-46d3-9908-b57332682066','Sascha_Bo_Bascha','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0êIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯~Ä{¿®y>Ö<?ëõÄósâÄ&ÏÏÑÑšçg½x~.]Zòü´©ñ|üïFğ¿Áÿnÿ»üïF]lôüGØØèù°Xô<?ËåÀóAğ¿Áÿnÿ»üïFğ¿uk{Áó#¿7{Ë×çùù³?ı3Ÿ—|ôCy~şø/ŸÀó³^O<=ÏÁÿnÿ»üïFğ¿ÁÿnÔùfÇóó2/õŸÙbÁóÓov<?³9ÏÏË<êÁ<?ğWOä_à7‚ÿİşw#øßà7êb«çùéæ[<?‹MŸ­çg¶1çù™mÎy~66fü+üïFğ¿Áÿnÿ»üïFİØ˜ñüüöïÿ)ÏÏæ|ƒççíŞí]y~n{âßòüüıÓÇóµQy~6x¾şw#øßà7‚ÿİşw£şõßŞÎósæøiŸn>ãùéºçg¶ØàùY,6x~,¯³«³<ÿ»üïFğ¿Áÿnÿ»Qßìõ_›ççÌ\r·ğü,¶óüÔ~ƒçg±±ÁóóŠ/ÿâ<?ÎóüÜñôM‚ÿİşw#øßà7‚ÿİøG¬—;`XI\n\r\0\0\0\0IEND®B`‚','2026-08-19 00:06:43'),
('4b31f7a5-d430-48b3-99b7-3924ab8c6051','abracadamz','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0‰IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾ş«¿¢ùß‹à7‚ÿİşw#øßà7*/@Kó?I	ñ|üïFğ¿Áÿnÿ»üïFmiş#”ÿ\Z-Í¿FKó|üïFğ¿Áÿnÿ»üïFå(!ş5¾á½_“ç§µäùùÈïû}ş5Zšçƒà7‚ÿİşw#øßà7j	ñü´aà_£ß<Æó3^âùY¯V<?5‚ç§ô=ÏÁÿnÿ»üïFğ¿ÁÿnT^€GÜ|=ÏÏm÷ÜÇóıŒç§çÏÏæ¬ãù¹åºkx~vïy‚ÿİşw#øßà7‚ÿİ¨¼\0_ôqÀóó•¿ğ3<?³Íc<?k.ñü¼Ük¿8ÏÏÇ¾Ù[ñü¼Ó\'~1ÏÁÿnÿ»üïFğ¿Áÿnè?ñ¥æù˜mã_£làùi‡ù°>¼ÄóAğ¿Áÿnÿ»üïFğ¿ÿn‘7Íÿ½Ë\0\0\0\0IEND®B`‚','2026-08-14 16:23:00'),
('4c61aed4-3b5f-20f0-a4bb-4f510f5e1c60','NPC2','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ÁIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯Şù-odŸƒÏ×Öœçë`Å¿ÊÖœçë`Åóµ5çù øßà7‚ÿİşw#øßÊÁŠçkkÎóu°âùÚšóü,‡CŸ/ÀÖœçë`ÅóAğ¿Áÿnÿ»üïFğ¿•­9Ï×ÁŠçkkÎó³y~½ö\'ñ¯1üá×ó¯@ğ¿Áÿnÿ»üïFğ¿u9ò|õ<Ã!ÏÏ±×ş$ŸÙlÆó³wé\"Ï×Ë¾/Ïşò;y>şw#øßà7‚ÿİşw£Î_ù#x~®}é·åùyô=†çç¯ŞhÆóUæ<?¯õMŸÆóó„oy<ÏÏ½<_ÿ»üïFğ¿Áÿnÿ»¡ûEó|¨t<?Eæù*s¯¶âùRáù™¦‰ç§ñ|üïFğ¿Áÿnÿ»üïF­µò|•ÏW[ñü´§]ä_£<hÁóS‹x~Öë5ÏÁÿnÿ»üïFğ¿ÁÿnT^¶âù*sŸò şuÊœÙŒç‡à7‚ÿİşw#øßà7ş¨@g>Ã…\0\0\0\0IEND®B`‚','2026-08-17 01:53:04'),
('4da5f608-682d-4966-8fb4-dd5227eb79f4','WinterEtHistoria','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯şú¯ÿºùW¸tñÏÏ±Çøo@ğ¿Áÿnÿ»üïFğ¿•àØö6ÏÏµ×^Ëóó¤\'<‰çç‘~$ÿ\Z«£#ŸKûû<ÿ»üïFğ¿Áÿnÿ»Q¯½öZş5?ÎósìÄ1ş#Ì76x~æ<ÿ»üïFğ¿Áÿnÿ»QùWÚİİåù¹öÚkùo@ğ¿Áÿnÿ»üïFğ¿uutÄóó™ŸıÙük|îg6ÏÏ¥ı}Ÿ¯øŠ¯à_ãs?û³y>şw#øßà7‚ÿİşwC?ñc?aş8Æóó‡ø‡ük¼Øc^Œÿ\0ÿ»üïFğ¿Áÿnÿ»QŸqÛ3x~~í×ÿLôGÄ¿Æ¼şğ|üïFğ¿Áÿnÿ»üï†~ı×İü+\\{íµügº÷Ş{ùW øßà7‚ÿİşw#øß¹<3Ì.éBÊ\0\0\0\0IEND®B`‚','2026-08-14 16:23:00'),
('4df9cc1b-1026-4fac-a732-8697c53f87ac','ItsRequiem','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\08IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾û»¿»ùß‹à7‚ÿİşw#øßà7*ÿJ7ÜpÏÏ]wİÅ‚ÿİşw#øßà7‚ÿİ¨ü+İu×]<?7ÜpÏÏ]wİÅ\"‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİ¨¼\0_ğ_Àóó—ïğ<?oğMßÄ¿Æ¯½Ş›ñü¼ì}ÏÏ§}Ú§ñ|üïFğ¿Áÿnÿ»üïFåØÜÜäù9ÕÏøpªŸñülnnò¯@ğ¿Áÿnÿ»üïFğ¿:Øß7ÿ{üïFğ¿Áÿnÿ»üïÆ?7èFÈä)N\0\0\0\0IEND®B`‚','2026-08-14 16:23:00'),
('4eb7912c-ef7a-48aa-adcd-8790039dc15c','StarMeowOfficial','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ˆIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯~Ìgı¤y~:/ÏW¿Ùó|u<_£¯Êó×ñüüïFğ¿Áÿnÿ»üïFå_Iâù\ZÇçK<ÿşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7ªê‚çç¦›Nò|¿ç¯çù«<Ï×=Ïò|üïFğ¿Áÿnÿ»üïFåxÚ“nå_ã/ó0¯Âóõä[ŸÊ¿ÆÆéM‚ÿİşw#øßà7‚ÿİ¨Ãrÿ…ç§Ôà?ÂòÜ!ÏÁÿnÿ»üïFğ¿ÁÿnT^€—|™ÇğüÜ}şÏOfãùÉ©ñü\\{íu<?×_{Œççoşö‰<ÿ»üïFğ¿Áÿnÿ»Q»®ãù98\\òüÛÙàù‰ŸRƒççøÎÏÏŞrÍóSw:‚ÿİşw#øßà7‚ÿİøGPo*~°\'*s\0\0\0\0IEND®B`‚','2026-08-14 16:23:00'),
('4ec163f8-5725-41f0-b92b-a09201dc6481','evAlpha','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0˜IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯şĞÇa­Ï×ÖœçkŞñ¯²\Zy¾V<_K‚ÿİşw#øßà7‚ÿİ¨[¯­9Ï×¼ãùÚ^ğßà7‚ÿİşw#øßà7êÖœçkŞñ|m/x¾6füw øßà7‚ÿİşw#øß:ïx¾¶<_/ööÏósï¯¼8ÿ\Zy‹¿çùù‡qşşw#øßà7‚ÿİşw£ò¼ØG˜çç}¿ğ×y~¾ó}şççŞ_yqŸ÷ı®»y~¾óSÍóóÇ_*‚ÿİşw#øßà7‚ÿİ¨«‘•ıOáù»ççÚ7ú{Ÿı¯ø=¿×çùY<?ÿ»üïFğ¿Áÿnÿ»!ÿåo˜çg1ãùšÏy¾fsşUÖ+¯ÕŠçk¹æù øßà7‚ÿİşw#øßÊ²\\óŸjµâùZ®ùW øßà7‚ÿİşw#øßè¼5Jz5Q\0\0\0\0IEND®B`‚','2026-08-17 13:55:07'),
('4fb4c481-9098-4e6e-ad03-830f2c91d352','visionplant','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0±IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾Ü\r5ÿ{üïFğ¿Áÿnÿ»üïF}—×yŸíãsŸíş#ì_\\ò¯±¿»âù øßà7‚ÿİşw#øßÊ°}bÁ¦íŸı‹Kşşw#øßà7‚ÿİşwC¯ı°G›çãú›NòüÜ}ÇŸøÌwä?ÂÇç¯óüÜ}Ç‚ÿİşw#øßà7‚ÿİ¨¼\0¿ı÷OâùÙŞÚä?Âë|æ÷ğüìòü<êøi‚ÿİşw#øßà7‚ÿİ¨¼\0?÷+¿ÌóóÙo÷¾<?7¼ì+ğüìßı4ŸGrŒçç³å\'x~>şŞçƒà7‚ÿİşw#øßà7ê|æ;òüÜğr/Çóóò/ù ş5¶¯(ÏÏË¿äƒx~^îå^çç>óy>şw#øßà7‚ÿİşwCw~ÏgšçcûúS<?Û×?”ÿLûw?çgÿîó<ÿ»üïFğ¿Áÿnÿ»ñ²´5¶ÕNX÷\0\0\0\0IEND®B`‚','2026-08-14 16:23:00'),
('502aec57-a321-4758-9f06-4f6e2c70fbad','SkylerH811','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0»IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯>|^Ìó1<_<Ùx~úç«şUîYòüüïFğ¿Áÿnÿ»üïF]6¯¾ğ|,<_çV<_eàùzø<_·İÉóUx¾şw#øßà7‚ÿİşw£ö<¥ğ|µÆóuİÏ×…¯ƒ¯Æów²çù!øßà7‚ÿİşw#øßÚ÷<_¯c…çëc?øÍy~¾â›~‰çg½æùê:¯‚ÿİşw#øßà7‚ÿİ¨ÃÀóµ\ZÏÏjäùZôÏÏ§Ô[òü|èşÿ\ZÇ…çƒà7‚ÿİşw#øßà7j)<_?ı«¿ÁóóÎ_ı®<?¾ş8ÿ\Z¯_x~~ıÓ~•ççİ^ï\ry>şw#øßà7‚ÿİşw£şÔw|<ÏÏƒ_ñy~Î¿ÜEŸã\'¯á_C¯ÀóõŠ¯øŠ<?º¾ñ|üïFğ¿Áÿnÿ»üï†îü¥/1ÿ¼ÖÛ|*ÏÁÿnÿ»üïFğ¿Áÿnü#/ø9úÍ<“\0\0\0\0IEND®B`‚','2026-08-17 13:23:09'),
('50f96783-0a06-4f63-9ffa-09af60c69528','Brusilovsky','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ÑIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾Âcj®«<?Ù\ZÏ—Äó¥àù©ÏO&ÏŸ’çƒà7‚ÿİşw#øßà7êÔ\ZÏÄóõKßü…ükDíx~Şä?•ç\'Â<?6ÏÁÿnÿ»üïFğ¿Áÿnèóó|üâ7!ÏÏl¾ÁóãL/ó|©ÏÏ8,y~ŞâÃ>“çƒà7‚ÿİşw#øßà7tÏo|¿y>^÷>‘çG<ò£ßÆóÓZòü¼ê»~ÿ\Z¿ö\rŸÏóAğ¿Áÿnÿ»üïFğ¿u\ZV<?ÿğÔ;y~úñ/ÎóÓ¦äùÏ×á[àùyúWü=ÏÏ]¿ò<ÿ»üïFğ¿Áÿnÿ»¡güÂ·˜çckûÏOíz¯èxşÌóãÖx~VËCŸåşÏÁÿnÿ»üïFğ¿Áÿnèeù ó|üÄ—}ÏÏÛ}Â—ğüüê·}1ÏŸy~Şğ>…çç\'¾ô“x~Şî“¾„çƒà7‚ÿİşw#øßà7ô2|ùß@<?ÿ»üïFğ¿Áÿnÿ»ñ±çQØó\nj\0\0\0\0IEND®B`‚','2026-08-14 16:23:00'),
('5136e396-b7b8-4a61-bf66-d4885a8133b1','Slovakk','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0#IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯şø}£y>:u<?òÈósşüŸ¿úë?çùy•W|Ÿ‡>ôa<?—.îò|üïFğ¿Áÿnÿ»üï†f}˜ç#ºMŸŸÿÁoäùù“?ùmŸ3§NòüÜxÃõ<?oùîËó³3«<ÿ»üïFğ¿Áÿnÿ»Q§L¯õ>ÏO7œçù™v/ğü¬êšççû÷/y~LÏó³îç<ÿ»üïFğ¿Áÿnÿ»¡¯úÜ6ÏÇÑşYŸ§=ùi<?/ı/ÎóóÄÇÿÏÏí÷ìòü¼ãû}ÏOâù øßà7‚ÿİşw#øßº^òü\\{Íu<??ñó¿Êóóó¿õ—<?zğŸwyû7áù¹÷éOãùyÆ÷ò|üïFğ¿Áÿnÿ»üïF}ì‹½ÏÏ4®y~^ú¥_‰ççñOû5Ÿ÷¿÷âù¹xş>Ÿ®3ÏOÕÄóAğ¿Áÿnÿ»üïFğ¿ú¤wó|ÜuÏYŸÿ¹ßæùYMkŸyñü|ôû¼ÏÏË½ÂKóüüÚ/ÿ&ÏÁÿnÿ»üïFğ¿ÁÿnÔ§®áù¹piŸççu_ãex~†£ÏÏ‰—Ÿ»nû)Ÿ“O»çÇ˜çƒà7‚ÿİşw#øßà7ş<KlW–µ˜ï\0\0\0\0IEND®B`‚','2026-08-14 16:23:00'),
('51458aeb-58a6-4f92-aa0d-861cffdd1fae','asdeo','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\08IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾óÛ¾›ùß‹à7‚ÿİşw#øßà7*/À·}ÔGóüT?çg¸åÏÏŸ\\w†çg9¼)ÏÏ+şÏ×Ç|Ûó|üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFå¨Çwx~´ßóüÔÙ	Ÿí8Îós¬ïx~×ñ¯Ağ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿•à}>çsùğQ?ø<?_õîïÇóóÍŸñü+üïFğ¿Áÿnÿ»üïÆ?0Ö#¥ø\0\0\0\0IEND®B`‚','2026-08-14 16:23:00'),
('523ac7ef-ca6f-4760-b757-6751835f0baa','Alorily','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ÀIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯~Ü;½‘y>>è+~„ççÎÛîâ_ãÆ[nàù¹ó¶»x~n¼åŸoù¸wâù øßà7‚ÿİşw#øß\rıÖ>Îü+üÃ~9ÿ™^ì?‚ÿİşw#øßà7‚ÿİĞ“îØ5ÏÇ¯ı§ğ?Éëøñ|üïFğ¿Áÿnÿ»üï†~ëgGíİÆÿ$OÜ¹…çƒà7‚ÿİşw#øßà7ê?üè—óü|ÀOü\nÿ\Zó3?Ç¿ÆK½Õ[ğ¯ñÑo÷F<ÿ»üïFğ¿Áÿnÿ»Q¿ú\'~…ççs?ç³x~~÷óüGxw{Ÿ7xäkòü|æg}ÏÁÿnÿ»üïFğ¿ÁÿnÔ·zÕçùyÓ7}S¯{Ÿîš9ÿ\Z/÷j/Íóó¦¯ğ¦<?ñ+?ÁóAğ¿Áÿnÿ»üïFğ¿u÷‹<?İ]÷ñü¼ıÖÏ×Áÿ\Zø¨·äùïºçg÷‹<ÿ»üïFğ¿Áÿnÿ»ñÕüDSjJ³\0\0\0\0IEND®B`‚','2026-08-16 17:53:03'),
('55c0f761-c552-4417-853d-2bd3766a473b','crunchiemc','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0IIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯ş\næ/‚ÿİşw#øßà7‚ÿİ¨ü+½¡ùÏô«Úä_à7‚ÿİşw#øßà7*/ÀúÿoèCŸ_Õ&ÏÁÿnÿ»üïFğ¿ÁÿnTş•N:Åósşüyş5N:Åósşüyşşw#øßà7‚ÿİşw£ò¯t×‡WŸõg]Ë¿Æ]^ù@ğ¿Áÿnÿ»üïFğ¿•`ıY×òßaıY×ò¯@ğ¿Áÿnÿ»üïFğ¿•¥ë¿näù‘Ä„»>¬òü¼Öglñ|üïFğ¿Áÿnÿ»üï†~…\ró¯ğZŸ¹Å‡ßùÜ‚ÿİşw#øßà7‚ÿİøG® L\nä•\0\0\0\0IEND®B`‚','2026-08-17 00:23:04'),
('56018719-656c-41bd-9af3-49818498ec6b','Westerian','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0\0ÙIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯Jâ1‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßÆ³\0f=õ®\0\0\0\0IEND®B`‚','2026-08-19 00:06:44'),
('574c49e8-8d78-4218-9a5a-b84c0f37626c','HighGround1887','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ÑIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯~Ö¼´y>rr‡ÿO¿°Çóóô‡<?9¹É¿Áÿnÿ»üïFğ¿ÁÿnÔ§_8äùyÈÉŸ§_Øã_ãéy~n½°Ïóó“›ü+üïFğ¿Áÿnÿ»üï†^ó!×™çãÁ\'·y~ŞåM_›ÿ_ôı?ÇóAğ¿Áÿnÿ»üïFğ¿•à]Şôµù×8qÃ	ş#\\¼ë\"ÿ\nÿ»üïFğ¿Áÿnÿ»Q?åİß‚ççu>ä#y~^ÿ¿‚ççËoàù:sËiŸ÷ú¦Çñüüú·~ÿ\nÿ»üïFğ¿Áÿnÿ»¡?ş¦O4ÏÇ™[Nó¯ñ{ßûóük¼Æ{¾9ÿ\Zgo;ÇóAğ¿Áÿnÿ»üïFğ¿zÏ—{„y>>ës?€çç{¿úy~^ù•_?şã?ãùyÏ~WŸÏùÌoãù øßà7‚ÿİşw#øß\r½çË=Â<9¹Éóóô‡<?9¹É¿ÆÓ/òü<ää&ÏÏÓ/ò|üïFğ¿Áÿnÿ»üïÆ?QÊBe—¼‘\0\0\0\0IEND®B`‚','2026-08-14 16:23:00'),
('5c09010b-ff36-4faf-9c5e-7a45932c3adb','Macroscopic_','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0/IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾Ó;½“y>^ã!Ïóóêoüf<?_ù÷ğü”Rx~qô<?;éx~şêì+ó|üïFğ¿Áÿnÿ»üï†¾ği\'Ì^™çg>Ÿóü|è»çùùÅoúiŸÇu¯Èó3#ÏÏk<äïy>şw#øßà7‚ÿİşw£Şvâuy~>ëí^çg\\òü”Õœçç%zÏÏÛ¿ÆóüÌvNòü|ò7|ÏÁÿnÿ»üïFğ¿Áÿnèi¿ùSæùø˜¯ùnŸ“\'Oòü¼íu#ÏÏ£_ëÍy~>çûç§µÆóó™ïôú<ÿ»üïFğ¿Áÿnÿ»QÛ°æùùéŸşiŸwûé¿æùyğøG<?Óêçç÷~ï÷x~n½õVŸgüîÏñ|üïFğ¿Áÿnÿ»üï†ÿÓßa§üÉoñü<ôå_ƒçç³~è×x~666x~>õ^—çg\\ñüÌ¶vx>şw#øßà7‚ÿİşw£>åO~‹ççA/ùŠ<?_ù‹ÊóóïóÖ<?óc\'y~>í›çç“ŞòUy~>ùÛ’çƒà7‚ÿİşw#øßà7ôîïşîæùX­V<?ÇãùÇ‘ç\'3y~º®ãùY­Vü+üïFğ¿Áÿnÿ»üïÆ?²dğ¾z!i\0\0\0\0IEND®B`‚','2026-08-14 16:23:00'),
('5db1d801-fbdf-4c69-9b8b-c7a15ba045d8','JOHNWICK5513','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ÙIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾ÜÃO˜…­¾òŸé`˜x~VÃÄóAğ¿Áÿnÿ»üïFğ¿õÒÁ’ççØÖ‚çç`˜x~¶úÊ¿ÆÁ0ñülõ•‚ÿİşw#øßà7‚ÿİ¨³¾ãùùà×zeŸë®9ÃóS7¶y~¦£}Ÿåzäù¹ti—çç[~÷Ox>şw#øßà7‚ÿİşwCßö~obcÇóü,fÿ\ZËõÈ„K—vy>şw#øßà7‚ÿİşw£;vœçç¾ây~Şî5¿”çç_á¯y~.]Úåùù¥\'½6ÏÏOüî\'òüüØÇ½+ÏÁÿnÿ»üïFğ¿ÁÿnèÛŞïMÌóqìØqş5~û/Ï¿Æk¿ìcø×¸ti—çƒà7‚ÿİşw#øßà7êáÑÏÏÁxÈóó«ô·<?/yó#ø×øæûŸ·x—çùÙ;y>şw#øßà7‚ÿİşw£Ö™y~Îï<?ëÕÀóó··?™çg½\Zx~fóçgïpäùÙÙìx>şw#øßà7‚ÿİşwãÏüWz¥´\0\0\0\0IEND®B`‚','2026-08-14 16:23:00'),
('5f34eb38-5a3c-4b4e-ae5f-afc9f58f700b','BeanieScoop','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0\nIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾ÿ;¾¹ùWxéW{IŸy‡ğü>íÏÏæCOòü|Óï=çç¯ÿàoy>şw#øßà7‚ÿİşw£~Ä+ŞÄóó˜“âùyü…<?‡O;ÆóóÔ?û]Ÿ‡ñš<?¸}‘ççñ¯xÏÁÿnÿ»üïFğ¿ÁÿnÔÇœÏÏï<á^Ÿ×zôµ<?å¡\'y~ÆkòüÌ÷nåùù\'ÜËóóZ¾–çƒà7‚ÿİşw#øßà7êã/˜ççµ}-ÏÏã/˜çç÷~ïé<?ïóRåùyü­Oçùy­G_Ëóóøæù øßà7‚ÿİşw#øßú{İIŸı¾?ä_ã—¾úÃù×øØ_xÿ\ZoûV¯ÆóAğ¿Áÿnÿ»üïFğ¿õ§~úy~Ÿ¹–çg÷ì½üg:~æZŸŸü™?àù øßà7‚ÿİşw#øß\r½Şë¼¶y>¾ó~˜ççïşîox~^şàvş5ş|ëfŸ—x‰—âùyßw{g‚ÿİşw#øßà7‚ÿİ¨9³Åó3û£ŸçùySsŸîºãük¼ÎÅ³<?ûôó<?9³ÅóAğ¿Áÿnÿ»üïFğ¿ÿ­N§oÇŠß\0\0\0\0IEND®B`‚','2026-08-14 16:23:00'),
('601d5f79-8aed-42b1-811b-d389088b15da','TsikenNaggit','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0(IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯Şqö‚ùß‹à7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşwC3¶Ì¿ÂŞú<ÏÏÙ½Cş5Îìlò¯±3;ÅóAğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»Q÷Öçùï°3;Å\0‚ÿİşw#øßà7‚ÿİĞ¯|İß™çãûnåù¹éšóüÜqß­<?7]ó`Ÿ;î»•çç¦kÌósÇ}·ò|üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïÆ?\\Ğı¯\'ÿ\0\0\0\0IEND®B`‚','2026-08-14 16:23:00'),
('6336925e-7b05-42a4-ace8-11b72866dfa9','John_the_fat_pig','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0\0ØIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ/øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşwãÉ\0aÂcÁ.\0\0\0\0IEND®B`‚','2026-08-14 16:23:00'),
('649ff7b2-6e6d-4ae5-b5ca-39c42d02e02b','tungtungtungply','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0gIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯æ?À7¿ÅŒş¹5ÿşw#øßà7‚ÿİşwCôòùğ2×ÿ\Zuwò€à7‚ÿİşw#øßà7dÛ<’x~lóü|öëÌø×øœßx~ló¯@ğ¿Áÿnÿ»üïFğ¿Á¿’$$!	IHBÿQ$!	IHB’xşw#øßà7‚ÿİşw£òäóß€à7‚ÿİşw#øßà7ôA/ß™…ë¶Äósı¶ø×¸{ß<?÷˜‚ÿİşw#øßà7‚ÿİ¨¼\0s÷Èóó2/;ã?ÂõÛâùù•\'<?/u}ÇóAğ¿Áÿnÿ»üïFğ¿•à¥®ïx~¾û/×ügz©ë;şşw#øßà7‚ÿİşwã²)¾„;!p\0\0\0\0IEND®B`‚','2026-08-17 15:05:29'),
('65f13e79-02a1-4215-bfe7-1119e856dcae','OsirisSama','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0dIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯ßÙ6ÿ\n}×ñ¡eòü´ÖøW øßà7‚ÿİşw#øßÊĞwÏO­•ÿÓÄ¿Fkçƒà7‚ÿİşw#øßà7jßu<?µVŸišøĞ2y~Zk<?}×ñ|üïFğ¿Áÿnÿ»üïFm™<_ÓÄóÓ2ùP\"x~Zk<?Ã8ò|üïFğ¿Áÿnÿ»üïFå¸÷ÜyŸ½£kx~.>ãkø×8ñ âùÙÙ8ÏósâØÏÁÿnÿ»üïFğ¿ÁÿnèôÉãæù8Z7ş5¶æÿ\Z«‘Yáù øßà7‚ÿİşw#øß\Z\nŸ­yğŸikŞñ€à7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşwãŒG3åWÄU\0\0\0\0IEND®B`‚','2026-08-17 13:44:25'),
('67787c05-192b-44a8-a4a9-0130151c6fa1','RuighV2','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\07IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯9sÆüïEğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»Qyn¸áş5îºë.ş5n¸áş5îºë.‚ÿİşw#øßà7‚ÿİ¨¼\0zÔ£x~îºë.Ÿ»ü7ük¼Î›¿#ÏÏ\r7ÜÀós×]wñ|üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿ÁÿnhÜ½Ë<ÓşYŸº}†ç§nŸá_cÚ?Ëó3íŸåù©Ûgx>şw#øßà7‚ÿİşwã•h&ÒyK\0\0\0\0IEND®B`‚','2026-08-14 16:23:00'),
('6993be1b-de1b-4801-afc7-508c3aacac7c','Crewette_PL','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0,IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾éë½šy>67<_æùÏ—xşl/ñü-y>şw#øßà7‚ÿİşw£òÈ<_‹ÅŒÿæù[.×ü+üïFğ¿Áÿnÿ»üï†ö[Ìó±±˜ó?ÉÑrÅóAğ¿Áÿnÿ»üïFğ¿õÁ7^ËÿÇx>şw#øßà7‚ÿİşwCüÇlş÷\"øßà7‚ÿİşw#øß\re¦y>\"‚ç\'3ùÏ<?™ÉóAğ¿Áÿnÿ»üïFğ¿ÊLó¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïÆ?o6#4âÕ\0\0\0\0IEND®B`‚','2026-08-15 04:23:00'),
('69a984f3-ec3f-4e78-8e3d-a6ca91511b54','Alexii_Talbot','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0—IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯~ÇG¿Œy>Wççë~íÿLñ›<?›óÂóAğ¿Áÿnÿ»üïFğ¿µ+Áó³9çù\ZÇ‘ççé×^ËóõgÆóó[náùÙœŸ®ÏÁÿnÿ»üïFğ¿ÁÿnèÆë¯7ÿ{üïFğ¿Áÿnÿ»üïFı¢w½çç=¿â/ø×¸ë\'~‚Şîíø×øŞ{9‚ÿİşw#øßà7‚ÿİ¨ïùÁósñâEŸï?q‚ÿ_Çó÷î/òüœ8q‚çƒà7‚ÿİşw#øßà7êêç~çgvü8ÏÏ5<?ó®ã_ãšŸãÇóü¬~îçx>şw#øßà7‚ÿİşwC»?ñæù˜÷=Ï×lÆªõšçg5<ÿ»üïFğ¿Áÿnÿ»Qç}Ïó5›ñßb6ãù™ó|üïFğ¿Áÿnÿ»üïÆ?tŠ-BW5\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('69ba6048-e794-46b2-a3a7-30c79f7f7539','comicraider','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0áIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯ı–o4ÏÇÁ…ó<?[ÇÏğü‰çG‹ÏOSòüÔ‘çK3‚ÿİşw#øßà7‚ÿİ¨ë¡ñü”&Ÿ2ëy~²ò|y¹æùé·7y~´=çù’y>şw#øßà7‚ÿİşw£–Ÿùƒnâùê‚ç+Åó‹çÇ“x~<<?±Ñó|üïFğ¿Áÿnÿ»üïFå8ıïÍóc›ççÂw~\'Ï6<?\'Şé]x~$ñüÜı\rßÀóAğ¿Áÿnÿ»üïFğ¿:û\rßl²±àùÉnàùéŸfóüHâùÑ…{x~†Ã%ÏÁÿnÿ»üïFğ¿ÁÿnÔ²Õó|©ñü|ÿ×|%ÏÏ{¾Ó»ğüh6ãùùñşAŸ·Ï÷äù™-<ÿ»üïFğ¿Áÿnÿ»QÛ¥ÏW)<?/ûr¯Êóó„Ûîæù™İrœççå_ı5x¾ºÊóÓZãù øßà7‚ÿİşw#øß\Z[•ç§eğü¼Ø#náùQ_y~<ëy¾fÇx¾†5ÏO(x>şw#øßà7‚ÿİşwã¦(E1ÉjG\0\0\0\0IEND®B`‚','2026-08-14 16:23:00'),
('69fbdb2d-065c-40a9-8b6f-a8ef447fcaaf','LGwolfpack','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0«IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾ó£_Ò<\'g<?;³mş3í­÷y~.¬x>şw#øßà7‚ÿİşw£ò\\XñßáÂúˆ‚ÿİşw#øßà7‚ÿİĞ‹Í®1ÿuİiş5xÏ9şüïFğ¿Áÿnÿ»üï†Şşõ¾Ğ<¯Í“ùŸä×ï{ÏÁÿnÿ»üïFğ¿ÁÿnT^€oı‹§óü\\Ø?ÇóóÉ¯ı\n<?Çñü|æÏü:ÏÏÉíÓ<?½ù<ÿ»üïFğ¿Áÿnÿ»QŸvû¯òüüÅçİÀóóºy7ÏÏÆ±c<?;7]Çóóy~~óónàùy¹ÏøU‚ÿİşw#øßà7‚ÿİ¨öÏñ|½êšçç±×ŸäùÙ¹é:ş5{ıI¯W}:ÏßŒçƒà7‚ÿİşw#øßà7ôê¯øæùøÀ—-<?;7]Ç¦½;îáùùÖ¿l<ÿ»üïFğ¿Áÿnÿ»ñŠò8‹µÆ_\0\0\0\0IEND®B`‚','2026-08-17 14:01:35'),
('6a4ca33e-97c6-4722-9fc4-b5a4d4acfcc9','Snerel','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0MIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯†ææùø“ÿI^éÎ×àù øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİ¨»—Äóó:}yŸßzÜ£y~øØïç_ãQ{wŸ×yìx~v/=ˆçƒà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşwC?|Í›çãaıÃøŸä©ÃSy>şw#øßà7‚ÿİşwCvÓŸ™…§Oå?ÓÃú‡ñ¯@ğ¿Áÿnÿ»üïFğ¿õÚ×ò¯ñ‡wı!ÿ™^õÄ«ò¯@ğ¿Áÿnÿ»üïFğ¿\nÍÍóqë‹?‰ÿIü÷äù øßà7‚ÿİşw#øßG!cúJÙ\0\0\0\0IEND®B`‚','2026-08-14 16:23:00'),
('6a97369f-c813-4bfe-bcd5-efa99062313c','TBoG','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ÆIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯~è;¼¼y>pëŸÎlñüœÜYğü,×#ÏOKóüüÃSïãùy¹Ç\\ÏóAğ¿Áÿnÿ»üïFğ¿•`5Œ<?¶y~q÷.ÏÏ5\'7y~Äó7ï+ÏOkçƒà7‚ÿİşw#øßà7êß?å>ŸÖ’çg5L<?âùéjğü<å=ŸÕ0ñü¼ücnäù øßà7‚ÿİşw#øß:ÏÏ¿ı+óüüáßŞÆó3ë+ÏOfòŸˆà7‚ÿİşw#øßà7jß÷ükì¬y~î¼ï>Ÿ—|äuük¼Üc®ç_à7‚ÿİşw#øßà7êK=êzş5j-ügú‹ÇßÍóóO=ËóAğ¿Áÿnÿ»üïFğ¿úÚ}=ó|<áöKüGh­ñü”Rx~şá©gy~^ò‘×ñ|üïFğ¿Áÿnÿ»üïF}üm»<?’ø×øÛ\'İÃóób;Ãóó”;öx~yËqŸc3‚ÿİşw#øßà7‚ÿİøGtgR?Â¼ûÿ\0\0\0\0IEND®B`‚','2026-08-17 14:16:50'),
('6acec059-a2ee-4fff-829d-48418fd28596','dougdimmadom312','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ñIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯~Æû¿·y>nÚæù:}ÍÏÏ_?õˆççÜî>ÏÏë¿Üµ<?çî;âù¹cŸç‡à7‚ÿİşw#øßà7*/Àc}’ççØñççU^é4ÏÏÙ³kŸK»#ÿ\Zwìñ|üïFğ¿Áÿnÿ»üïF=·»ÏóóÙßùş5.ìíñáäÎÏÏ£n¾‘çƒà7‚ÿİşw#øßà7êKß¼ÍóóßÿG<?Ÿ÷UŸÈ¿Æú÷x~®{•—àùùØübŸ¿øºãù øßà7‚ÿİşw#øßzúš\rş5Şï>™çç;~ä‹y~®{•—àùùØübŸûîºÀósúš\r‚ÿİşw#øßà7‚ÿİĞßüÈ\'™çãÌ™Ï×«~ÏÏ]w]àù¹ï®ük¼ôğ}<?gÏ®y>şw#øßà7‚ÿİşw£^ÚùWù™Oæùéxşnä_ç,Ïß¥İ‘çƒà7‚ÿİşw#øßà7*/ÀS¶Ïóó¨—{Ÿ¿ú¢oàùùÛK#ÏÏ{}ñGóü<ñ/~‹ççÌÉ9ÏÁÿnÿ»üïFğ¿Áÿnü#w	RèÚáV\0\0\0\0IEND®B`‚','2026-08-14 16:23:00'),
('6c055e3d-952b-405a-b0e5-dfefc0ee2d89','kinsukghoshXD','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ŒIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯^sê”y>j­<?mšx~J­<_æùš¦‰ç§v•çgš&‚ÿİşw#øßà7‚ÿİ¨µVŸZ\nÏŸy~j)ü«ˆç«–Â¿Áÿnÿ»üïFğ¿ÁÿnTñüÕ¾çù™–ç§ö=ÏOFş5jßóüLË%ÏÁÿnÿ»üïFğ¿ÁÿnTóŸË˜ÿDÿ»üïFğ¿Áÿnÿ»¡®½Ö<»ûük½›çkyÄó³yËÃø×8±½ÅóAğ¿Áÿnÿ»üïFğ¿•à®»îäù9şbïÅ„£¯Ïó³ûßËóóØG=’çƒà7‚ÿİşw#øßà7ê4Mü«œ|1ŸñŞ;y~ÄpòÅxşÌó3MÏÁÿnÿ»üïFğ¿ÁÿnhxÚãÍóQvNğÁ<â_§í]äù øßà7‚ÿİşw#øß3E;_V¤²+\0\0\0\0IEND®B`‚','2026-08-14 16:23:00'),
('6c3d87dd-2732-427c-a864-a4975f770736','_TheNothing_','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0{IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯æ/‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßúßÿ<?ûWük\\{ã)ş5î½ó<ÿ\ZÛ\'æ<ÿ»üïFğ¿Áÿnÿ»Qy¾êÃ•çGÏÏ—şì»ğ¯ñÕñk<?¶y~>óŞ’çƒà7‚ÿİşw#øßà7ô©ßófæù(%ø×¸áš›ù×¸ë¾Ûù×h-y>şw#øßà7‚ÿİşw£?±Ãósî‹<?§¯;Áóóô[ŸÆósúº<?ë£‘ççôu\'x~Îİs‘çƒà7‚ÿİşw#øßà7êöüÏÏ]ës<?Ûó<?w­ÏñülÏOğüÜµ>Çó³=?Áós×úÏÁÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïÆ?¬\r2fbš2\0\0\0\0IEND®B`‚','2026-08-17 14:15:45'),
('6d100df0-dbd4-4ce7-86bf-5f6b1d68790b','Malicios','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0tIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯şí§¿‘ùW¸şÄ’óü‰çëî‹şşw#øßà7‚ÿİşw£^bÉó;×òüíğüäŞ½<_âùŠky~nÜáùÊ½{y>şw#øßà7‚ÿİşw£–ÅÏ×xÈ&‡ük”ÅÏÁÿnÿ»üïFğ¿ÁÿnT^ñü™ÿdâù3ÏÁÿnÿ»üïFğ¿ÁÿnÔ¶<à?“yşÚò€ÿ\0ÿ»üïFğ¿Áÿnÿ»¡s÷ÜjşŞí­Ş„ççûßñÏ—y¾ŞıÇÎòüüÀÏüÿ\nÿ»üïFğ¿Áÿnÿ»¡[ÿø#Ìó±õàã_cú…»ø×¨ovÿ\Z·~ÏÁÿnÿ»üïFğ¿ÁÿnèÖ?şó|™çOü·ÏÁÿnÿ»üïFğ¿Áÿnü#P3\0Ô\'–\0\0\0\0IEND®B`‚','2026-08-14 16:23:00'),
('6f93e5d7-b57f-20d9-9d89-f1621f0780eb','NPC1','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ÁIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯Şù-odŸƒÏ×Öœçë`Å¿ÊÖœçë`Åóµ5çù øßà7‚ÿİşw#øßÊÁŠçkkÎóu°âùÚšóü,‡CŸ/ÀÖœçë`ÅóAğ¿Áÿnÿ»üïFğ¿•­9Ï×ÁŠçkkÎó³y~½ö\'ñ¯1üá×ó¯@ğ¿Áÿnÿ»üïFğ¿u9ò|õ<Ã!ÏÏ±×ş$ŸÙlÆó³wé\"Ï×Ë¾/Ïşò;y>şw#øßà7‚ÿİşw£Î_ù#x~®}é·åùyô=†çç¯ŞhÆóUæ<?¯õMŸÆóó„oy<ÏÏ½<_ÿ»üïFğ¿Áÿnÿ»¡ûEó|¨t<?Eæù*s¯¶âùRáù™¦‰ç§ñ|üïFğ¿Áÿnÿ»üïF­µò|•ÏW[ñü´§]ä_£<hÁóS‹x~Öë5ÏÁÿnÿ»üïFğ¿ÁÿnT^¶âù*sŸò şuÊœÙŒç‡à7‚ÿİşw#øßà7ş¨@g>Ã…\0\0\0\0IEND®B`‚','2026-08-16 17:23:03'),
('6fea9bfe-6e24-4687-a3ea-068262453d6c','atarutea','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0dIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾ñ¿±y>Î=Ëÿ$gÎœáù øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİ¨ëõšÿ\rÖë5ÏÁÿnÿ»üïFğ¿ÁÿnTş•>øUÅ¦oşÃ\'ò¯@ğ¿Áÿnÿ»üïFğ¿z¹—{9ó|<şñç_ãkŞï­ù×ø¨ïøiş5ó˜Çğ|üïFğ¿Áÿnÿ»üïFİÙÙáùù©ïüfŸoøÒ/àù9sl‹×~Ä<?õ)ŸÁóóÅßò]<ÿ»üïFğ¿Áÿnÿ»¡×y×1ÏÇ§¾é+ğ?ÉşâŸñ|üïFğ¿Áÿnÿ»üï†~úÓ?Ğü+l;Î¦ÃK»ü+üïFğ¿Áÿnÿ»üïÆ?\'†RÖÇ\0\0\0\0IEND®B`‚','2026-08-14 16:23:00'),
('71000d6e-ffd2-4913-b3bb-5105a0114b80','alaies2739','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0™IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯<yÒü\'z9‚ç§Ê¿Æ=«5ÏÁÿnÿ»üïFğ¿ÁÿnTş“õQù×râù¹n>ãù øßà7‚ÿİşw#øßÊğ—ùüOòa/ÿ*<ÿ»üïFğ¿Áÿnÿ»¡\'>ññæ_áôékøÏtîÜ}ü+üïFğ¿Áÿnÿ»üïF†5ÏÏ}÷ÜÍósÇm·òü¼ôË¾\"ÿ\Zı—Ê¿Æ5×]ÏóAğ¿Áÿnÿ»üïFğ¿õ¾{îæù¹í¶{x~ŞçıŞ‡ççüùóük¼Ş¼	ÏÏw}Çwñ¯@ğ¿Áÿnÿ»üïFğ¿•à½ß÷½y~~ò\'~œççäÉ“ük¼Å›¾ÏÏ{¿ï{óüüæ¯ÿ2ÏÁÿnÿ»üïFğ¿ÁÿnèÔ©SæùøÑş~Ÿ×}ı7æ?Óoşú/óü|Á;¾;ÏÁÿnÿ»üïFğ¿Áÿnü#D®84—¦÷,\0\0\0\0IEND®B`‚','2026-08-14 16:23:00'),
('7365e8cc-7931-4375-ab33-a59220541a1a','celoriko','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0¯IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯^Ø{/óŸèé‡ÿ‰şw#øßà7‚ÿİşw£ò|ç§M<?ç/ğü¼ı—oñ¯ñãÀósêäÏÏë|*ÏÁÿnÿ»üïFğ¿Áÿnè/î~7ó¿Áÿnÿ»üïFğ¿ÁÿnT^€—*Ãóóaú<?_ô;<?O?œx~¾õ#x~¾á?ççïø~‚ÿİşw#øßà7‚ÿİĞ_Üınæ?ÀC6+ÏÏÓ\'Ÿ?ÿãùyù×úŸ;ï>ÃóAğ¿Áÿnÿ»üïFğ¿õÎ»ÏğüÜxıYş5~ÿ)\'ø×xù×úŸÿøŸ¿Å‹ñ|üïFğ¿Áÿnÿ»üïF½ûI×ğüÜxıYş5ô]gù×ø£<?oÿå[<?ş;<?ÿ»üïFğ¿Áÿnÿ»Qyî¼ûÏÏ×ŸåùyOå_åÎ»ÂósçİüküïFğ¿Áÿnÿ»üïÆ?¯zC¼gíWÄ\0\0\0\0IEND®B`‚','2026-08-18 15:06:52'),
('74845fc8-5483-489d-ba2f-c54ed98032a6','MuzSheet','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0ı1\0\0\0ÓIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾ÿ©şsüç\"øÏEğŸ‹à?Á.‚ÿ\\ÿ¹şsüç\"øÏEğŸ‹à?Á.‚ÿ\\ÿ¹şsüç\"øÏEğŸ‹à?Á.‚ÿ\\ÿ¹şsüç\"øÏEğŸ‹à?Á.‚ÿ\\ÿ¹şsüç\"øÏEğŸ‹à?Á.‚ÿ\\ÿ¹şsüç\"øÏEğŸ‹à?Á.‚ÿ\\ü#»â\0¸Á+ÕÑ\0\0\0\0IEND®B`‚','2026-08-19 00:06:44'),
('74de5c82-e8bb-20d2-a33a-09e57678aef0','NPC1','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ÁIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯Şù-odŸƒÏ×Öœçë`Å¿ÊÖœçë`Åóµ5çù øßà7‚ÿİşw#øßÊÁŠçkkÎóu°âùÚšóü,‡CŸ/ÀÖœçë`ÅóAğ¿Áÿnÿ»üïFğ¿•­9Ï×ÁŠçkkÎó³y~½ö\'ñ¯1üá×ó¯@ğ¿Áÿnÿ»üïFğ¿u9ò|õ<Ã!ÏÏ±×ş$ŸÙlÆó³wé\"Ï×Ë¾/Ïşò;y>şw#øßà7‚ÿİşw£Î_ù#x~®}é·åùyô=†çç¯ŞhÆóUæ<?¯õMŸÆóó„oy<ÏÏ½<_ÿ»üïFğ¿Áÿnÿ»¡ûEó|¨t<?Eæù*s¯¶âùRáù™¦‰ç§ñ|üïFğ¿Áÿnÿ»üïF­µò|•ÏW[ñü´§]ä_£<hÁóS‹x~Öë5ÏÁÿnÿ»üïFğ¿ÁÿnT^¶âù*sŸò şuÊœÙŒç‡à7‚ÿİşw#øßà7ş¨@g>Ã…\0\0\0\0IEND®B`‚','2026-08-14 16:23:00'),
('77543988-97f4-45cd-a344-dae72c25f709','Maekyr','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ÔIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯~÷»¼ºùWØ(âùyÙ×<Çó³»¿äùùû?¿‰ÿ\0ÿ»üïFğ¿Áÿnÿ»Qy6Šx~^ö5Ïñü¼Áô™<?Ã­Çóó3/ÿƒ<?Oû«›y~šy>şw#øßà7‚ÿİşw£¾ü«ŞÅ¿Æî~òü·şÏÏtş>Ÿ½ëç<?}¥;ùW øßà7‚ÿİşw#øß\rıæ>Ú<;³ÏÏ¼ŸÕ<?{ë9ÏÏ5ÛÏÏjHşşw#øßà7‚ÿİşw£O»çg¯ëx~º·ı`Ÿù>çoÅósßãÅó3#ÿ\nÿ»üïFğ¿Áÿnÿ»Q»®ãùyoüeŸ×y»/âùùÎOüVŸ¶¿Ïóó¹ğxŸßú‰OáùùÕx=‚ÿİşw#øßà7‚ÿİ¨ü Ïä_csç\ZŸ~¾àùÙæùÛÜ¹†ÿ\0ÿ»üïFğ¿Áÿnÿ»¡_yÿ×5ÏÇ#ŞÿSy~úù‚ÿLÃjÉóóäoÿB‚ÿİşw#øßà7‚ÿİøG[³N­pñ%½\0\0\0\0IEND®B`‚','2026-08-14 16:23:00'),
('79b9ae9a-61c0-471f-b2e8-a98915c70216','Sythodeus','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ÑIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯v]gqy~º®ãùÇ‘ç§ë:Ÿqy~º®ãùÇ‘çƒà7‚ÿİşw#øßà7êñãÇy~vwwy~?Îó³»»ËósüøqŸİİ]ŸãÇóüìîîò|üïFğ¿Áÿnÿ»üïF=yò$ÿ\Z\'Oä_ãäÉ“ükœ<y’‚ÿİşw#øßà7‚ÿİ¨;;;<?O|ây~Î=ËóóÃßúÅük¼ó~2ÏÏÙ³gy~õ¨Gñ|üïFğ¿Áÿnÿ»üïF½téÏmŸ÷y‹¯áùy§·~Mş5~í§®ãùùö_|/ŸG=êQ<ÿ»üïFğ¿Áÿnÿ»QŸøû?Ì¿Æá¥Æ„ÉGük<ñ÷˜çƒà7‚ÿİşw#øßà7äûşÒ<_õMßÏóó1òîügúÚoÿŸ|ÿwâù øßà7‚ÿİşw#øß\r}ñg}œy>>éÃŞåjÍó£¶äù™oç_ãë¾å{y>şw#øßà7‚ÿİşwã(›P\"tÛ¡—\0\0\0\0IEND®B`‚','2026-08-14 16:23:00'),
('7a49c556-73d2-40c5-b848-7c702cd96ff8','BossOmnivore966','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0\0ÿIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾ßk}‘y>~êï¾ŒÿIŞæ%>çƒà7‚ÿİşw#øßà7tòäIó¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïF}›—øŸŸú»/ã’·y‰Oàù øßà7‚ÿİşw#øßDJ\n´?Ipù\0\0\0\0IEND®B`‚','2026-08-14 16:23:00'),
('7e3a44d3-2edd-418f-876e-679cda2630cc','Lazzy_MC','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0SIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯:ùæ/‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİ¨¼\0ùsÿI^ö-\nÏÁÿnÿ»üïFğ¿ÁÿnT^€Ç¾Áßò¯ñ¸_{Iş5ûË¿Æ|ş2<ÿ»üïFğ¿Áÿnÿ»QW«¿â_ãSûÇğüt›7ò¯ñ\Z§\ZÏÏïÿŸÕê¯x>şw#øßà7‚ÿİşw£Fœäùù½ß_Ÿ_xí_àù©gø×¹ççşğãy~^ãÕ¿“çƒà7‚ÿİşw#øßà7´½õ‘æùxê_¾9ÿ“<ìeçƒà7‚ÿİşw#øßà7ş¨ êJDb\0\0\0\0IEND®B`‚','2026-08-14 16:23:00'),
('7ee8e0d3-4ea8-4039-bfc3-0333db7c7993','Goatlian','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0£IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯>úÅ~Ü<ãx–ÿãx–ÿGGÿÀóAğ¿Áÿnÿ»üïFğ¿uÏòáOşğx~ö÷÷y~^á•?™ÿ\0ÿ»üïFğ¿Áÿnÿ»¡ï¿î¸ùß‹à7‚ÿİşw#øßà7ô¨G=Ê<ûûûüGØßßç_cŸ‚ÿİşw#øßà7‚ÿİĞÅ‹Íóñb/öbükÜú›[<?ïæùyøËğüÜ>šçç‰O|\"ÏÁÿnÿ»üïFğ¿ÁÿnèÂ…æùXııõ<?§¯yÏÇ»ù×8qà_cûeÎñ|üïFğ¿Áÿnÿ»üï†ö÷÷ÍóÑ÷=ÏÏşş>ÏÏöİáù9qàùÙ¿öoy~N:Åósë­·ò|üïFğ¿Áÿnÿ»üïF½ë®»x~N:Å¿Æù‹ÏOÿØ;y~Nñüİzë­<?óùœçƒà7‚ÿİşw#øßà7ş\\ZT–+d#á\0\0\0\0IEND®B`‚','2026-08-14 16:23:00'),
('813c8e43-96fb-4c99-91ac-c8bded72b80a','JJ1234567890','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ìIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯~Ä[¼¢y>n:½ÍósÇ¹}Ÿ›Noóücãù¹éô6ÏÏ­÷]âùÆÆóAğ¿Áÿnÿ»üïFğ¿uÖŸYå_ãäÖœçg9ğü®GŸ‡]wœççoo=ËóAğ¿Áÿnÿ»üïFğ¿u=6ŸOãù9ZO<?%Äó3¶äù¹t´æùÙYÌx~6çÏÁÿnÿ»üïFğ¿ÁÿnÔççŞ‹û<?ïü‘É¿Æw~ÙWğü\\r‹ççî‹<?³çƒà7‚ÿİşw#øßà7ôoñŠæùxÂçø×øîøV¯ÆóõŞïùük¼ñË>Œçƒà7‚ÿİşw#øßà7êÇî§ñül?è5x~^ç“?ç§ÔÏWåùºïŞ˜çç·¾øóy~öŸñ{<ÿ»üïFğ¿Áÿnÿ»¡güùÏ˜çgÎóUc“ç§Ìg<_Ï_ğ|µiÍó3M‡<ÿ»üïFğ¿Áÿnÿ»QÇvÈóÓ­6y~¦ù!ÏOf<?m\\ó|¯i:äù\Zx~şw#øßà7‚ÿİşwã†hVÕ3g0\0\0\0\0IEND®B`‚','2026-08-17 12:00:21'),
('825974e6-9566-4cc6-8ae0-28bf47cef8d8','lazerchicken64','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ŸIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯şÆ·½“y>õ&_ÁóóÄ_ú8ŸG½ÉWğ¯qö×ß—ççÌë\'ÏÏğë¯ÇóAğ¿Áÿnÿ»üïFğ¿õdw‘çgøõ×ãùyùãççO^õåù×(ŸñZ<?ı£×æùÚäù!øßà7‚ÿİşw#øßza<ÁóÕñ|âi<?ÿÜcükœÚüŸ§>”ççÂx‚çƒà7‚ÿİşw#øßà7tÇw˜ÿ\0?úè‡ñ¯ñOx*ÿşw#øßà7‚ÿİşwCwÜq‡y>ùğ›x~ô”;øÏôÈ‡ßÄóó¤§ÜÁóAğ¿Áÿnÿ»üïFğ¿ºã;Ì¿Â±[_—ÿL—ü›ü+üïFğ¿Áÿnÿ»üïFå_éwéş3½Ô‡ğ¯Ağ¿Áÿnÿ»üïFğ¿ºã;Ì€}ôÃø×xÇ\'<•ÿ\0ÿ»üïFğ¿Áÿnÿ»ñİ<—D­×Ù\0\0\0\0IEND®B`‚','2026-08-14 16:23:00'),
('82bd221d-55a6-4a0a-a2b5-89aa9fe8dbb5','WeepForWillow','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0iIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯~Û+½¸y>ªÄó3àù©ÏÏ¼ÏOàù©Ï—y~şw#øßà7‚ÿİşw£Ş³\\óüÔÏÏ<‚ç§*x~jˆçç¦ÏOÂó3Ù<ÿ»üïFğ¿Áÿnÿ»¡Ÿıõß7ÿ^½ç_ã[>æx~wÏÏ¼ÏÁÿnÿ»üïFğ¿ÁÿnèÂoÿŒùß‹à7‚ÿİşw#øßà7´¿¿ox¹<??ü¤‰ççÂoÿÿ\Z\'_û­x~Şù‘•ççÛşâ\"ÏÁÿnÿ»üïFğ¿ÁÿnèÂoÿŒùß‹à7‚ÿİşw#øßà7êïO§ø_Œà7‚ÿİşw#øßà7*ÿJ¯^Ïó¯ñûÓ)şüïFğ¿Áÿnÿ»üïÆ?ğ±((İ€º2\0\0\0\0IEND®B`‚','2026-08-14 16:23:00'),
('83729dfb-9fee-43b8-9062-061206409ed5','Kaloz','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0pIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯ŞtÓMæùÄ¿Æl6ãùY­V<?óùœç§µÆó³^¯y>şw#øßà7‚ÿİşw£ÎçsI<?«ÕŠçg½^ó¯!‰çGÏÏ|>çù øßà7‚ÿİşw#øßÚZãù©µòüÌçsŸÕjÅó3ŸÏy~şá¾çç%ßò£x~öööx>şw#øßà7‚ÿİşwC7ß|³y>òßÎÿ$/õ–ÅóAğ¿Áÿnÿ»üïFğ¿Z?éWÌóÑ?â\ry~6_öóy~.şÈ+ò¯qâş”ççğ/?çgxò¯ò|üïFğ¿Áÿnÿ»üï†ÖOúó¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnü#U«1Dâî\0\0\0\0IEND®B`‚','2026-08-14 16:23:00'),
('845fd19d-be31-4836-89ef-edf7f31a3462','Mr_Lorde','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾Å[¼…ùß‹à7‚ÿİşw#øßà7*/ÀüÜ/ğ|ıuòü|Gğ|}\r_Åóõ³¯ÇóõK<_oqòÓx>şw#øßà7‚ÿİşw£òŸîÿ\Zÿ<_O|‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßÊ¯¡ç¿Áÿnÿ»üïFğ¿ÁÿnTşÓ½	Ï×/ñà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşwCoñoaş÷\"øßà7‚ÿİşw#øßØ\ZgSñ\0\0\0\0IEND®B`‚','2026-08-14 16:23:00'),
('8766ae36-509b-4520-b6f7-f269f8eb2509','the0warrior','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ZIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾úG}ùWĞİùÏäëOğ¯@ğ¿Áÿnÿ»üïFğ¿uzÂ3øåÒÿ\nÿ»üïFğ¿Áÿnÿ»QyÌó\'ŸO{×ä_ã~0ø@ğ¿Áÿnÿ»üïFğ¿šÏçæ/‚ÿİşw#øßà7‚ÿİĞ·}áÇ›…7xõWã?Ó¯ışğ¯@ğ¿Áÿnÿ»üïFğ¿•àÍŞô-øïğfoú<?¿ğ‹?ÇóAğ¿Áÿnÿ»üïFğ¿•àA/ûZük<ù·ŠG¼öÛğ¯ñŸÿñ<ÿ»üïFğ¿Áÿnÿ»¡\'üüw˜çc¾s’~ç$ÿ\ZÃŞş5V{x>şw#øßà7‚ÿİşwãNi\'“ƒ¤\0\0\0\0IEND®B`‚','2026-08-14 16:23:00'),
('88a8db5d-3723-4973-9910-893b079990b8','sleepymaya','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ƒIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯şÆw¹ùß‹à7‚ÿİşw#øßà7*/À×Çğ?É‡¿ß»ñ|üïFğ¿Áÿnÿ»üï†Şæ5^ÆüïEğ¿Áÿnÿ»üïFğ¿•¥O|·×âù™mŸá_c½–ççKàwøW øßà7‚ÿİşw#øß\r½Ík¼Œy>şîî}ş5~æ+?Š·úØ¯á_ã%®ßæù øßà7‚ÿİşw#øßúwwïó¯Nş#„“ç\'<?w÷>ÏÁÿnÿ»üïFğ¿ÁÿnT^€oùÒÏçùùó_ù1ŸéŞ‹ük¼ßë¿ÏÏË¿Ñ;ğü|Ğ\'~:ÏÁÿnÿ»üïFğ¿ÁÿnÔ—¸~›çgã¾?æùyƒ×|YŸº½Ã¿Æ¼æËòü¬ïûcŸ—¸~›çƒà7‚ÿİşw#øßà7şF70jo±ÕÑ\0\0\0\0IEND®B`‚','2026-08-14 16:23:00'),
('88c54e2e-3776-490d-8085-c2c7a25f2dbf','real_R3N','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ÏIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯şÑ§¿¶ùpâ‘Çø×¸ø¤Kü øßà7‚ÿİşw#øßÊpâ‘Çx~.>éÏÏÅ\']â?Â‰Gãù¹ø¤K<ÿ»üïFğ¿Áÿnÿ»Qy6n¹ççâ“.ñüt<”‘§ñülÜrÏÏÅ\']âù øßà7‚ÿİşw#øßzâ‘Çx~îüõ\'òüt<”S¹…çïŸ;ı·y~N<òÏÁÿnÿ»üïFğ¿ÁÿnT^€7ø‚ßæù9vâx~~ÿË>ŒççÌCÌósİë¾7ÿ\Zş=oÅóAğ¿Áÿnÿ»üïFğ¿õâ“.ñü|å§|*ÏÏİ_øUüGø/x~®ÿÔáù¹ø¤?äù øßà7‚ÿİşw#øßÚñPŸø‚/àù¹çµnãùYİÁóµyÃ\r<?ø+oÇósİ~ÏÏ_|Æûñ|üïFğ¿Áÿnÿ»üï†şŸmşÎ<ôÁüklŞpÿ\Z·şşò¯@ğ¿Áÿnÿ»üïFğ¿ÿ–“> ‰*ç¶\0\0\0\0IEND®B`‚','2026-08-14 16:23:00'),
('8d8e86a4-0fe5-48d8-a969-1b1791359db4','Augustheard','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0£IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾ÿ{½§y>^åÕ^ççöÛnåù¹ù–ó¯qûm·òüÜ|Ëƒy~şè~Ÿçƒà7‚ÿİşw#øßà7ôßö­æù±xşÌÿ ÿ»üïFğ¿Áÿnÿ»QoÆ­<?7ßò`Ÿ3×\\Ãñüœ½ï^ŸÛo»•çƒà7‚ÿİşw#øßà7ê·ßÁóóßû#<?›[›<?‡‡<æùÙÜÚâù9<8äùyÃ×y5‚ÿİşw#øßà7‚ÿİ¨çÏå_ãğàñüò¯qşì}<ÿ»üïFğ¿Áÿnÿ»Qy^îÅÉóóÿ$ñü™—{ñGò¯@ğ¿Áÿnÿ»üïFğ¿õÔ™3<?çÏåùÙÜÚäù9<8àùÏÏæÖ&ÿ\Z§Ïœáù øßà7‚ÿİşw#øßÊÍ­-ş3™ç‹à7‚ÿİşw#øßà7şjâ<¡”5¸¥\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('8db8b67d-3602-43b6-bb26-056cfa04789e','marslikescats','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0lIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯^<\\™…YÏ_ğü¬§Æ\"‚ÿİşw#øßà7‚ÿİ¨¼\0\'6ç<?Gë‘çgcÖñü\\<\\ñüœØœóü\\<\\ñüœØœó|üïFğ¿Áÿnÿ»üï†\0ó¿Áÿnÿ»üïFğ¿ÁÿnÔ£õÈ¦õÔøODğ¿Áÿnÿ»üïFğ¿u=5ş3]<\\ñ¯ñ—oùæ<?/û³?ÏóAğ¿Áÿnÿ»üïFğ¿z·÷şxó|ìñü|×÷|-ÿ\ZWük¼Óc>ŠççÚÙcx>şw#øßà7‚ÿİşwCWæ_a&óü™ÿ÷<?ÿğIáù øßà7‚ÿİşw#øß\r™ÿDÉóˆçÏ<?Ÿğky>şw#øßà7‚ÿİşwãlÆ;´ÌlKô\0\0\0\0IEND®B`‚','2026-08-15 04:23:01'),
('8e2e6eb7-f6e8-4de6-ab1e-cc42e8ad9d21','BarkandMeow','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯òb/fŸø¯{1¯øşU^ìÅx¾şáx¾^ìÅx>şw#øßà7‚ÿİşwC€ùß‹à7‚ÿİşw#øßà7*yÿ*<ÿ©óşşw#øßà7‚ÿİşwCüÖo™ççå_çë_‘çëñç_å1áùúÓ?åùúó?çù øßà7‚ÿİşw#øß\rñ˜Ç˜çç¿‘çëå_çk{›•ı}¯?ÿs¯ıP‚ÿİşw#øßà7‚ÿİ`ŸÇ<†ÿQÿx‚ÿİşw#øßà7‚ÿİ¨<æ1<?/sÃ<?åäùºûnşU®¿ççe<?ÅóEğ¿Áÿnÿ»üïFğ¿•Ç?çç¯x^öey¾~ó7ùWyÙ—åùù«¿üK¯Ç?çƒà7‚ÿİşw#øßà7ş*5-9ù84A\0\0\0\0IEND®B`‚','2026-08-17 23:28:04'),
('903d66e1-a66c-4848-8700-b6194f60bd11','LAYSVEX0','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ÑIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯~Ó‡¾µy>.,y~Nl-x~.,y~Nl-x~.,y~Nl-x~.,y>şw#øßà7‚ÿİşwC¯ó’3ÏÇ‰­ÏÏÅƒ%ÏÏ‰­ÏÏÅƒ%ÏÏ‰­ÏÏÅƒ%ÏÏ‰­ÏÁÿnÿ»üïFğ¿ÁÿnÔw|õ—àù¹x°äù9±µàù¹x°äù9±µàù¹x°äù9±µàù¹x°äù øßà7‚ÿİşw#øß\r>}Úü+¸5ŸÚ÷<?™É¿†mşşw#øßà7‚ÿİşw£ò”Rx~†Öx~¦aà_£ö=ÏÏ4M<?ÁóAğ¿Áÿnÿ»üïFğ¿•`ŸZ+ÏO­•ççñ?ñı<?y³·ç_£ÖÊóAğ¿Áÿnÿ»üïFğ¿•à»¾ıÛy~~äÇœççÛ¿øsø×xã7~cŸwzû·çùyÿú ‚ÿİşw#øßà7‚ÿİĞîş†y~vNğütÛ[üg\Z÷x¾ö.ò|üïFğ¿Áÿnÿ»üïÆ??ŠPtz\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('9177b316-77c9-467b-8b73-dc4441b9136a','Xavian_Ruby','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0µIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯~÷ï=Õ<ŠÂóãl<?\nñ¯á4Ï¢ğü8ÏÁÿnÿ»üïFğ¿ÁÿnT^€ñüÈósxî\"ÿ™6OŸàù©\'‚çƒà7‚ÿİşw#øßà7êt1y~úëf<?İ™kx~T‚\r·äùQ	Ÿá5ÏÁÿnÿ»üïFğ¿ÁÿnÔ²Uy~dñü¼Õò¯øÏô³›/ÏóS¶*ÏÁÿnÿ»üïFğ¿ÁÿnT^€?ùˆÏàùù¿/øâ·â_ãÓ>ùgxş~†ççå¾ø³x>şw#øßà7‚ÿİşwCşŠïm/ûá·âùŸşG<?qêÍù×Èó?ÏóÓ=äUx~>á†çƒà7‚ÿİşw#øßà7*/Àü!oÍós÷öëñü\\{ñ‰ükœ»ñÓy~rz›çïgx>şw#øßà7‚ÿİşwCßøU¿m÷|àùÑÆ‚ÿL>Zòü|ïo%ÏÁÿnÿ»üïFğ¿Áÿnü#ÀGAA {Qa\0\0\0\0IEND®B`‚','2026-08-16 20:53:04'),
('91a0d158-5d80-43a5-9587-238325a436a6','CranSpriteberry','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ÚIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾ô#nišx~¦iâù©µòüÔZy~j­<?Ó4ñüÔZy>şw#øßà7‚ÿİşw£NÓÄó3MÏÏ4Mügš¦‰‚ÿİşw#øßà7‚ÿİ¨Ó4ñüLÓÄóó×¿ş#ükÔÍã<?Óá.ÏÏË¿ñ»ñ¯@ğ¿Áÿnÿ»üïFğ¿zñ‡>Ø<üóßÃ¿FôsŸèæ<?9®x~rXñü¼ü¿ÏÁÿnÿ»üïFğ¿Áÿnè¥ùpó|œ;w\'ıé¯ğüÔÍã<?}±Wâ_ãøñã<ÿ»üïFğ¿Áÿnÿ»QÏ;Çóó7·]äùù‘_üsŸèzŸèæ<?ŸúÍ¿ÆóóNoúò<?/uË	‚ÿİşw#øßà7‚ÿİ¨[[[<?\'7y¾N\\{œçg:¼‹ç\'ÇÏÏ‰kOòüœÜäùÚÚÚâù øßà7‚ÿİşw#øßZkåùY>õOy~ŞæÁsŸè¯ãù‰nÎóó6İ.ÏÏò©ÊóSkåù øßà7‚ÿİşw#øß¿›M-ÏğsÉ\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('92f5151b-35bb-4aa5-b7ca-e7695db683d0','cherydol','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0\0ÙIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯æ/‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßdb8R‚`\0\0\0\0IEND®B`‚','2026-08-17 10:23:03'),
('94113c9c-53ce-46e6-9691-3092c2f53e55','Malms','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0qIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾ÂË¼Œùß‹à7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7*/À¯ÁÛóüÌ·OğŸiµwççõ?ı\'x>şw#øßà7‚ÿİşwC¯ğ2/c½ÃCş5ğ#ŸÇ¿Æ£ßé3ø×ØÙÜäù øßà7‚ÿİşw#øßºwxÈóó°‡?œççşáø°Z¯y~^ìÅ^Œçç©Oy\nÏÁÿnÿ»üïFğ¿ÁÿnT^€ÿøçùùò/ÿrŸ½»ŸÂ¿Æ‹½Ø‹ñü|üÇ<ÏÏ‡|ğó|üïFğ¿Áÿnÿ»üï†.ıâ˜…ùö	Ÿ~ëÿ\ZÃÁyŸÕŞ/‰çƒà7‚ÿİşw#øßà7şu-O‘Aõ\\\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('94e64db5-eec4-48d7-9c0f-72d2f8a29f39','MattQuack','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ÕIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯~Ş»<Ê<¿ú•ççèèçggœx~/<?·M#ÏÏÆÆ&ÏÏ¾ØÄóAğ¿Áÿnÿ»üïFğ¿õi÷ìóü¼Æ£ñü<ıÎ%ÏÏCo<Éóc¿ù{<?¹qÎóó´{öy>şw#øßà7‚ÿİşw£^æÏÏ±çç!7äù1ÏßÓï<ÏóóOñ|‰çëú3Çx>şw#øßà7‚ÿİşwC/÷ğ›ç£ŸÍx~~íG?ÿL¯õVŸÈ¿Áÿnÿ»üïFğ¿Áÿnèåş`ó|¬×ÏÏlÖóüüÎÏ|)ÿ\Z¯õÖŸÄó³^­y~f³çƒà7‚ÿİşw#øßà7*/À‡~Ê§óü|õW5ÿöÕñü|ô§|ÏÏw|å—ò|üïFğ¿Áÿnÿ»üïFåxË÷y\'ŸßùßáùÙïOò¯ñ2/ó2<?où>ïÄóó_ù¥<ÿ»üïFğ¿Áÿnÿ»¡ƒøQó|ì÷\'ùŸd{¸ÀóAğ¿Áÿnÿ»üïFğ¿ÿ<B}egø«\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('968f5571-bfcf-40ab-b882-a40100cbadba','TotallyEmp','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0²IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾Í‹=È<§7ç<?§7f<?wîñüÜ||“ç\'Óü øßà7‚ÿİşw#øßº=ëx~ú<?Ë©ñü\\³5çùÙ[<?S&ÏÏñyÏóÓ×ÂóAğ¿Áÿnÿ»üïFğ¿u{ÖñülÏ:Ÿû–<?%‚çg^ÏÏzj<?»«ççø¼çù øßà7‚ÿİşw#øßº¿y~¾üóŞ™ÿâ_ãi¿şŸüÓ?çù øßà7‚ÿİşw#øß\r-ısÌó1½ÏäùùĞ_ıuŸ¯,Èó\'Ÿùë}ÏÏã>åıy~úúâù øßà7‚ÿİşw#øßÊñ¯ñ¸OyŸÇ~Ñ·óü¬~ãóx>şw#øßà7‚ÿİşwCË_ÿóŸJ<?Oûõgğü<ôõÄ¿Áÿnÿ»üïFğ¿ÁÿnTşÕÄósîIÁ¿ÆC_ÿAüë˜çƒà7‚ÿİşw#øßà7şVœ<šGVæ›\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('97cf1d09-68d9-4ffd-a509-876d08326997','maaaaaattie','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ŸIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾Í‡|·ùpêÌÍükœ?{;ÿşw#øßà7‚ÿİşw£òœ:s3ÏÏù³·óŸéÔ™›y~ÎŸ½çƒà7‚ÿİşw#øßà7ê©37ó¯qêÌÍüG8uæfş5N¹™çƒà7‚ÿİşw#øßà7*ÿJ_şv\'ùÏôñ?q‚ÿİşw#øßà7‚ÿİĞ+½ÔKšçãø£Şœù´wà_ã¾àÇø×¸ùÑ¯ÇóAğ¿Áÿnÿ»üïFğ¿õø£ŞœççØÉëy~.]¸›ÿLÇN^Ïósû~ƒçƒà7‚ÿİşw#øßà7ôJ/õ’æùøÍ_ÿŸK÷şÏÏÉ›Şwü8ÏÏ±kß‚ççm?ìëx>şw#øßà7‚ÿİşw£ŞğªËó“Cãù9yÓÛóáäMoÏó3ñülœz$ÏÁÿnÿ»üïFğ¿Áÿnü#|ğ.©I³e%\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('97d916a1-6157-4026-91b1-35990d743760','nooui','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0’IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯~îç~®ùW˜Íf<?óùœÕjÅó³^¯ùW øßà7‚ÿİşw#øßÊğã?ğ=üOòöïö^<ÿ»üïFğ¿Áÿnÿ»¡‡ß|£y>66æ<?Ã0òüô}Ç¿Æ0Œ<?}ßñü­x>şw#øßà7‚ÿİşw£ò¯ôÉïôügúÊŸúeşşw#øßà7‚ÿİşwC7]{Æ<wÜ{–¿ü¡oã_ãeßåø×¸éÚ3<ÿ»üïFğ¿Áÿnÿ»Qï¸÷,ÿÜqïY‚ÿİşw#øßà7‚ÿİ`\'şÒóüÜyëÓy~®¹éfş5î»ãvŸüŸG½ÉÛó|üïFğ¿Áÿnÿ»üïF½éÚ3<?‡»y~®¹éfş#\\sÓÍ<?‡»y~nºöÏÁÿnÿ»üïFğ¿Áÿnü#¦Y6å{—•\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('98fe22fc-ecb2-4b6b-8697-c70bfe67b273','civwars','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0\\IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯>ñ‰O4ÿ{üïFğ¿Áÿnÿ»üïFå8“÷ğ?ÉÙ¸çƒà7‚ÿİşw#øßà7*ÿJ[7<šÿLw=‚ÿİşw#øßà7‚ÿİĞ…Çÿy>ÎÆuük<äºãük<ı]ş5Îä=<ÿ»üïFğ¿Áÿnÿ»QyùÈGòüÜôó¿Áóóôëó¯ñºOºçç7=Ÿ‹O¸‡çƒà7‚ÿİşw#øßà7*/ÀÁÁÏO;{ÏÏÁ]Oà_£½ççàà€‚ÿİşw#øßà7‚ÿİĞ…Çÿy>úíÓüO2ìŸãù øßà7‚ÿİşw#øßÊ0ìŸã‚ÿİşw#øßà7‚ÿİøGËD4\rŠyÃé\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('99b573fd-ee03-4dda-bc40-d9f1f82f1bbc','kritzuha','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0¿IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯~ÿw|«y>æ]Çó³³=çù¹ã³<?§Nç_cµâ_à7‚ÿİşw#øßà7êö|ÎóÓot<?ç¯ß˜óüôÏO7/<?ıªã_à7‚ÿİşw#øßà7*/Àùû<?Ûó9ÏÏKîô<?òÈóSÓ<?»§7x~‚ÿİşw#øßà7‚ÿİ¨‹çç¡¯:«ük,6ü«ìñüìâù øßà7‚ÿİşw#øßZg…ççoîŞçùV<?¯òĞÓüküşÓÎòüG+Ÿ~cÎóAğ¿Áÿnÿ»üïFğ¿õÖ§ŞÃóó:/õ0Ÿ¿ß½ÿ§®çùzh÷ Ÿ\'Üw‰çƒà7‚ÿİşw#øßà7ê-¿çg÷‹<?ßÜá?Âƒ½ÅóstqŸçg±Ññ|üïFğ¿Áÿnÿ»üïFÍUãù©5yş‚çg<\Zø×Xl,xş–<?…çƒà7‚ÿİşw#øßà7şÙ=?2pwòğ\0\0\0\0IEND®B`‚','2026-08-16 10:23:03'),
('9a7fc0f9-66b0-4f90-820b-8a614eed05a0','FecalMaster','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0°IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯şálşwó€à7‚ÿİşw#øßà7*ÿÉÆ»ù×8ğxşşw#øßà7‚ÿİşw£ò¯tûÅßäù9µõş5Î<ççÔÖcøW øßà7‚ÿİşw#øßúğ[¯áùy™7ù<Ÿ¿ú¥ÏàùùÛ­¿á_ãu.½3ÏÏË¼êçñüüÕ/}ÏÁÿnÿ»üïFğ¿ÁÿnèGşî‘æù8µõŸóçù9µõş5Î<ççÔÖcx~Î<çƒà7‚ÿİşw#øßà7ê©­Çğüœ?x<ÏÏ©­ÇğáÔÖcx~Î<ççÔÖcx>şw#øßà7‚ÿİşw£ò¼ÓK<‰çç	ûõ<?~É7äùyÂßş*ÿ\Z¯ÿ’oÈóóëOÏÁÿnÿ»üïFğ¿Áÿnè×ŸşVæ_á·ßîø×øü¿|\nÿ\Z¿şô·â_à7‚ÿİşw#øßà7şĞ¦@2hTÎÚ\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('9ab64574-9078-4879-aa94-d6caa2a0530f','Myrrdraal','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0_IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯Ştıµæ/‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİ¨¼\0·÷7ğ|şS]HŸ›ßûÃx>şw#øßà7‚ÿİşwC7]­y>ööø×¸ô[ßÇóµ³ÁósìåŞí-‚ÿİşw#øßà7‚ÿİ¨¼\0O¾í<?¯ö˜‡ñ|ílğ|mÍx~®Ù¬<?ğø§òü¼Ü‹½ÏÁÿnÿ»üïFğ¿Áÿnè¦ë¯5ÏÇí¿ı=ü«lÍøW9Xó¯qók¿ÏÁÿnÿ»üïFğ¿ÁÿnÈö“æ_cgƒçkkÆ¿ÊÁšçkïˆ‚ÿİşw#øßà7‚ÿİøGƒc\"3Å½Jµ\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('9e55408c-aee0-4a97-91ca-7a480f3c54ad','swamp_wizard_','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯Şü¨Ï4ÏÇ/}çGñüœ¸æÏÏÆVá_ãè ñü\\¼ïÏÏ›¼ï×ğ|üïFğ¿Áÿnÿ»üï†¾ë+ÿÄ<7?äÏÏu×œàù9qÍ1ş5.Şw‰ççû.òüÜşôó<ÿ»üïFğ¿Áÿnÿ»¡rí{›çã†ã·ğü\\j‡ççÌé‡ğü¼ø‹=Œçç·~ç×y~î>¿Çós×îm<ÿ»üïFğ¿Áÿnÿ»Qynû˜ëøW¹^<_×¯x¾^ù¡<_wßÃóS?ë6‚ÿİşw#øßà7‚ÿİ¨‡óŸ¿=óš<?w>õ\"ÏÏ›ğwüküÒÏğüÜø°Gòü~Ì>ÏÁÿnÿ»üïFğ¿ÁÿnÔƒ½ÏÏ#_æ1<?ïğ~âùyİOş\0ŸÏßGá\'òüüÍ_>‘ççà/~‚çƒà7‚ÿİşw#øßà7ô7?ñ÷æù¸ñ/~‚ççÎ—{;Ÿc§·x~®½ùfŸ\'ıÕãy~nü‹Ÿàù¹óåŞçƒà7‚ÿİşw#øßà7êO½ÈóõroÇósìôÏÏ¾Õëó¯ñ«?óë<?w¾ÜÛñüÜùÔ‹<ÿ»üïFğ¿Áÿnÿ»ñ´šU&´ÃQh\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('9ebd6353-3b44-4c72-9981-faf6050343a0','RainiiGalaxii','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0æIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯şş_˜…ãÇ;ŸİÃÿ\ZÇ7ç<?»»#ÿ\nÿ»üïFğ¿Áÿnÿ»Q7şôy~şêÚïäùy[<?O?»â_ã!g\nÏÏŸqÀóó2÷¾/ÏÁÿnÿ»üïFğ¿ÁÿnÔ£WüQ¯gğüÜwî€ççŞ\'îò¯±)ó¯qôŠ?ÊóAğ¿Áÿnÿ»üïFğ¿õégy~.Ş¾ËósËã¿›çç¥øWz<Ï×ÓóŞ<?OßÏÁÿnÿ»üïFğ¿ÁÿnèË¿ö	æùø™ïÿfş5>óåæük|î_¬ø×x«wÿ`‚ÿİşw#øßà7‚ÿİ¨?óıßÌóóR¯ğ:<?ÿÛ?çùyø#7x~¶n>ÍóÓÿım<?yÉ—çùù™ïÿf‚ÿİşw#øßà7‚ÿİ¨¼\0_÷UoÄóóe_÷Ÿc/ıw<?Ç®¹†ççŞúµx~>á#náùyÍWÿ-‚ÿİşw#øßà7‚ÿİĞ—íÌóñ^7üÏO9u’ÿLíüŸï¹ë5x>şw#øßà7‚ÿİşwã°M-%ãˆA\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('a015a88c-fd69-46f1-855f-6f80ffe7f828','PuppyGirlKisses','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ÖIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯~ú[¿y>®½ş$ÏÏ½w_àù¹öú“ükÜ{÷Ÿk¯?Éósïİx>şw#øßà7‚ÿİşw£^{ıIŸn<Ã¿Æ\r7á?Â\r7á_à7‚ÿİşw#øßà7ê\r7áƒn<ÃóAğ¿Áÿnÿ»üïFğ¿õ®;ÏòüÜpãŸwx³÷ä?ÄKó|ıÁ_ÿÏÏ]wåù øßà7‚ÿİşw#øßzïİx~>â›~Œçïy~îùùŸãùÙºö8ÏÏÖ+¼ÿ\ZŸşÖ¯ÇóAğ¿Áÿnÿ»üïFğ¿ÌóñGûŸ÷ùñ?âùùó·x8ÏÏæ5Çy~óÎóó]oÿ*<?¯ò’æù øßà7‚ÿİşw#øßú!¯ş\n<?¯üâùy‰éÏÏæ©\r¯ãÇx~^â­ËóóÊ/ñ(ŸyõWàù øßà7‚ÿİşw#øßÊpøç¿Ïóó£×ç_e÷ÏÏÚàù9üóßç_à7‚ÿİşw#øßà7ş,*7Çd{Ùr\0\0\0\0IEND®B`‚','2026-08-19 18:06:48'),
('a02d9702-e7a1-4d7f-ad18-cda82a43b367','Rayz_Amillionz','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0cIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾Şk¼†ùß‹à7‚ÿİşw#øßà7*ÿAJÿ\Z-“ÿ\0ÿ»üïFğ¿Áÿnÿ»QÇqäù¹ëÜ9ŸNŸæùyÆ¹sükÜpú4ÏÏ]çÎñüÜpú4ÏÁÿnÿ»üïFğ¿ÁÿnT^€ßú®÷â’wû„_àù øßà7‚ÿİşw#øßº\\¯y~¶NŞÂó³^-ùï°\\¯y>şw#øßà7‚ÿİşw£®W+åÀóó:ïùb<?ôÃOà_ãUŞùÑ<?ôÃOàùY¯V<ÿ»üïFğ¿Áÿnÿ»Qy=ÿ\Z¾ÔóÁÑó¯@ğ¿Áÿnÿ»üïFğ¿ºøßcşelñüDğ€à7‚ÿİşw#øßà7ş¥5’mÎ¢8\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('a11fe8f7-680a-4b1e-bac1-8c71f667d18f','IAmTheTobii','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0šIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾ÄcmÕzÍó3ŸÍx~Zkük”Rx~Vë5ÏÏ|6ãù øßà7‚ÿİşw#øßÚÕçgµ^óütµãù)Qx¾Äó\nŸÕzÍóÓÕçƒà7‚ÿİşw#øßà7jßWŸù4ãù™ÚÄóÓwÏÏÔ\ZÏO×UŸùlÆóÓ÷•çƒà7‚ÿİşw#øßà7jW;¿%ÏÏÏ~ÎûòŸé->ó;x~ºÚñ|üïFğ¿Áÿnÿ»üï†ñĞ‡˜çcGŸÖ\ZÏÏïÍÇò¯ñêõ•<?¥Ÿ¾ëx>şw#øßà7‚ÿİşw£ò<ıõ’çë¥Åósÿ:·}¢x¾ş:y~õ»<?ÿ»üïFğ¿Áÿnÿ»QyA^šçïµxşÂ¿Îkñ¯ó»<?ÿ»üïFğ¿Áÿnÿ»¡[ìËÌÿ^ÿ»üïFğ¿Áÿnÿ»ñ™,3Y^:\0\0\0\0IEND®B`‚','2026-08-17 14:11:08'),
('a3c8fe0e-6394-47da-b140-f1667c5ca3c7','Infernoart','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ĞIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯~ôë=Æü+¼ïËñŸé;ÿ|ƒ‚ÿİşw#øßà7‚ÿİ¨¼\0ŸòA¯ÏóóEßòë<?ïûòGük|çŸoğü|Ê½>ÏÏ}Ë¯ó|üïFğ¿Áÿnÿ»üï†>úõc7}äÿ\Z×íÿ\Z÷ì%ÿ\Z¿ø¤-‚ÿİşw#øßà7‚ÿİ¨oúÈŸ‡¿á\'òŸéáüë¼)_ÊóAğ¿Áÿnÿ»üïFğ¿•àk¿şù×øÄÏøŸÕÅ{y~¾öë¿‘7}$ÏÁÿnÿ»üïFğ¿ÁÿnÔ_|ÒÏÏ{}ÏŸòüüâ¯¼ÏO9uÏÏœçïÌ»àùyÓ7úŸïy¯Wäù øßà7‚ÿİşw#øßú\Z¯ôò<?/}zççğ•ß™çGuÁ¿Æk½ò;óü¼ôé=Ÿ§½ÒËó|üïFğ¿Áÿnÿ»üïFİ¿õ×y~î{ò3x~zş:Ÿ‰\'ó¯ñĞ³×ñüÜ—ÏàùÙ¿õ×y>şw#øßà7‚ÿİşwãYä?Qİ:ñ\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('a40a8519-6496-4e20-8c16-2bccd03c20ae','S1ard','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0„IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯Şş?aş÷\"øßà7‚ÿİşw#øßÊ¿Òp¸Ç¦~s‡‚ÿİşw#øßà7‚ÿİ¨¼\0ëÓåùYÜ4ãùÉ;şŠ¸éex~–«5ÏÏìÜãx>şw#øßà7‚ÿİşw£òœ>yœççnÿ*ÏÏb×<?åø6ÏÏŞâ÷x~®ßxCŸıs<?ÿ»üïFğ¿Áÿnÿ»¡[á»Í¿B9¾ÍóÓv÷ù×(Ç·y~Úî>ÿ\nÿ»üïFğ¿Áÿnÿ»QùWŠ›^†çg}zÍó“Ùx~fóÏ×îïñ¯@ğ¿Áÿnÿ»üïFğ¿µßæ_ãğèˆç§ÚŸó¯1>ü•x~fÇ·ùW øßà7‚ÿİşw#øßÊ¿ÒæÆÏÏáC_ç§ï:ŸE×ñü$ÿ*ÿ»üïFğ¿Áÿnÿ»ñ•÷1Í-zŠ\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('a57e47c6-f5bb-20b9-9168-5c1503a39d50','NPC2','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0êIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾Äƒ™ç£%ÏWQğümâù™¦Æó<?]-<?6ÏÁÿnÿ»üïFğ¿ÁÿnÔ–ü«4\'ÏÏÆ¼çùÙ™ÏO<?ç÷×<?éÆóAğ¿Áÿnÿ»üïFğ¿•à‹>â½y~ú®çùYÌwx~–‡{<_%x~.Ş{7ÏÏ—ÿø/ò|üïFğ¿Áÿnÿ»üï†~à³>Ä<‹ÙŒçg¹^óü”2ãù¹¸w‘çç–k¯áùyÆ3Ì¿Áÿnÿ»üïFğ¿ÁÿnÔÅlÆóó6ŸòU<?oñÆ_Ìóó¾¯t;ÏÏ-×^ÃóóM¿~’ççç~ù§x~~ğ³?”çƒà7‚ÿİşw#øßà7ôøfæù¸æºy~ºÙ1ŸŸÿÍßä_ãíŞø5x~î¸í)<?O¿çÏÁÿnÿ»üïFğ¿ÁÿnÔƒqâùîx:ÏÏ3îØçùÙ*ÿ\Z¿òkÌósİ\r<?¢ãù øßà7‚ÿİşw#øßzë]÷òüd&ÏÏéãÇø×XÏÏb6çù9\\6Ÿõ8ğ|üïFğ¿Áÿnÿ»üïÆ?cÉZ0`Øªï\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('a5ad0f0f-8b7a-49ec-8467-b625c5bbb38d','Stalfy','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0²IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾çÛ}¤y>>î\rÍÿ$_ñ«âù øßà7‚ÿİşw#øßÊğ9¿°Çóó¡/]ùÏô=ñüluÇx>şw#øßà7‚ÿİşwC¿ş™ïg³gGş\'9s¦ãù øßà7‚ÿİşw#øßzöìÈóó¨—~Cş\'yâ_ÿ*ÏÁÿnÿ»üïFğ¿ÁÿnT^€·ú‚Ïå_ãg>í3ù×x«/ø\\ş5¾ôÍ^™çƒà7‚ÿİşw#øßà7êçüöãx~ó:¯Ãóóøßú-Ÿí­9ÿó:¯Ãóó9¿ı<ÿ»üïFğ¿Áÿnÿ»¡—{å×5ÏÇï~û—óü¼Ëß=‘ççÇ_ëÕy~öŸôDŸ÷¹û,ÏÏ½Ä£x~^óı?çƒà7‚ÿİşw#øßà7ê»<ìzŸîäŸ­3<?ã…³<?óÓ\'y~¾‹çïâSïàùy—‡]ÏóAğ¿Áÿnÿ»üïFğ¿ÿ–á9åk><\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('ab0db16d-cd0e-4850-9c8d-500b4826969a','iPecs','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0‰IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯>ò‘6ÿ\nã¸æùéºÿú~Áósx¸ËóAğ¿Áÿnÿ»üïFğ¿µï<?‡‡»üGèûÿ‰şw#øßà7‚ÿİşw£îòü<í?ÿ}×oå?Áÿnÿ»üïFğ¿Áÿnè!yˆy>67ó¯ñw?ğaük¼Ä»}ÿ\Z‡‡»<ÿ»üïFğ¿Áÿnÿ»QÿOÇósr‹çë=~ğ\ry¾ÚÀ¿ÆŸıÙòü¼Ç¾!ÏÏ×¼åò|üïFğ¿Áÿnÿ»üïF=¹Åóõ¿óV<?‹<_ëKük|àï¼ÏÏâÆÏÏÉ-‚ÿİşw#øßà7‚ÿİÿè‹Ìó³q†Õ#ßççÂÏ×\rwı\0ÿ*Ggy>şw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7ş52Ï/éÜ\0\0\0\0IEND®B`‚','2026-08-16 21:23:04'),
('abb87f04-58c1-42d8-9d80-bff9cf1493ce','Bridmeie','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ÄIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯şÌ§}€y>¶wx~Vcğü\\¸¯ğüÜpãÈós×ÏÏÉk\ZÏÏ¸œó|üïFğ¿Áÿnÿ»üïF½íŞÏÏ‰ıçg{»ãùy~ö÷6x~w÷ŸÇ²ÍósñhÅóAğ¿Áÿnÿ»üïFğ¿õîKG<?w_âùzı­Ó<?Û[3ŸÛ/<?:½Ãóó¸»÷øW øßà7‚ÿİşw#øßzı±\rŸ7{­ÇğâñÏà_ãæ§y~şá¾#‚ÿİşw#øßà7‚ÿİ¨/vÍÏÏû|íOğ¯ñ]ùv<?~Ìƒx~Şçk‚÷}ù—äù øßà7‚ÿİşw#øß\r½Ö+¼œy>~á{¾‚çç³êŸ½åi<?·>ş<?¿¸ù:<?Ÿı6×ñü¼Ù{}ÏÁÿnÿ»üïFğ¿Áÿnèiß÷…æ/‚ÿİşw#øßà7‚ÿİ¨üùÃ_øKş5^õÍ^–ÿ\0ÿ»üïFğ¿Áÿnÿ»ñ£\rCÓMÁB\0\0\0\0IEND®B`‚','2026-08-16 10:23:04'),
('abc1d02d-6612-41c4-b0b5-f8cdc83d7a6f','Reezh','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0oIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾ù52ÏÇ™®ãùyØ¬ç?ÓS×ÏÏÙqäù øßà7‚ÿİşw#øßz¼v<?¯±¹Éóó{<?¿vpÀ¿Ælmñü¼ŞÖÏÏoò|üïFğ¿Áÿnÿ»üïF}íÍ\rŸ_[ñüüÆÁÿ~íà€ç\'kåùy½Í\r‚ÿİşw#øßà7‚ÿİ¨‹Åœçç7î½›ÿ¿±»Ëóóæ>ÁóAğ¿Áÿnÿ»üïFğ¿ºfçŒùß‹à7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw£¾áÖ1Ÿ_=¸Äÿ$o¸uŒçƒà7‚ÿİşw#øßà7ê=ÓÈóó\Z›Û<?¿w¸Ï¦×ØÜæù¹g\Zy>şw#øßà7‚ÿİşwãEß.=¦0‚\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('ad16a160-d75b-4cee-a0ce-ac073bd5d8b0','Kaico_sanamory','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0RIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯Şxãæ/‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİ¨¼\0ğ_Éÿ$¯ö~ËóAğ¿Áÿnÿ»üïFğ¿ºñÆÍó‘™üküÑw}5ÿ\Z¯ò>Í¿FDğ|üïFğ¿Áÿnÿ»üïFå?Èƒ|ÿ\rşw#øßà7‚ÿİşwC7Şx£y>~ş{¾‡ççÉ·ßÁóó¦:Ã¿Æ/>ñ,ÏÏ#n¾‰ççÍßë½x>şw#øßà7‚ÿİşwCwıÔw˜çc~Íõ<?›óÏO¿¹Á¿ÆpxÄós¸Zóü¬î»›çƒà7‚ÿİşw#øßà7şB¦\"â¬)\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('b095f847-c6db-4342-a022-2ebb750c0d46','Finex2126','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\06IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯nÍŠùß‹à7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7*/Àõ;=ÿîŞøW øßà7‚ÿİşw#øß\r=âÌÂü+|Õû½&ÏÏÇ|Çïòß€à7‚ÿİşw#øßà7ôˆ3ó|<é¾#Ÿ¯yğ\r<?——ä_ã)?ô·<?uë]<?¼fƒçƒà7‚ÿİşw#øßà7êW½ßkò¯ñP7ş#<Ô¯z¿×äù øßà7‚ÿİşw#øß\rıü\'¿‘ùß‹à7‚ÿİşw#øßà7şÊ7øp9\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('b539a75a-b564-460e-bff6-e371c61449ab','Buerbatos','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0sIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯^w|Ëü˜GáùYeã?Áÿnÿ»üïFğ¿ÁÿnT^€yŸÍ(<?‡Ùx~æQx~6£ğ¯q~\Zx>şw#øßà7‚ÿİşw£Î£ğü,¯yÏÏ’ço>›ñ¯qn½æ_cqßy>şw#øßà7‚ÿİşwCz©×0ÿ\n³ùœÿLëÕŠ‚ÿİşw#øßà7‚ÿİ¨³ùœçgscÁ‡ÍÏÏáÑ’çƒà7‚ÿİşw#øßà7êÎöÏÏŸÿúOñ¯ñò¯ÿ6üküù¯ÿÿ\Z/ÿúoÃóAğ¿Áÿnÿ»üïFğ¿õ†Ó;<?/şêoÂ¦õ7á_ã†Ó;<ÿ»üïFğ¿Áÿnÿ»Qyæó9ÿ™æó9ÿşw#øßà7‚ÿİşwã€]!–@›Î…\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('b6141c5a-f0b4-4f67-8423-4da525bc8943','F0xtr0tNisse','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ÔIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾Õ[½•y>ÎùŸÍ=ÏÏË^ÿZ<?ã8òüìîîòü<áì_óülèy>şw#øßà7‚ÿİşw£nllğü<zã¥y~ú¾ç_cGŸ¾ïy~}æ¥y~pö¯y>şw#øßà7‚ÿİşw£ŞvÛm<?<?<?<?ã8òüÜu×]<?GGG<_Gs‚ÿİşw#øßà7‚ÿİ¨›O¿Ÿ%<?wİµÁósttÄóó{¿÷{ü øßà7‚ÿİşw#øßzxqàù9Ú_òüll/x~:âù9::â?Áÿnÿ»üïFğ¿ÁÿnÔ£ı%ÿ\ZGûKŸßû›ßã?Â;½Ó;ñüìîîò|üïFğ¿Áÿnÿ»üïFİÚŞàùyä™—âù9~ü8ÏÏwıÍwñ¯ñ>ïó><?»»»<?GGG<ÿ»üïFğ¿Áÿnÿ»Q×÷ÏÏÎ?ççôéÓüGxÊSÂósîÜ9¯S+‚ÿİşw#øßà7‚ÿİøGD·VßtIÑ4\0\0\0\0IEND®B`‚','2026-08-21 00:06:47'),
('b6196c92-5940-472b-8336-83decdf3881c','Aydir_','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0gIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯şáö#Ìÿ^ÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿•ÿaV­ñü\\rãù øßà7‚ÿİşw#øßº<_ÛÉ‹óüÜî‘çƒà7‚ÿİşw#øßà7tÏÏ]gşğ[§x~ı:çy~ğÛ§x¾Ìóõè×9Ï¿Áÿnÿ»üïFğ¿ÁÿnT^€£—ùcŸ·˜¿ÏÏÏı2Ï×K¾ÅqŸ•ççoó<?õÊ<ÿ»üïFğ¿Áÿnÿ»¡¿ıjæùxÚošñ|•7òü´wò¯ñĞ×ÏÁÿnÿ»üïFğ¿ÁÿnèÂo¿šùWxÚo™ÿL}ñüûOåù øßà7‚ÿİşw#øß é2Ö>ß@M\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('b8b7c154-5288-4af1-855b-bb92167ab08f','2kelp','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0£IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾ÄK¼„ùW°ÍIü øßà7‚ÿİşw#øßj›çç!yÏODğüHâ_Ã6ÏOfòü<ıéOçù øßà7‚ÿİşw#øßúğ‡?œçGÏODğüØæù±ÍóSJáùÉLŸ‡?üá<ÿ»üïFğ¿Áÿnÿ»¡›nºÉüxù—yŸóçÏóü<ıéOç?\0Áÿnÿ»üïFğ¿ÁÿnÔ—ù—çùùĞ÷~oŸß}¿÷ãùù{şu¾óë¿ççwßïıx~şş5^ƒçƒà7‚ÿİşw#øßà7ôÖoıÖæù°Íóc›ççâÅ‹ükœ8q‚çGÏ$‚ÿİşw#øßà7‚ÿİ¨­5ŸR\nÏ$ŸS§Nñüd&ÿ\Z’x~Zk<ÿ»üïFğ¿Áÿnÿ»QylóüHâù9ş<ÿ\Z§Nâù±Í¿Áÿnÿ»üïFğ¿Áÿnü#ÏGù’ŒmO\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('b900d9ab-f0e2-4f92-b010-ee06eaf65e78','Ecuadorians','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0’IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯şĞÿ°y>®¿î:Ÿ\'?ùÉ<?Ÿú©ŸÊ¿Æ~áòü\\{İu<?‡‡‡<ÿ»üïFğ¿Áÿnÿ»QŸòä\'óüÜ{Ï=üg:<<äùyÚSŸÊó³¿¿ÏóAğ¿Áÿnÿ»üïFğ¿:sæŒùß‹à7‚ÿİşw#øßà7ê4Müküéşÿ™^ñU_…‚ÿİşw#øßà7‚ÿİĞææ¦y>†aà_ãqûwük<ö%_‚¾ïy>şw#øßà7‚ÿİşw£NÓÄóóÑşá<??òıßÏ„YWy~>äƒ>˜ççk¿ñy>şw#øßà7‚ÿİşwC€y>lóü¼Îë¼ÏÏoıÖoñ¯qóÍ7óüÜ~ûí<?’x>şw#øßà7‚ÿİşwC³ÙÌ<«ÕŠÿIæó9ÏÁÿnÿ»üïFğ¿Áÿnü#ı(?=I¾S\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('ba0c4676-4c40-4994-9c0b-4c3ab161b236','dasinger4','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0wIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯^{íuæùø¹o{(ÏÏÛ}Ä=ükŒÃÀ¿ÆÏ~Ë-<?oñOãù øßà7‚ÿİşw#øß:#ÏÏúŞ³<?ã0ğ¯1¬—ük¬ï=Ëó3#ÏÁÿnÿ»üïFğ¿ÁÿnÔÍíc<?³kÏğütı=ügš]{†ç§Ÿ-y>şw#øßà7‚ÿİşwCıéÇ˜ç§nğül?Å¿Æúh—ah<_ÓÏÁÿnÿ»üïFğ¿ÁÿnÔ-Ÿãù9àş\'Ùò9‚ÿİşw#øßà7‚ÿİ¨Ó¸æùÙâ6Ÿ^ñ¯±âˆ£ñ€çg\Z×<ÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿•¥ıK»<?ÛÇó¯1ÿşw#øßà7‚ÿİşwã±\"@dù¬YZ\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('ba45d8ba-8b21-4f1b-a194-731ef8bf271f','goatleaf','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ÙIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾ÜÃO˜…­¾òŸé`˜x~VÃÄóAğ¿Áÿnÿ»üïFğ¿õÒÁ’ççØÖ‚çç`˜x~¶úÊ¿ÆÁ0ñülõ•‚ÿİşw#øßà7‚ÿİ¨³¾ãùùà×zeŸë®9ÃóS7¶y~¦£}Ÿåzäù¹ti—çç[~÷Ox>şw#øßà7‚ÿİşwCßö~obcÇóü,fÿ\ZËõÈ„K—vy>şw#øßà7‚ÿİşw£;vœçç¾ây~Şî5¿”çç_á¯y~.]Úåùù¥\'½6ÏÏOüî\'òüüØÇ½+ÏÁÿnÿ»üïFğ¿ÁÿnèÛŞïMÌóqìØqş5~û/Ï¿Æk¿ìcø×¸ti—çƒà7‚ÿİşw#øßà7êáÑÏÏÁxÈóó«ô·<?/yó#ø×øæûŸ·x—çùÙ;y>şw#øßà7‚ÿİşw£Ö™y~Îï<?ëÕÀóó··?™çg½\Zx~fóçgïpäùÙÙìx>şw#øßà7‚ÿİşwãÏüWz¥´\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('ba47eca7-c6e0-4b66-8f77-e249387c625f','Tehquilaivy','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0{IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾Ş£_İüïEğ¿Áÿnÿ»üïFğ¿•ÿ ›uƒÃéˆÿ\0ÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿•¥wzé‡ğŸéGşúéü+üïFğ¿Áÿnÿ»üï†^ïÑ¯n\'<íù×ø¬·}7ş5>ç\'€G?ôUy>şw#øßà7‚ÿİşw£¾ÄâzŸ÷ığOäùùî_ú\rş#<öa/ÇóóŞoòz<?ö[Oåù øßà7‚ÿİşw#øßúŠ/uŒçç5^êÅx~î¼õ,ÏÏÖ\\<?7_w\rÏÏ=ÏÏk¾Ô‹ñüèÂ9‚ÿİşw#øßà7‚ÿİĞë=úÕÍóñ~¯ühŸSÛ›üg:¿Èóóü‚ÿİşw#øßà7‚ÿİøG÷O&¨İò\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('bac1b5d9-6730-467a-9032-ad4f39adb7fe','Pirate_Ship','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0”IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯xå¹y>úÊ¿Æ°7ñüô;•çgØ›x~úÊó3ìM<ÿ»üïFğ¿Áÿnÿ»Q/şñŠkßp‹ÿAşw#øßà7‚ÿİşw£şÕwÏÏÖ™ëy~ñfïÍ¿Æ“á»ùppön‚ÿİşw#øßà7‚ÿİĞµo¸eşüæ|	ÏÏ‹½Ã‡ñáÚ7Üâù øßà7‚ÿİşw#øß\r=ù¾Û<§_ıy~Şà›^Œçç‡^â³ø×xÄ›½7ÿ\ZOş…ïæù øßà7‚ÿİşw#øß\rıÃ}ƒy>úMş\'yÄ›½7ÏÁÿnÿ»üïFğ¿ÁÿnÔáp~c“ççàìİükl¹çg8:äùù«ïş\"‚ÿİşw#øßà7‚ÿİ¨ü+\rG‡<?[g®ç_c8:ä?\0Áÿnÿ»üïFğ¿Áÿnü#87¿¸›“\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('bbfc92b9-a643-4db8-a6dc-bfdcb0fc8d93','ish_amon_','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0RIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯~Æ×~’ùß‹à7‚ÿİşw#øßà7*ÿAê¬ğaZ7şşw#øßà7‚ÿİşw£ÖYáùùˆxş\'ùºoû>‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßÊğVoô~üküÂ¯ü0ÿ\ZoöFïÌ¿Æë¿ıkó|üïFğ¿Áÿnÿ»üï†|¯y>\\Ãóóí¿şI<?Oÿkó¯ñ—ÏÏû¿ş—ğü,¹çƒà7‚ÿİşw#øßà7tä{Íóñù_şåük|úÇ<ÿ\ZŸÿå_Î¿Æ§üÇó|üïFğ¿Áÿnÿ»üï†|¯ùß‹à7‚ÿİşw#øßà7ş‘\'\'a@\\Œ\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('bc12f817-d0f2-47a0-be1e-86c438cea6ea','Boston8099','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯n,¶Ìóñ´§=ƒççá(ÏÏ|¶ÁóÓ²ñüŒãšçç)Oy\ZÏÏCú ‚ÿİşw#øßà7‚ÿİ¨…çgssÁó³Xlóütµçù§çÇ6ÏÏÎ±MŸˆÂóAğ¿Áÿnÿ»üïFğ¿Úß;2ÏÇõ×_Ïó³{é<ÏÏ‹?ö•y~/ñü<ıçù9~ìÏÏİwßÍóAğ¿Áÿnÿ»üïFğ¿u±Ñóü|üÁ%ŸBáù™Í<?™ÉóSJáùùÔƒ‘çg‹ÏÁÿnÿ»üïFğ¿ÁÿnÔõzäùyÈÆëğüü.ŸÇó3ë7x~œÉóóÛ|&ÏÏƒyŸ££ÏÁÿnÿ»üïFğ¿ÁÿnÔåÑÀósÛÆïóü¼[û5ŸÃÃWçù98¼ÄóóÚ|.ÏÏç Ÿƒı%ÏÁÿnÿ»üïFğ¿Áÿnhkó˜y>n¿ãŸ{ÌKñüÌfŸõzÉó3kŸ\'=å	<?7ßtÏÁÿnÿ»üïFğ¿ÁÿnÔq\Zx~ö÷x~ööÏóüìpŠçg=ñü¬×KŸİ<?ã4ğ|üïFğ¿Áÿnÿ»üïÆ?§îi\\kÜsX\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('c0f06db5-c829-4874-9b64-1f6901ed1427','_PurpleNight','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0\0ùIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯æ/‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßÊğ|=ÏÏÃxyŸOæ•ù×øbş˜çç©ü9ÏÏ·ñá<ÿ»üïFğ¿Áÿnÿ»!ÀüïEğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿ÿóÒbUöl \0\0\0\0IEND®B`‚','2026-08-14 18:53:01'),
('c40a315f-f355-4cf9-94b7-9843bd625193','archerkb','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0¶IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯8qÂü+¼ü{>˜ççè¨ñüŒËçÇˆçgòÀós°»ÏóAğ¿Áÿnÿ»üïFğ¿•¥i\nŸko:Îó³yÏ×tdŸ§ÿõ=<?«yÏóAğ¿Áÿnÿ»üïFğ¿•¥W~Å—çù9}ì$ÏÏj}Äós4_óü”Gv<?wŸ;ÏóAğ¿Áÿnÿ»üïFğ¿:qâ„ùğ‰_ÿ~<?—öx~¶Íy~şêşšççèèˆçƒà7‚ÿİşw#øßà7tâÄ	ó|¼o¾)ÏÏKï<†çç#¾‚çç3¾çƒx~¾ûÓ‘çgww—ççµŞç%x>şw#øßà7‚ÿİşwC\'Nœ0ÿ‰^ã^Œçç1¯òŸÇ=íq<?ÏxÒ]<ÿ»üïFğ¿Áÿnÿ»¡\'N˜ÿx“Ó<?±Éóuxáˆçƒà7‚ÿİşw#øßà7tâÄ	ó¿ÀÖË<ÿ»üïFğ¿Áÿnÿ»ñS™F3‹¾\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('ce2162a3-4d12-4a6f-814c-4663e4fe4988','Dangerouspectate','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0şIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯æ_a>Ÿóü”Rø×h­ñü¬V+şşw#øßà7‚ÿİşwC€ùWxÒO½2ÏÏu7âùyĞş!ÏÏŸ|ç£x~®»~Æó³óÊ¿ÃóAğ¿Áÿnÿ»üïFğ¿Úûã×6ÏÇ=w¯x~î½ÔóüÜpÍÿ\ZwİwÀósí±çÇmÍóAğ¿Áÿnÿ»üïFğ¿õ×~ånŸ·û¬\'òüØæùyüw½ÏÏüôcy~^ı½~çGÏÏ|Í‹ñ|üïFğ¿Áÿnÿ»üï†şàk^Ì<óü\\óWäù©ıpş5†Ç}=ÏÏ¹§ÿ)ÏÏ=—&‚ÿİşw#øßà7‚ÿİĞ3ÿ[æù¸ôøïâù9ö˜÷áùy¿wKş5¾òÓŞ†ççØcŞ‡ççÒã¿‹çƒà7‚ÿİşw#øßà7ôäßüLó|ô×¿ÏÏ¥ÇÏÏ±Ç¼ÏÏ¥ÇÏÏ±Ç¼ÏÏ¥ÇÏÏ±Ç¼ÏÁÿnÿ»üïFğ¿Áÿnèÿ-ó|,Ÿñs<_§_ç§;zÏO=ó*<?ÓÙ?âù7Íóuî÷y>şw#øßà7‚ÿİşwã6B[‡6q˜\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('cfb68e02-978c-4648-973a-9d4ef60c96dd','matrix404','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0\0ÙIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯æ/‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßdb8R‚`\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('d06d7536-10fb-4d06-a886-5bde82c06583','ownerpro1','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0“IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯şú7¿¯y>V«ÿæó9ÿn?w–çƒà7‚ÿİşw#øßà7êíçÎòüüìo?™çgÿpà?Ó#?ñççÎ½\"ÏÁÿnÿ»üïFğ¿ÁÿnT^€ı‡s<?wMÉóó}?ÎósçKıÏÏ°wÏÏ#ù`şşw#øßà7‚ÿİşw£şı“Îñü\\ûµßÄó3ŞsÏÏ]ÇÎò|ı!ÿ!şşIçx>şw#øßà7‚ÿİşw£¾ø#Oóütù!<?İ”<__ñáüGXıÜ›ñü¼í«òüüïFğ¿Áÿnÿ»üïF½ùôó?Ëjµâù øßà7‚ÿİşw#øßÊÿ0ó·øŸù½oÆóAğ¿Áÿnÿ»üïFğ¿ú¸÷|óàèhàù¹ıŞ}Ÿ›¯İæ_cc£çù øßà7‚ÿİşw#øßÎ#?È>V?<\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('d09bffcd-f2c0-2046-a433-d5dd3204f008','NPC3','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0êIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾Äƒ™ç£%ÏWQğümâù™¦Æó<?]-<?6ÏÁÿnÿ»üïFğ¿ÁÿnÔ–ü«4\'ÏÏÆ¼çùÙ™ÏO<?ç÷×<?éÆóAğ¿Áÿnÿ»üïFğ¿•à‹>â½y~ú®çùYÌwx~–‡{<_%x~.Ş{7ÏÏ—ÿø/ò|üïFğ¿Áÿnÿ»üï†~à³>Ä<‹ÙŒçg¹^óü”2ãù¹¸w‘çç–k¯áùyÆ3Ì¿Áÿnÿ»üïFğ¿ÁÿnÔÅlÆóó6ŸòU<?oñÆ_Ìóó¾¯t;ÏÏ-×^ÃóóM¿~’ççç~ù§x~~ğ³?”çƒà7‚ÿİşw#øßà7ôøfæù¸æºy~ºÙ1ŸŸÿÍßä_ãíŞø5x~î¸í)<?O¿çÏÁÿnÿ»üïFğ¿ÁÿnÔƒqâùîx:ÏÏ3îØçùÙ*ÿ\Z¿òkÌósİ\r<?¢ãù øßà7‚ÿİşw#øßzë]÷òüd&ÏÏéãÇø×XÏÏb6çù9\\6Ÿõ8ğ|üïFğ¿Áÿnÿ»üïÆ?cÉZ0`Øªï\0\0\0\0IEND®B`‚','2026-08-17 15:05:27'),
('d1cb1bcd-c991-4212-aaeb-81192f170ebc','_Kergan','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\01IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯®æÍÿ^ÿ»üïFğ¿Áÿnÿ»Qyt|‹ÿI¼{ÀóAğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Ìó1üÎßò¯1ıÁŸó¯Q_íåù×è_ë%y>şw#øßà7‚ÿİşwCëŸùCó|èøÿ“x÷€çƒà7‚ÿİşw#øßà7j{ây~ê+½ÿ“´\'>‘çƒà7‚ÿİşw#øßà7jŞy/ÏÏô\'ÁóSõ(ş3µ\'>‘ç\'ï¼—çƒà7‚ÿİşw#øßà7şÁŒ%:WlÖ2\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('d4d184ac-afd2-46bf-9f98-a58dd33beb8f','Elpodero','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ÃIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯ıµ·0ÿî8Ëó³qÓi?ñ|™çëCşè½y>şw#øßà7‚ÿİşw£‚y~î8Çó³çÏÏö<?GwœãùÙ¿óˆçgûÆ\rŸraÅóAğ¿Áÿnÿ»üïFğ¿:ûkoa£;Îòü‰çgã¦Ó<?æù[Şq–ÅMgx>şw#øßà7‚ÿİşw£İqçgã¦æù9ºã«y¾Ìó%ñ¯²¸é£y~–w|5ÏÁÿnÿ»üïFğ¿ÁÿnTÛ<?gŞàyşÄósşŠ½Ï[óü½3ÏÏ3¾ë•y>şw#øßà7‚ÿİşw£J<_{ûMŸñÔCy¾ú×ükœ¿÷VŸîüÓx~.üÉ§ò|üïFğ¿Áÿnÿ»üïFå?ÈüÆky~Úá’çgä?Áÿnÿ»üïFğ¿ÁÿnÔƒ;x~¶v÷x~:ÆóÓxşÄó×\ZÏÏ¸»ÏóspçÏÁÿnÿ»üïFğ¿Áÿnü#ÎÒRb˜®_\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('d699157b-7068-4666-92e5-fc7c534c4787','__viola__','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0DIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾ó+æ/‚ÿİşw#øßà7‚ÿİ¨xÉ‘ÿÅşw#øßà7‚ÿİşw£¾Ì«tü/Fğ¿Áÿnÿ»üïFğ¿ZşÒ§™çcşÆŸÏóóŠ?şÁ<?¿»uš×<8Çóó§oÿÍ<?«_şt‚ÿİşw#øßà7‚ÿİ¨Õkş7¨^ó|üïFğ¿Áÿnÿ»üï†Æ_üxóàÒxšÍ~Ÿç§zÍ¿Áÿnÿ»üïFğ¿ÁÿnÔI3ş5ª×<?›ı>ÿ\ZÕkŸI3şşw#øßà7‚ÿİşw£ò¯4iÆósx×6ÿ\Z›7ğà7‚ÿİşw#øßà7şæÌ\':B¼U\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('d891e68e-e6b8-4f59-809b-efcea8c94117','Slidcarrot555','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0VIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾ş£æ/‚ÿİşw#øßà7‚ÿİ¨ü\'ûµïı\"ş#¼Á{~\nÏÁÿnÿ»üïFğ¿ÁÿnT^€_ûŞ/â‚ÿİşw#øßà7‚ÿİ¨¼\0wİøv<?õ¶¯Àóóc_÷Éük¼ÃG|1ÏÏ×üäŸñü}\nÏÁÿnÿ»üïFğ¿ÁÿnÈòÕæ/‚ÿİşw#øßà7‚ÿİĞÛ¼Ô¦y>~ò[¿€ççm?ğÓøÏô“ßú<?oûŸÆóAğ¿Áÿnÿ»üïFğ¿òŸ|µy>Şö?ŸüÜ/à_ãm?óÓø×øÉoı‚ÿİşw#øßà7‚ÿİÿä«Íÿ^ÿ»üïFğ¿Áÿnÿ»ñè&¬«\0_\0\0\0\0IEND®B`‚','2026-08-17 03:53:04'),
('dab1442f-68ad-4ec6-8d15-b088369f4fe7','luck800','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0\0ÙIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯Jâ1‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßÆ³\0f=õ®\0\0\0\0IEND®B`‚','2026-08-19 00:06:44'),
('dbc66303-2ab3-479f-81c0-ad28d749bff6','limecitruslimon','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ÆIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯şĞwıµy>ŞøÍÎÿÿ»üïFğ¿Áÿnÿ»Q‡ÕŠçç»¾éwx~şàqÇó5»ç\'6®åù9ùğ‡òü;äù9ºëoy>şw#øßà7‚ÿİşw£?{ççpÿÏÏg|ü[ñcâù›ñü;öú<ÿ»üïFğ¿Áÿnÿ»¡³w?Î<G‡G<?íÖüg*>Éó³±¹ÁóAğ¿Áÿnÿ»üïFğ¿õèğˆççèğçëÌŒççÚeá_ãŞEãù:<ä_à7‚ÿİşw#øßà7ê¯İuÏÏ#N=ççã¾ësx~şøı¿”7üöOäùùŠ÷ù,Ÿ\'ßuÏÁÿnÿ»üïFğ¿ÁÿnÔÃ‹kŸWµWâùy‰WxIŸræZş5^â^’ççÕıJ<?ıówğ|üïFğ¿Áÿnÿ»üïFİ¿oÍóãÀóóoõ¹üGøÎ·ú\\¯qàùÙ¿oÍóAğ¿Áÿnÿ»üïFğ¿ÿù*MfÔ%\0\0\0\0IEND®B`‚','2026-08-19 18:06:49'),
('e0c3650b-5403-439e-bbfb-58fab3e59665','GwebSnipSnip','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ÂIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾æ‡ü‚y>–¹†ÅÓïã_cùkø×X<ı>‚ÿİşw#øßà7‚ÿİ¨Ë‡\\ÃóõR7ò¯±ä_é¥nä_cÉóEğ¿Áÿnÿ»üïFğ¿•—º‘ççAóüüğ…?âùy^†ÿzìœççÜÈóAğ¿Áÿnÿ»üïFğ¿•à‡/üÿ\Ztİ_ñáyşşw#øßà7‚ÿİşw£ò7wòüœüÀ/à_ãÂo~\rÿ\Z\'_÷£ø×xÔ·ş8ÏÁÿnÿ»üïFğ¿ÁÿnhçA¯jŸøöÏáùùÔ¿:ÎóóGï¹Ã¿Æ«|ïÏÏ¾Ì.ÏÏÛ½ÿgñ|üïFğ¿Áÿnÿ»üïFİyÄ£x~^ÿõ_Ÿçç[}‘çk±â_ãşğ×x~Ê\'|ÏÏÎ#~çƒà7‚ÿİşw#øßà7ôšòæùøÍ÷¿çkkÎóu¬ò¯riâù:Xñü¼î·ßÃóAğ¿Áÿnÿ»üïFğ¿ÿ}Ñ8}¨eg\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('e16c5849-299c-46ff-810b-2c0e8d3b952d','HatGuy636','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0*IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯şæ›œ6ÿ{üïFğ¿Áÿnÿ»üïFå¸áäÈó³;ş3¯çç®ÏÁÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïF}±[\nÏ_áù9Áó÷ôİ‘‡ïxş:Ÿ[<?ÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿µ›oğáhoŸîº\rşüïFğ¿Áÿnÿ»üïFå?ÈÆNòß€à7‚ÿİşw#øßà7ôS¯|Êü+;!ş3]ºhşşw#øßà7‚ÿİşwã~æ.\nî\\`\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('e73c264a-8e8d-4f67-aa1c-211507ec7feb','AllieW_','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0gIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯>æ11ÿj­ükLÓÄ\0‚ÿİşw#øßà7‚ÿİ¨¼\0µVş3ÕZù×˜¦‰çƒà7‚ÿİşw#øßà7j­•ÿ\rj­<ÿ»üïFğ¿Áÿnÿ»QùWú½ïÿ^ş3½Æ»¿\'ÿ\nÿ»üïFğ¿Áÿnÿ»¡—x‰—0ÏÇşş>ÿ\Zı3?Å¿ÆK¿ÕÛğ¯±½½ÍóAğ¿Áÿnÿ»üïFğ¿uŸÿ\rö÷÷y>şw#øßà7‚ÿİşw£òüÃŸıÏÏ“¿µòüÌTø×øéø3ŸG|àÄóób¯ğ*<ÿ»üïFğ¿Áÿnÿ»Q‹ÏOççÑ6ã?Â£?¬ğüŒ‡kŸÅbÁóAğ¿Áÿnÿ»üïFğ¿ÿ;Ø\'’‘X\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('e9ad44b3-ee05-4287-a410-13dee589c397','sharkfangamer2','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0\0çIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯æ/‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßÊ`›\rIükØæ_CÏÁÿnÿ»üïFğ¿Áÿn0ÿ{üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïÆ?,ÑbK~èr\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('ea0f81e2-c3cb-4676-9f9d-f16d4632a133','BleuVinny','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0rIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯8qÂüïEğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»¡ßÿıß7ÏÇ_¼æ«óüìóüíñüíñü]J¯5=ÏÏÇşşoò|üïFğ¿Áÿnÿ»üï†> 0ÏÇÃxş.ğü=%{Ÿııßäùù×|uŸ‡óüÏÁÿnÿ»üïFğ¿Áÿnè‘×Ÿ4ÏÇË½öñüüÎ/ıÏÏ/¼ÿ›òü¬W<?oûC¿ÉóóZoò<?ñÛ¿ÂóAğ¿Áÿnÿ»üïFğ¿õ`9ğü|÷w7ÏÏC®=Å¿ÆlsÎ¿Æw÷wóü<äÚS<ÿ»üïFğ¿Áÿnÿ»¡¿úøw4ÿ{üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnü#¯9,µª%«D\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('ead534e0-1ac6-419c-9d93-7a3b4045ca40','reven004','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0¬IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯Îçsó?Èz½æ_à7‚ÿİşw#øßà7*ÿÃÌf3ŸõzÍóAğ¿Áÿnÿ»üïFğ¿•à§>õCùp”#ÏÏFtük¼ég}ÏÁÿnÿ»üïFğ¿Áÿnè—>÷cÍ€£y~6¢ã?Áÿnÿ»üïFğ¿ÁÿnT^€×ş„/àùùŠ—x	Ÿ—{Ï·ä_ã/¾÷gy~>æ¯ÿšççw¿ò3y>şw#øßà7‚ÿİşwC¯øŠ¯hııŸG>òQ<?OzÒy~ùÈGñüÜ}÷<?×_#ÏÏ“ôD‚ÿİşw#øßà7‚ÿİ¨×_#ÏÏõ×ó|=éIOäùyä#Åós÷İwòü\\ı<?wß}\'ÏÏ#ù(‚ÿİşw#øßà7‚ÿİ¨wß}\'ÏÏşşÏÏ#ù(Ÿ\'=é‰üëÜÉó³¿Àów\'ÏÁÿnÿ»üïFğ¿Áÿnü#÷2@S@í‘\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('ec2c48ad-d531-403a-bc72-01be8fb2edaa','Bigbudpluto','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0xIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯øµÌóÓ‰çk4ÏOœ*<?¹—<?ËüQş5ÄóEğ¿Áÿnÿ»üïFğ¿ÕÏW¹®ğüh!Ÿöô‘çgùc?Æó|üïFğ¿Áÿnÿ»üïFÕB<?Ú	¯Ñ<?Ëû1şüïFğ¿Áÿnÿ»üïFõÒ<?ŞKŸÃ¯û!ş!øßà7‚ÿİşw#øßZÛóü|Áğ?ÉæG¼ÏÁÿnÿ»üïFğ¿Áÿnhş`şÙx¯wâùñh‚ÿİşw#øßà7‚ÿİĞég<Ø<yÏÄósô?Â¿ÆüÍßç§<¢ãùZš‚ÿİşw#øßà7‚ÿİ¨ŞKŸ¸®ò¯±ùïÂóÓÎó¥àùi÷<?Zˆçƒà7‚ÿİşw#øßà7şÜ:cÎ2\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('ee06602a-60bd-20ae-a385-654afee07423','NPC2','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0ÁIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯Şù-odŸƒÏ×Öœçë`Å¿ÊÖœçë`Åóµ5çù øßà7‚ÿİşw#øßÊÁŠçkkÎóu°âùÚšóü,‡CŸ/ÀÖœçë`ÅóAğ¿Áÿnÿ»üïFğ¿•­9Ï×ÁŠçkkÎó³y~½ö\'ñ¯1üá×ó¯@ğ¿Áÿnÿ»üïFğ¿u9ò|õ<Ã!ÏÏ±×ş$ŸÙlÆó³wé\"Ï×Ë¾/Ïşò;y>şw#øßà7‚ÿİşw£Î_ù#x~®}é·åùyô=†çç¯ŞhÆóUæ<?¯õMŸÆóó„oy<ÏÏ½<_ÿ»üïFğ¿Áÿnÿ»¡ûEó|¨t<?Eæù*s¯¶âùRáù™¦‰ç§ñ|üïFğ¿Áÿnÿ»üïF­µò|•ÏW[ñü´§]ä_£<hÁóS‹x~Öë5ÏÁÿnÿ»üïFğ¿ÁÿnT^¶âù*sŸò şuÊœÙŒç‡à7‚ÿİşw#øßà7ş¨@g>Ã…\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('f2d94503-4055-4414-a546-2fc32f29883c','Jacquemon','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0\\IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯>äÚ™ùWØšñŸê`Í¿Áÿnÿ»üïFğ¿ÁÿnT^€­ÿ-¶f<_k‚ÿİşw#øßà7‚ÿİ¨[3şUNloó¯qqŸÿ[3‚ÿİşw#øßà7‚ÿİ¨\'¶·ù×ø®O};Ÿ÷ùÂŸàù9±½Í„ıåÄóAğ¿Áÿnÿ»üïFğ¿•àçÿèi<?×¿ò»ñüüí§½ÏÏû|áOğüü…_…ççî?şŸ7•‡ò|üïFğ¿Áÿnÿ»üïFå_©Û<Å¿Æw}êÛñü¼ÜW¯ù@ğ¿Áÿnÿ»üïFğ¿zê|ùß‹à7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşwãëM ‹<ß\0\r\0\0\0\0IEND®B`‚','2026-08-15 16:23:02'),
('f4d212e4-ec93-4e44-87f1-c98864da050f','greedysheldon12','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0›IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯~á¿¥ùß‹à7‚ÿİşw#øßà7êãîŞçùyìõÛ<?·ÜrŒÿL·İv‰ççqwïó|üïFğ¿Áÿnÿ»üïFåxÜİûükÜrË1ş5n»íÏÏãîŞç_à7‚ÿİşw#øßà7ô²7¿”ùß‹à7‚ÿİşw#øßà7êz\'y~‹—âùWOâù¹áA¯Êóó¶êx~~éïÊóóÔ‹wğütóGò|üïFğ¿Áÿnÿ»üïF­Zğü|û[4ŸÏü†‹<?oñšÿ\ZÓÿçç{>ìåy~ŞëÇÄóAğ¿Áÿnÿ»üïFğ¿õa\'nâùyèkãù¹ş\'ŸWİ×æ_ãÏãÇy~úÚÇx~öë7ñ|üïFğ¿Áÿnÿ»üï†^êÅ_Ñ<?üÙŸÅÿ$ïñÅ?ÄóAğ¿Áÿnÿ»üïFğ¿ÿõC6I½Ä³\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('f62aa194-a0de-48dd-8dbb-2a97601e5e46','Parang15','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯Æ«?ÂüïEğ¿Áÿnÿ»üïFğ¿•c<_—øW9¶Á¿Ê¥#şUmğ|üïFğ¿Áÿnÿ»üïFå9¶ÁóuéˆÿTÇ6øW øßà7‚ÿİşw#øßÊ‹ëx¾ææùª…ç«ïx¾æ+¯Öx~b<ÇóAğ¿Áÿnÿ»üïFğ¿U¿–çç«^uÉósİM<?ïòÕæùê{Ÿúàçç;V<?ÿ‡×ò|üïFğ¿Áÿnÿ»üï†ê—¿“y>¦§ˆçkj<_5x¾¦äù:Zò|…x~êKoğ|üïFğ¿Áÿnÿ»üïFÕCÎğ|=å,ÏW\r¯4Ï×ÁÏŸy¾–Ïò ‚ÿİşw#øßà7‚ÿİ¨¼ cãù\Z\'¯9Ï×ñ-¯;ïãùºñ\Zşşw#øßà7‚ÿİşwã\nZ2ˆÎæŸ\0\0\0\0IEND®B`‚','2026-08-17 00:23:04'),
('f97392cd-b6c9-2003-bf51-39aafa50d536','NPC3','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0êIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾Äƒ™ç£%ÏWQğümâù™¦Æó<?]-<?6ÏÁÿnÿ»üïFğ¿ÁÿnÔ–ü«4\'ÏÏÆ¼çùÙ™ÏO<?ç÷×<?éÆóAğ¿Áÿnÿ»üïFğ¿•à‹>â½y~ú®çùYÌwx~–‡{<_%x~.Ş{7ÏÏ—ÿø/ò|üïFğ¿Áÿnÿ»üï†~à³>Ä<‹ÙŒçg¹^óü”2ãù¹¸w‘çç–k¯áùyÆ3Ì¿Áÿnÿ»üïFğ¿ÁÿnÔÅlÆóó6ŸòU<?oñÆ_Ìóó¾¯t;ÏÏ-×^ÃóóM¿~’ççç~ù§x~~ğ³?”çƒà7‚ÿİşw#øßà7ôøfæù¸æºy~ºÙ1ŸŸÿÍßä_ãíŞø5x~î¸í)<?O¿çÏÁÿnÿ»üïFğ¿ÁÿnÔƒqâùîx:ÏÏ3îØçùÙ*ÿ\Z¿òkÌósİ\r<?¢ãù øßà7‚ÿİşw#øßzë]÷òüd&ÏÏéãÇø×XÏÏb6çù9\\6Ÿõ8ğ|üïFğ¿Áÿnÿ»üïÆ?cÉZ0`Øªï\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('f9fa4452-e36a-4a8b-94dc-87666750b3d8','MCJMY','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯öÛÇÍÿ^ÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿Áÿnÿ»üïFğ¿•à{¿÷»øŸä=ßó}x>şw#øßà7‚ÿİşwC?üS?eş÷\"øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİP¿}Ü<÷>õ	<?³ù‚ç\'³ñüDŸõjÉó³:<àùyĞK¾<ÏÁÿnÿ»üïFğ¿Áÿnü#œ‚¬i@nn\0\0\0\0IEND®B`‚','2026-08-16 18:23:04'),
('fd0eb76d-43f9-4f2b-ae31-4da17797d3a3','Zufl','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0kIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯¾ü#æ/‚ÿİşw#øßà7‚ÿİĞíßôşæù¨Ç®áù™.İÇ¦zì\ZŸéÒ}<ÿ»üïFğ¿Áÿnÿ»¡—äÂüø¹Ïşş5Şâ³¿Šÿ\0ÿ»üïFğ¿Áÿnÿ»QêcŞçgıŸÌóóFôÊüG¸xó&ÏÏ¯|ËóüÌ~í‹y>şw#øßà7‚ÿİşwC·Óû›ç£»†ÿI¦K÷ñ|üïFğ¿Áÿnÿ»üï†^ş‘ó|üÜgÏÏ[|öWñŸéç>ûcx~Şâ³¿Šçƒà7‚ÿİşw#øßà7ôò\\˜ÿ\0?÷ÙÃ¿Æ[|öWñ€à7‚ÿİşw#øßà7ôò\\˜ÿ½şw#øßà7‚ÿİşwãñ%*•CÆd\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('fd91a82c-1ef1-45cc-b85d-2fb578445c68','Kuvviine','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0™IDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯>å¯şØüïEğ¿Áÿnÿ»üïFğ¿uµ<âù™/6x~f›ügZòü¬–G<ÿ»üïFğ¿Áÿnÿ»QÇaÍ¿ÆjyÄó3_lğ¯±Zñ¯1k‚ÿİşw#øßà7‚ÿİĞgÎ˜…şÆ¯æ?Ó;èGó¯@ğ¿Áÿnÿ»üïFğ¿ºñÌó|\\Üßç_ãW¾ï;ø×x£÷x?ş5Nloó|üïFğ¿Áÿnÿ»üïF2y~ŞëmŞŠçç{~êgøÏô^oóV<??ù«¿ÎóAğ¿Áÿnÿ»üïFğ¿:}ü¸y>~æ‡¾‹ççéO~:ÏÏ£^ìQük<ñÈóóG<„çç­Şå}x>şw#øßà7‚ÿİşwC¿şCßmn6ãùéf3Ÿn>ã_c\\­y~Æõšçg\\¯y>şw#øßà7‚ÿİşwã²CU¤Dù^\0\0\0\0IEND®B`‚','2026-08-14 16:23:01'),
('ffb12e34-7489-490c-89f2-e1c2b0936ec1','mrameser','‰PNG\r\n\Z\n\0\0\0\rIHDR\0\0\00\0\0\00\0\0\0Wù‡\0\0\0õIDATxíÀ $Y–ÆñÿwîÈÌ§rKc®mÛ¶mÛ¶mÛ¶miŒ–J¯23\"îùv·jz¦‡;kÕ¯æ/‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİşw#øßà7‚ÿİ¨¼\0¶y~$ñÁ6Ï$şşw#øßà7‚ÿİşwC¶Íó!‰ÿIló|üïFğ¿Áÿnÿ»üï†\0ó|Øæ¿ƒ$şşw#øßà7‚ÿİşwã]ñ Ï&\0\0\0\0IEND®B`‚','2026-08-14 16:23:01');
/*!40000 ALTER TABLE `player_heads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `player_shops`
--

DROP TABLE IF EXISTS `player_shops`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `player_shops` (
  `key` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `owner` varchar(255) DEFAULT NULL,
  `owner_name` varchar(255) DEFAULT NULL,
  `world` varchar(255) DEFAULT NULL,
  `plot_x` int(11) DEFAULT NULL,
  `plot_z` int(11) DEFAULT NULL,
  `currency` varchar(100) DEFAULT NULL,
  `balances` text DEFAULT NULL,
  `sell_listings` text DEFAULT NULL,
  `buy_listings` text DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `player_shops`
--

LOCK TABLES `player_shops` WRITE;
/*!40000 ALTER TABLE `player_shops` DISABLE KEYS */;
INSERT INTO `player_shops` VALUES
('tortug','Tortug','fd91a82c-1ef1-45cc-b85d-2fb578445c68','Kuvviine','worldworld',-2,6,'bill','{}','[{\"item\":\"GOLDEN_APPLE\",\"price\":1,\"amount\":63,\"currency\":\"bill\"}]','[]','2026-08-20 09:27:39');
/*!40000 ALTER TABLE `player_shops` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `towny_history`
--

DROP TABLE IF EXISTS `towny_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `towny_history` (
  `name` varchar(255) NOT NULL,
  `type` varchar(50) NOT NULL,
  `date` date NOT NULL,
  `residents` int(11) NOT NULL,
  `chunks` int(11) NOT NULL,
  `towns_count` int(11) NOT NULL DEFAULT 0,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`name`,`type`,`date`),
  KEY `date_idx` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `towny_history`
--

LOCK TABLES `towny_history` WRITE;
/*!40000 ALTER TABLE `towny_history` DISABLE KEYS */;
INSERT INTO `towny_history` VALUES
('aeternum_infernalis','nation','2026-08-14',4,0,2,'2026-08-14 23:53:01'),
('aeternum_infernalis','nation','2026-08-15',4,0,2,'2026-08-15 23:53:02'),
('aeternum_infernalis','nation','2026-08-16',4,0,2,'2026-08-16 23:53:04'),
('aeternum_infernalis','nation','2026-08-17',4,0,2,'2026-08-17 23:58:15'),
('aeternum_infernalis','nation','2026-08-18',4,0,2,'2026-08-18 23:36:58'),
('aeternum_infernalis','nation','2026-08-19',4,0,2,'2026-08-19 21:17:19'),
('al-hirÄá¹£ia','nation','2026-08-14',1,0,1,'2026-08-14 23:53:01'),
('al-hirÄá¹£ia','nation','2026-08-15',1,0,1,'2026-08-15 23:53:02'),
('al-hirÄá¹£ia','nation','2026-08-16',1,0,1,'2026-08-16 23:53:04'),
('al-hirÄá¹£ia','nation','2026-08-17',1,0,1,'2026-08-17 23:58:15'),
('al-hirÄá¹£ia','nation','2026-08-18',1,0,1,'2026-08-18 23:36:58'),
('al-hirÄá¹£ia','nation','2026-08-19',1,0,1,'2026-08-19 21:17:19'),
('al-samidah','nation','2026-08-14',16,0,2,'2026-08-14 23:53:01'),
('al-samidah','nation','2026-08-15',16,0,2,'2026-08-15 23:53:02'),
('al-samidah','nation','2026-08-16',16,0,2,'2026-08-16 23:53:04'),
('al-samidah','nation','2026-08-17',16,0,2,'2026-08-17 23:58:15'),
('al-samidah','nation','2026-08-18',16,0,2,'2026-08-18 23:36:58'),
('al-samidah','nation','2026-08-19',16,0,2,'2026-08-19 21:17:19'),
('ariszimhar','nation','2026-08-14',32,0,3,'2026-08-14 23:53:01'),
('ariszimhar','nation','2026-08-15',30,0,3,'2026-08-15 23:53:02'),
('ariszimhar','nation','2026-08-16',29,0,3,'2026-08-16 23:53:04'),
('ariszimhar','nation','2026-08-17',29,0,3,'2026-08-17 23:58:15'),
('ariszimhar','nation','2026-08-18',29,0,3,'2026-08-18 23:36:58'),
('ariszimhar','nation','2026-08-19',29,0,3,'2026-08-19 21:17:19'),
('arrakis','nation','2026-08-14',1,0,1,'2026-08-14 23:53:01'),
('arrakis','nation','2026-08-15',1,0,1,'2026-08-15 23:53:02'),
('arrakis','nation','2026-08-16',1,0,1,'2026-08-16 23:53:04'),
('arrakis','nation','2026-08-17',1,0,1,'2026-08-17 23:58:15'),
('arrakis','nation','2026-08-18',1,0,1,'2026-08-18 23:36:58'),
('arrakis','nation','2026-08-19',1,0,1,'2026-08-19 21:17:19'),
('atlantis','nation','2026-08-14',2,0,1,'2026-08-14 23:53:01'),
('atlantis','nation','2026-08-15',2,0,1,'2026-08-15 23:53:02'),
('atlantis','nation','2026-08-16',2,0,1,'2026-08-16 23:53:04'),
('atlantis','nation','2026-08-17',2,0,1,'2026-08-17 23:58:15'),
('atlantis','nation','2026-08-18',2,0,1,'2026-08-18 23:36:58'),
('atlantis','nation','2026-08-19',2,0,1,'2026-08-19 21:17:19'),
('breathren_court','nation','2026-08-14',9,0,1,'2026-08-14 23:53:01'),
('breathren_court','nation','2026-08-15',9,0,1,'2026-08-15 23:53:02'),
('breathren_court','nation','2026-08-16',9,0,1,'2026-08-16 23:53:04'),
('breathren_court','nation','2026-08-17',8,0,1,'2026-08-17 23:58:15'),
('breathren_court','nation','2026-08-18',8,0,1,'2026-08-18 23:36:58'),
('breathren_court','nation','2026-08-19',8,0,1,'2026-08-19 21:17:19'),
('cervidia','nation','2026-08-14',1,0,1,'2026-08-14 23:53:01'),
('cervidia','nation','2026-08-15',1,0,1,'2026-08-15 23:53:02'),
('cervidia','nation','2026-08-16',1,0,1,'2026-08-16 23:53:04'),
('cervidia','nation','2026-08-17',1,0,1,'2026-08-17 23:58:15'),
('cervidia','nation','2026-08-18',1,0,1,'2026-08-18 23:36:58'),
('cervidia','nation','2026-08-19',1,0,1,'2026-08-19 21:17:19'),
('damao','nation','2026-08-14',1,0,1,'2026-08-14 23:53:01'),
('damao','nation','2026-08-15',1,0,1,'2026-08-15 23:53:02'),
('damao','nation','2026-08-16',1,0,1,'2026-08-16 23:53:04'),
('damao','nation','2026-08-17',1,0,1,'2026-08-17 23:58:15'),
('damao','nation','2026-08-18',1,0,1,'2026-08-18 23:36:58'),
('damao','nation','2026-08-19',1,0,1,'2026-08-19 21:17:19'),
('darayyabi_sultanate','nation','2026-08-14',2,0,1,'2026-08-14 23:53:01'),
('darayyabi_sultanate','nation','2026-08-15',2,0,1,'2026-08-15 23:53:02'),
('darayyabi_sultanate','nation','2026-08-16',2,0,1,'2026-08-16 23:53:04'),
('darayyabi_sultanate','nation','2026-08-17',2,0,1,'2026-08-17 23:58:15'),
('darayyabi_sultanate','nation','2026-08-18',2,0,1,'2026-08-18 23:36:58'),
('darayyabi_sultanate','nation','2026-08-19',2,0,1,'2026-08-19 21:17:19'),
('datsihri','nation','2026-08-14',18,0,3,'2026-08-14 23:53:01'),
('datsihri','nation','2026-08-15',18,0,3,'2026-08-15 23:53:02'),
('datsihri','nation','2026-08-16',19,0,3,'2026-08-16 23:53:04'),
('datsihri','nation','2026-08-17',19,0,3,'2026-08-17 23:58:15'),
('datsihri','nation','2026-08-18',19,0,3,'2026-08-18 23:36:58'),
('datsihri','nation','2026-08-19',19,0,3,'2026-08-19 21:17:19'),
('detroit','nation','2026-08-16',1,0,1,'2026-08-16 23:53:04'),
('detroit','nation','2026-08-17',1,0,1,'2026-08-17 23:58:15'),
('detroit','nation','2026-08-18',1,0,1,'2026-08-18 23:36:58'),
('detroit','nation','2026-08-19',1,0,1,'2026-08-19 21:17:19'),
('eÅ¡aran-solmarii','nation','2026-08-14',1,0,1,'2026-08-14 23:53:01'),
('eÅ¡aran-solmarii','nation','2026-08-15',1,0,1,'2026-08-15 23:53:02'),
('eÅ¡aran-solmarii','nation','2026-08-16',1,0,1,'2026-08-16 23:53:04'),
('eÅ¡aran-solmarii','nation','2026-08-17',1,0,1,'2026-08-17 23:58:15'),
('eÅ¡aran-solmarii','nation','2026-08-18',1,0,1,'2026-08-18 23:36:58'),
('eÅ¡aran-solmarii','nation','2026-08-19',1,0,1,'2026-08-19 21:17:19'),
('grand_itassia','nation','2026-08-14',13,0,3,'2026-08-14 23:53:01'),
('grand_itassia','nation','2026-08-15',13,0,3,'2026-08-15 23:53:02'),
('grand_itassia','nation','2026-08-16',13,0,3,'2026-08-16 23:53:04'),
('grand_itassia','nation','2026-08-17',13,0,3,'2026-08-17 23:58:15'),
('grand_itassia','nation','2026-08-18',13,0,3,'2026-08-18 23:36:58'),
('grand_itassia','nation','2026-08-19',13,0,3,'2026-08-19 21:17:19'),
('hoenn','nation','2026-08-14',1,0,1,'2026-08-14 23:53:01'),
('hoenn','nation','2026-08-15',1,0,1,'2026-08-15 23:53:02'),
('hoenn','nation','2026-08-16',1,0,1,'2026-08-16 23:53:04'),
('hoenn','nation','2026-08-17',1,0,1,'2026-08-17 23:58:15'),
('hoenn','nation','2026-08-18',1,0,1,'2026-08-18 23:36:58'),
('hoenn','nation','2026-08-19',1,0,1,'2026-08-19 21:17:19'),
('ichtacozcatlÄn','nation','2026-08-14',2,0,1,'2026-08-14 23:53:01'),
('ichtacozcatlÄn','nation','2026-08-15',2,0,1,'2026-08-15 23:53:02'),
('ichtacozcatlÄn','nation','2026-08-16',2,0,1,'2026-08-16 23:53:04'),
('ichtacozcatlÄn','nation','2026-08-17',2,0,1,'2026-08-17 23:58:15'),
('ichtacozcatlÄn','nation','2026-08-18',2,0,1,'2026-08-18 23:36:58'),
('ichtacozcatlÄn','nation','2026-08-19',2,0,1,'2026-08-19 21:17:19'),
('ironvale','nation','2026-08-14',6,0,1,'2026-08-14 23:53:01'),
('ironvale','nation','2026-08-15',6,0,1,'2026-08-15 23:53:02'),
('ironvale','nation','2026-08-16',6,0,1,'2026-08-16 23:53:04'),
('ironvale','nation','2026-08-17',6,0,1,'2026-08-17 23:58:15'),
('ironvale','nation','2026-08-18',6,0,1,'2026-08-18 23:36:58'),
('ironvale','nation','2026-08-19',6,0,1,'2026-08-19 21:17:19'),
('kergan','town','2026-08-20',1,20,0,'2026-08-20 23:57:51'),
('kergan','town','2026-08-21',1,20,0,'2026-08-21 09:27:58'),
('kingdom_of_arydia','nation','2026-08-14',19,0,3,'2026-08-14 23:53:01'),
('kingdom_of_arydia','nation','2026-08-15',19,0,3,'2026-08-15 23:53:02'),
('kingdom_of_arydia','nation','2026-08-16',19,0,3,'2026-08-16 23:53:04'),
('kingdom_of_arydia','nation','2026-08-17',31,0,6,'2026-08-17 23:58:15'),
('kingdom_of_arydia','nation','2026-08-18',29,0,6,'2026-08-18 23:36:58'),
('kingdom_of_arydia','nation','2026-08-19',29,0,6,'2026-08-19 21:17:19'),
('kingdom_of_delman','nation','2026-08-14',6,0,1,'2026-08-14 23:53:01'),
('kingdom_of_delman','nation','2026-08-15',6,0,1,'2026-08-15 23:53:02'),
('kingdom_of_delman','nation','2026-08-16',6,0,1,'2026-08-16 23:53:04'),
('kingdom_of_delman','nation','2026-08-17',6,0,1,'2026-08-17 23:58:15'),
('kingdom_of_delman','nation','2026-08-18',6,0,1,'2026-08-18 23:36:58'),
('kingdom_of_delman','nation','2026-08-19',6,0,1,'2026-08-19 21:17:19'),
('kingdom_of_goldenfield','nation','2026-08-14',38,0,8,'2026-08-14 23:53:01'),
('kingdom_of_goldenfield','nation','2026-08-15',38,0,8,'2026-08-15 23:53:02'),
('kingdom_of_goldenfield','nation','2026-08-16',38,0,8,'2026-08-16 23:53:04'),
('kingdom_of_goldenfield','nation','2026-08-17',38,0,8,'2026-08-17 23:58:15'),
('kingdom_of_goldenfield','nation','2026-08-18',38,0,8,'2026-08-18 23:36:58'),
('kingdom_of_goldenfield','nation','2026-08-19',38,0,8,'2026-08-19 21:17:19'),
('kingdom_of_savoia','nation','2026-08-14',3,0,2,'2026-08-14 23:53:01'),
('kingdom_of_savoia','nation','2026-08-15',3,0,2,'2026-08-15 23:53:02'),
('kingdom_of_savoia','nation','2026-08-16',3,0,2,'2026-08-16 23:53:04'),
('kingdom_of_savoia','nation','2026-08-17',3,0,2,'2026-08-17 23:58:15'),
('kingdom_of_savoia','nation','2026-08-18',3,0,2,'2026-08-18 23:36:58'),
('kingdom_of_savoia','nation','2026-08-19',3,0,2,'2026-08-19 21:17:19'),
('kingdom_of_valcroissene','nation','2026-08-14',8,0,3,'2026-08-14 23:53:01'),
('kingdom_of_valcroissene','nation','2026-08-15',8,0,3,'2026-08-15 23:53:02'),
('kingdom_of_valcroissene','nation','2026-08-16',8,0,3,'2026-08-16 23:53:04'),
('kingdom_of_valcroissene','nation','2026-08-17',8,0,3,'2026-08-17 23:58:15'),
('kingdom_of_valcroissene','nation','2026-08-18',7,0,3,'2026-08-18 23:36:58'),
('kingdom_of_valcroissene','nation','2026-08-19',7,0,3,'2026-08-19 21:17:19'),
('kiralian_khanate','nation','2026-08-14',2,0,1,'2026-08-14 23:53:01'),
('kiralian_khanate','nation','2026-08-15',2,0,1,'2026-08-15 23:53:02'),
('kiralian_khanate','nation','2026-08-16',2,0,1,'2026-08-16 23:53:04'),
('kiralian_khanate','nation','2026-08-17',2,0,1,'2026-08-17 23:58:15'),
('kiralian_khanate','nation','2026-08-18',2,0,1,'2026-08-18 23:36:58'),
('kiralian_khanate','nation','2026-08-19',2,0,1,'2026-08-19 21:17:19'),
('kralovstvo_mora','nation','2026-08-14',1,0,1,'2026-08-14 23:53:01'),
('kralovstvo_mora','nation','2026-08-15',1,0,1,'2026-08-15 23:53:02'),
('kralovstvo_mora','nation','2026-08-16',1,0,1,'2026-08-16 23:53:04'),
('kralovstvo_mora','nation','2026-08-17',1,0,1,'2026-08-17 23:58:15'),
('kralovstvo_mora','nation','2026-08-18',1,0,1,'2026-08-18 23:36:58'),
('kralovstvo_mora','nation','2026-08-19',1,0,1,'2026-08-19 21:17:19'),
('kuvville','town','2026-08-20',1,22,0,'2026-08-20 23:57:51'),
('kuvville','town','2026-08-21',1,22,0,'2026-08-21 09:27:58'),
('loasian_frontier','nation','2026-08-14',2,0,1,'2026-08-14 23:53:01'),
('loasian_frontier','nation','2026-08-15',2,0,1,'2026-08-15 23:53:02'),
('loasian_frontier','nation','2026-08-16',2,0,1,'2026-08-16 23:53:04'),
('loasian_frontier','nation','2026-08-17',2,0,1,'2026-08-17 23:58:15'),
('loasian_frontier','nation','2026-08-18',2,0,1,'2026-08-18 23:36:58'),
('loasian_frontier','nation','2026-08-19',2,0,1,'2026-08-19 21:17:19'),
('loftor','nation','2026-08-14',1,0,1,'2026-08-14 23:53:01'),
('loftor','nation','2026-08-15',1,0,1,'2026-08-15 23:53:02'),
('loftor','nation','2026-08-16',1,0,1,'2026-08-16 23:53:04'),
('loftor','nation','2026-08-17',1,0,1,'2026-08-17 23:58:15'),
('loftor','nation','2026-08-18',1,0,1,'2026-08-18 23:36:58'),
('loftor','nation','2026-08-19',1,0,1,'2026-08-19 21:17:19'),
('lunus','nation','2026-08-14',3,0,1,'2026-08-14 23:53:01'),
('lunus','nation','2026-08-15',3,0,1,'2026-08-15 23:53:02'),
('lunus','nation','2026-08-16',3,0,1,'2026-08-16 23:53:04'),
('lunus','nation','2026-08-17',3,0,1,'2026-08-17 23:58:15'),
('lunus','nation','2026-08-18',3,0,1,'2026-08-18 23:36:58'),
('lunus','nation','2026-08-19',3,0,1,'2026-08-19 21:17:19'),
('miracaÃ©lian_realm','nation','2026-08-14',46,0,4,'2026-08-14 23:53:01'),
('miracaÃ©lian_realm','nation','2026-08-15',46,0,4,'2026-08-15 23:53:02'),
('miracaÃ©lian_realm','nation','2026-08-16',46,0,4,'2026-08-16 23:53:04'),
('miracaÃ©lian_realm','nation','2026-08-17',46,0,4,'2026-08-17 23:58:15'),
('miracaÃ©lian_realm','nation','2026-08-18',46,0,4,'2026-08-18 23:36:58'),
('miracaÃ©lian_realm','nation','2026-08-19',46,0,4,'2026-08-19 21:17:19'),
('mushroomia','nation','2026-08-14',1,0,1,'2026-08-14 23:53:01'),
('mushroomia','nation','2026-08-15',1,0,1,'2026-08-15 23:53:02'),
('mushroomia','nation','2026-08-16',1,0,1,'2026-08-16 23:53:04'),
('mushroomia','nation','2026-08-17',1,0,1,'2026-08-17 23:58:15'),
('mushroomia','nation','2026-08-18',1,0,1,'2026-08-18 23:36:58'),
('mushroomia','nation','2026-08-19',1,0,1,'2026-08-19 21:17:19'),
('myrrenbloom','nation','2026-08-14',5,0,1,'2026-08-14 23:53:01'),
('myrrenbloom','nation','2026-08-15',5,0,1,'2026-08-15 23:53:02'),
('myrrenbloom','nation','2026-08-16',5,0,1,'2026-08-16 23:53:04'),
('myrrenbloom','nation','2026-08-17',4,0,1,'2026-08-17 23:58:15'),
('myrrenbloom','nation','2026-08-18',4,0,1,'2026-08-18 23:36:58'),
('myrrenbloom','nation','2026-08-19',4,0,1,'2026-08-19 21:17:19'),
('nation','nation','2026-08-14',1,0,1,'2026-08-14 23:53:01'),
('nation','nation','2026-08-15',1,0,1,'2026-08-15 23:53:02'),
('nation','nation','2026-08-16',1,0,1,'2026-08-16 23:53:04'),
('nation','nation','2026-08-17',1,0,1,'2026-08-17 23:58:15'),
('nation','nation','2026-08-18',1,0,1,'2026-08-18 23:36:58'),
('nation','nation','2026-08-19',1,0,1,'2026-08-19 21:17:19'),
('new_celtor','nation','2026-08-14',2,0,1,'2026-08-14 23:53:01'),
('new_celtor','nation','2026-08-15',2,0,1,'2026-08-15 23:53:02'),
('new_celtor','nation','2026-08-16',2,0,1,'2026-08-16 23:53:04'),
('new_celtor','nation','2026-08-17',2,0,1,'2026-08-17 23:58:15'),
('new_celtor','nation','2026-08-18',2,0,1,'2026-08-18 23:36:58'),
('new_celtor','nation','2026-08-19',2,0,1,'2026-08-19 21:17:19'),
('new_hyperborea','town','2026-08-20',1,25,0,'2026-08-20 23:57:51'),
('new_hyperborea','town','2026-08-21',1,25,0,'2026-08-21 09:27:58'),
('nivalian_burrow','nation','2026-08-14',1,0,1,'2026-08-14 23:53:01'),
('nivalian_burrow','nation','2026-08-15',1,0,1,'2026-08-15 23:53:02'),
('nivalian_burrow','nation','2026-08-16',1,0,1,'2026-08-16 23:53:04'),
('nivalian_burrow','nation','2026-08-17',1,0,1,'2026-08-17 23:58:15'),
('nivalian_burrow','nation','2026-08-18',1,0,1,'2026-08-18 23:36:58'),
('nivalian_burrow','nation','2026-08-19',1,0,1,'2026-08-19 21:17:19'),
('orazen','nation','2026-08-14',10,0,3,'2026-08-14 23:53:01'),
('orazen','nation','2026-08-15',10,0,3,'2026-08-15 23:53:02'),
('orazen','nation','2026-08-16',10,0,3,'2026-08-16 23:53:04'),
('orazen','nation','2026-08-17',10,0,3,'2026-08-17 23:58:15'),
('orazen','nation','2026-08-18',10,0,3,'2026-08-18 23:36:58'),
('orazen','nation','2026-08-19',10,0,3,'2026-08-19 21:17:19'),
('pufferton','town','2026-08-20',1,18,0,'2026-08-20 23:57:51'),
('pufferton','town','2026-08-21',1,18,0,'2026-08-21 09:27:58'),
('qasrawet','nation','2026-08-14',1,0,1,'2026-08-14 23:53:01'),
('qasrawet','nation','2026-08-15',1,0,1,'2026-08-15 23:53:02'),
('qasrawet','nation','2026-08-16',1,0,1,'2026-08-16 23:53:04'),
('qasrawet','nation','2026-08-17',1,0,1,'2026-08-17 23:58:15'),
('qasrawet','nation','2026-08-18',1,0,1,'2026-08-18 23:36:58'),
('qasrawet','nation','2026-08-19',1,0,1,'2026-08-19 21:17:19'),
('republic_of_riddenheim','nation','2026-08-14',2,0,1,'2026-08-14 23:53:01'),
('republic_of_riddenheim','nation','2026-08-15',2,0,1,'2026-08-15 23:53:02'),
('republic_of_riddenheim','nation','2026-08-16',2,0,1,'2026-08-16 23:53:04'),
('republic_of_riddenheim','nation','2026-08-17',1,0,1,'2026-08-17 23:58:15'),
('republic_of_riddenheim','nation','2026-08-18',1,0,1,'2026-08-18 23:36:58'),
('republic_of_riddenheim','nation','2026-08-19',1,0,1,'2026-08-19 21:17:19'),
('san_illia','nation','2026-08-14',1,0,1,'2026-08-14 23:53:01'),
('san_illia','nation','2026-08-15',1,0,1,'2026-08-15 23:53:02'),
('san_illia','nation','2026-08-16',1,0,1,'2026-08-16 23:53:04'),
('san_illia','nation','2026-08-17',1,0,1,'2026-08-17 23:58:15'),
('san_illia','nation','2026-08-18',1,0,1,'2026-08-18 23:36:58'),
('san_illia','nation','2026-08-19',1,0,1,'2026-08-19 21:17:19'),
('shagaret_al_3alam','nation','2026-08-14',5,0,1,'2026-08-14 23:53:01'),
('shagaret_al_3alam','nation','2026-08-15',5,0,1,'2026-08-15 23:53:02'),
('shagaret_al_3alam','nation','2026-08-16',5,0,1,'2026-08-16 23:53:04'),
('shagaret_al_3alam','nation','2026-08-17',5,0,1,'2026-08-17 23:58:15'),
('shagaret_al_3alam','nation','2026-08-18',5,0,1,'2026-08-18 23:36:58'),
('shagaret_al_3alam','nation','2026-08-19',5,0,1,'2026-08-19 21:17:19'),
('st._petersburg','town','2026-08-20',1,65,0,'2026-08-20 23:57:51'),
('st._petersburg','town','2026-08-21',1,65,0,'2026-08-21 09:27:58'),
('terra_amoris','nation','2026-08-14',1,0,1,'2026-08-14 23:53:01'),
('terra_amoris','nation','2026-08-15',1,0,1,'2026-08-15 23:53:02'),
('terra_amoris','nation','2026-08-16',1,0,1,'2026-08-16 23:53:04'),
('terra_amoris','nation','2026-08-17',1,0,1,'2026-08-17 23:58:15'),
('terra_amoris','nation','2026-08-18',1,0,1,'2026-08-18 23:36:58'),
('terra_amoris','nation','2026-08-19',1,0,1,'2026-08-19 21:17:19'),
('thedak_fotthor','nation','2026-08-14',1,0,1,'2026-08-14 23:53:01'),
('thedak_fotthor','nation','2026-08-15',1,0,1,'2026-08-15 23:53:02'),
('thedak_fotthor','nation','2026-08-16',1,0,1,'2026-08-16 23:53:04'),
('thedak_fotthor','nation','2026-08-17',1,0,1,'2026-08-17 23:58:15'),
('thedak_fotthor','nation','2026-08-18',1,0,1,'2026-08-18 23:36:58'),
('thedak_fotthor','nation','2026-08-19',1,0,1,'2026-08-19 21:17:19'),
('thedak_khuznil','nation','2026-08-14',16,0,2,'2026-08-14 23:53:01'),
('thedak_khuznil','nation','2026-08-15',16,0,2,'2026-08-15 23:53:02'),
('thedak_khuznil','nation','2026-08-16',16,0,2,'2026-08-16 23:53:04'),
('thedak_khuznil','nation','2026-08-17',16,0,2,'2026-08-17 23:58:15'),
('thedak_khuznil','nation','2026-08-18',16,0,2,'2026-08-18 23:36:58'),
('thedak_khuznil','nation','2026-08-19',16,0,2,'2026-08-19 21:17:19'),
('thedak_ziril_inseg','nation','2026-08-14',1,0,1,'2026-08-14 23:53:01'),
('thedak_ziril_inseg','nation','2026-08-15',1,0,1,'2026-08-15 23:53:02'),
('thedak_ziril_inseg','nation','2026-08-16',1,0,1,'2026-08-16 23:53:04'),
('thedak_ziril_inseg','nation','2026-08-17',1,0,1,'2026-08-17 23:58:15'),
('thedak_ziril_inseg','nation','2026-08-18',1,0,1,'2026-08-18 23:36:58'),
('thedak_ziril_inseg','nation','2026-08-19',1,0,1,'2026-08-19 21:17:19'),
('the_ashen_kingdom','nation','2026-08-14',1,0,1,'2026-08-14 23:53:01'),
('the_ashen_kingdom','nation','2026-08-15',1,0,1,'2026-08-15 23:53:02'),
('the_ashen_kingdom','nation','2026-08-16',1,0,1,'2026-08-16 23:53:04'),
('the_ashen_kingdom','nation','2026-08-17',1,0,1,'2026-08-17 23:58:15'),
('the_ashen_kingdom','nation','2026-08-18',1,0,1,'2026-08-18 23:36:58'),
('the_ashen_kingdom','nation','2026-08-19',1,0,1,'2026-08-19 21:17:19'),
('the_command','nation','2026-08-14',3,0,1,'2026-08-14 23:53:01'),
('the_command','nation','2026-08-15',3,0,1,'2026-08-15 23:53:02'),
('the_command','nation','2026-08-16',3,0,1,'2026-08-16 23:53:04'),
('the_command','nation','2026-08-17',3,0,1,'2026-08-17 23:58:15'),
('the_command','nation','2026-08-18',3,0,1,'2026-08-18 23:36:58'),
('the_command','nation','2026-08-19',3,0,1,'2026-08-19 21:17:19'),
('the_kingdom_of_gewebia','nation','2026-08-14',11,0,2,'2026-08-14 23:53:01'),
('the_kingdom_of_gewebia','nation','2026-08-15',11,0,2,'2026-08-15 23:53:02'),
('the_kingdom_of_gewebia','nation','2026-08-16',11,0,2,'2026-08-16 23:53:04'),
('the_kingdom_of_gewebia','nation','2026-08-17',11,0,2,'2026-08-17 23:58:15'),
('the_kingdom_of_gewebia','nation','2026-08-18',11,0,2,'2026-08-18 23:36:58'),
('the_kingdom_of_gewebia','nation','2026-08-19',11,0,2,'2026-08-19 21:17:19'),
('the_rats_republic','nation','2026-08-14',14,0,4,'2026-08-14 23:53:01'),
('the_rats_republic','nation','2026-08-15',14,0,4,'2026-08-15 23:53:02'),
('the_rats_republic','nation','2026-08-16',14,0,4,'2026-08-16 23:53:04'),
('the_rats_republic','nation','2026-08-17',14,0,4,'2026-08-17 23:58:15'),
('the_rats_republic','nation','2026-08-18',13,0,4,'2026-08-18 23:36:58'),
('the_rats_republic','nation','2026-08-19',13,0,4,'2026-08-19 21:17:19'),
('the_spire','nation','2026-08-14',4,0,1,'2026-08-14 23:53:01'),
('the_spire','nation','2026-08-15',4,0,1,'2026-08-15 23:53:02'),
('the_spire','nation','2026-08-16',4,0,1,'2026-08-16 23:53:04'),
('the_spire','nation','2026-08-17',4,0,1,'2026-08-17 23:58:15'),
('the_spire','nation','2026-08-18',4,0,1,'2026-08-18 23:36:58'),
('the_spire','nation','2026-08-19',4,0,1,'2026-08-19 21:17:19'),
('tivera','nation','2026-08-14',3,0,2,'2026-08-14 23:53:01'),
('tivera','nation','2026-08-15',3,0,2,'2026-08-15 23:53:02'),
('tivera','nation','2026-08-16',3,0,2,'2026-08-16 23:53:04'),
('tivera','nation','2026-08-17',3,0,2,'2026-08-17 23:58:15'),
('tivera','nation','2026-08-18',3,0,2,'2026-08-18 23:36:58'),
('tivera','nation','2026-08-19',3,0,2,'2026-08-19 21:17:19'),
('united_coastal_states','nation','2026-08-14',3,0,2,'2026-08-14 23:53:01'),
('united_coastal_states','nation','2026-08-15',3,0,2,'2026-08-15 23:53:02'),
('united_coastal_states','nation','2026-08-16',3,0,2,'2026-08-16 23:53:04'),
('united_coastal_states','nation','2026-08-17',3,0,2,'2026-08-17 23:58:15'),
('united_coastal_states','nation','2026-08-18',3,0,2,'2026-08-18 23:36:58'),
('united_coastal_states','nation','2026-08-19',3,0,2,'2026-08-19 21:17:19'),
('united_herds_of_druznia','nation','2026-08-14',10,0,1,'2026-08-14 23:53:01'),
('united_herds_of_druznia','nation','2026-08-15',10,0,1,'2026-08-15 23:53:02'),
('united_herds_of_druznia','nation','2026-08-16',10,0,1,'2026-08-16 23:53:04'),
('united_herds_of_druznia','nation','2026-08-17',10,0,1,'2026-08-17 23:58:15'),
('united_herds_of_druznia','nation','2026-08-18',10,0,1,'2026-08-18 23:36:58'),
('united_herds_of_druznia','nation','2026-08-19',10,0,1,'2026-08-19 21:17:19'),
('vaelisora','nation','2026-08-14',6,0,1,'2026-08-14 23:53:01'),
('vaelisora','nation','2026-08-15',6,0,1,'2026-08-15 23:53:02'),
('vaelisora','nation','2026-08-16',6,0,1,'2026-08-16 23:53:04'),
('vaelisora','nation','2026-08-17',6,0,1,'2026-08-17 23:58:15'),
('vaelisora','nation','2026-08-18',6,0,1,'2026-08-18 23:36:58'),
('vaelisora','nation','2026-08-19',6,0,1,'2026-08-19 21:17:19'),
('valdis','nation','2026-08-14',3,0,2,'2026-08-14 23:53:01'),
('valdis','nation','2026-08-15',3,0,2,'2026-08-15 23:53:02'),
('valdis','nation','2026-08-16',3,0,2,'2026-08-16 23:53:04'),
('valdis','nation','2026-08-17',3,0,2,'2026-08-17 23:58:15'),
('valdis','nation','2026-08-18',3,0,2,'2026-08-18 23:36:58'),
('valdis','nation','2026-08-19',3,0,2,'2026-08-19 21:17:19'),
('virelia','nation','2026-08-14',1,0,1,'2026-08-14 23:53:01'),
('virelia','nation','2026-08-15',1,0,1,'2026-08-15 23:53:02'),
('virelia','nation','2026-08-16',1,0,1,'2026-08-16 23:53:04'),
('virelia','nation','2026-08-17',1,0,1,'2026-08-17 23:58:15'),
('virelia','nation','2026-08-18',1,0,1,'2026-08-18 23:36:58'),
('virelia','nation','2026-08-19',1,0,1,'2026-08-19 21:17:19'),
('warhorde_kingdom','nation','2026-08-14',50,0,2,'2026-08-14 23:53:01'),
('warhorde_kingdom','nation','2026-08-15',49,0,2,'2026-08-15 23:53:02'),
('warhorde_kingdom','nation','2026-08-16',49,0,3,'2026-08-16 23:53:04'),
('warhorde_kingdom','nation','2026-08-17',48,0,2,'2026-08-17 23:58:15'),
('warhorde_kingdom','nation','2026-08-18',47,0,2,'2026-08-18 23:36:58'),
('warhorde_kingdom','nation','2026-08-19',47,0,2,'2026-08-19 21:17:19'),
('wizardville','town','2026-08-20',1,19,0,'2026-08-20 23:57:51'),
('wizardville','town','2026-08-21',1,19,0,'2026-08-21 09:27:58'),
('yggdrasil','nation','2026-08-14',26,0,5,'2026-08-14 23:53:01'),
('yggdrasil','nation','2026-08-15',26,0,5,'2026-08-15 23:53:02'),
('yggdrasil','nation','2026-08-16',26,0,5,'2026-08-16 23:53:04'),
('yggdrasil','nation','2026-08-17',26,0,5,'2026-08-17 23:58:15'),
('yggdrasil','nation','2026-08-18',26,0,5,'2026-08-18 23:36:58'),
('yggdrasil','nation','2026-08-19',26,0,5,'2026-08-19 21:17:19'),
('zulban_unol','nation','2026-08-14',4,0,1,'2026-08-14 23:53:01'),
('zulban_unol','nation','2026-08-15',4,0,1,'2026-08-15 23:53:02'),
('zulban_unol','nation','2026-08-16',4,0,1,'2026-08-16 23:53:04'),
('zulban_unol','nation','2026-08-17',4,0,1,'2026-08-17 23:58:15'),
('zulban_unol','nation','2026-08-18',4,0,1,'2026-08-18 23:36:58'),
('zulban_unol','nation','2026-08-19',4,0,1,'2026-08-19 21:17:19');
/*!40000 ALTER TABLE `towny_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'weby_arc_db'
--

--
-- Dumping routines for database 'weby_arc_db'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-08-21 11:56:50
