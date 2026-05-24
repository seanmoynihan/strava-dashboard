import { sql } from './db';
import type { Activity, Athlete, TokenRow } from './types';

const CLIENT_ID = process.env.STRAVA_CLIENT_ID!;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET!;
const BASE = 'https://www.strava.com/api/v3';

export function getAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all',
  });
  return `https://www.strava.com/oauth/authorize?${params}`;
}

export async function exchangeCode(code: string): Promise<TokenRow> {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code, grant_type: 'authorization_code' }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  const data = await res.json();
  return {
    athlete_id: data.athlete.id,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    athlete_json: JSON.stringify(data.athlete),
  };
}

async function refreshToken(row: TokenRow): Promise<TokenRow> {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, refresh_token: row.refresh_token, grant_type: 'refresh_token' }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const data = await res.json();
  return { ...row, access_token: data.access_token, refresh_token: data.refresh_token, expires_at: data.expires_at };
}

export async function getStoredToken(): Promise<TokenRow | null> {
  const { rows } = await sql`SELECT * FROM tokens LIMIT 1`;
  return (rows[0] as TokenRow) ?? null;
}

export async function saveToken(token: TokenRow): Promise<void> {
  await sql`
    INSERT INTO tokens (athlete_id, access_token, refresh_token, expires_at, athlete_json)
    VALUES (${token.athlete_id}, ${token.access_token}, ${token.refresh_token}, ${token.expires_at}, ${token.athlete_json})
    ON CONFLICT(athlete_id) DO UPDATE SET
      access_token  = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      expires_at    = EXCLUDED.expires_at,
      athlete_json  = EXCLUDED.athlete_json
  `;
}

export async function getValidToken(): Promise<TokenRow | null> {
  let token = await getStoredToken();
  if (!token) return null;
  if (Date.now() / 1000 > token.expires_at - 300) {
    token = await refreshToken(token);
    await saveToken(token);
  }
  return token;
}

export async function getAthlete(): Promise<Athlete | null> {
  const token = await getStoredToken();
  if (!token) return null;
  return JSON.parse(token.athlete_json) as Athlete;
}

async function stravaFetch(path: string, params?: Record<string, string>): Promise<unknown> {
  const token = await getValidToken();
  if (!token) throw new Error('Not authenticated');
  const url = new URL(`${BASE}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token.access_token}` } });
  if (!res.ok) throw new Error(`Strava API error: ${res.status}`);
  return res.json();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapActivity(a: any): Activity {
  return {
    id: a.id,
    name: a.name,
    distance: a.distance,
    moving_time: a.moving_time,
    elapsed_time: a.elapsed_time,
    total_elevation_gain: a.total_elevation_gain ?? 0,
    type: a.type,
    start_date: a.start_date,
    start_date_local: a.start_date_local,
    average_speed: a.average_speed ?? 0,
    max_speed: a.max_speed ?? 0,
    average_heartrate: a.average_heartrate,
    max_heartrate: a.max_heartrate,
    map_polyline: a.map?.summary_polyline || a.map?.polyline,
    splits_metric: a.splits_metric,
  };
}

export async function fetchAndCacheActivities(page = 1, perPage = 50): Promise<Activity[]> {
  const data = await stravaFetch('/athlete/activities', {
    per_page: String(perPage),
    page: String(page),
    type: 'Run',
  }) as unknown[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activities = (data as any[]).map(mapActivity);
  await Promise.all(activities.map((a) => sql`
    INSERT INTO activities (id, name, distance, moving_time, elapsed_time, total_elevation_gain, type, start_date, start_date_local, average_speed, max_speed, average_heartrate, max_heartrate, map_polyline, splits_metric)
    VALUES (${a.id}, ${a.name}, ${a.distance}, ${a.moving_time}, ${a.elapsed_time}, ${a.total_elevation_gain}, ${a.type}, ${a.start_date}, ${a.start_date_local}, ${a.average_speed}, ${a.max_speed}, ${a.average_heartrate ?? null}, ${a.max_heartrate ?? null}, ${a.map_polyline ?? null}, ${a.splits_metric ? JSON.stringify(a.splits_metric) : null})
    ON CONFLICT(id) DO UPDATE SET
      name = EXCLUDED.name, map_polyline = EXCLUDED.map_polyline,
      splits_metric = EXCLUDED.splits_metric, synced_at = EXTRACT(EPOCH FROM NOW())::BIGINT
  `));
  return activities;
}

export async function fetchAndCacheActivity(id: number): Promise<Activity> {
  const data = await stravaFetch(`/activities/${id}`) as Record<string, unknown>;
  const activity = mapActivity(data);
  await sql`
    INSERT INTO activities (id, name, distance, moving_time, elapsed_time, total_elevation_gain, type, start_date, start_date_local, average_speed, max_speed, average_heartrate, max_heartrate, map_polyline, splits_metric)
    VALUES (${activity.id}, ${activity.name}, ${activity.distance}, ${activity.moving_time}, ${activity.elapsed_time}, ${activity.total_elevation_gain}, ${activity.type}, ${activity.start_date}, ${activity.start_date_local}, ${activity.average_speed}, ${activity.max_speed}, ${activity.average_heartrate ?? null}, ${activity.max_heartrate ?? null}, ${activity.map_polyline ?? null}, ${activity.splits_metric ? JSON.stringify(activity.splits_metric) : null})
    ON CONFLICT(id) DO UPDATE SET
      map_polyline = EXCLUDED.map_polyline, splits_metric = EXCLUDED.splits_metric, synced_at = EXTRACT(EPOCH FROM NOW())::BIGINT
  `;
  return activity;
}

export async function hasActivities(): Promise<boolean> {
  const { rows } = await sql`SELECT COUNT(*) as n FROM activities`;
  return Number(rows[0].n) > 0;
}

export async function getCachedActivities(): Promise<Activity[]> {
  const { rows } = await sql`SELECT * FROM activities WHERE type = 'Run' ORDER BY start_date_local DESC`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (rows as any[]).map((r) => ({
    ...r,
    splits_metric: r.splits_metric ? JSON.parse(r.splits_metric) : undefined,
  }));
}

export async function getCachedActivity(id: number): Promise<Activity | null> {
  const { rows } = await sql`SELECT * FROM activities WHERE id = ${id}`;
  if (!rows[0]) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = rows[0] as any;
  return { ...r, splits_metric: r.splits_metric ? JSON.parse(r.splits_metric) : undefined };
}
