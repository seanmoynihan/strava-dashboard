import { sql } from '@vercel/postgres';

export { sql };

export async function ensureSchema(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS tokens (
      athlete_id    BIGINT PRIMARY KEY,
      access_token  TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      expires_at    BIGINT NOT NULL,
      athlete_json  TEXT NOT NULL DEFAULT '{}'
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS activities (
      id                    BIGINT PRIMARY KEY,
      name                  TEXT NOT NULL,
      distance              DOUBLE PRECISION NOT NULL,
      moving_time           INTEGER NOT NULL,
      elapsed_time          INTEGER NOT NULL,
      total_elevation_gain  DOUBLE PRECISION NOT NULL DEFAULT 0,
      type                  TEXT NOT NULL,
      start_date            TEXT NOT NULL,
      start_date_local      TEXT NOT NULL,
      average_speed         DOUBLE PRECISION NOT NULL DEFAULT 0,
      max_speed             DOUBLE PRECISION NOT NULL DEFAULT 0,
      average_heartrate     DOUBLE PRECISION,
      max_heartrate         DOUBLE PRECISION,
      map_polyline          TEXT,
      splits_metric         TEXT,
      location_names        TEXT,
      synced_at             BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(start_date_local DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type)`;

  await sql`
    CREATE TABLE IF NOT EXISTS planned_activities (
      id                SERIAL PRIMARY KEY,
      date              TEXT NOT NULL,
      type              TEXT NOT NULL CHECK(type IN ('run','strength')),
      title             TEXT NOT NULL,
      notes             TEXT,
      distance_km       DOUBLE PRECISION,
      duration_minutes  INTEGER,
      created_at        BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_planned_date ON planned_activities(date)`;

  await sql`
    CREATE TABLE IF NOT EXISTS weight_entries (
      id          SERIAL PRIMARY KEY,
      date        TEXT NOT NULL UNIQUE,
      kg          DOUBLE PRECISION NOT NULL,
      recorded_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_weight_date ON weight_entries(date DESC)`;

  // Seed historical weight entries
  const seeds = [
    { date: '2026-06-01', kg: 94 },
    { date: '2026-05-23', kg: 95 },
    { date: '2026-05-18', kg: 95 },
    { date: '2026-04-09', kg: 95 },
    { date: '2025-01-25', kg: 99 },
  ];
  for (const s of seeds) {
    await sql`INSERT INTO weight_entries (date, kg) VALUES (${s.date}, ${s.kg}) ON CONFLICT (date) DO NOTHING`;
  }
}
