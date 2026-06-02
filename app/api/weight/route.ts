import { NextResponse } from 'next/server';
import { ensureSchema, sql } from '@/lib/db';

export async function GET() {
  await ensureSchema();
  const { rows } = await sql`SELECT id, date, kg FROM weight_entries ORDER BY date DESC`;
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  await ensureSchema();
  const { date, kg } = await req.json();
  if (!date || typeof kg !== 'number') return NextResponse.json({ error: 'Invalid' }, { status: 400 });
  await sql`
    INSERT INTO weight_entries (date, kg) VALUES (${date}, ${kg})
    ON CONFLICT (date) DO UPDATE SET kg = EXCLUDED.kg
  `;
  const { rows } = await sql`SELECT id, date, kg FROM weight_entries ORDER BY date DESC`;
  return NextResponse.json(rows);
}

export async function DELETE(req: Request) {
  await ensureSchema();
  const { id } = await req.json();
  await sql`DELETE FROM weight_entries WHERE id = ${id}`;
  const { rows } = await sql`SELECT id, date, kg FROM weight_entries ORDER BY date DESC`;
  return NextResponse.json(rows);
}
