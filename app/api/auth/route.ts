import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/strava';

export async function GET(request: NextRequest) {
  const host = request.headers.get('host') ?? 'localhost:3000';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  const redirectUri = `${protocol}://${host}/api/auth/callback`;
  return NextResponse.redirect(getAuthUrl(redirectUri));
}
