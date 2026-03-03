-- ============================================
-- DATABASE SETUP UNTUK IKM SURVEY
-- ============================================

-- Buat Database
CREATE DATABASE IF NOT EXISTS ikm_survey;
USE ikm_survey;

-- Buat Tabel Votes
CREATE TABLE IF NOT EXISTS votes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loket_id INT NOT NULL,
    rating DECIMAL(3, 2) NOT NULL,
    answers LONGTEXT NOT NULL COMMENT 'JSON format: {u1: 4, u2: 3, ...}',
    respondent LONGTEXT NOT NULL COMMENT 'JSON format: {gender: "L", education: "S1", age: "28"}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_loket_id (loket_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Buat Tabel Users (untuk admin)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert data dummy (opsional)
-- ALTER TABLE votes AUTO_INCREMENT = 1;

-- Tampilkan struktur tabel
SHOW TABLES;
DESCRIBE votes;
