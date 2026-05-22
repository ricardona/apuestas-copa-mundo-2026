CREATE TABLE IF NOT EXISTS players (
    id         TEXT      PRIMARY KEY,
    username   TEXT      NOT NULL,
    email      TEXT      NOT NULL,
    avatar_url TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
