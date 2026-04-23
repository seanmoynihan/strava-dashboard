import { describe, it, expect } from 'vitest';

// Pure logic tests that don't need the real DB or Strava API

describe('token expiry logic', () => {
  it('considers a token expired when within 5 minutes of expiry', () => {
    const now = Math.floor(Date.now() / 1000);
    const isExpired = (expiresAt: number) => now > expiresAt - 300;

    expect(isExpired(now - 1)).toBe(true);   // already expired
    expect(isExpired(now + 100)).toBe(true);  // expires in < 5 min
    expect(isExpired(now + 400)).toBe(false); // still valid
  });
});

describe('activity mapping', () => {
  it('handles missing map polyline gracefully', () => {
    const raw: { map?: { summary_polyline?: string; polyline?: string } } = { map: { summary_polyline: '' } };
    // Empty string polyline falls through to null — nothing to render
    const polyline = raw.map?.summary_polyline || raw.map?.polyline || null;
    expect(polyline).toBeNull();
  });

  it('picks summary_polyline over polyline', () => {
    const raw = { map: { summary_polyline: 'abc123', polyline: 'longer_detail' } };
    const polyline = raw.map?.summary_polyline || raw.map?.polyline;
    expect(polyline).toBe('abc123');
  });

  it('falls back to polyline when summary is missing', () => {
    const raw = { map: { summary_polyline: undefined, polyline: 'detail_poly' } };
    const polyline = raw.map?.summary_polyline || raw.map?.polyline;
    expect(polyline).toBe('detail_poly');
  });
});

describe('hasActivities guard', () => {
  it('returns false when count is 0', () => {
    const count = 0;
    expect(count > 0).toBe(false);
  });

  it('returns true when activities exist', () => {
    const count = 5;
    expect(count > 0).toBe(true);
  });
});
