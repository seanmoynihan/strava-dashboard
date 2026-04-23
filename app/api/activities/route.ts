import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/strava';
import { getDb } from '@/lib/db';
import type { Activity } from '@/lib/types';

export async function GET(request: NextRequest) {
  const token = await getValidToken();
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const q = request.nextUrl.searchParams.get('q')?.trim().toLowerCase();
  const db = getDb();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rows: any[];
  if (q) {
    rows = db.prepare(
      `SELECT * FROM activities WHERE type = 'Run'
       AND (LOWER(name) LIKE ? OR LOWER(COALESCE(location_names, '')) LIKE ?)
       ORDER BY start_date_local DESC`
    ).all(`%${q}%`, `%${q}%`);
  } else {
    rows = db.prepare(`SELECT * FROM activities WHERE type = 'Run' ORDER BY start_date_local DESC`).all();
  }

  const activities: Activity[] = rows.map((r) => ({
    ...r,
    splits_metric: r.splits_metric ? JSON.parse(r.splits_metric) : undefined,
  }));

  return NextResponse.json(activities);
}
