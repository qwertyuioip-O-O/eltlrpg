CREATE TABLE IF NOT EXISTS players (
 id uuid PRIMARY KEY, token_hash text UNIQUE NOT NULL, nickname text NOT NULL,
 xp integer NOT NULL DEFAULT 0, gold integer NOT NULL DEFAULT 0,
 energy integer NOT NULL DEFAULT 20 CHECK (energy BETWEEN 0 AND 20), energy_at bigint NOT NULL
);
CREATE TABLE IF NOT EXISTS items (
 id uuid PRIMARY KEY, player_id uuid NOT NULL REFERENCES players(id), slot text NOT NULL CHECK(slot IN ('weapon','armor','charm')),
 name text NOT NULL, power integer NOT NULL, upgrade integer NOT NULL DEFAULT 0, equipped boolean NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX IF NOT EXISTS one_equipped_slot ON items(player_id,slot) WHERE equipped;
CREATE TABLE IF NOT EXISTS bosses (
 room text NOT NULL, day text NOT NULL, name text NOT NULL, hp integer NOT NULL CHECK(hp>=0), max_hp integer NOT NULL,
 ended boolean NOT NULL DEFAULT false, PRIMARY KEY(room,day)
);
CREATE TABLE IF NOT EXISTS contributions (
 room text NOT NULL, day text NOT NULL, player_id uuid NOT NULL REFERENCES players(id), damage integer NOT NULL,
 claimed boolean NOT NULL DEFAULT false, PRIMARY KEY(room,day,player_id), FOREIGN KEY(room,day) REFERENCES bosses(room,day)
);
CREATE TABLE IF NOT EXISTS requests (
 player_id uuid NOT NULL REFERENCES players(id), request_id uuid NOT NULL, payload_hash text NOT NULL,
 response jsonb NOT NULL, PRIMARY KEY(player_id,request_id)
);
