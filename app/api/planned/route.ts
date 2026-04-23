import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getValidToken } from '@/lib/strava';
import type { PlannedActivity } from '@/lib/types';

export async function GET(request: NextRequest) {
  const token = await getValidToken();
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const month = request.nextUrl.searchParams.get('month'); // YYYY-MM
  const db = getDb();

  const rows = month
    ? db.prepare(`SELECT * FROM planned_activities WHERE date LIKE ? ORDER BY date`).all(`${month}%`)
    : db.prepare(`SELECT * FROM planned_activities ORDER BY date`).all();

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

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO planned_activities (date, type, title, notes, distance_km, duration_minutes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(date, type, title, notes ?? null, distance_km ?? null, duration_minutes ?? null);

  const row = db.prepare(`SELECT * FROM planned_activities WHERE id = ?`).get(result.lastInsertRowid);
  return NextResponse.json(row, { status: 201 });
}
