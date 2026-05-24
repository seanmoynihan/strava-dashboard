import { notFound } from 'next/navigation';
import { getCachedActivity, fetchAndCacheActivity, getValidToken } from '@/lib/strava';
import RunDetail from './RunDetail';

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await getValidToken();
  if (!token) notFound();

  let activity = await getCachedActivity(Number(id));
  if (!activity || !activity.map_polyline) {
    try { activity = await fetchAndCacheActivity(Number(id)); } catch { /* use cached */ }
  }
  if (!activity) notFound();

  return <RunDetail activity={activity} />;
}
