import { NextResponse } from 'next/server';
import { getValidToken } from '@/lib/strava';
import { getUngeocoded, getUngeocodedCount, geocodeActivity } from '@/lib/geocode';

// GET — return count of ungeocoded activities
export async function GET() {
  const token = await getValidToken();
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  return NextResponse.json({ remaining: await getUngeocodedCount() });
}

// POST — geocode one batch (up to 5 activities, ~30s with rate limiting)
export async function POST() {
  const token = await getValidToken();
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const batch = await getUngeocoded(5);
  if (batch.length === 0) return NextResponse.json({ processed: 0, remaining: 0 });

  let processed = 0;
  for (const { id, map_polyline } of batch) {
    await geocodeActivity(id, map_polyline);
    processed++;
  }

  return NextResponse.json({ processed, remaining: await getUngeocodedCount() });
}
