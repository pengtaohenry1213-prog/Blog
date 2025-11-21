-- 数据库初始化脚本
-- 此脚本会在 MySQL 容器首次启动时自动执行

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS blog_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE blog_db;

-- 注意：表结构会由 Sequelize 自动创建
-- 这里创建索引以优化查询性能
-- 注意：MySQL 的 CREATE INDEX 不支持 IF NOT EXISTS，需要先检查索引是否存在

-- 为 users 表的 username 字段创建唯一索引（如果不存在）
SET @dbname = DATABASE();
SET @tablename = 'users';
SET @indexname = 'idx_users_username';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE table_schema = @dbname
    AND table_name = @tablename
    AND index_name = @indexname
  ) > 0,
  'SELECT 1',
  CONCAT('CREATE UNIQUE INDEX ', @indexname, ' ON ', @tablename, '(username)')
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为 articles 表的 author_id、category_id、publish_time 字段创建联合索引（如果不存在）
SET @tablename = 'articles';
SET @indexname = 'idx_articles_author_category_time';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE table_schema = @dbname
    AND table_name = @tablename
    AND index_name = @indexname
  ) > 0,
  'SELECT 1',
  CONCAT('CREATE INDEX ', @indexname, ' ON ', @tablename, '(author_id, category_id, publish_time)')
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为 articles 表的 publish_time 创建单独索引（用于排序，如果不存在）
SET @indexname = 'idx_articles_publish_time';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE table_schema = @dbname
    AND table_name = @tablename
    AND index_name = @indexname
  ) > 0,
  'SELECT 1',
  CONCAT('CREATE INDEX ', @indexname, ' ON ', @tablename, '(publish_time DESC)')
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为 articles 表的 category_id 创建索引（用于分类查询，如果不存在）
SET @indexname = 'idx_articles_category_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE table_schema = @dbname
    AND table_name = @tablename
    AND index_name = @indexname
  ) > 0,
  'SELECT 1',
  CONCAT('CREATE INDEX ', @indexname, ' ON ', @tablename, '(category_id)')
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为 articles 表的 author_id 创建索引（用于作者查询，如果不存在）
SET @indexname = 'idx_articles_author_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE table_schema = @dbname
    AND table_name = @tablename
    AND index_name = @indexname
  ) > 0,
  'SELECT 1',
  CONCAT('CREATE INDEX ', @indexname, ' ON ', @tablename, '(author_id)')
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

