import { describe, it, expect } from 'vitest';
import { formatDistance, formatDuration, formatPace, formatDate } from '@/lib/format';

describe('formatDistance', () => {
  it('converts metres to km', () => {
    expect(formatDistance(5000)).toBe('5.00 km');
    expect(formatDistance(10500)).toBe('10.50 km');
    expect(formatDistance(42195)).toBe('42.20 km');
  });
});

describe('formatDuration', () => {
  it('formats seconds under an hour as mm:ss', () => {
    expect(formatDuration(90)).toBe('1:30');
    expect(formatDuration(3599)).toBe('59:59');
  });

  it('formats seconds over an hour with hours', () => {
    expect(formatDuration(3600)).toBe('1:00:00');
    expect(formatDuration(3661)).toBe('1:01:01');
  });

  it('pads minutes and seconds', () => {
    expect(formatDuration(65)).toBe('1:05');
  });
});

describe('formatPace', () => {
  it('converts m/s to min/km string', () => {
    // 3 m/s = 1000/3 = 333.3 sec/km = 5:33 /km
    expect(formatPace(3)).toBe('5:33 /km');
  });

  it('returns — for zero speed', () => {
    expect(formatPace(0)).toBe('—');
  });
});

describe('formatDate', () => {
  it('formats an ISO date string', () => {
    const result = formatDate('2026-04-23T07:00:00Z');
    expect(result).toMatch(/Apr/);
  });
});
