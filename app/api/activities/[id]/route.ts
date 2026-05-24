import { NextRequest, NextResponse } from 'next/server';
import { getCachedActivity, fetchAndCacheActivity, getValidToken } from '@/lib/strava';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getValidToken();
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const activityId = Number(id);

  let activity = await getCachedActivity(activityId);
  if (!activity || !activity.map_polyline) {
    activity = await fetchAndCacheActivity(activityId);
  }
  if (!activity) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(activity);
}
