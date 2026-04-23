import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'strava.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('wal_checkpoint(FULL)');
    initSchema(db);
    registerShutdownHandlers(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tokens (
      athlete_id    INTEGER PRIMARY KEY,
      access_token  TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      expires_at    INTEGER NOT NULL,
      athlete_json  TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS activities (
      id                    INTEGER PRIMARY KEY,
      name                  TEXT NOT NULL,
      distance              REAL NOT NULL,
      moving_time           INTEGER NOT NULL,
      elapsed_time          INTEGER NOT NULL,
      total_elevation_gain  REAL NOT NULL DEFAULT 0,
      type                  TEXT NOT NULL,
      start_date            TEXT NOT NULL,
      start_date_local      TEXT NOT NULL,
      average_speed         REAL NOT NULL DEFAULT 0,
      max_speed             REAL NOT NULL DEFAULT 0,
      average_heartrate     REAL,
      max_heartrate         REAL,
      map_polyline          TEXT,
      splits_metric         TEXT,
      synced_at             INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(start_date_local DESC);
    CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
  `);

  // Migration: add location_names for road-name search
  try {
    db.exec(`ALTER TABLE activities ADD COLUMN location_names TEXT`);
  } catch { /* column already exists */ }
}

function registerShutdownHandlers(database: Database.Database) {
  const shutdown = () => {
    try {
      database.pragma('wal_checkpoint(TRUNCATE)');
      database.close();
    } catch { /* already closed */ }
    process.exit(0);
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
