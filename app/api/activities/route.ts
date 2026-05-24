import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/strava';
import { sql } from '@/lib/db';
import type { Activity } from '@/lib/types';

export async function GET(request: NextRequest) {
  const token = await getValidToken();
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const q = request.nextUrl.searchParams.get('q')?.trim().toLowerCase();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rows: any[];
  if (q) {
    const pattern = `%${q}%`;
    const result = await sql`
      SELECT * FROM activities WHERE type = 'Run'
      AND (LOWER(name) LIKE ${pattern} OR LOWER(COALESCE(location_names, '')) LIKE ${pattern})
      ORDER BY start_date_local DESC
    `;
    rows = result.rows;
  } else {
    const result = await sql`SELECT * FROM activities WHERE type = 'Run' ORDER BY start_date_local DESC`;
    rows = result.rows;
  }

  const activities: Activity[] = rows.map((r) => ({
    ...r,
    splits_metric: r.splits_metric ? JSON.parse(r.splits_metric) : undefined,
  }));

  return NextResponse.json(activities);
}
