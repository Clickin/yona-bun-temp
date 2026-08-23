/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.11.18-MariaDB, for debian-linux-gnu (aarch64)
--
-- Host: localhost    Database: yona
-- ------------------------------------------------------
-- Server version	10.11.18-MariaDB-ubu2204

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `yona`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `yona` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;

USE `yona`;

--
-- Table structure for table `assignee`
--

DROP TABLE IF EXISTS `assignee`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `assignee` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) DEFAULT NULL,
  `project_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_assignee_user_1` (`user_id`),
  KEY `ix_assignee_project_2` (`project_id`),
  CONSTRAINT `fk_assignee_project_2` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`),
  CONSTRAINT `fk_assignee_user_1` FOREIGN KEY (`user_id`) REFERENCES `n4user` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assignee`
--

LOCK TABLES `assignee` WRITE;
/*!40000 ALTER TABLE `assignee` DISABLE KEYS */;
INSERT INTO `assignee` VALUES
(1,2,101);
/*!40000 ALTER TABLE `assignee` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attachment`
--

DROP TABLE IF EXISTS `attachment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `attachment` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `hash` varchar(255) DEFAULT NULL,
  `container_type` varchar(20) DEFAULT NULL,
  `mime_type` varchar(255) DEFAULT NULL,
  `size` bigint(20) DEFAULT NULL,
  `container_id` bigint(20) NOT NULL,
  `created_date` datetime DEFAULT NULL,
  `owner_login_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_attachment_container` (`container_type`,`container_id`),
  KEY `ix_attachment_owner_login_id` (`owner_login_id`),
  KEY `ix_attachment_created_date` (`created_date`)
) ENGINE=InnoDB AUTO_INCREMENT=6003 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attachment`
--

LOCK TABLES `attachment` WRITE;
/*!40000 ALTER TABLE `attachment` DISABLE KEYS */;
INSERT INTO `attachment` VALUES
(6001,'kris-avatar.png','c414cd0e204de974f73753c7e28d7638e7b3691bb8b1a2bab6b25bb7fed7ce77','USER_AVATAR','image/png',70,2,'2026-01-05 09:30:00','kris'),
(6002,'stacktrace.txt','a3d98c9e138319971a8602070b822d78aa2778cfab1f8ebcfe264632250d56fe','ISSUE_POST','text/plain',69,1001,'2026-01-06 09:15:00','kris');
/*!40000 ALTER TABLE `attachment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `comment_thread`
--

DROP TABLE IF EXISTS `comment_thread`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `comment_thread` (
  `dtype` varchar(10) NOT NULL,
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `author_id` bigint(20) DEFAULT NULL,
  `author_login_id` varchar(255) DEFAULT NULL,
  `author_name` varchar(255) DEFAULT NULL,
  `state` varchar(6) DEFAULT NULL,
  `created_date` datetime DEFAULT NULL,
  `pull_request_id` bigint(20) DEFAULT NULL,
  `project_id` bigint(20) DEFAULT NULL,
  `prev_commit_id` varchar(255) DEFAULT NULL,
  `commit_id` varchar(255) DEFAULT NULL,
  `path` varchar(255) DEFAULT NULL,
  `start_side` varchar(1) DEFAULT NULL,
  `start_line` int(11) DEFAULT NULL,
  `start_column` int(11) DEFAULT NULL,
  `end_side` varchar(1) DEFAULT NULL,
  `end_line` int(11) DEFAULT NULL,
  `end_column` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_comment_thread_pullRequest_3` (`pull_request_id`),
  KEY `ix_comment_thread_project_4` (`project_id`),
  CONSTRAINT `fk_comment_thread_project_4` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`),
  CONSTRAINT `fk_comment_thread_pullRequest_3` FOREIGN KEY (`pull_request_id`) REFERENCES `pull_request` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `comment_thread`
--

LOCK TABLES `comment_thread` WRITE;
/*!40000 ALTER TABLE `comment_thread` DISABLE KEYS */;
/*!40000 ALTER TABLE `comment_thread` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `comment_thread_n4user`
--

DROP TABLE IF EXISTS `comment_thread_n4user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `comment_thread_n4user` (
  `comment_thread_id` bigint(20) NOT NULL,
  `n4user_id` bigint(20) NOT NULL,
  PRIMARY KEY (`comment_thread_id`,`n4user_id`),
  KEY `fk_comment_thread_n4user_n4user_02` (`n4user_id`),
  CONSTRAINT `fk_comment_thread_n4user_comment_thread_01` FOREIGN KEY (`comment_thread_id`) REFERENCES `comment_thread` (`id`),
  CONSTRAINT `fk_comment_thread_n4user_n4user_02` FOREIGN KEY (`n4user_id`) REFERENCES `n4user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `comment_thread_n4user`
--

LOCK TABLES `comment_thread_n4user` WRITE;
/*!40000 ALTER TABLE `comment_thread_n4user` DISABLE KEYS */;
/*!40000 ALTER TABLE `comment_thread_n4user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `commit_comment`
--

DROP TABLE IF EXISTS `commit_comment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `commit_comment` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `project_id` bigint(20) DEFAULT NULL,
  `path` varchar(255) DEFAULT NULL,
  `line` int(11) DEFAULT NULL,
  `side` varchar(1) DEFAULT NULL,
  `contents` longtext DEFAULT NULL,
  `created_date` datetime DEFAULT NULL,
  `author_id` bigint(20) DEFAULT NULL,
  `author_login_id` varchar(255) DEFAULT NULL,
  `author_name` varchar(255) DEFAULT NULL,
  `commit_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_commit_comment_project_5` (`project_id`),
  CONSTRAINT `fk_commit_comment_project_5` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `commit_comment`
--

LOCK TABLES `commit_comment` WRITE;
/*!40000 ALTER TABLE `commit_comment` DISABLE KEYS */;
/*!40000 ALTER TABLE `commit_comment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `email`
--

DROP TABLE IF EXISTS `email`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `email` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `valid` tinyint(1) DEFAULT 0,
  `token` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_email_email_valid` (`email`,`valid`),
  KEY `ix_email_user_6` (`user_id`),
  CONSTRAINT `fk_email_user_6` FOREIGN KEY (`user_id`) REFERENCES `n4user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `email`
--

LOCK TABLES `email` WRITE;
/*!40000 ALTER TABLE `email` DISABLE KEYS */;
/*!40000 ALTER TABLE `email` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `favorite_issue`
--

DROP TABLE IF EXISTS `favorite_issue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `favorite_issue` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) DEFAULT NULL,
  `issue_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_favorite_issue_user_id_issue_id_1` (`user_id`,`issue_id`),
  KEY `ix_favorite_issue_user_1` (`user_id`),
  KEY `ix_favorite_issue_project_2` (`issue_id`),
  CONSTRAINT `fk_favorite_issue_issue` FOREIGN KEY (`issue_id`) REFERENCES `issue` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_favorite_issue_user` FOREIGN KEY (`user_id`) REFERENCES `n4user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `favorite_issue`
--

LOCK TABLES `favorite_issue` WRITE;
/*!40000 ALTER TABLE `favorite_issue` DISABLE KEYS */;
/*!40000 ALTER TABLE `favorite_issue` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `favorite_organization`
--

DROP TABLE IF EXISTS `favorite_organization`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `favorite_organization` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) DEFAULT NULL,
  `organization_id` bigint(20) DEFAULT NULL,
  `organization_name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_favorite_organization_user_id_organization_id_1` (`user_id`,`organization_id`),
  KEY `ix_favorite_organization_user_1` (`user_id`),
  KEY `ix_favorite_organization_organization_2` (`organization_id`),
  CONSTRAINT `fk_favorite_organization_organization` FOREIGN KEY (`organization_id`) REFERENCES `organization` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_favorite_organization_user` FOREIGN KEY (`user_id`) REFERENCES `n4user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `favorite_organization`
--

LOCK TABLES `favorite_organization` WRITE;
/*!40000 ALTER TABLE `favorite_organization` DISABLE KEYS */;
/*!40000 ALTER TABLE `favorite_organization` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `favorite_project`
--

DROP TABLE IF EXISTS `favorite_project`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `favorite_project` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) DEFAULT NULL,
  `project_id` bigint(20) DEFAULT NULL,
  `owner` varchar(255) DEFAULT NULL,
  `project_name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_favorite_project_user_id_project_id_1` (`user_id`,`project_id`),
  KEY `ix_favorite_project_user_1` (`user_id`),
  KEY `ix_favorite_project_project_2` (`project_id`),
  CONSTRAINT `fk_favorite_project_project` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_favorite_project_user` FOREIGN KEY (`user_id`) REFERENCES `n4user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `favorite_project`
--

LOCK TABLES `favorite_project` WRITE;
/*!40000 ALTER TABLE `favorite_project` DISABLE KEYS */;
/*!40000 ALTER TABLE `favorite_project` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `issue`
--

DROP TABLE IF EXISTS `issue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `issue` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) DEFAULT NULL,
  `body` longtext DEFAULT NULL,
  `created_date` datetime DEFAULT NULL,
  `updated_date` datetime DEFAULT NULL,
  `author_id` bigint(20) DEFAULT NULL,
  `author_login_id` varchar(255) DEFAULT NULL,
  `author_name` varchar(255) DEFAULT NULL,
  `project_id` bigint(20) DEFAULT NULL,
  `number` bigint(20) DEFAULT NULL,
  `num_of_comments` int(11) DEFAULT NULL,
  `state` int(11) DEFAULT NULL,
  `due_date` datetime DEFAULT NULL,
  `milestone_id` bigint(20) DEFAULT NULL,
  `assignee_id` bigint(20) DEFAULT NULL,
  `history` longtext DEFAULT NULL,
  `parent_id` bigint(20) DEFAULT NULL,
  `weight` tinyint(2) DEFAULT 0,
  `updated_by_author_id` bigint(20) DEFAULT NULL,
  `is_draft` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_issue_1` (`project_id`,`number`),
  KEY `ix_issue_project_7` (`project_id`),
  KEY `ix_issue_milestone_8` (`milestone_id`),
  KEY `ix_issue_assignee_9` (`assignee_id`),
  KEY `ix_issue_author_id_state` (`author_id`,`state`),
  KEY `ix_issue_created_date` (`created_date`),
  KEY `ix_issue_parent_id` (`parent_id`),
  KEY `ix_issue_weight` (`weight`),
  KEY `ix_issue_is_draft_1` (`weight`,`is_draft`,`number`,`created_date`),
  KEY `ix_issue_is_draft_2` (`is_draft`,`author_login_id`,`project_id`),
  CONSTRAINT `fk_issue_assignee_9` FOREIGN KEY (`assignee_id`) REFERENCES `assignee` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_issue_milestone_8` FOREIGN KEY (`milestone_id`) REFERENCES `milestone` (`id`),
  CONSTRAINT `fk_issue_parent_id_01` FOREIGN KEY (`parent_id`) REFERENCES `issue` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_issue_project_7` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2002 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `issue`
--

LOCK TABLES `issue` WRITE;
/*!40000 ALTER TABLE `issue` DISABLE KEYS */;
INSERT INTO `issue` VALUES
(1001,'Login fails on Safari','Login POST returns 500 in Safari 17.\nAttached stacktrace.','2026-01-06 09:15:00','2026-01-06 09:15:00',2,'kris','Kris Krisson',101,1,1,1,NULL,1,1,NULL,NULL,0,NULL,0),
(1002,'Add dark mode','Users want a dark theme.','2026-01-07 14:20:00','2026-01-08 08:00:00',3,'laura','Laura Lawson',101,2,0,2,NULL,NULL,NULL,NULL,NULL,0,NULL,0),
(2001,'SVN checkout broken','svn checkout of orbital-svn times out.','2026-01-09 12:00:00','2026-01-09 12:00:00',2,'kris','Kris Krisson',103,1,0,1,NULL,NULL,NULL,NULL,NULL,0,NULL,0);
/*!40000 ALTER TABLE `issue` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `issue_comment`
--

DROP TABLE IF EXISTS `issue_comment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `issue_comment` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `contents` longtext DEFAULT NULL,
  `created_date` datetime DEFAULT NULL,
  `author_id` bigint(20) DEFAULT NULL,
  `author_login_id` varchar(255) DEFAULT NULL,
  `author_name` varchar(255) DEFAULT NULL,
  `issue_id` bigint(20) DEFAULT NULL,
  `project_id` bigint(20) NOT NULL,
  `parent_comment_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_issue_comment_issue_10` (`issue_id`),
  KEY `ix_issue_comment_project_id` (`project_id`),
  KEY `ix_issue_comment_author_id` (`author_id`),
  KEY `ix_issue_parent_id` (`parent_comment_id`),
  CONSTRAINT `fk_issue_comment_issue_10` FOREIGN KEY (`issue_id`) REFERENCES `issue` (`id`),
  CONSTRAINT `fk_issue_comment_parent_id_01` FOREIGN KEY (`parent_comment_id`) REFERENCES `issue_comment` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3002 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `issue_comment`
--

LOCK TABLES `issue_comment` WRITE;
/*!40000 ALTER TABLE `issue_comment` DISABLE KEYS */;
INSERT INTO `issue_comment` VALUES
(3001,'Cannot reproduce on Chrome 121. Safari only?','2026-01-06 15:30:00',3,'laura','Laura Lawson',1001,101,NULL);
/*!40000 ALTER TABLE `issue_comment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `issue_comment_voter`
--

DROP TABLE IF EXISTS `issue_comment_voter`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `issue_comment_voter` (
  `issue_comment_id` bigint(20) NOT NULL,
  `user_id` bigint(20) NOT NULL,
  PRIMARY KEY (`issue_comment_id`,`user_id`),
  KEY `ix_issue_comment_voter_user_id` (`user_id`),
  CONSTRAINT `fk_issue_comment_voter_issue_comment_01` FOREIGN KEY (`issue_comment_id`) REFERENCES `issue_comment` (`id`),
  CONSTRAINT `fk_issue_comment_voter_n4user_02` FOREIGN KEY (`user_id`) REFERENCES `n4user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `issue_comment_voter`
--

LOCK TABLES `issue_comment_voter` WRITE;
/*!40000 ALTER TABLE `issue_comment_voter` DISABLE KEYS */;
/*!40000 ALTER TABLE `issue_comment_voter` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `issue_event`
--

DROP TABLE IF EXISTS `issue_event`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `issue_event` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `created` datetime DEFAULT NULL,
  `sender_login_id` varchar(255) DEFAULT NULL,
  `sender_email` varchar(255) DEFAULT NULL,
  `issue_id` bigint(20) DEFAULT NULL,
  `event_type` varchar(34) DEFAULT NULL,
  `old_value` longtext DEFAULT NULL,
  `new_value` longtext DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_issue_event_issue_11` (`issue_id`),
  CONSTRAINT `fk_issue_event_issue_11` FOREIGN KEY (`issue_id`) REFERENCES `issue` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `issue_event`
--

LOCK TABLES `issue_event` WRITE;
/*!40000 ALTER TABLE `issue_event` DISABLE KEYS */;
/*!40000 ALTER TABLE `issue_event` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `issue_issue_label`
--

DROP TABLE IF EXISTS `issue_issue_label`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `issue_issue_label` (
  `issue_id` bigint(20) NOT NULL,
  `issue_label_id` bigint(20) NOT NULL,
  PRIMARY KEY (`issue_id`,`issue_label_id`),
  KEY `fk_issue_issue_label_issue_label_02` (`issue_label_id`),
  CONSTRAINT `fk_issue_issue_label_issue_01` FOREIGN KEY (`issue_id`) REFERENCES `issue` (`id`),
  CONSTRAINT `fk_issue_issue_label_issue_label_02` FOREIGN KEY (`issue_label_id`) REFERENCES `issue_label` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `issue_issue_label`
--

LOCK TABLES `issue_issue_label` WRITE;
/*!40000 ALTER TABLE `issue_issue_label` DISABLE KEYS */;
INSERT INTO `issue_issue_label` VALUES
(1001,1);
/*!40000 ALTER TABLE `issue_issue_label` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `issue_label`
--

DROP TABLE IF EXISTS `issue_label`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `issue_label` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `category_id` bigint(20) DEFAULT NULL,
  `color` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `project_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_issue_label_category_12` (`category_id`),
  KEY `ix_issue_label_project_13` (`project_id`),
  CONSTRAINT `fk_issue_label_category_12` FOREIGN KEY (`category_id`) REFERENCES `issue_label_category` (`id`),
  CONSTRAINT `fk_issue_label_project_13` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `issue_label`
--

LOCK TABLES `issue_label` WRITE;
/*!40000 ALTER TABLE `issue_label` DISABLE KEYS */;
INSERT INTO `issue_label` VALUES
(1,1,'#e74c3c','bug',101),
(2,1,'#3498db','feature',101);
/*!40000 ALTER TABLE `issue_label` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `issue_label_category`
--

DROP TABLE IF EXISTS `issue_label_category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `issue_label_category` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `project_id` bigint(20) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `is_exclusive` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `ix_issue_label_category_project_14` (`project_id`),
  CONSTRAINT `fk_issue_label_category_project_14` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `issue_label_category`
--

LOCK TABLES `issue_label_category` WRITE;
/*!40000 ALTER TABLE `issue_label_category` DISABLE KEYS */;
INSERT INTO `issue_label_category` VALUES
(1,101,'Type',0);
/*!40000 ALTER TABLE `issue_label_category` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `issue_sharer`
--

DROP TABLE IF EXISTS `issue_sharer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `issue_sharer` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `created` date DEFAULT NULL,
  `login_id` varchar(255) DEFAULT NULL,
  `user_id` bigint(20) DEFAULT NULL,
  `issue_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_issue_sharer_login_id` (`login_id`),
  KEY `ix_issue_sharer_user_id` (`user_id`),
  KEY `ix_issue_sharer_issue_id` (`issue_id`),
  CONSTRAINT `fk_issue_sharer_issue` FOREIGN KEY (`issue_id`) REFERENCES `issue` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_issue_sharer_user` FOREIGN KEY (`user_id`) REFERENCES `n4user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `issue_sharer`
--

LOCK TABLES `issue_sharer` WRITE;
/*!40000 ALTER TABLE `issue_sharer` DISABLE KEYS */;
/*!40000 ALTER TABLE `issue_sharer` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `issue_voter`
--

DROP TABLE IF EXISTS `issue_voter`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `issue_voter` (
  `issue_id` bigint(20) NOT NULL,
  `user_id` bigint(20) NOT NULL,
  PRIMARY KEY (`issue_id`,`user_id`),
  KEY `ix_issue_voter_user_id` (`user_id`),
  CONSTRAINT `fk_issue_voter_issue_01` FOREIGN KEY (`issue_id`) REFERENCES `issue` (`id`),
  CONSTRAINT `fk_issue_voter_n4user_02` FOREIGN KEY (`user_id`) REFERENCES `n4user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `issue_voter`
--

LOCK TABLES `issue_voter` WRITE;
/*!40000 ALTER TABLE `issue_voter` DISABLE KEYS */;
/*!40000 ALTER TABLE `issue_voter` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `label`
--

DROP TABLE IF EXISTS `label`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `label` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `category` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_label_1` (`category`,`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `label`
--

LOCK TABLES `label` WRITE;
/*!40000 ALTER TABLE `label` DISABLE KEYS */;
/*!40000 ALTER TABLE `label` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `linked_account`
--

DROP TABLE IF EXISTS `linked_account`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `linked_account` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_credential_id` bigint(20) DEFAULT NULL,
  `provider_user_id` varchar(255) DEFAULT NULL,
  `provider_key` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_linked_account_user_credential_1` (`user_credential_id`),
  CONSTRAINT `fk_linked_account_user_1` FOREIGN KEY (`user_credential_id`) REFERENCES `user_credential` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `linked_account`
--

LOCK TABLES `linked_account` WRITE;
/*!40000 ALTER TABLE `linked_account` DISABLE KEYS */;
/*!40000 ALTER TABLE `linked_account` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mention`
--

DROP TABLE IF EXISTS `mention`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `mention` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `resource_type` varchar(20) DEFAULT NULL,
  `resource_id` varchar(255) DEFAULT NULL,
  `user_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_mention_user_15` (`user_id`),
  KEY `ix_mention_resource_type` (`resource_type`),
  CONSTRAINT `fk_mention_user_15` FOREIGN KEY (`user_id`) REFERENCES `n4user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mention`
--

LOCK TABLES `mention` WRITE;
/*!40000 ALTER TABLE `mention` DISABLE KEYS */;
/*!40000 ALTER TABLE `mention` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `milestone`
--

DROP TABLE IF EXISTS `milestone`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `milestone` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) DEFAULT NULL,
  `due_date` datetime DEFAULT NULL,
  `contents` longtext DEFAULT NULL,
  `state` int(11) DEFAULT NULL,
  `project_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_milestone_1` (`project_id`,`title`),
  KEY `ix_milestone_project_16` (`project_id`),
  CONSTRAINT `fk_milestone_project_16` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `milestone`
--

LOCK TABLES `milestone` WRITE;
/*!40000 ALTER TABLE `milestone` DISABLE KEYS */;
INSERT INTO `milestone` VALUES
(1,'v1.0','2026-06-30 23:59:59','First gated release',1,101);
/*!40000 ALTER TABLE `milestone` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `n4user`
--

DROP TABLE IF EXISTS `n4user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `n4user` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `login_id` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `password_salt` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `remember_me` tinyint(1) DEFAULT 0,
  `state` varchar(7) DEFAULT NULL,
  `last_state_modified_date` datetime DEFAULT NULL,
  `created_date` datetime DEFAULT NULL,
  `lang` varchar(255) DEFAULT NULL,
  `token` varchar(255) DEFAULT NULL,
  `is_guest` tinyint(1) DEFAULT 0,
  `english_name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_n4user_1` (`login_id`),
  UNIQUE KEY `uq_n4user_token` (`token`),
  KEY `ix_n4user_email` (`email`),
  KEY `ix_n4user_is_guest` (`is_guest`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `n4user`
--

LOCK TABLES `n4user` WRITE;
/*!40000 ALTER TABLE `n4user` DISABLE KEYS */;
INSERT INTO `n4user` VALUES
(1,'Gate Admin','admin','+VoYrMnAxjhRi3JwRHca6jQRrV0GjVMV/KFe1Myq+v8=','salt-admin-0123456789abcdef','admin@example.com',0,'ACTIVE','2026-01-05 09:00:00','2026-01-02 10:00:00','en',NULL,0,NULL),
(2,'Kris Krisson','kris','CfzZIoefPQoB79R66A59jl6d+YbnN7qDjLqOTgjncHY=','salt-kris-0123456789abcdef0','kris@example.com',0,'ACTIVE','2026-01-05 09:00:00','2026-01-02 10:00:00','en',NULL,0,NULL),
(3,'Laura Lawson','laura','XJT2loUqTDe1oujZurdwfkts4mp475Ji9bzC5nw4bj8=','salt-laura-0123456789abcdef','laura@example.com',0,'ACTIVE','2026-01-05 09:00:00','2026-01-02 10:00:00','en',NULL,0,NULL),
(4,'Mika Migrator','mika','$2y$10$94mWOPOk43ZQFB/UiaxufexWDV2MNgk/QMee2LLRE9LmTno9ggjRm',NULL,'mika@example.com',0,'ACTIVE','2026-01-06 11:00:00','2026-01-03 10:00:00','en',NULL,0,NULL);
/*!40000 ALTER TABLE `n4user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notification_event`
--

DROP TABLE IF EXISTS `notification_event`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_event` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) DEFAULT NULL,
  `sender_id` bigint(20) DEFAULT NULL,
  `created` datetime DEFAULT NULL,
  `resource_type` varchar(20) DEFAULT NULL,
  `resource_id` varchar(255) DEFAULT NULL,
  `event_type` varchar(34) DEFAULT NULL,
  `old_value` longtext DEFAULT NULL,
  `new_value` longtext DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_notification_event_created` (`created` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification_event`
--

LOCK TABLES `notification_event` WRITE;
/*!40000 ALTER TABLE `notification_event` DISABLE KEYS */;
/*!40000 ALTER TABLE `notification_event` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notification_event_n4user`
--

DROP TABLE IF EXISTS `notification_event_n4user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_event_n4user` (
  `notification_event_id` bigint(20) NOT NULL,
  `n4user_id` bigint(20) NOT NULL,
  PRIMARY KEY (`notification_event_id`,`n4user_id`),
  KEY `fk_notification_event_n4user_n4user_02` (`n4user_id`),
  CONSTRAINT `fk_notification_event_n4user_n4user_02` FOREIGN KEY (`n4user_id`) REFERENCES `n4user` (`id`),
  CONSTRAINT `fk_notification_event_n4user_notification_event_01` FOREIGN KEY (`notification_event_id`) REFERENCES `notification_event` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification_event_n4user`
--

LOCK TABLES `notification_event_n4user` WRITE;
/*!40000 ALTER TABLE `notification_event_n4user` DISABLE KEYS */;
/*!40000 ALTER TABLE `notification_event_n4user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notification_mail`
--

DROP TABLE IF EXISTS `notification_mail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_mail` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `notification_event_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_notification_mail_notificationEvent_17` (`notification_event_id`),
  CONSTRAINT `fk_notification_mail_notificationEvent_17` FOREIGN KEY (`notification_event_id`) REFERENCES `notification_event` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification_mail`
--

LOCK TABLES `notification_mail` WRITE;
/*!40000 ALTER TABLE `notification_mail` DISABLE KEYS */;
/*!40000 ALTER TABLE `notification_mail` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `organization`
--

DROP TABLE IF EXISTS `organization`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `organization` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `created` datetime DEFAULT NULL,
  `descr` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `organization`
--

LOCK TABLES `organization` WRITE;
/*!40000 ALTER TABLE `organization` DISABLE KEYS */;
INSERT INTO `organization` VALUES
(1,'orbit','2026-01-04 09:30:00','Orbit org for release gate');
/*!40000 ALTER TABLE `organization` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `organization_user`
--

DROP TABLE IF EXISTS `organization_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `organization_user` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) DEFAULT NULL,
  `organization_id` bigint(20) DEFAULT NULL,
  `role_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_organization_user_user_18` (`user_id`),
  KEY `ix_organization_user_organization_19` (`organization_id`),
  KEY `ix_organization_user_role_20` (`role_id`),
  CONSTRAINT `fk_organization_user_organization_19` FOREIGN KEY (`organization_id`) REFERENCES `organization` (`id`),
  CONSTRAINT `fk_organization_user_role_20` FOREIGN KEY (`role_id`) REFERENCES `role` (`id`),
  CONSTRAINT `fk_organization_user_user_18` FOREIGN KEY (`user_id`) REFERENCES `n4user` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `organization_user`
--

LOCK TABLES `organization_user` WRITE;
/*!40000 ALTER TABLE `organization_user` DISABLE KEYS */;
INSERT INTO `organization_user` VALUES
(1,2,1,6),
(2,4,1,7);
/*!40000 ALTER TABLE `organization_user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `original_email`
--

DROP TABLE IF EXISTS `original_email`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `original_email` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `message_id` varchar(255) DEFAULT NULL,
  `resource_type` varchar(20) DEFAULT NULL,
  `resource_id` varchar(255) DEFAULT NULL,
  `handled_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_original_email_message_id` (`message_id`),
  UNIQUE KEY `uq_original_email_1` (`resource_type`,`resource_id`),
  KEY `ix_original_email_resource_id` (`resource_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `original_email`
--

LOCK TABLES `original_email` WRITE;
/*!40000 ALTER TABLE `original_email` DISABLE KEYS */;
/*!40000 ALTER TABLE `original_email` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `play_evolutions`
--

DROP TABLE IF EXISTS `play_evolutions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `play_evolutions` (
  `id` int(11) NOT NULL,
  `hash` varchar(255) NOT NULL,
  `applied_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `apply_script` mediumtext DEFAULT NULL,
  `revert_script` mediumtext DEFAULT NULL,
  `state` varchar(255) DEFAULT NULL,
  `last_problem` mediumtext DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `play_evolutions`
--

LOCK TABLES `play_evolutions` WRITE;
/*!40000 ALTER TABLE `play_evolutions` DISABLE KEYS */;
INSERT INTO `play_evolutions` VALUES
(1,'0d3be176827f1b6f7d26dad1daf9c8c2','2026-08-23 12:00:00','# --- !Upscreate table assignee (  id                        bigint auto_increment not null,  user_id                   bigint,  project_id                bigint,  constraint pk_assignee primary key (id));create table attachment (  id                        bigint auto_increment not null,  name                      varchar(255),  hash                      varchar(255),  container_type            varchar(20),  mime_type                 varchar(255),  size                      bigint,  container_id              varchar(255),  created_date              datetime,  constraint ck_attachment_container_type check (container_type in (\'ISSUE_POST\',\'ISSUE_ASSIGNEE\',\'ISSUE_STATE\',\'ISSUE_CATEGORY\',\'ISSUE_MILESTONE\',\'ISSUE_LABEL\',\'BOARD_POST\',\'BOARD_CATEGORY\',\'BOARD_NOTICE\',\'CODE\',\'MILESTONE\',\'WIKI_PAGE\',\'PROJECT_SETTING\',\'SITE_SETTING\',\'USER\',\'USER_AVATAR\',\'PROJECT\',\'ATTACHMENT\',\'ISSUE_COMMENT\',\'NONISSUE_COMMENT\',\'LABEL\',\'PROJECT_LABELS\',\'FORK\',\'COMMIT_COMMENT\',\'PULL_REQUEST\',\'COMMIT\',\'COMMENT_THREAD\',\'REVIEW_COMMENT\',\'ORGANIZATION\',\'PROJECT_TRANSFER\',\'ISSUE_LABEL_CATEGORY\',\'WEBHOOK\',\'NOT_A_RESOURCE\')),  constraint pk_attachment primary key (id))  row_format=compressed, key_block_size=8;create table comment_thread (  dtype                     varchar(10) not null,  id                        bigint auto_increment not null,  author_id                 bigint,  author_login_id           varchar(255),  author_name               varchar(255),  state                     varchar(6),  created_date              datetime,  pull_request_id           bigint,  project_id                bigint,  prev_commit_id            varchar(255),  commit_id                 varchar(255),  path                      varchar(255),  start_side                varchar(1),  start_line                integer,  start_column              integer,  end_side                  varchar(1),  end_line                  integer,  end_column                integer,  constraint ck_comment_thread_state check (state in (\'OPEN\',\'CLOSED\')),  constraint ck_comment_thread_start_side check (start_side in (\'A\',\'B\')),  constraint ck_comment_thread_end_side check (end_side in (\'A\',\'B\')),  constraint pk_comment_thread primary key (id))  row_format=compressed, key_block_size=8;create table commit_comment (  id                        bigint auto_increment not null,  project_id                bigint,  path                      varchar(255),  line                      integer,  side                      varchar(1),  contents                  longtext,  created_date              datetime,  author_id                 bigint,  author_login_id           varchar(255),  author_name               varchar(255),  commit_id                 varchar(255),  constraint ck_commit_comment_side check (side in (\'A\',\'B\')),  constraint pk_commit_comment primary key (id))  row_format=compressed, key_block_size=8;create table email (  id                        bigint auto_increment not null,  user_id                   bigint,  email                     varchar(255),  valid                     tinyint(1) default 0,  token                     varchar(255),  constraint pk_email primary key (id))  row_format=compressed, key_block_size=8;create table issue (  id                        bigint auto_increment not null,  title                     varchar(255),  body                      longtext,  created_date              datetime,  updated_date              datetime,  author_id                 bigint,  author_login_id           varchar(255),  author_name               varchar(255),  project_id                bigint,  number                    bigint,  num_of_comments           integer,  state                     integer,  due_date                  datetime,  milestone_id              bigint,  assignee_id               bigint,  constraint ck_issue_state check (state in (0,1,2,3,4,5,6)),  constraint uq_issue_1 unique (project_id,number),  constraint pk_issue primary key (id))  row_format=compressed, key_block_size=8;create table issue_comment (  id                        bigint auto_increment not null,  contents                  longtext,  created_date              datetime,  author_id                 bigint,  author_login_id           varchar(255),  author_name               varchar(255),  issue_id                  bigint,  constraint pk_issue_comment primary key (id))  row_format=compressed, key_block_size=8;create table issue_event (  id                        bigint auto_increment not null,  created                   datetime,  sender_login_id           varchar(255),  sender_email              varchar(255),  issue_id                  bigint,  event_type                varchar(34),  old_value                 longtext,  new_value                 longtext,  constraint ck_issue_event_event_type check (event_type in (\'NEW_ISSUE\',\'NEW_POSTING\',\'NEW_PULL_REQUEST\',\'ISSUE_STATE_CHANGED\',\'ISSUE_ASSIGNEE_CHANGED\',\'PULL_REQUEST_STATE_CHANGED\',\'NEW_COMMENT\',\'NEW_REVIEW_COMMENT\',\'MEMBER_ENROLL_REQUEST\',\'PULL_REQUEST_MERGED\',\'ISSUE_REFERRED_FROM_COMMIT\',\'PULL_REQUEST_COMMIT_CHANGED\',\'NEW_COMMIT\',\'PULL_REQUEST_REVIEW_STATE_CHANGED\',\'ISSUE_BODY_CHANGED\',\'ISSUE_REFERRED_FROM_PULL_REQUEST\',\'REVIEW_THREAD_STATE_CHANGED\',\'ORGANIZATION_MEMBER_ENROLL_REQUEST\',\'COMMENT_UPDATED\')),  constraint pk_issue_event primary key (id))  row_format=compressed, key_block_size=8;create table issue_label (  id                        bigint auto_increment not null,  category_id               bigint,  color                     varchar(255),  name                      varchar(255),  project_id                bigint,  constraint pk_issue_label primary key (id))  row_format=compressed, key_block_size=8;create table issue_label_category (  id                        bigint auto_increment not null,  project_id                bigint,  name                      varchar(255),  is_exclusive              tinyint(1) default 0,  constraint pk_issue_label_category primary key (id))  row_format=compressed, key_block_size=8;create table label (  id                        bigint auto_increment not null,  category                  varchar(255),  name                      varchar(255),  constraint uq_label_1 unique (category,name),  constraint pk_label primary key (id))  row_format=compressed, key_block_size=8;create table mention (  id                        bigint auto_increment not null,  resource_type             varchar(20),  resource_id               varchar(255),  user_id                   bigint,  constraint ck_mention_resource_type check (resource_type in (\'ISSUE_POST\',\'ISSUE_ASSIGNEE\',\'ISSUE_STATE\',\'ISSUE_CATEGORY\',\'ISSUE_MILESTONE\',\'ISSUE_LABEL\',\'BOARD_POST\',\'BOARD_CATEGORY\',\'BOARD_NOTICE\',\'CODE\',\'MILESTONE\',\'WIKI_PAGE\',\'PROJECT_SETTING\',\'SITE_SETTING\',\'USER\',\'USER_AVATAR\',\'PROJECT\',\'ATTACHMENT\',\'ISSUE_COMMENT\',\'NONISSUE_COMMENT\',\'LABEL\',\'PROJECT_LABELS\',\'FORK\',\'COMMIT_COMMENT\',\'PULL_REQUEST\',\'COMMIT\',\'COMMENT_THREAD\',\'REVIEW_COMMENT\',\'ORGANIZATION\',\'PROJECT_TRANSFER\',\'ISSUE_LABEL_CATEGORY\',\'WEBHOOK\',\'NOT_A_RESOURCE\')),  constraint pk_mention primary key (id))  row_format=compressed, key_block_size=8;create table milestone (  id                        bigint auto_increment not null,  title                     varchar(255),  due_date                  datetime,  contents                  longtext,  state                     integer,  project_id                bigint,  constraint ck_milestone_state check (state in (0,1,2,3,4,5,6)),  constraint uq_milestone_1 unique (project_id,title),  constraint pk_milestone primary key (id))  row_format=compressed, key_block_size=8;create table notification_event (  id                        bigint auto_increment not null,  title                     varchar(255),  sender_id                 bigint,  created                   datetime,  resource_type             varchar(20),  resource_id               varchar(255),  event_type                varchar(34),  old_value                 longtext,  new_value                 longtext,  constraint ck_notification_event_resource_type check (resource_type in (\'ISSUE_POST\',\'ISSUE_ASSIGNEE\',\'ISSUE_STATE\',\'ISSUE_CATEGORY\',\'ISSUE_MILESTONE\',\'ISSUE_LABEL\',\'BOARD_POST\',\'BOARD_CATEGORY\',\'BOARD_NOTICE\',\'CODE\',\'MILESTONE\',\'WIKI_PAGE\',\'PROJECT_SETTING\',\'SITE_SETTING\',\'USER\',\'USER_AVATAR\',\'PROJECT\',\'ATTACHMENT\',\'ISSUE_COMMENT\',\'NONISSUE_COMMENT\',\'LABEL\',\'PROJECT_LABELS\',\'FORK\',\'COMMIT_COMMENT\',\'PULL_REQUEST\',\'COMMIT\',\'COMMENT_THREAD\',\'REVIEW_COMMENT\',\'ORGANIZATION\',\'PROJECT_TRANSFER\',\'ISSUE_LABEL_CATEGORY\',\'WEBHOOK\',\'NOT_A_RESOURCE\')),  constraint ck_notification_event_event_type check (event_type in (\'NEW_ISSUE\',\'NEW_POSTING\',\'NEW_PULL_REQUEST\',\'ISSUE_STATE_CHANGED\',\'ISSUE_ASSIGNEE_CHANGED\',\'PULL_REQUEST_STATE_CHANGED\',\'NEW_COMMENT\',\'NEW_REVIEW_COMMENT\',\'MEMBER_ENROLL_REQUEST\',\'PULL_REQUEST_MERGED\',\'ISSUE_REFERRED_FROM_COMMIT\',\'PULL_REQUEST_COMMIT_CHANGED\',\'NEW_COMMIT\',\'PULL_REQUEST_REVIEW_STATE_CHANGED\',\'ISSUE_BODY_CHANGED\',\'ISSUE_REFERRED_FROM_PULL_REQUEST\',\'REVIEW_THREAD_STATE_CHANGED\',\'ORGANIZATION_MEMBER_ENROLL_REQUEST\',\'COMMENT_UPDATED\')),  constraint pk_notification_event primary key (id))  row_format=compressed, key_block_size=8;create table notification_mail (  id                        bigint auto_increment not null,  notification_event_id     bigint,  constraint pk_notification_mail primary key (id));create table organization (  id                        bigint auto_increment not null,  name                      varchar(255),  created                   datetime,  descr                     varchar(255),  constraint pk_organization primary key (id))  row_format=compressed, key_block_size=8;create table organization_user (  id                        bigint auto_increment not null,  user_id                   bigint,  organization_id           bigint,  role_id                   bigint,  constraint pk_organization_user primary key (id))  row_format=compressed, key_block_size=8;create table original_email (  id                        bigint auto_increment not null,  message_id                varchar(255),  resource_type             varchar(20),  resource_id               varchar(255),  handled_date              datetime,  constraint ck_original_email_resource_type check (resource_type in (\'ISSUE_POST\',\'ISSUE_ASSIGNEE\',\'ISSUE_STATE\',\'ISSUE_CATEGORY\',\'ISSUE_MILESTONE\',\'ISSUE_LABEL\',\'BOARD_POST\',\'BOARD_CATEGORY\',\'BOARD_NOTICE\',\'CODE\',\'MILESTONE\',\'WIKI_PAGE\',\'PROJECT_SETTING\',\'SITE_SETTING\',\'USER\',\'USER_AVATAR\',\'PROJECT\',\'ATTACHMENT\',\'ISSUE_COMMENT\',\'NONISSUE_COMMENT\',\'LABEL\',\'PROJECT_LABELS\',\'FORK\',\'COMMIT_COMMENT\',\'PULL_REQUEST\',\'COMMIT\',\'COMMENT_THREAD\',\'REVIEW_COMMENT\',\'ORGANIZATION\',\'PROJECT_TRANSFER\',\'ISSUE_LABEL_CATEGORY\',\'WEBHOOK\',\'NOT_A_RESOURCE\')),  constraint uq_original_email_message_id unique (message_id),  constraint uq_original_email_1 unique (resource_type,resource_id),  constraint pk_original_email primary key (id))  row_format=compressed, key_block_size=8;create table posting (  id                        bigint auto_increment not null,  title                     varchar(255),  body                      longtext,  created_date              datetime,  updated_date              datetime,  author_id                 bigint,  author_login_id           varchar(255),  author_name               varchar(255),  project_id                bigint,  number                    bigint,  num_of_comments           integer,  notice                    tinyint(1) default 0,  readme                    tinyint(1) default 0,  constraint uq_posting_1 unique (project_id,number),  constraint pk_posting primary key (id))  row_format=compressed, key_block_size=8;create table posting_comment (  id                        bigint auto_increment not null,  contents                  longtext,  created_date              datetime,  author_id                 bigint,  author_login_id           varchar(255),  author_name               varchar(255),  posting_id                bigint,  constraint pk_posting_comment primary key (id))  row_format=compressed, key_block_size=8;create table project (  id                        bigint auto_increment not null,  name                      varchar(255),  overview                  varchar(255),  vcs                       varchar(255),  siteurl                   varchar(255),  owner                     varchar(255),  created_date              datetime,  last_issue_number         bigint,  last_posting_number       bigint,  original_project_id       bigint,  last_pushed_date          datetime,  default_reviewer_count    integer,  is_using_reviewer_count   tinyint(1) default 0,  organization_id           bigint,  project_scope             varchar(9),  previous_owner_login_id   varchar(255),  previous_name             varchar(255),  previous_name_changed_time bigint,  constraint ck_project_project_scope check (project_scope in (\'PRIVATE\',\'PROTECTED\',\'PUBLIC\')),  constraint pk_project primary key (id))  row_format=compressed, key_block_size=8;create table project_menu_setting (  id                        bigint auto_increment not null,  project_id                bigint,  code                      tinyint(1) default 0,  issue                     tinyint(1) default 0,  pull_request              tinyint(1) default 0,  review                    tinyint(1) default 0,  milestone                 tinyint(1) default 0,  board                     tinyint(1) default 0,  constraint pk_project_menu_setting primary key (id));create table project_transfer (  id                        bigint auto_increment not null,  sender_id                 bigint,  destination               varchar(255),  project_id                bigint,  requested                 datetime,  confirm_key               varchar(255),  accepted                  tinyint(1) default 0,  new_project_name          varchar(255),  constraint pk_project_transfer primary key (id))  row_format=compressed, key_block_size=8;create table project_user (  id                        bigint auto_increment not null,  user_id                   bigint,  project_id                bigint,  role_id                   bigint,  constraint pk_project_user primary key (id));create table project_visitation (  id                        bigint auto_increment not null,  project_id                bigint,  recently_visited_projects_id bigint,  visited                   datetime,  constraint uq_project_visitation_1 unique (project_id,recently_visited_projects_id),  constraint pk_project_visitation primary key (id));create table property (  id                        bigint auto_increment not null,  name                      varchar(25),  value                     varchar(255),  constraint ck_property_name check (name in (\'MAILBOX_LAST_SEEN_UID\',\'MAILBOX_LAST_UID_VALIDITY\')),  constraint pk_property primary key (id))  row_format=compressed, key_block_size=8;create table pull_request (  id                        bigint auto_increment not null,  title                     varchar(255),  body                      longtext,  to_project_id             bigint,  from_project_id           bigint,  to_branch                 varchar(255),  from_branch               varchar(255),  contributor_id            bigint,  receiver_id               bigint,  created                   datetime,  updated                   datetime,  received                  datetime,  state                     integer,  is_conflict               tinyint(1) default 0,  is_merging                tinyint(1) default 0,  last_commit_id            varchar(255),  merged_commit_id_from     varchar(255),  merged_commit_id_to       varchar(255),  number                    bigint,  constraint ck_pull_request_state check (state in (0,1,2,3,4,5,6)),  constraint pk_pull_request primary key (id))  row_format=compressed, key_block_size=8;create table pull_request_commit (  id                        bigint auto_increment not null,  pull_request_id           bigint,  commit_id                 varchar(255),  author_date               datetime,  created                   datetime,  commit_message            longtext,  commit_short_id           varchar(255),  author_email              varchar(255),  state                     varchar(7),  constraint ck_pull_request_commit_state check (state in (\'PRIOR\',\'CURRENT\')),  constraint pk_pull_request_commit primary key (id))  row_format=compressed, key_block_size=8;create table pull_request_event (  id                        bigint auto_increment not null,  sender_login_id           varchar(255),  pull_request_id           bigint,  event_type                varchar(34),  created                   datetime,  old_value                 longtext,  new_value                 longtext,  constraint ck_pull_request_event_event_type check (event_type in (\'NEW_ISSUE\',\'NEW_POSTING\',\'NEW_PULL_REQUEST\',\'ISSUE_STATE_CHANGED\',\'ISSUE_ASSIGNEE_CHANGED\',\'PULL_REQUEST_STATE_CHANGED\',\'NEW_COMMENT\',\'NEW_REVIEW_COMMENT\',\'MEMBER_ENROLL_REQUEST\',\'PULL_REQUEST_MERGED\',\'ISSUE_REFERRED_FROM_COMMIT\',\'PULL_REQUEST_COMMIT_CHANGED\',\'NEW_COMMIT\',\'PULL_REQUEST_REVIEW_STATE_CHANGED\',\'ISSUE_BODY_CHANGED\',\'ISSUE_REFERRED_FROM_PULL_REQUEST\',\'REVIEW_THREAD_STATE_CHANGED\',\'ORGANIZATION_MEMBER_ENROLL_REQUEST\',\'COMMENT_UPDATED\')),  constraint pk_pull_request_event primary key (id))  row_format=compressed, key_block_size=8;create table project_pushed_branch (  id                        bigint auto_increment not null,  pushed_date               datetime,  name                      varchar(255),  project_id                bigint,  constraint pk_project_pushed_branch primary key (id))  row_format=compressed, key_block_size=8;create table recently_visited_projects (  id                        bigint auto_increment not null,  user_id                   bigint,  constraint pk_recently_visited_projects primary key (id));create table review_comment (  id                        bigint auto_increment not null,  contents                  longtext,  created_date              datetime,  author_id                 bigint,  author_login_id           varchar(255),  author_name               varchar(255),  thread_id                 bigint,  constraint pk_review_comment primary key (id))  row_format=compressed, key_block_size=8;create table role (  id                        bigint auto_increment not null,  name                      varchar(255),  active                    tinyint(1) default 0,  constraint pk_role primary key (id))  row_format=compressed, key_block_size=8;create table site_admin (  id                        bigint auto_increment not null,  admin_id                  bigint,  constraint pk_site_admin primary key (id));create table unwatch (  id                        bigint auto_increment not null,  user_id                   bigint,  resource_type             varchar(20),  resource_id               varchar(255),  constraint ck_unwatch_resource_type check (resource_type in (\'ISSUE_POST\',\'ISSUE_ASSIGNEE\',\'ISSUE_STATE\',\'ISSUE_CATEGORY\',\'ISSUE_MILESTONE\',\'ISSUE_LABEL\',\'BOARD_POST\',\'BOARD_CATEGORY\',\'BOARD_NOTICE\',\'CODE\',\'MILESTONE\',\'WIKI_PAGE\',\'PROJECT_SETTING\',\'SITE_SETTING\',\'USER\',\'USER_AVATAR\',\'PROJECT\',\'ATTACHMENT\',\'ISSUE_COMMENT\',\'NONISSUE_COMMENT\',\'LABEL\',\'PROJECT_LABELS\',\'FORK\',\'COMMIT_COMMENT\',\'PULL_REQUEST\',\'COMMIT\',\'COMMENT_THREAD\',\'REVIEW_COMMENT\',\'ORGANIZATION\',\'PROJECT_TRANSFER\',\'ISSUE_LABEL_CATEGORY\',\'WEBHOOK\',\'NOT_A_RESOURCE\')),  constraint pk_unwatch primary key (id))  row_format=compressed, key_block_size=8;create table n4user (  id                        bigint auto_increment not null,  name                      varchar(255),  login_id                  varchar(255),  password                  varchar(255),  password_salt             varchar(255),  email                     varchar(255),  remember_me               tinyint(1) default 0,  state                     varchar(7),  last_state_modified_date  datetime,  created_date              datetime,  lang                      varchar(255),  constraint ck_n4user_state check (state in (\'ACTIVE\',\'LOCKED\',\'DELETED\')),  constraint pk_n4user primary key (id))  row_format=compressed, key_block_size=8;create table user_project_notification (  id                        bigint auto_increment not null,  user_id                   bigint,  project_id                bigint,  notification_type         varchar(34),  allowed                   tinyint(1) default 0,  constraint ck_user_project_notification_notification_type check (notification_type in (\'NEW_ISSUE\',\'NEW_POSTING\',\'NEW_PULL_REQUEST\',\'ISSUE_STATE_CHANGED\',\'ISSUE_ASSIGNEE_CHANGED\',\'PULL_REQUEST_STATE_CHANGED\',\'NEW_COMMENT\',\'NEW_REVIEW_COMMENT\',\'MEMBER_ENROLL_REQUEST\',\'PULL_REQUEST_MERGED\',\'ISSUE_REFERRED_FROM_COMMIT\',\'PULL_REQUEST_COMMIT_CHANGED\',\'NEW_COMMIT\',\'PULL_REQUEST_REVIEW_STATE_CHANGED\',\'ISSUE_BODY_CHANGED\',\'ISSUE_REFERRED_FROM_PULL_REQUEST\',\'REVIEW_THREAD_STATE_CHANGED\',\'ORGANIZATION_MEMBER_ENROLL_REQUEST\',\'COMMENT_UPDATED\')),  constraint uq_user_project_notification_1 unique (project_id,user_id,notification_type),  constraint pk_user_project_notification primary key (id))  row_format=compressed, key_block_size=8;create table watch (  id                        bigint auto_increment not null,  user_id                   bigint,  resource_type             varchar(20),  resource_id               varchar(255),  constraint ck_watch_resource_type check (resource_type in (\'ISSUE_POST\',\'ISSUE_ASSIGNEE\',\'ISSUE_STATE\',\'ISSUE_CATEGORY\',\'ISSUE_MILESTONE\',\'ISSUE_LABEL\',\'BOARD_POST\',\'BOARD_CATEGORY\',\'BOARD_NOTICE\',\'CODE\',\'MILESTONE\',\'WIKI_PAGE\',\'PROJECT_SETTING\',\'SITE_SETTING\',\'USER\',\'USER_AVATAR\',\'PROJECT\',\'ATTACHMENT\',\'ISSUE_COMMENT\',\'NONISSUE_COMMENT\',\'LABEL\',\'PROJECT_LABELS\',\'FORK\',\'COMMIT_COMMENT\',\'PULL_REQUEST\',\'COMMIT\',\'COMMENT_THREAD\',\'REVIEW_COMMENT\',\'ORGANIZATION\',\'PROJECT_TRANSFER\',\'ISSUE_LABEL_CATEGORY\',\'WEBHOOK\',\'NOT_A_RESOURCE\')),  constraint pk_watch primary key (id))  row_format=compressed, key_block_size=8;create table webhook (  id                        bigint auto_increment not null,  project_id                bigint,  payload_url               varchar(2000),  secret                    varchar(250),  created_at                datetime,  constraint pk_webhook primary key (id))  row_format=compressed, key_block_size=8;create table comment_thread_n4user (  comment_thread_id              bigint not null,  n4user_id                      bigint not null,  constraint pk_comment_thread_n4user primary key (comment_thread_id, n4user_id));create table issue_issue_label (  issue_id                       bigint not null,  issue_label_id                 bigint not null,  constraint pk_issue_issue_label primary key (issue_id, issue_label_id));create table issue_voter (  issue_id                       bigint not null,  user_id                        bigint not null,  constraint pk_issue_voter primary key (issue_id, user_id));create table issue_comment_voter (  issue_comment_id               bigint not null,  user_id                        bigint not null,  constraint pk_issue_comment_voter primary key (issue_comment_id, user_id));create table notification_event_n4user (  notification_event_id          bigint not null,  n4user_id                      bigint not null,  constraint pk_notification_event_n4user primary key (notification_event_id, n4user_id));create table posting_issue_label (  posting_id                     bigint not null,  issue_label_id                 bigint not null,  constraint pk_posting_issue_label primary key (posting_id, issue_label_id));create table project_label (  project_id                     bigint not null,  label_id                       bigint not null,  constraint pk_project_label primary key (project_id, label_id));create table pull_request_reviewers (  pull_request_id                bigint not null,  user_id                        bigint not null,  constraint pk_pull_request_reviewers primary key (pull_request_id, user_id));create table user_enrolled_project (  user_id                        bigint not null,  project_id                     bigint not null,  constraint pk_user_enrolled_project primary key (user_id, project_id));create table user_enrolled_organization (  user_id                        bigint not null,  organization_id                bigint not null,  constraint pk_user_enrolled_organization primary key (user_id, organization_id));alter table assignee add constraint fk_assignee_user_1 foreign key (user_id) references n4user (id) on delete restrict on update restrict;create index ix_assignee_user_1 on assignee (user_id);alter table assignee add constraint fk_assignee_project_2 foreign key (project_id) references project (id) on delete restrict on update restrict;create index ix_assignee_project_2 on assignee (project_id);alter table comment_thread add constraint fk_comment_thread_pullRequest_3 foreign key (pull_request_id) references pull_request (id) on delete restrict on update restrict;create index ix_comment_thread_pullRequest_3 on comment_thread (pull_request_id);alter table comment_thread add constraint fk_comment_thread_project_4 foreign key (project_id) references project (id) on delete restrict on update restrict;create index ix_comment_thread_project_4 on comment_thread (project_id);alter table commit_comment add constraint fk_commit_comment_project_5 foreign key (project_id) references project (id) on delete restrict on update restrict;create index ix_commit_comment_project_5 on commit_comment (project_id);alter table email add constraint fk_email_user_6 foreign key (user_id) references n4user (id) on delete restrict on update restrict;create index ix_email_user_6 on email (user_id);alter table issue add constraint fk_issue_project_7 foreign key (project_id) references project (id) on delete restrict on update restrict;create index ix_issue_project_7 on issue (project_id);alter table issue add constraint fk_issue_milestone_8 foreign key (milestone_id) references milestone (id) on delete restrict on update restrict;create index ix_issue_milestone_8 on issue (milestone_id);alter table issue add constraint fk_issue_assignee_9 foreign key (assignee_id) references assignee (id) on delete restrict on update restrict;create index ix_issue_assignee_9 on issue (assignee_id);alter table issue_comment add constraint fk_issue_comment_issue_10 foreign key (issue_id) references issue (id) on delete restrict on update restrict;create index ix_issue_comment_issue_10 on issue_comment (issue_id);alter table issue_event add constraint fk_issue_event_issue_11 foreign key (issue_id) references issue (id) on delete restrict on update restrict;create index ix_issue_event_issue_11 on issue_event (issue_id);alter table issue_label add constraint fk_issue_label_category_12 foreign key (category_id) references issue_label_category (id) on delete restrict on update restrict;create index ix_issue_label_category_12 on issue_label (category_id);alter table issue_label add constraint fk_issue_label_project_13 foreign key (project_id) references project (id) on delete restrict on update restrict;create index ix_issue_label_project_13 on issue_label (project_id);alter table issue_label_category add constraint fk_issue_label_category_project_14 foreign key (project_id) references project (id) on delete restrict on update restrict;create index ix_issue_label_category_project_14 on issue_label_category (project_id);alter table mention add constraint fk_mention_user_15 foreign key (user_id) references n4user (id) on delete restrict on update restrict;create index ix_mention_user_15 on mention (user_id);alter table milestone add constraint fk_milestone_project_16 foreign key (project_id) references project (id) on delete restrict on update restrict;create index ix_milestone_project_16 on milestone (project_id);alter table notification_mail add constraint fk_notification_mail_notificationEvent_17 foreign key (notification_event_id) references notification_event (id) on delete restrict on update restrict;create index ix_notification_mail_notificationEvent_17 on notification_mail (notification_event_id);alter table organization_user add constraint fk_organization_user_user_18 foreign key (user_id) references n4user (id) on delete restrict on update restrict;create index ix_organization_user_user_18 on organization_user (user_id);alter table organization_user add constraint fk_organization_user_organization_19 foreign key (organization_id) references organization (id) on delete restrict on update restrict;create index ix_organization_user_organization_19 on organization_user (organization_id);alter table organization_user add constraint fk_organization_user_role_20 foreign key (role_id) references role (id) on delete restrict on update restrict;create index ix_organization_user_role_20 on organization_user (role_id);alter table posting add constraint fk_posting_project_21 foreign key (project_id) references project (id) on delete restrict on update restrict;create index ix_posting_project_21 on posting (project_id);alter table posting_comment add constraint fk_posting_comment_posting_22 foreign key (posting_id) references posting (id) on delete restrict on update restrict;create index ix_posting_comment_posting_22 on posting_comment (posting_id);alter table project add constraint fk_project_originalProject_23 foreign key (original_project_id) references project (id) on delete restrict on update restrict;create index ix_project_originalProject_23 on project (original_project_id);alter table project add constraint fk_project_organization_24 foreign key (organization_id) references organization (id) on delete restrict on update restrict;create index ix_project_organization_24 on project (organization_id);alter table project_menu_setting add constraint fk_project_menu_setting_project_25 foreign key (project_id) references project (id) on delete restrict on update restrict;create index ix_project_menu_setting_project_25 on project_menu_setting (project_id);alter table project_transfer add constraint fk_project_transfer_sender_26 foreign key (sender_id) references n4user (id) on delete restrict on update restrict;create index ix_project_transfer_sender_26 on project_transfer (sender_id);alter table project_transfer add constraint fk_project_transfer_project_27 foreign key (project_id) references project (id) on delete restrict on update restrict;create index ix_project_transfer_project_27 on project_transfer (project_id);alter table project_user add constraint fk_project_user_user_28 foreign key (user_id) references n4user (id) on delete restrict on update restrict;create index ix_project_user_user_28 on project_user (user_id);alter table project_user add constraint fk_project_user_project_29 foreign key (project_id) references project (id) on delete restrict on update restrict;create index ix_project_user_project_29 on project_user (project_id);alter table project_user add constraint fk_project_user_role_30 foreign key (role_id) references role (id) on delete restrict on update restrict;create index ix_project_user_role_30 on project_user (role_id);alter table project_visitation add constraint fk_project_visitation_project_31 foreign key (project_id) references project (id) on delete restrict on update restrict;create index ix_project_visitation_project_31 on project_visitation (project_id);alter table project_visitation add constraint fk_project_visitation_recentlyVisitedProjects_32 foreign key (recently_visited_projects_id) references recently_visited_projects (id) on delete restrict on update restrict;create index ix_project_visitation_recentlyVisitedProjects_32 on project_visitation (recently_visited_projects_id);alter table pull_request add constraint fk_pull_request_toProject_33 foreign key (to_project_id) references project (id) on delete restrict on update restrict;create index ix_pull_request_toProject_33 on pull_request (to_project_id);alter table pull_request add constraint fk_pull_request_fromProject_34 foreign key (from_project_id) references project (id) on delete restrict on update restrict;create index ix_pull_request_fromProject_34 on pull_request (from_project_id);alter table pull_request add constraint fk_pull_request_contributor_35 foreign key (contributor_id) references n4user (id) on delete restrict on update restrict;create index ix_pull_request_contributor_35 on pull_request (contributor_id);alter table pull_request add constraint fk_pull_request_receiver_36 foreign key (receiver_id) references n4user (id) on delete restrict on update restrict;create index ix_pull_request_receiver_36 on pull_request (receiver_id);alter table pull_request_commit add constraint fk_pull_request_commit_pullRequest_37 foreign key (pull_request_id) references pull_request (id) on delete restrict on update restrict;create index ix_pull_request_commit_pullRequest_37 on pull_request_commit (pull_request_id);alter table pull_request_event add constraint fk_pull_request_event_pullRequest_38 foreign key (pull_request_id) references pull_request (id) on delete restrict on update restrict;create index ix_pull_request_event_pullRequest_38 on pull_request_event (pull_request_id);alter table project_pushed_branch add constraint fk_project_pushed_branch_project_39 foreign key (project_id) references project (id) on delete restrict on update restrict;create index ix_project_pushed_branch_project_39 on project_pushed_branch (project_id);alter table recently_visited_projects add constraint fk_recently_visited_projects_user_40 foreign key (user_id) references n4user (id) on delete restrict on update restrict;create index ix_recently_visited_projects_user_40 on recently_visited_projects (user_id);alter table review_comment add constraint fk_review_comment_thread_41 foreign key (thread_id) references comment_thread (id) on delete restrict on update restrict;create index ix_review_comment_thread_41 on review_comment (thread_id);alter table site_admin add constraint fk_site_admin_admin_42 foreign key (admin_id) references n4user (id) on delete restrict on update restrict;create index ix_site_admin_admin_42 on site_admin (admin_id);alter table unwatch add constraint fk_unwatch_user_43 foreign key (user_id) references n4user (id) on delete restrict on update restrict;create index ix_unwatch_user_43 on unwatch (user_id);alter table user_project_notification add constraint fk_user_project_notification_user_44 foreign key (user_id) references n4user (id) on delete restrict on update restrict;create index ix_user_project_notification_user_44 on user_project_notification (user_id);alter table user_project_notification add constraint fk_user_project_notification_project_45 foreign key (project_id) references project (id) on delete restrict on update restrict;create index ix_user_project_notification_project_45 on user_project_notification (project_id);alter table watch add constraint fk_watch_user_46 foreign key (user_id) references n4user (id) on delete restrict on update restrict;create index ix_watch_user_46 on watch (user_id);alter table webhook add constraint fk_webhook_project_47 foreign key (project_id) references project (id) on delete restrict on update restrict;create index ix_webhook_project_47 on webhook (project_id);alter table comment_thread_n4user add constraint fk_comment_thread_n4user_comment_thread_01 foreign key (comment_thread_id) references comment_thread (id) on delete restrict on update restrict;alter table comment_thread_n4user add constraint fk_comment_thread_n4user_n4user_02 foreign key (n4user_id) references n4user (id) on delete restrict on update restrict;alter table issue_issue_label add constraint fk_issue_issue_label_issue_01 foreign key (issue_id) references issue (id) on delete restrict on update restrict;alter table issue_issue_label add constraint fk_issue_issue_label_issue_label_02 foreign key (issue_label_id) references issue_label (id) on delete restrict on update restrict;alter table issue_voter add constraint fk_issue_voter_issue_01 foreign key (issue_id) references issue (id) on delete restrict on update restrict;alter table issue_voter add constraint fk_issue_voter_n4user_02 foreign key (user_id) references n4user (id) on delete restrict on update restrict;alter table issue_comment_voter add constraint fk_issue_comment_voter_issue_comment_01 foreign key (issue_comment_id) references issue_comment (id) on delete restrict on update restrict;alter table issue_comment_voter add constraint fk_issue_comment_voter_n4user_02 foreign key (user_id) references n4user (id) on delete restrict on update restrict;alter table notification_event_n4user add constraint fk_notification_event_n4user_notification_event_01 foreign key (notification_event_id) references notification_event (id) on delete restrict on update restrict;alter table notification_event_n4user add constraint fk_notification_event_n4user_n4user_02 foreign key (n4user_id) references n4user (id) on delete restrict on update restrict;alter table posting_issue_label add constraint fk_posting_issue_label_posting_01 foreign key (posting_id) references posting (id) on delete restrict on update restrict;alter table posting_issue_label add constraint fk_posting_issue_label_issue_label_02 foreign key (issue_label_id) references issue_label (id) on delete restrict on update restrict;alter table project_label add constraint fk_project_label_project_01 foreign key (project_id) references project (id) on delete restrict on update restrict;alter table project_label add constraint fk_project_label_label_02 foreign key (label_id) references label (id) on delete restrict on update restrict;alter table pull_request_reviewers add constraint fk_pull_request_reviewers_pull_request_01 foreign key (pull_request_id) references pull_request (id) on delete restrict on update restrict;alter table pull_request_reviewers add constraint fk_pull_request_reviewers_n4user_02 foreign key (user_id) references n4user (id) on delete restrict on update restrict;alter table user_enrolled_project add constraint fk_user_enrolled_project_n4user_01 foreign key (user_id) references n4user (id) on delete restrict on update restrict;alter table user_enrolled_project add constraint fk_user_enrolled_project_project_02 foreign key (project_id) references project (id) on delete restrict on update restrict;alter table user_enrolled_organization add constraint fk_user_enrolled_organization_n4user_01 foreign key (user_id) references n4user (id) on delete restrict on update restrict;alter table user_enrolled_organization add constraint fk_user_enrolled_organization_organization_02 foreign key (organization_id) references organization (id) on delete restrict on update restrict;','SET FOREIGN_KEY_CHECKS=0;drop table assignee;drop table attachment;drop table comment_thread;drop table commit_comment;drop table email;drop table issue;drop table issue_issue_label;drop table issue_voter;drop table issue_comment;drop table issue_comment_voter;drop table issue_event;drop table issue_label;drop table posting_issue_label;drop table issue_label_category;drop table label;drop table project_label;drop table mention;drop table milestone;drop table notification_event;drop table notification_event_n4user;drop table notification_mail;drop table organization;drop table user_enrolled_organization;drop table organization_user;drop table original_email;drop table posting;drop table posting_comment;drop table project;drop table user_enrolled_project;drop table project_menu_setting;drop table project_transfer;drop table project_user;drop table project_visitation;drop table property;drop table pull_request;drop table pull_request_reviewers;drop table pull_request_commit;drop table pull_request_event;drop table project_pushed_branch;drop table recently_visited_projects;drop table review_comment;drop table role;drop table site_admin;drop table unwatch;drop table n4user;drop table user_project_notification;drop table watch;drop table webhook;SET FOREIGN_KEY_CHECKS=1;','applied',NULL),
(2,'b48c244939ef2851069cb799b8073bd5','2026-08-23 12:00:00','# --- !Upscreate index ix_issue_voter_user_id on issue_voter (user_id);create index ix_issue_comment_voter_user_id on issue_comment_voter (user_id);create index ix_original_email_resource_id on original_email (resource_id);CREATE INDEX ix_attachment_container ON attachment (container_type, container_id);create index ix_mention_resource_type on mention (resource_type);','drop index if exists ix_issue_voter_user_id;drop index if exists ix_issue_comment_voter_user_id;drop index if exists ix_original_email_resource_id;drop index if exists ix_attachment_container;drop index if exists ix_mention_resource_type;','applied',NULL),
(3,'71dbf42a875a380966762f5a6e92ece6','2026-08-23 12:00:00','# --- !Upscreate unique index uq_n4user_1 on n4user (login_id);create index ix_notification_event_created on notification_event (created DESC);create index ix_watch_resource_id_resource_type on watch(resource_id, resource_type);create index ix_unwatch_resource_id_resource_type on unwatch(resource_id, resource_type);','drop index uq_n4user_1 on n4user;drop index ix_notification_event_created on notification_event;drop index ix_watch_resource_id_resource_type on watch;drop index ix_unwatch_resource_id_resource_type on unwatch;','applied',NULL),
(4,'e5e8879790df4776535ac59a4be67200','2026-08-23 12:00:00','# --- !Upscreate table recent_project (  id                        bigint auto_increment not null,  user_id                   bigint,  owner                     varchar(255),  project_id                bigint,  project_name              varchar(255),  constraint pk_recent_project primary key (id),  constraint uq_recent_project_1 unique (user_id, project_id))  row_format=compressed, key_block_size=8;alter table recent_project add constraint fk_recent_project_project_2 foreign key (project_id) references project (id) on delete CASCADE on update CASCADE;','drop table recent_project;','applied',NULL),
(5,'5b3a409b37af9dad5795c5615ad8903a','2026-08-23 12:00:00','# --- !UpsALTER TABLE project_visitation DROP FOREIGN KEY fk_project_visitation_project_31;alter table project_visitation add constraint fk_project_visitation_project_31 foreign key (project_id) references project (id) on delete CASCADE on update CASCADE;',NULL,'applied',NULL),
(6,'b08c400bcd507bf533fd6124a85fe22a','2026-08-23 12:00:00','# --- !UpsALTER TABLE n4user ADD COLUMN token varchar(255);CREATE UNIQUE INDEX uq_n4user_token ON n4user (token);','DROP INDEX IF EXISTS uq_n4user_token;ALTER TABLE n4user DROP COLUMN token;','applied',NULL),
(7,'62a9d78ac8fc03b0cb12c0e023513aba','2026-08-23 12:00:00','# --- !UpsALTER TABLE issue ADD COLUMN history longtext;ALTER TABLE posting ADD COLUMN history longtext;','ALTER TABLE issue DROP COLUMN history;ALTER TABLE posting DROP COLUMN history;','applied',NULL),
(8,'aeda45d390d21c699fd8e6c08f8f8604','2026-08-23 12:00:00','# --- !UpsALTER TABLE project ADD COLUMN is_code_accessible_member_only tinyint(1) default 0;','ALTER TABLE project DROP COLUMN is_code_accessible_member_only;','applied',NULL),
(9,'ab430cc5d822c1c81d30004d54133cf3','2026-08-23 12:00:00','# --- !UpsSET FOREIGN_KEY_CHECKS=0;ALTER TABLE issue_comment ADD COLUMN project_id bigint;DELETE FROM issue_comment WHERE issue_id = 0;COMMIT;UPDATE issue_comment aSET a.project_id = (SELECT project_id FROM issue b WHERE a.issue_id = b.id);ALTER TABLE issue_comment MODIFY COLUMN project_id bigint NOT NULL;CREATE INDEX ix_issue_comment_project_id ON issue_comment (project_id);ALTER TABLE posting_comment ADD COLUMN project_id bigint NOT NULL;DELETE FROM posting_comment WHERE posting_id = 0;COMMIT;UPDATE posting_comment aSET a.project_id = (SELECT project_id FROM posting b WHERE a.posting_id = b.id);ALTER TABLE posting_comment MODIFY COLUMN project_id bigint NOT NULL;SET FOREIGN_KEY_CHECKS=1;CREATE INDEX ix_posting_comment_project_id ON posting_comment (project_id);CREATE INDEX ix_issue_comment_author_id ON issue_comment (author_id);CREATE INDEX ix_posting_comment_author_id ON posting_comment (author_id);CREATE INDEX ix_pull_request_number ON pull_request (number);CREATE INDEX ix_issue_author_id_state ON issue (author_id, state);CREATE INDEX ix_issue_created_date ON issue (created_date);CREATE INDEX ix_n4user_email ON n4user (email);CREATE UNIQUE INDEX uq_email_email_valid ON email (email, valid);','DROP INDEX ix_issue_comment_project_id ON issue_comment;DROP INDEX ix_posting_comment_project_id ON posting_comment;ALTER TABLE issue_comment DROP COLUMN project_id;ALTER TABLE posting_comment DROP COLUMN project_id;DROP INDEX ix_issue_comment_author_id ON issue_comment;DROP INDEX ix_posting_comment_author_id ON posting_comment;DROP INDEX ix_pull_request_number ON pull_request;DROP INDEX ix_issue_author_id_state ON issue;DROP INDEX ix_issue_created_date ON issue;DROP INDEX ix_n4user_email ON n4user;DROP  INDEX uq_email_email_valid ON email;','applied',NULL),
(10,'290430b46e7bd9bf851059211fe3c878','2026-08-23 12:00:00','# --- !UpsALTER TABLE attachment ADD COLUMN owner_login_id VARCHAR(255);CREATE INDEX ix_attachment_owner_login_id ON attachment (owner_login_id);CREATE INDEX ix_attachment_created_date ON attachment (created_date);ALTER TABLE attachment MODIFY container_id BIGINT NOT NULL;UPDATE attachment aSET owner_login_id = (SELECT author_login_id FROM posting b WHERE b.id = a.container_id)WHERE container_type = \'BOARD_POST\';UPDATE attachment aSET owner_login_id = (SELECT author_login_id FROM issue b WHERE b.id = a.container_id)WHERE container_type = \'ISSUE_POST\';UPDATE attachment aSET owner_login_id = (SELECT author_login_id FROM issue_comment b WHERE b.id = a.container_id)WHERE container_type = \'ISSUE_COMMENT\';UPDATE attachment aSET owner_login_id = (SELECT author_login_id FROM posting_comment b WHERE b.id = a.container_id)WHERE container_type = \'NONISSUE_COMMENT\';UPDATE attachment aSET owner_login_id = (SELECT login_id FROM n4user b WHERE a.id = b.id)WHERE container_type in (\'USER\', \'USER_AVATAR\');','DROP INDEX ix_attachment_owner_login_id ON attachment;DROP INDEX ix_attachment_created_date ON attachment;ALTER TABLE attachment DROP COLUMN owner_login_id;','applied',NULL),
(11,'f2a01af4b97aa3de99d1296a99c14132','2026-08-23 12:00:00','# --- !UpsCREATE TABLE favorite_project (  id                        BIGINT AUTO_INCREMENT NOT NULL,  user_id                   BIGINT,  project_id                BIGINT,  owner                     VARCHAR(255),  project_name              VARCHAR(255),  CONSTRAINT pk_favorite_project PRIMARY KEY (id),  CONSTRAINT uq_favorite_project_user_id_project_id_1 UNIQUE (user_id, project_id),  CONSTRAINT fk_favorite_project_user FOREIGN KEY (user_id) REFERENCES n4user (id) on DELETE CASCADE,  CONSTRAINT fk_favorite_project_project FOREIGN KEY (project_id) REFERENCES project (id) on DELETE CASCADE  )  row_format=compressed, key_block_size=8;CREATE index ix_favorite_project_user_1 ON favorite_project (user_id);CREATE index ix_favorite_project_project_2 ON favorite_project (project_id);CREATE TABLE favorite_organization (  id                        BIGINT AUTO_INCREMENT NOT NULL,  user_id                   BIGINT,  organization_id           BIGINT,  organization_name        VARCHAR(255),  CONSTRAINT pk_favorite_organization PRIMARY KEY (id),  CONSTRAINT uq_favorite_organization_user_id_organization_id_1 UNIQUE (user_id, organization_id),  CONSTRAINT fk_favorite_organization_user FOREIGN KEY (user_id) REFERENCES n4user (id) on DELETE CASCADE,  CONSTRAINT fk_favorite_organization_organization FOREIGN KEY (organization_id) REFERENCES organization (id) on DELETE CASCADE  )  row_format=compressed, key_block_size=8;CREATE index ix_favorite_organization_user_1 ON favorite_organization (user_id);CREATE index ix_favorite_organization_organization_2 ON favorite_organization (organization_id);','DROP TABLE favorite_project;DROP TABLE favorite_organization;','applied',NULL),
(12,'1f2e813b68e90d9d26be58f2e262bab2','2026-08-23 12:00:00','# --- !Upscreate table linked_account (  id                        bigint auto_increment not null,  user_credential_id        bigint,  provider_user_id          varchar(255),  provider_key              varchar(255),  constraint pk_linked_account primary key (id))  row_format=compressed, key_block_size=8;create table user_credential (  id                        bigint auto_increment not null,  user_id                   bigint,  login_id                  varchar(255),  email                     varchar(255),  name                      varchar(255),  active                    tinyint(1) default 0,  email_validated           tinyint(1) default 0,  constraint pk_users primary key (id),  CONSTRAINT fk_user_credential_user FOREIGN KEY (user_id) REFERENCES n4user (id) on DELETE CASCADE)  row_format=compressed, key_block_size=8;create index ix_user_credential_user_id_1 on user_credential (user_id);alter table linked_account add constraint fk_linked_account_user_1 foreign key (user_credential_id) references user_credential (id) on delete CASCADE;create index ix_linked_account_user_credential_1 on linked_account (user_credential_id);','SET FOREIGN_KEY_CHECKS=0;drop table linked_account;drop table user_credential;SET FOREIGN_KEY_CHECKS=1;','applied',NULL),
(13,'ff258dd289eb8aabdc74596253200149','2026-08-23 12:00:00','# --- !UpsALTER TABLE issue ADD COLUMN parent_id bigint;alter table issue add constraint fk_issue_parent_id_01 foreign key (parent_id) references issue (id) on delete set null;CREATE INDEX ix_issue_parent_id ON issue (parent_id);ALTER TABLE posting ADD COLUMN parent_id bigint;alter table posting add constraint fk_posting_parent_id_01 foreign key (parent_id) references posting (id) on delete set null;CREATE INDEX ix_posting_parent_id ON posting (parent_id);','ALTER TABLE issue DROP FOREIGN KEY fk_issue_parent_id_01;ALTER TABLE posting DROP FOREIGN KEY fk_posting_parent_id_01;ALTER TABLE issue DROP COLUMN parent_id;ALTER TABLE posting DROP COLUMN parent_id;','applied',NULL),
(14,'9c88b1757dcbc89095c7967306c5c6b9','2026-08-23 12:00:00','# --- !UpsCREATE TABLE user_setting (  id                        BIGINT AUTO_INCREMENT NOT NULL,  user_id                   BIGINT,  login_default_page        VARCHAR(255),  CONSTRAINT pk_user_setting PRIMARY KEY (id),  CONSTRAINT fk_user_setting_user FOREIGN KEY (user_id) REFERENCES n4user (id) on DELETE CASCADE)row_format=compressed, key_block_size=8;CREATE index ix_user_setting_user_1 ON user_setting (user_id);','DROP TABLE user_setting;','applied',NULL),
(15,'68c937bbe02dc89c65abb79b3c07de5b','2026-08-23 12:00:00','# --- !UpsCREATE TABLE user_verification (  id                        BIGINT AUTO_INCREMENT NOT NULL,  user_id                   BIGINT,  login_id                  VARCHAR(255),  verification_code         VARCHAR(255),  timestamp                 BIGINT,  CONSTRAINT pk_user_verification PRIMARY KEY (id),  CONSTRAINT fk_user_verification_user FOREIGN KEY (user_id) REFERENCES n4user (id) on DELETE CASCADE)row_format=compressed, key_block_size=8;CREATE index ix_user_verification_user_1 ON user_verification (user_id);CREATE index ix_user_verification_user_2 ON user_verification (login_id, verification_code);','DROP TABLE user_verification;','applied',NULL),
(16,'1293407a2361835d5907d1f94aa961b5','2026-08-23 12:00:00','# --- !UpsALTER TABLE n4user ADD COLUMN is_guest tinyint(1) default 0;CREATE INDEX ix_n4user_is_guest ON n4user (is_guest);','DROP INDEX IF EXISTS ix_n4user_is_guest ON n4user;ALTER TABLE n4user DROP COLUMN is_guest;','applied',NULL),
(17,'cf790a91a09e03dccf5dc59bde973faa','2026-08-23 12:00:00','# --- !UpsALTER TABLE webhook ADD COLUMN git_push_only tinyint(1) default 1;CREATE INDEX ix_webhook_git_push_only ON webhook (git_push_only);','ALTER TABLE webhook DROP COLUMN git_push_only;','applied',NULL),
(18,'877e50b25dfcc83979a25ab3e04ccff8','2026-08-23 12:00:00','# --- !UpsALTER TABLE n4user ADD COLUMN english_name VARCHAR(255);','ALTER TABLE n4user DROP COLUMN english_name;','applied',NULL),
(19,'8f53663d11876bc68aa6cf02df2c756c','2026-08-23 12:00:00','# --- !UpsCREATE TABLE issue_sharer (  id                        BIGINT AUTO_INCREMENT NOT NULL,  created                   DATE,  login_id                  VARCHAR(255),  user_id                   BIGINT,  issue_id                   BIGINT,  CONSTRAINT pk_issue_sharer PRIMARY KEY (id),  CONSTRAINT fk_issue_sharer_user FOREIGN KEY (user_id) REFERENCES n4user (id) on DELETE CASCADE,  CONSTRAINT fk_issue_sharer_issue FOREIGN KEY (issue_id) REFERENCES issue (id) on DELETE CASCADE)row_format=compressed, key_block_size=8;CREATE index ix_issue_sharer_login_id ON issue_sharer (login_id);CREATE index ix_issue_sharer_user_id ON issue_sharer (user_id);CREATE index ix_issue_sharer_issue_id ON issue_sharer (issue_id);','DROP TABLE issue_sharer;','applied',NULL),
(20,'de23c541c7c36103f3df3bc027234951','2026-08-23 12:00:00','# --- !UpsALTER TABLE attachment DROP CONSTRAINT IF EXISTS ck_attachment_container_type;ALTER TABLE comment_thread DROP CONSTRAINT IF EXISTS ck_comment_thread_state;ALTER TABLE comment_thread DROP CONSTRAINT IF EXISTS ck_comment_thread_start_side;ALTER TABLE comment_thread DROP CONSTRAINT IF EXISTS ck_comment_thread_end_side;ALTER TABLE commit_comment DROP CONSTRAINT IF EXISTS ck_commit_comment_side;ALTER TABLE issue DROP CONSTRAINT IF EXISTS ck_issue_state;ALTER TABLE issue_event DROP CONSTRAINT IF EXISTS ck_issue_event_event_type;ALTER TABLE mention DROP CONSTRAINT IF EXISTS ck_mention_resource_type;ALTER TABLE milestone DROP CONSTRAINT IF EXISTS ck_milestone_state;ALTER TABLE notification_event DROP CONSTRAINT IF EXISTS ck_notification_event_resource_type;ALTER TABLE notification_event DROP CONSTRAINT IF EXISTS ck_notification_event_event_type;ALTER TABLE original_email DROP CONSTRAINT IF EXISTS ck_original_email_resource_type;ALTER TABLE project DROP CONSTRAINT IF EXISTS ck_project_project_scope;ALTER TABLE property DROP CONSTRAINT IF EXISTS ck_property_name;ALTER TABLE pull_request DROP CONSTRAINT IF EXISTS ck_pull_request_state;ALTER TABLE pull_request_commit DROP CONSTRAINT IF EXISTS ck_pull_request_commit_state;ALTER TABLE pull_request_event DROP CONSTRAINT IF EXISTS ck_pull_request_event_event_type;ALTER TABLE unwatch DROP CONSTRAINT IF EXISTS ck_unwatch_resource_type;ALTER TABLE n4user DROP CONSTRAINT IF EXISTS ck_n4user_state;ALTER TABLE user_project_notification DROP CONSTRAINT IF EXISTS ck_user_project_notification_notification_type;ALTER TABLE watch DROP CONSTRAINT IF EXISTS ck_watch_resource_type;',NULL,'applied',NULL),
(21,'28fccbc37e0bc68038d0c1a961b4756e','2026-08-23 12:00:00','# --- !UpsCREATE TABLE title_head (  id                         BIGINT AUTO_INCREMENT NOT NULL,  project_id                 BIGINT,  head_keyword               VARCHAR(255),  frequency                  INTEGER,  CONSTRAINT pk_title_head PRIMARY KEY (id),  CONSTRAINT fk_title_head_project FOREIGN KEY (project_id) REFERENCES project (id) on DELETE CASCADE)row_format=compressed, key_block_size=8;CREATE index ix_title_head_project_id ON title_head (project_id);CREATE index ix_title_head_head_keyword ON title_head (head_keyword);','DROP TABLE title_head;','applied',NULL),
(22,'1857ea9cb015dbb31e0b38a7018a3d04','2026-08-23 12:00:00','# --- !UpsALTER TABLE issue_comment ADD COLUMN parent_comment_id bigint;alter table issue_comment add constraint fk_issue_comment_parent_id_01 foreign key (parent_comment_id) references issue_comment (id) on delete set null;CREATE INDEX ix_issue_parent_id ON issue_comment (parent_comment_id);ALTER TABLE posting_comment ADD COLUMN parent_comment_id bigint;alter table posting_comment add constraint fk_posting_comment_parent_id_01 foreign key (parent_comment_id) references posting_comment (id) on delete set null;CREATE INDEX ix_posting_parent_id ON posting_comment (parent_comment_id);','ALTER TABLE issue_comment DROP FOREIGN KEY fk_issue_comment_parent_id_01;ALTER TABLE issue_comment DROP COLUMN parent_comment_id;ALTER TABLE posting_comment DROP FOREIGN KEY fk_posting_comment_parent_id_01;ALTER TABLE posting_comment DROP COLUMN parent_comment_id;','applied',NULL),
(23,'d1c98143fe22cba4b058241bdd1aa981','2026-08-23 12:00:00','# --- !UpsCREATE TABLE favorite_issue (  id                        BIGINT AUTO_INCREMENT NOT NULL,  user_id                   BIGINT,  issue_id                BIGINT,  CONSTRAINT pk_favorite_issue PRIMARY KEY (id),  CONSTRAINT uq_favorite_issue_user_id_issue_id_1 UNIQUE (user_id, issue_id),  CONSTRAINT fk_favorite_issue_user FOREIGN KEY (user_id) REFERENCES n4user (id) on DELETE CASCADE,  CONSTRAINT fk_favorite_issue_issue FOREIGN KEY (issue_id) REFERENCES issue (id) on DELETE CASCADE  )  row_format=compressed, key_block_size=8;CREATE index ix_favorite_issue_user_1 ON favorite_issue (user_id);CREATE index ix_favorite_issue_project_2 ON favorite_issue (issue_id);','DROP TABLE favorite_issue;','applied',NULL),
(24,'98af44bc1b7187d9c17cc75ce9fefb61','2026-08-23 12:00:00','# --- !UpsALTER TABLE webhook ADD COLUMN webhook_type tinyint(1) default 1;CREATE INDEX ix_webhook_webhook_type ON webhook (webhook_type);','ALTER TABLE webhook DROP COLUMN webhook_type;','applied',NULL),
(25,'2c2c00063cf300eb25d5ecafc7856b57','2026-08-23 12:00:00','# --- !UpsALTER TABLE issue DROP FOREIGN KEY fk_issue_assignee_9;ALTER TABLE issue ADD CONSTRAINT fk_issue_assignee_9 FOREIGN KEY (assignee_id) REFERENCES assignee (id) ON DELETE SET NULL ON UPDATE CASCADE;ALTER TABLE issue DROP FOREIGN KEY fk_issue_project_7;ALTER TABLE issue ADD CONSTRAINT fk_issue_project_7 FOREIGN KEY (project_id) REFERENCES project (id) ON DELETE CASCADE ON UPDATE CASCADE;',NULL,'applied',NULL),
(26,'e0592af48efec5a9cd0ab0ee03138030','2026-08-23 12:00:00','# --- !UpsALTER TABLE issue ADD COLUMN weight tinyint(2) default 0;CREATE INDEX ix_issue_weight ON issue (weight);','ALTER TABLE issue DROP COLUMN weight;','applied',NULL),
(27,'557d9f030b91c9837fe415b933c4510e','2026-08-23 12:00:00','# --- !UpsCREATE TABLE webhook_thread (  id                        BIGINT AUTO_INCREMENT NOT NULL,  webhook_id                BIGINT,  resource_type             VARCHAR(20),  resource_id               VARCHAR(255),  thread_id                 VARCHAR(2000),  created_at                DATETIME,  CONSTRAINT pk_webhook_thread PRIMARY KEY (id),  CONSTRAINT fk_webhook_thread_webhook FOREIGN KEY (webhook_id) REFERENCES webhook (id) ON DELETE CASCADE  )  row_format=compressed, key_block_size=8;CREATE index ix_webhook_thread_webhook_1 ON webhook_thread (webhook_id);CREATE index ix_webhook_thread_resource_2 ON webhook_thread (resource_type, resource_id);','DROP TABLE webhook_thread;','applied',NULL),
(28,'c99495884fbfef834e7a4ddcda45ac86','2026-08-23 12:00:00','# --- !UpsUPDATE webhook SET webhook_type = 3 WHERE git_push_only = 1;ALTER TABLE webhook CHANGE git_push_only git_push tinyint(1);','ALTER TABLE webhook CHANGE git_push git_push_only tinyint(1);UPDATE webhook SET git_push_only = 1 WHERE webhook_type = 3;UPDATE webhook SET webhook_type = 0 WHERE webhook_type = 3;','applied',NULL),
(29,'297877ccc5ef71a7197e85f2af2b492e','2026-08-23 12:00:00','# --- !UpsALTER TABLE issue ADD COLUMN updated_by_author_id bigint;','ALTER TABLE issue DROP COLUMN updated_by_author_id;','applied',NULL),
(30,'029b3606b8fcd6d5a0812800e8167381','2026-08-23 12:00:00','# --- !UpsALTER TABLE posting ADD COLUMN updated_by_author_id bigint;','ALTER TABLE posting DROP COLUMN updated_by_author_id;','applied',NULL),
(31,'b8b00f53ffee6fc419692b1396286055','2026-08-23 12:00:00','# --- !UpsCREATE TABLE recent_issue (    id           BIGINT AUTO_INCREMENT NOT NULL,    user_id      BIGINT,    issue_id     BIGINT,    posting_id   BIGINT,    title        VARCHAR(255),    url          VARCHAR(255),    created_date datetime,    CONSTRAINT pk_recent_issue PRIMARY KEY (id),    CONSTRAINT uq_recent_issue_user_id_issue_id_1 UNIQUE (user_id, issue_id),    CONSTRAINT uq_recent_issue_user_id_posting_id_1 UNIQUE (user_id, posting_id),    CONSTRAINT fk_recent_issue_user FOREIGN KEY (user_id) REFERENCES n4user (id) on DELETE CASCADE,    CONSTRAINT fk_recent_issue_issue FOREIGN KEY (issue_id) REFERENCES issue (id) on DELETE CASCADE);CREATE index ix_recent_issue_user_1 ON recent_issue (user_id);CREATE index ix_recent_issue_issue_2 ON recent_issue (user_id, issue_id);CREATE index ix_recent_issue_posting_3 ON recent_issue (user_id, posting_id);','DROP TABLE recent_issue;','applied',NULL),
(32,'921194395b62648cbaf34fed62470b97','2026-08-23 12:00:00','# --- !UpsALTER TABLE issue ADD COLUMN is_draft tinyint(1) default 0;CREATE index ix_issue_is_draft_1 ON issue (weight, is_draft, number, created_date);CREATE index ix_issue_is_draft_2 ON issue (is_draft, author_login_id, project_id);','drop index ix_issue_is_draft_1 on issue;drop index ix_issue_is_draft_2 on issue;ALTER TABLE issue DROP COLUMN is_draft;','applied',NULL);
/*!40000 ALTER TABLE `play_evolutions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `posting`
--

DROP TABLE IF EXISTS `posting`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `posting` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) DEFAULT NULL,
  `body` longtext DEFAULT NULL,
  `created_date` datetime DEFAULT NULL,
  `updated_date` datetime DEFAULT NULL,
  `author_id` bigint(20) DEFAULT NULL,
  `author_login_id` varchar(255) DEFAULT NULL,
  `author_name` varchar(255) DEFAULT NULL,
  `project_id` bigint(20) DEFAULT NULL,
  `number` bigint(20) DEFAULT NULL,
  `num_of_comments` int(11) DEFAULT NULL,
  `notice` tinyint(1) DEFAULT 0,
  `readme` tinyint(1) DEFAULT 0,
  `history` longtext DEFAULT NULL,
  `parent_id` bigint(20) DEFAULT NULL,
  `updated_by_author_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_posting_1` (`project_id`,`number`),
  KEY `ix_posting_project_21` (`project_id`),
  KEY `ix_posting_parent_id` (`parent_id`),
  CONSTRAINT `fk_posting_parent_id_01` FOREIGN KEY (`parent_id`) REFERENCES `posting` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_posting_project_21` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4002 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `posting`
--

LOCK TABLES `posting` WRITE;
/*!40000 ALTER TABLE `posting` DISABLE KEYS */;
INSERT INTO `posting` VALUES
(4001,'Welcome to sample-app','This board hosts project announcements.','2026-01-05 12:00:00','2026-01-05 12:00:00',2,'kris','Kris Krisson',101,1,1,1,0,NULL,NULL,NULL);
/*!40000 ALTER TABLE `posting` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `posting_comment`
--

DROP TABLE IF EXISTS `posting_comment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `posting_comment` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `contents` longtext DEFAULT NULL,
  `created_date` datetime DEFAULT NULL,
  `author_id` bigint(20) DEFAULT NULL,
  `author_login_id` varchar(255) DEFAULT NULL,
  `author_name` varchar(255) DEFAULT NULL,
  `posting_id` bigint(20) DEFAULT NULL,
  `project_id` bigint(20) NOT NULL,
  `parent_comment_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_posting_comment_posting_22` (`posting_id`),
  KEY `ix_posting_comment_project_id` (`project_id`),
  KEY `ix_posting_comment_author_id` (`author_id`),
  KEY `ix_posting_parent_id` (`parent_comment_id`),
  CONSTRAINT `fk_posting_comment_parent_id_01` FOREIGN KEY (`parent_comment_id`) REFERENCES `posting_comment` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_posting_comment_posting_22` FOREIGN KEY (`posting_id`) REFERENCES `posting` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5002 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `posting_comment`
--

LOCK TABLES `posting_comment` WRITE;
/*!40000 ALTER TABLE `posting_comment` DISABLE KEYS */;
INSERT INTO `posting_comment` VALUES
(5001,'Happy to be here!','2026-01-05 13:00:00',3,'laura','Laura Lawson',4001,101,NULL);
/*!40000 ALTER TABLE `posting_comment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `posting_issue_label`
--

DROP TABLE IF EXISTS `posting_issue_label`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `posting_issue_label` (
  `posting_id` bigint(20) NOT NULL,
  `issue_label_id` bigint(20) NOT NULL,
  PRIMARY KEY (`posting_id`,`issue_label_id`),
  KEY `fk_posting_issue_label_issue_label_02` (`issue_label_id`),
  CONSTRAINT `fk_posting_issue_label_issue_label_02` FOREIGN KEY (`issue_label_id`) REFERENCES `issue_label` (`id`),
  CONSTRAINT `fk_posting_issue_label_posting_01` FOREIGN KEY (`posting_id`) REFERENCES `posting` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `posting_issue_label`
--

LOCK TABLES `posting_issue_label` WRITE;
/*!40000 ALTER TABLE `posting_issue_label` DISABLE KEYS */;
/*!40000 ALTER TABLE `posting_issue_label` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project`
--

DROP TABLE IF EXISTS `project`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `project` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `overview` varchar(255) DEFAULT NULL,
  `vcs` varchar(255) DEFAULT NULL,
  `siteurl` varchar(255) DEFAULT NULL,
  `owner` varchar(255) DEFAULT NULL,
  `created_date` datetime DEFAULT NULL,
  `last_issue_number` bigint(20) DEFAULT NULL,
  `last_posting_number` bigint(20) DEFAULT NULL,
  `original_project_id` bigint(20) DEFAULT NULL,
  `last_pushed_date` datetime DEFAULT NULL,
  `default_reviewer_count` int(11) DEFAULT NULL,
  `is_using_reviewer_count` tinyint(1) DEFAULT 0,
  `organization_id` bigint(20) DEFAULT NULL,
  `project_scope` varchar(9) DEFAULT NULL,
  `previous_owner_login_id` varchar(255) DEFAULT NULL,
  `previous_name` varchar(255) DEFAULT NULL,
  `previous_name_changed_time` bigint(20) DEFAULT NULL,
  `is_code_accessible_member_only` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `ix_project_originalProject_23` (`original_project_id`),
  KEY `ix_project_organization_24` (`organization_id`),
  CONSTRAINT `fk_project_organization_24` FOREIGN KEY (`organization_id`) REFERENCES `organization` (`id`),
  CONSTRAINT `fk_project_originalProject_23` FOREIGN KEY (`original_project_id`) REFERENCES `project` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=104 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project`
--

LOCK TABLES `project` WRITE;
/*!40000 ALTER TABLE `project` DISABLE KEYS */;
INSERT INTO `project` VALUES
(101,'sample-app','Public Git sample project','GIT','http://localhost:9000/kris/sample-app','kris','2026-01-05 10:00:00',3,1,NULL,NULL,NULL,0,NULL,'PUBLIC',NULL,NULL,NULL,0),
(102,'private-tools','Private Git tools project','GIT','http://localhost:9000/kris/private-tools','kris','2026-01-05 10:10:00',0,0,NULL,NULL,NULL,0,NULL,'PRIVATE',NULL,NULL,NULL,0),
(103,'orbital-svn','Org SVN project','Subversion','http://localhost:9000/orbit/orbital-svn','orbit','2026-01-05 11:00:00',1,0,NULL,NULL,NULL,0,1,'PUBLIC',NULL,NULL,NULL,0);
/*!40000 ALTER TABLE `project` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project_label`
--

DROP TABLE IF EXISTS `project_label`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_label` (
  `project_id` bigint(20) NOT NULL,
  `label_id` bigint(20) NOT NULL,
  PRIMARY KEY (`project_id`,`label_id`),
  KEY `fk_project_label_label_02` (`label_id`),
  CONSTRAINT `fk_project_label_label_02` FOREIGN KEY (`label_id`) REFERENCES `label` (`id`),
  CONSTRAINT `fk_project_label_project_01` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_label`
--

LOCK TABLES `project_label` WRITE;
/*!40000 ALTER TABLE `project_label` DISABLE KEYS */;
/*!40000 ALTER TABLE `project_label` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project_menu_setting`
--

DROP TABLE IF EXISTS `project_menu_setting`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_menu_setting` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `project_id` bigint(20) DEFAULT NULL,
  `code` tinyint(1) DEFAULT 0,
  `issue` tinyint(1) DEFAULT 0,
  `pull_request` tinyint(1) DEFAULT 0,
  `review` tinyint(1) DEFAULT 0,
  `milestone` tinyint(1) DEFAULT 0,
  `board` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `ix_project_menu_setting_project_25` (`project_id`),
  CONSTRAINT `fk_project_menu_setting_project_25` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_menu_setting`
--

LOCK TABLES `project_menu_setting` WRITE;
/*!40000 ALTER TABLE `project_menu_setting` DISABLE KEYS */;
/*!40000 ALTER TABLE `project_menu_setting` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project_pushed_branch`
--

DROP TABLE IF EXISTS `project_pushed_branch`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_pushed_branch` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `pushed_date` datetime DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `project_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_project_pushed_branch_project_39` (`project_id`),
  CONSTRAINT `fk_project_pushed_branch_project_39` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_pushed_branch`
--

LOCK TABLES `project_pushed_branch` WRITE;
/*!40000 ALTER TABLE `project_pushed_branch` DISABLE KEYS */;
/*!40000 ALTER TABLE `project_pushed_branch` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project_transfer`
--

DROP TABLE IF EXISTS `project_transfer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_transfer` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `sender_id` bigint(20) DEFAULT NULL,
  `destination` varchar(255) DEFAULT NULL,
  `project_id` bigint(20) DEFAULT NULL,
  `requested` datetime DEFAULT NULL,
  `confirm_key` varchar(255) DEFAULT NULL,
  `accepted` tinyint(1) DEFAULT 0,
  `new_project_name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_project_transfer_sender_26` (`sender_id`),
  KEY `ix_project_transfer_project_27` (`project_id`),
  CONSTRAINT `fk_project_transfer_project_27` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`),
  CONSTRAINT `fk_project_transfer_sender_26` FOREIGN KEY (`sender_id`) REFERENCES `n4user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_transfer`
--

LOCK TABLES `project_transfer` WRITE;
/*!40000 ALTER TABLE `project_transfer` DISABLE KEYS */;
/*!40000 ALTER TABLE `project_transfer` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project_user`
--

DROP TABLE IF EXISTS `project_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_user` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) DEFAULT NULL,
  `project_id` bigint(20) DEFAULT NULL,
  `role_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_project_user_user_28` (`user_id`),
  KEY `ix_project_user_project_29` (`project_id`),
  KEY `ix_project_user_role_30` (`role_id`),
  CONSTRAINT `fk_project_user_project_29` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`),
  CONSTRAINT `fk_project_user_role_30` FOREIGN KEY (`role_id`) REFERENCES `role` (`id`),
  CONSTRAINT `fk_project_user_user_28` FOREIGN KEY (`user_id`) REFERENCES `n4user` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_user`
--

LOCK TABLES `project_user` WRITE;
/*!40000 ALTER TABLE `project_user` DISABLE KEYS */;
INSERT INTO `project_user` VALUES
(1,2,101,1),
(2,3,101,2),
(3,2,102,1),
(4,2,103,1),
(5,4,103,2);
/*!40000 ALTER TABLE `project_user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project_visitation`
--

DROP TABLE IF EXISTS `project_visitation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_visitation` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `project_id` bigint(20) DEFAULT NULL,
  `recently_visited_projects_id` bigint(20) DEFAULT NULL,
  `visited` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_project_visitation_1` (`project_id`,`recently_visited_projects_id`),
  KEY `ix_project_visitation_project_31` (`project_id`),
  KEY `ix_project_visitation_recentlyVisitedProjects_32` (`recently_visited_projects_id`),
  CONSTRAINT `fk_project_visitation_project_31` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_project_visitation_recentlyVisitedProjects_32` FOREIGN KEY (`recently_visited_projects_id`) REFERENCES `recently_visited_projects` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_visitation`
--

LOCK TABLES `project_visitation` WRITE;
/*!40000 ALTER TABLE `project_visitation` DISABLE KEYS */;
/*!40000 ALTER TABLE `project_visitation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `property`
--

DROP TABLE IF EXISTS `property`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `property` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(25) DEFAULT NULL,
  `value` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `property`
--

LOCK TABLES `property` WRITE;
/*!40000 ALTER TABLE `property` DISABLE KEYS */;
INSERT INTO `property` VALUES
(1,'signup.require.confirm','false'),
(2,'use.email.auth.module','false');
/*!40000 ALTER TABLE `property` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pull_request`
--

DROP TABLE IF EXISTS `pull_request`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pull_request` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) DEFAULT NULL,
  `body` longtext DEFAULT NULL,
  `to_project_id` bigint(20) DEFAULT NULL,
  `from_project_id` bigint(20) DEFAULT NULL,
  `to_branch` varchar(255) DEFAULT NULL,
  `from_branch` varchar(255) DEFAULT NULL,
  `contributor_id` bigint(20) DEFAULT NULL,
  `receiver_id` bigint(20) DEFAULT NULL,
  `created` datetime DEFAULT NULL,
  `updated` datetime DEFAULT NULL,
  `received` datetime DEFAULT NULL,
  `state` int(11) DEFAULT NULL,
  `is_conflict` tinyint(1) DEFAULT 0,
  `is_merging` tinyint(1) DEFAULT 0,
  `last_commit_id` varchar(255) DEFAULT NULL,
  `merged_commit_id_from` varchar(255) DEFAULT NULL,
  `merged_commit_id_to` varchar(255) DEFAULT NULL,
  `number` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_pull_request_toProject_33` (`to_project_id`),
  KEY `ix_pull_request_fromProject_34` (`from_project_id`),
  KEY `ix_pull_request_contributor_35` (`contributor_id`),
  KEY `ix_pull_request_receiver_36` (`receiver_id`),
  KEY `ix_pull_request_number` (`number`),
  CONSTRAINT `fk_pull_request_contributor_35` FOREIGN KEY (`contributor_id`) REFERENCES `n4user` (`id`),
  CONSTRAINT `fk_pull_request_fromProject_34` FOREIGN KEY (`from_project_id`) REFERENCES `project` (`id`),
  CONSTRAINT `fk_pull_request_receiver_36` FOREIGN KEY (`receiver_id`) REFERENCES `n4user` (`id`),
  CONSTRAINT `fk_pull_request_toProject_33` FOREIGN KEY (`to_project_id`) REFERENCES `project` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pull_request`
--

LOCK TABLES `pull_request` WRITE;
/*!40000 ALTER TABLE `pull_request` DISABLE KEYS */;
INSERT INTO `pull_request` VALUES
(1,'Add login module','Introduces src/login.js.',101,101,'master','feature/login',2,2,'2026-01-07 10:00:00','2026-01-07 10:00:00',NULL,1,0,0,NULL,NULL,NULL,1);
/*!40000 ALTER TABLE `pull_request` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pull_request_commit`
--

DROP TABLE IF EXISTS `pull_request_commit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pull_request_commit` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `pull_request_id` bigint(20) DEFAULT NULL,
  `commit_id` varchar(255) DEFAULT NULL,
  `author_date` datetime DEFAULT NULL,
  `created` datetime DEFAULT NULL,
  `commit_message` longtext DEFAULT NULL,
  `commit_short_id` varchar(255) DEFAULT NULL,
  `author_email` varchar(255) DEFAULT NULL,
  `state` varchar(7) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_pull_request_commit_pullRequest_37` (`pull_request_id`),
  CONSTRAINT `fk_pull_request_commit_pullRequest_37` FOREIGN KEY (`pull_request_id`) REFERENCES `pull_request` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pull_request_commit`
--

LOCK TABLES `pull_request_commit` WRITE;
/*!40000 ALTER TABLE `pull_request_commit` DISABLE KEYS */;
/*!40000 ALTER TABLE `pull_request_commit` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pull_request_event`
--

DROP TABLE IF EXISTS `pull_request_event`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pull_request_event` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `sender_login_id` varchar(255) DEFAULT NULL,
  `pull_request_id` bigint(20) DEFAULT NULL,
  `event_type` varchar(34) DEFAULT NULL,
  `created` datetime DEFAULT NULL,
  `old_value` longtext DEFAULT NULL,
  `new_value` longtext DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_pull_request_event_pullRequest_38` (`pull_request_id`),
  CONSTRAINT `fk_pull_request_event_pullRequest_38` FOREIGN KEY (`pull_request_id`) REFERENCES `pull_request` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pull_request_event`
--

LOCK TABLES `pull_request_event` WRITE;
/*!40000 ALTER TABLE `pull_request_event` DISABLE KEYS */;
/*!40000 ALTER TABLE `pull_request_event` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pull_request_reviewers`
--

DROP TABLE IF EXISTS `pull_request_reviewers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pull_request_reviewers` (
  `pull_request_id` bigint(20) NOT NULL,
  `user_id` bigint(20) NOT NULL,
  PRIMARY KEY (`pull_request_id`,`user_id`),
  KEY `fk_pull_request_reviewers_n4user_02` (`user_id`),
  CONSTRAINT `fk_pull_request_reviewers_n4user_02` FOREIGN KEY (`user_id`) REFERENCES `n4user` (`id`),
  CONSTRAINT `fk_pull_request_reviewers_pull_request_01` FOREIGN KEY (`pull_request_id`) REFERENCES `pull_request` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pull_request_reviewers`
--

LOCK TABLES `pull_request_reviewers` WRITE;
/*!40000 ALTER TABLE `pull_request_reviewers` DISABLE KEYS */;
/*!40000 ALTER TABLE `pull_request_reviewers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recent_issue`
--

DROP TABLE IF EXISTS `recent_issue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `recent_issue` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) DEFAULT NULL,
  `issue_id` bigint(20) DEFAULT NULL,
  `posting_id` bigint(20) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `url` varchar(255) DEFAULT NULL,
  `created_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_recent_issue_user_id_issue_id_1` (`user_id`,`issue_id`),
  UNIQUE KEY `uq_recent_issue_user_id_posting_id_1` (`user_id`,`posting_id`),
  KEY `fk_recent_issue_issue` (`issue_id`),
  KEY `ix_recent_issue_user_1` (`user_id`),
  KEY `ix_recent_issue_issue_2` (`user_id`,`issue_id`),
  KEY `ix_recent_issue_posting_3` (`user_id`,`posting_id`),
  CONSTRAINT `fk_recent_issue_issue` FOREIGN KEY (`issue_id`) REFERENCES `issue` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_recent_issue_user` FOREIGN KEY (`user_id`) REFERENCES `n4user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recent_issue`
--

LOCK TABLES `recent_issue` WRITE;
/*!40000 ALTER TABLE `recent_issue` DISABLE KEYS */;
/*!40000 ALTER TABLE `recent_issue` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recent_project`
--

DROP TABLE IF EXISTS `recent_project`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `recent_project` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) DEFAULT NULL,
  `owner` varchar(255) DEFAULT NULL,
  `project_id` bigint(20) DEFAULT NULL,
  `project_name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_recent_project_1` (`user_id`,`project_id`),
  KEY `fk_recent_project_project_2` (`project_id`),
  CONSTRAINT `fk_recent_project_project_2` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recent_project`
--

LOCK TABLES `recent_project` WRITE;
/*!40000 ALTER TABLE `recent_project` DISABLE KEYS */;
/*!40000 ALTER TABLE `recent_project` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recently_visited_projects`
--

DROP TABLE IF EXISTS `recently_visited_projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `recently_visited_projects` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_recently_visited_projects_user_40` (`user_id`),
  CONSTRAINT `fk_recently_visited_projects_user_40` FOREIGN KEY (`user_id`) REFERENCES `n4user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recently_visited_projects`
--

LOCK TABLES `recently_visited_projects` WRITE;
/*!40000 ALTER TABLE `recently_visited_projects` DISABLE KEYS */;
/*!40000 ALTER TABLE `recently_visited_projects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `review_comment`
--

DROP TABLE IF EXISTS `review_comment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `review_comment` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `contents` longtext DEFAULT NULL,
  `created_date` datetime DEFAULT NULL,
  `author_id` bigint(20) DEFAULT NULL,
  `author_login_id` varchar(255) DEFAULT NULL,
  `author_name` varchar(255) DEFAULT NULL,
  `thread_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_review_comment_thread_41` (`thread_id`),
  CONSTRAINT `fk_review_comment_thread_41` FOREIGN KEY (`thread_id`) REFERENCES `comment_thread` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `review_comment`
--

LOCK TABLES `review_comment` WRITE;
/*!40000 ALTER TABLE `review_comment` DISABLE KEYS */;
/*!40000 ALTER TABLE `review_comment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role`
--

DROP TABLE IF EXISTS `role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `role` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `active` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role`
--

LOCK TABLES `role` WRITE;
/*!40000 ALTER TABLE `role` DISABLE KEYS */;
INSERT INTO `role` VALUES
(1,'manager',1),
(2,'member',1),
(3,'sitemanager',1),
(4,'anonymous',1),
(5,'guest',1),
(6,'org_admin',1),
(7,'org_member',1);
/*!40000 ALTER TABLE `role` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `site_admin`
--

DROP TABLE IF EXISTS `site_admin`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `site_admin` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `admin_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_site_admin_admin_42` (`admin_id`),
  CONSTRAINT `fk_site_admin_admin_42` FOREIGN KEY (`admin_id`) REFERENCES `n4user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `site_admin`
--

LOCK TABLES `site_admin` WRITE;
/*!40000 ALTER TABLE `site_admin` DISABLE KEYS */;
/*!40000 ALTER TABLE `site_admin` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `title_head`
--

DROP TABLE IF EXISTS `title_head`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `title_head` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `project_id` bigint(20) DEFAULT NULL,
  `head_keyword` varchar(255) DEFAULT NULL,
  `frequency` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_title_head_project_id` (`project_id`),
  KEY `ix_title_head_head_keyword` (`head_keyword`),
  CONSTRAINT `fk_title_head_project` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `title_head`
--

LOCK TABLES `title_head` WRITE;
/*!40000 ALTER TABLE `title_head` DISABLE KEYS */;
/*!40000 ALTER TABLE `title_head` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `unwatch`
--

DROP TABLE IF EXISTS `unwatch`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `unwatch` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) DEFAULT NULL,
  `resource_type` varchar(20) DEFAULT NULL,
  `resource_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_unwatch_user_43` (`user_id`),
  KEY `ix_unwatch_resource_id_resource_type` (`resource_id`,`resource_type`),
  CONSTRAINT `fk_unwatch_user_43` FOREIGN KEY (`user_id`) REFERENCES `n4user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `unwatch`
--

LOCK TABLES `unwatch` WRITE;
/*!40000 ALTER TABLE `unwatch` DISABLE KEYS */;
/*!40000 ALTER TABLE `unwatch` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_credential`
--

DROP TABLE IF EXISTS `user_credential`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_credential` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) DEFAULT NULL,
  `login_id` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `active` tinyint(1) DEFAULT 0,
  `email_validated` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `ix_user_credential_user_id_1` (`user_id`),
  CONSTRAINT `fk_user_credential_user` FOREIGN KEY (`user_id`) REFERENCES `n4user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_credential`
--

LOCK TABLES `user_credential` WRITE;
/*!40000 ALTER TABLE `user_credential` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_credential` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_enrolled_organization`
--

DROP TABLE IF EXISTS `user_enrolled_organization`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_enrolled_organization` (
  `user_id` bigint(20) NOT NULL,
  `organization_id` bigint(20) NOT NULL,
  PRIMARY KEY (`user_id`,`organization_id`),
  KEY `fk_user_enrolled_organization_organization_02` (`organization_id`),
  CONSTRAINT `fk_user_enrolled_organization_n4user_01` FOREIGN KEY (`user_id`) REFERENCES `n4user` (`id`),
  CONSTRAINT `fk_user_enrolled_organization_organization_02` FOREIGN KEY (`organization_id`) REFERENCES `organization` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_enrolled_organization`
--

LOCK TABLES `user_enrolled_organization` WRITE;
/*!40000 ALTER TABLE `user_enrolled_organization` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_enrolled_organization` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_enrolled_project`
--

DROP TABLE IF EXISTS `user_enrolled_project`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_enrolled_project` (
  `user_id` bigint(20) NOT NULL,
  `project_id` bigint(20) NOT NULL,
  PRIMARY KEY (`user_id`,`project_id`),
  KEY `fk_user_enrolled_project_project_02` (`project_id`),
  CONSTRAINT `fk_user_enrolled_project_n4user_01` FOREIGN KEY (`user_id`) REFERENCES `n4user` (`id`),
  CONSTRAINT `fk_user_enrolled_project_project_02` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_enrolled_project`
--

LOCK TABLES `user_enrolled_project` WRITE;
/*!40000 ALTER TABLE `user_enrolled_project` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_enrolled_project` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_project_notification`
--

DROP TABLE IF EXISTS `user_project_notification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_project_notification` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) DEFAULT NULL,
  `project_id` bigint(20) DEFAULT NULL,
  `notification_type` varchar(34) DEFAULT NULL,
  `allowed` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_project_notification_1` (`project_id`,`user_id`,`notification_type`),
  KEY `ix_user_project_notification_user_44` (`user_id`),
  KEY `ix_user_project_notification_project_45` (`project_id`),
  CONSTRAINT `fk_user_project_notification_project_45` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`),
  CONSTRAINT `fk_user_project_notification_user_44` FOREIGN KEY (`user_id`) REFERENCES `n4user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_project_notification`
--

LOCK TABLES `user_project_notification` WRITE;
/*!40000 ALTER TABLE `user_project_notification` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_project_notification` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_setting`
--

DROP TABLE IF EXISTS `user_setting`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_setting` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) DEFAULT NULL,
  `login_default_page` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_user_setting_user_1` (`user_id`),
  CONSTRAINT `fk_user_setting_user` FOREIGN KEY (`user_id`) REFERENCES `n4user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_setting`
--

LOCK TABLES `user_setting` WRITE;
/*!40000 ALTER TABLE `user_setting` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_setting` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_verification`
--

DROP TABLE IF EXISTS `user_verification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_verification` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) DEFAULT NULL,
  `login_id` varchar(255) DEFAULT NULL,
  `verification_code` varchar(255) DEFAULT NULL,
  `timestamp` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_user_verification_user_1` (`user_id`),
  KEY `ix_user_verification_user_2` (`login_id`,`verification_code`),
  CONSTRAINT `fk_user_verification_user` FOREIGN KEY (`user_id`) REFERENCES `n4user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_verification`
--

LOCK TABLES `user_verification` WRITE;
/*!40000 ALTER TABLE `user_verification` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_verification` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `watch`
--

DROP TABLE IF EXISTS `watch`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `watch` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) DEFAULT NULL,
  `resource_type` varchar(20) DEFAULT NULL,
  `resource_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_watch_user_46` (`user_id`),
  KEY `ix_watch_resource_id_resource_type` (`resource_id`,`resource_type`),
  CONSTRAINT `fk_watch_user_46` FOREIGN KEY (`user_id`) REFERENCES `n4user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `watch`
--

LOCK TABLES `watch` WRITE;
/*!40000 ALTER TABLE `watch` DISABLE KEYS */;
/*!40000 ALTER TABLE `watch` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `webhook`
--

DROP TABLE IF EXISTS `webhook`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `webhook` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `project_id` bigint(20) DEFAULT NULL,
  `payload_url` varchar(2000) DEFAULT NULL,
  `secret` varchar(250) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `git_push` tinyint(1) DEFAULT NULL,
  `webhook_type` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `ix_webhook_project_47` (`project_id`),
  KEY `ix_webhook_git_push_only` (`git_push`),
  KEY `ix_webhook_webhook_type` (`webhook_type`),
  CONSTRAINT `fk_webhook_project_47` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `webhook`
--

LOCK TABLES `webhook` WRITE;
/*!40000 ALTER TABLE `webhook` DISABLE KEYS */;
/*!40000 ALTER TABLE `webhook` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `webhook_thread`
--

DROP TABLE IF EXISTS `webhook_thread`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `webhook_thread` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `webhook_id` bigint(20) DEFAULT NULL,
  `resource_type` varchar(20) DEFAULT NULL,
  `resource_id` varchar(255) DEFAULT NULL,
  `thread_id` varchar(2000) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_webhook_thread_webhook_1` (`webhook_id`),
  KEY `ix_webhook_thread_resource_2` (`resource_type`,`resource_id`),
  CONSTRAINT `fk_webhook_thread_webhook` FOREIGN KEY (`webhook_id`) REFERENCES `webhook` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `webhook_thread`
--

LOCK TABLES `webhook_thread` WRITE;
/*!40000 ALTER TABLE `webhook_thread` DISABLE KEYS */;
/*!40000 ALTER TABLE `webhook_thread` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'yona'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-23 14:31:10
