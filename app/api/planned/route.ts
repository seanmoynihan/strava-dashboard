import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getValidToken } from '@/lib/strava';
import type { PlannedActivity } from '@/lib/types';

export async function GET(request: NextRequest) {
  const token = await getValidToken();
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const month = request.nextUrl.searchParams.get('month'); // YYYY-MM

  const { rows } = month
    ? await sql`SELECT * FROM planned_activities WHERE date LIKE ${`${month}%`} ORDER BY date`
    : await sql`SELECT * FROM planned_activities ORDER BY date`;

  return NextResponse.json(rows as PlannedActivity[]);
}

export async function POST(request: NextRequest) {
  const token = await getValidToken();
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const { date, type, title, notes, distance_km, duration_minutes } = body;

  if (!date || !type || !title) {
    return NextResponse.json({ error: 'date, type, and title are required' }, { status: 400 });
  }

  const { rows } = await sql`
    INSERT INTO planned_activities (date, type, title, notes, distance_km, duration_minutes)
    VALUES (${date}, ${type}, ${title}, ${notes ?? null}, ${distance_km ?? null}, ${duration_minutes ?? null})
    ON CONFLICT (date, type, title) DO NOTHING
    RETURNING *
  `;

  if (!rows[0]) return NextResponse.json({ skipped: true }, { status: 200 });
  return NextResponse.json(rows[0], { status: 201 });
}
