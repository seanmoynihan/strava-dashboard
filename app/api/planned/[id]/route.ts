import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getValidToken } from '@/lib/strava';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getValidToken();
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const db = getDb();
  db.prepare(`DELETE FROM planned_activities WHERE id = ?`).run(Number(id));
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getValidToken();
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { title, notes, distance_km, duration_minutes } = body;

  const db = getDb();
  db.prepare(`
    UPDATE planned_activities SET title = ?, notes = ?, distance_km = ?, duration_minutes = ? WHERE id = ?
  `).run(title, notes ?? null, distance_km ?? null, duration_minutes ?? null, Number(id));

  const row = db.prepare(`SELECT * FROM planned_activities WHERE id = ?`).get(Number(id));
  return NextResponse.json(row);
}
