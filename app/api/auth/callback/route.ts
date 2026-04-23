import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode, saveToken, fetchAndCacheActivities, hasActivities } from '@/lib/strava';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL('/?error=access_denied', request.url));
  }

  try {
    const token = await exchangeCode(code);
    saveToken(token);
    // Only seed on first connect — skip if activities already cached
    if (!hasActivities()) {
      fetchAndCacheActivities(1, 100).catch(console.error);
      fetchAndCacheActivities(2, 100).catch(console.error);
    }
    return NextResponse.redirect(new URL('/runs', request.url));
  } catch (e) {
    console.error('OAuth callback error:', e);
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url));
  }
}
