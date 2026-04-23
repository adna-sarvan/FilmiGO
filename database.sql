-- ============================================
-- FilmiGO - Baza Podataka
-- ============================================

CREATE DATABASE IF NOT EXISTS filmigo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE filmigo;

-- Korisnici
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    avatar VARCHAR(255) DEFAULT NULL,
    bio TEXT DEFAULT NULL,
    film_rank VARCHAR(50) DEFAULT 'Novajlija',
    total_watched INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Watchlist (lista za gledanje)
CREATE TABLE IF NOT EXISTS watchlist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    tmdb_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    poster_path VARCHAR(255),
    media_type ENUM('movie', 'tv') DEFAULT 'movie',
    priority ENUM('must_watch', 'when_in_mood', 'someday') DEFAULT 'when_in_mood',
    note TEXT DEFAULT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_watchlist (user_id, tmdb_id, media_type)
);

-- Ocjene i recenzije
CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    tmdb_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    poster_path VARCHAR(255),
    media_type ENUM('movie', 'tv') DEFAULT 'movie',
    rating DECIMAL(2,1) NOT NULL CHECK (rating >= 0.5 AND rating <= 5.0),
    emoji_reaction VARCHAR(10) DEFAULT '🎬',
    review_text TEXT DEFAULT NULL,
    rewatch ENUM('never', 'maybe', 'definitely') DEFAULT 'maybe',
    contains_spoiler TINYINT(1) DEFAULT 0,
    watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_review (user_id, tmdb_id, media_type)
);

-- Prijatelji
CREATE TABLE IF NOT EXISTS friendships (
    id INT AUTO_INCREMENT PRIMARY KEY,
    requester_id INT NOT NULL,
    receiver_id INT NOT NULL,
    status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_friendship (requester_id, receiver_id)
);

-- Favoriti žanrovi (za filmski DNK)
CREATE TABLE IF NOT EXISTS user_genres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    genre_id INT NOT NULL,
    genre_name VARCHAR(100) NOT NULL,
    count INT DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_genre (user_id, genre_id)
);

-- Filmski dvoboji
CREATE TABLE IF NOT EXISTS duels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    creator_id INT NOT NULL,
    tmdb_id_1 INT NOT NULL,
    title_1 VARCHAR(255) NOT NULL,
    poster_1 VARCHAR(255),
    tmdb_id_2 INT NOT NULL,
    title_2 VARCHAR(255) NOT NULL,
    poster_2 VARCHAR(255),
    votes_1 INT DEFAULT 0,
    votes_2 INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Glasovi za dvoboje
CREATE TABLE IF NOT EXISTS duel_votes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    duel_id INT NOT NULL,
    user_id INT NOT NULL,
    voted_for TINYINT NOT NULL COMMENT '1 ili 2',
    voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (duel_id) REFERENCES duels(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_vote (duel_id, user_id)
);
