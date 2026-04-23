import polyline from '@mapbox/polyline';
import { getDb } from './db';

const NOMINATIM = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = 'strava-running-dashboard/1.0';

function sampleCoords(encoded: string, samples = 5): [number, number][] {
  const coords = polyline.decode(encoded);
  if (coords.length === 0) return [];
  if (coords.length <= samples) return coords as [number, number][];
  const step = Math.floor(coords.length / samples);
  return Array.from({ length: samples }, (_, i) => coords[Math.min(i * step, coords.length - 1)] as [number, number]);
}

async function reverseGeocode(lat: number, lon: number): Promise<string[]> {
  const url = `${NOMINATIM}?lat=${lat}&lon=${lon}&format=json&zoom=16&addressdetails=1`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) return [];
    const data = await res.json() as { address?: Record<string, string> };
    const addr = data.address ?? {};
    // Collect meaningful names: road, path, cycleway, footway, suburb, neighbourhood
    return [addr.road, addr.path, addr.cycleway, addr.footway, addr.suburb, addr.neighbourhood]
      .filter((v): v is string => !!v && v.length > 1);
  } catch {
    return [];
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function getUngeocoded(limit = 10): { id: number; map_polyline: string }[] {
  const db = getDb();
  return db.prepare(
    `SELECT id, map_polyline FROM activities
     WHERE map_polyline IS NOT NULL AND map_polyline != '' AND location_names IS NULL
     ORDER BY start_date_local DESC LIMIT ?`
  ).all(limit) as { id: number; map_polyline: string }[];
}

export function getUngeocodedCount(): number {
  const db = getDb();
  const row = db.prepare(
    `SELECT COUNT(*) as n FROM activities WHERE map_polyline IS NOT NULL AND map_polyline != '' AND location_names IS NULL`
  ).get() as { n: number };
  return row.n;
}

export async function geocodeActivity(id: number, encoded: string): Promise<string> {
  const points = sampleCoords(encoded, 5);
  const names = new Set<string>();

  for (const [lat, lon] of points) {
    const results = await reverseGeocode(lat, lon);
    results.forEach((n) => names.add(n));
    await sleep(1100); // Nominatim rate limit: 1 req/sec
  }

  const locationNames = [...names].join(', ');
  const db = getDb();
  db.prepare(`UPDATE activities SET location_names = ? WHERE id = ?`).run(locationNames, id);
  return locationNames;
}
