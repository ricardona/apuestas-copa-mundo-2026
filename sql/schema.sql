CREATE TABLE IF NOT EXISTS players (
    id         TEXT      PRIMARY KEY,
    username   TEXT      NOT NULL,
    email      TEXT      NOT NULL,
    avatar_url TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS player_bets (
    player_id  TEXT PRIMARY KEY REFERENCES players(id),
    bets       TEXT NOT NULL DEFAULT '[]',
    plus_bets  TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
