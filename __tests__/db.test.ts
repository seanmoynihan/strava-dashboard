import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';

function createTestDb() {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
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
  `);
  return db;
}

function seedActivity(db: Database.Database, overrides: Partial<Record<string, unknown>> = {}) {
  const defaults = {
    id: 1,
    name: 'Morning Run',
    distance: 5000,
    moving_time: 1800,
    elapsed_time: 1850,
    total_elevation_gain: 50,
    type: 'Run',
    start_date: '2026-04-23T07:00:00Z',
    start_date_local: '2026-04-23T08:00:00',
    average_speed: 2.78,
    max_speed: 3.5,
    average_heartrate: 155,
    max_heartrate: 175,
    map_polyline: null,
    splits_metric: null,
  };
  const row = { ...defaults, ...overrides };
  db.prepare(`
    INSERT INTO activities (id, name, distance, moving_time, elapsed_time, total_elevation_gain, type, start_date, start_date_local, average_speed, max_speed, average_heartrate, max_heartrate, map_polyline, splits_metric)
    VALUES (@id, @name, @distance, @moving_time, @elapsed_time, @total_elevation_gain, @type, @start_date, @start_date_local, @average_speed, @max_speed, @average_heartrate, @max_heartrate, @map_polyline, @splits_metric)
  `).run(row);
  return row;
}

describe('activities table', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  it('inserts and retrieves an activity', () => {
    seedActivity(db);
    const row = db.prepare('SELECT * FROM activities WHERE id = 1').get() as { name: string; distance: number };
    expect(row.name).toBe('Morning Run');
    expect(row.distance).toBe(5000);
  });

  it('upserts on conflict without losing existing data', () => {
    seedActivity(db, { id: 1, name: 'First' });
    db.prepare(`
      INSERT INTO activities (id, name, distance, moving_time, elapsed_time, type, start_date, start_date_local, average_speed, max_speed)
      VALUES (1, 'Updated', 5000, 1800, 1850, 'Run', '2026-04-23T07:00:00Z', '2026-04-23T08:00:00', 2.78, 3.5)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name
    `).run();
    const row = db.prepare('SELECT name FROM activities WHERE id = 1').get() as { name: string };
    expect(row.name).toBe('Updated');
  });

  it('stores and retrieves JSON splits', () => {
    const splits = [{ split: 1, average_speed: 3.0, moving_time: 333, elapsed_time: 340, distance: 1000, elevation_difference: 5 }];
    seedActivity(db, { splits_metric: JSON.stringify(splits) });
    const row = db.prepare('SELECT splits_metric FROM activities WHERE id = 1').get() as { splits_metric: string };
    expect(JSON.parse(row.splits_metric)).toEqual(splits);
  });

  it('orders activities by start_date_local descending', () => {
    seedActivity(db, { id: 1, start_date_local: '2026-04-21T08:00:00' });
    seedActivity(db, { id: 2, start_date_local: '2026-04-23T08:00:00' });
    const rows = db.prepare('SELECT id FROM activities ORDER BY start_date_local DESC').all() as { id: number }[];
    expect(rows[0].id).toBe(2);
    expect(rows[1].id).toBe(1);
  });
});

describe('tokens table', () => {
  let db: Database.Database;

  beforeEach(() => { db = createTestDb(); });

  it('saves and retrieves a token', () => {
    db.prepare(`INSERT INTO tokens (athlete_id, access_token, refresh_token, expires_at, athlete_json)
      VALUES (42, 'acc', 'ref', 9999999, '{"firstname":"Sean"}')`).run();
    const row = db.prepare('SELECT * FROM tokens WHERE athlete_id = 42').get() as { access_token: string; athlete_json: string };
    expect(row.access_token).toBe('acc');
    expect(JSON.parse(row.athlete_json).firstname).toBe('Sean');
  });

  it('upserts token on reconnect', () => {
    db.prepare(`INSERT INTO tokens (athlete_id, access_token, refresh_token, expires_at, athlete_json) VALUES (42, 'old', 'ref', 1000, '{}')`).run();
    db.prepare(`INSERT INTO tokens (athlete_id, access_token, refresh_token, expires_at, athlete_json)
      VALUES (42, 'new', 'ref2', 2000, '{}')
      ON CONFLICT(athlete_id) DO UPDATE SET access_token = excluded.access_token, expires_at = excluded.expires_at`).run();
    const row = db.prepare('SELECT access_token, expires_at FROM tokens WHERE athlete_id = 42').get() as { access_token: string; expires_at: number };
    expect(row.access_token).toBe('new');
    expect(row.expires_at).toBe(2000);
  });
});
