import polyline from '@mapbox/polyline';
import { sql } from './db';

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
    return [addr.road, addr.path, addr.cycleway, addr.footway, addr.suburb, addr.neighbourhood]
      .filter((v): v is string => !!v && v.length > 1);
  } catch {
    return [];
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function getUngeocoded(limit = 10): Promise<{ id: number; map_polyline: string }[]> {
  const { rows } = await sql`
    SELECT id, map_polyline FROM activities
    WHERE map_polyline IS NOT NULL AND map_polyline != '' AND location_names IS NULL
    ORDER BY start_date_local DESC LIMIT ${limit}
  `;
  return rows as { id: number; map_polyline: string }[];
}

export async function getUngeocodedCount(): Promise<number> {
  const { rows } = await sql`
    SELECT COUNT(*) as n FROM activities
    WHERE map_polyline IS NOT NULL AND map_polyline != '' AND location_names IS NULL
  `;
  return Number(rows[0].n);
}

export async function geocodeActivity(id: number, encoded: string): Promise<string> {
  const points = sampleCoords(encoded, 5);
  const names = new Set<string>();

  for (const [lat, lon] of points) {
    const results = await reverseGeocode(lat, lon);
    results.forEach((n) => names.add(n));
    await sleep(1100);
  }

  const locationNames = [...names].join(', ');
  await sql`UPDATE activities SET location_names = ${locationNames} WHERE id = ${id}`;
  return locationNames;
}
