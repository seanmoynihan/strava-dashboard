import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getValidToken } from '@/lib/strava';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getValidToken();
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  await sql`DELETE FROM planned_activities WHERE id = ${Number(id)}`;
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getValidToken();
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { title, notes, distance_km, duration_minutes } = body;

  const { rows } = await sql`
    UPDATE planned_activities
    SET title = ${title}, notes = ${notes ?? null}, distance_km = ${distance_km ?? null}, duration_minutes = ${duration_minutes ?? null}
    WHERE id = ${Number(id)}
    RETURNING *
  `;
  return NextResponse.json(rows[0]);
}
