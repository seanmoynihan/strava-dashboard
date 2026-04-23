import { NextResponse } from 'next/server';
import { fetchAndCacheActivities, getValidToken } from '@/lib/strava';

export async function POST() {
  const token = await getValidToken();
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const page1 = await fetchAndCacheActivities(1, 100);
    const page2 = await fetchAndCacheActivities(2, 100);
    return NextResponse.json({ synced: page1.length + page2.length });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
