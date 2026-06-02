'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Activity } from '@/lib/types';
import { formatDistance, formatDuration, formatPace, formatDate } from '@/lib/format';

interface BestEntry {
  value: string;
  sub: string;
  activity: Activity;
  pace?: string;
  time?: string;
}

interface Best {
  label: string;
  entries: BestEntry[];
}

export default function BestsPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/activities').then((r) => r.json()).then((d) => {
      setActivities(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  }, []);

  const years = [...new Set(activities.map((a) => new Date(a.start_date_local).getFullYear()))].sort((a, b) => b - a);
  const filtered = selectedYear ? activities.filter((a) => new Date(a.start_date_local).getFullYear() === selectedYear) : activities;
  const bests = computeBests(filtered);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-stone-900">Personal Bests</h1>
        {!loading && years.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedYear(null)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${selectedYear === null ? 'bg-orange-500 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
            >
              All time
            </button>
            {years.map((y) => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${selectedYear === y ? 'bg-orange-500 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
              >
                {y}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-stone-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : bests.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-4xl mb-3">🏅</p>
          <p className="font-medium">No data yet</p>
          <p className="text-sm mt-1">Sync your runs first.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {bests.map((b) => (
            <div key={b.label} className="bg-white border border-stone-200 rounded-2xl px-5 py-4 space-y-3">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">{b.label}</p>
              {b.entries.map((entry, i) => (
                <Link
                  key={entry.activity.id}
                  href={`/runs/${entry.activity.id}`}
                  className={`flex items-start gap-3 group ${i > 0 ? 'border-t border-stone-100 pt-3' : ''}`}
                >
                  <span className={`text-xs font-bold mt-0.5 w-4 shrink-0 ${i === 0 ? 'text-orange-500' : 'text-stone-300'}`}>
                    {i === 0 ? '1st' : i === 1 ? '2nd' : '3rd'}
                  </span>
                  <div className="min-w-0">
                    <p className={`font-bold ${i === 0 ? 'text-xl text-stone-900' : 'text-base text-stone-600'}`}>{entry.value}</p>
                    {(entry.pace || entry.time) && (
                      <div className="flex gap-3 mt-0.5">
                        {entry.pace && <span className="text-xs text-stone-500">{entry.pace}</span>}
                        {entry.time && <span className="text-xs text-stone-500">{entry.time}</span>}
                      </div>
                    )}
                    <p className="text-xs text-stone-400 mt-0.5 truncate group-hover:text-orange-400 transition-colors">{entry.sub} · {formatDate(entry.activity.start_date_local)}</p>
                  </div>
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function top3<T>(arr: T[], compareFn: (a: T, b: T) => number): T[] {
  return [...arr].sort(compareFn).slice(0, 3);
}

function computeBests(activities: Activity[]): Best[] {
  if (!activities.length) return [];
  const bests: Best[] = [];

  // Longest run
  const longestRuns = top3(activities, (a, b) => b.distance - a.distance);
  bests.push({
    label: 'Longest Run',
    entries: longestRuns.map((a) => ({ value: formatDistance(a.distance), pace: formatPace(a.average_speed), time: formatDuration(a.moving_time), sub: a.name, activity: a })),
  });

  // Fastest pace (runs ≥ 3km)
  const longEnough = activities.filter((a) => a.distance >= 3000);
  if (longEnough.length) {
    bests.push({
      label: 'Fastest Avg Pace',
      entries: top3(longEnough, (a, b) => b.average_speed - a.average_speed).map((a) => ({ value: formatPace(a.average_speed), time: formatDuration(a.moving_time), sub: a.name, activity: a })),
    });
  }

  // Fastest 5K (runs ≥ 5km, best pace)
  const over5k = activities.filter((a) => a.distance >= 5000);
  if (over5k.length) {
    bests.push({
      label: 'Best 5K Pace',
      entries: top3(over5k, (a, b) => b.average_speed - a.average_speed).map((a) => ({ value: formatPace(a.average_speed), time: formatDuration(Math.round(5000 / a.average_speed)), sub: a.name, activity: a })),
    });
  }

  // Fastest 10K (runs ≥ 10km, best pace)
  const over10k = activities.filter((a) => a.distance >= 10000);
  if (over10k.length) {
    bests.push({
      label: 'Best 10K Pace',
      entries: top3(over10k, (a, b) => b.average_speed - a.average_speed).map((a) => ({ value: formatPace(a.average_speed), time: formatDuration(Math.round(10000 / a.average_speed)), sub: a.name, activity: a })),
    });
  }

  // Fastest 5 Miler (runs ≥ 8047m)
  const over5mi = activities.filter((a) => a.distance >= 8047);
  if (over5mi.length) {
    bests.push({
      label: 'Best 5 Mile Pace',
      entries: top3(over5mi, (a, b) => b.average_speed - a.average_speed).map((a) => ({ value: formatPace(a.average_speed), time: formatDuration(Math.round(8047 / a.average_speed)), sub: a.name, activity: a })),
    });
  }

  // Fastest 10 Miler (runs ≥ 16093m)
  const over10mi = activities.filter((a) => a.distance >= 16093);
  if (over10mi.length) {
    bests.push({
      label: 'Best 10 Mile Pace',
      entries: top3(over10mi, (a, b) => b.average_speed - a.average_speed).map((a) => ({ value: formatPace(a.average_speed), time: formatDuration(Math.round(16093 / a.average_speed)), sub: a.name, activity: a })),
    });
  }

  // Fastest Half Marathon (runs ≥ 21097m)
  const overHalf = activities.filter((a) => a.distance >= 21097);
  if (overHalf.length) {
    bests.push({
      label: 'Best Half Marathon Pace',
      entries: top3(overHalf, (a, b) => b.average_speed - a.average_speed).map((a) => ({ value: formatPace(a.average_speed), time: formatDuration(Math.round(21097 / a.average_speed)), sub: a.name, activity: a })),
    });
  }

  // Most elevation
  const elevRuns = top3(activities.filter((a) => a.total_elevation_gain > 0), (a, b) => b.total_elevation_gain - a.total_elevation_gain);
  if (elevRuns.length) {
    bests.push({
      label: 'Most Elevation',
      entries: elevRuns.map((a) => ({ value: `↑ ${Math.round(a.total_elevation_gain)}m`, sub: a.name, activity: a })),
    });
  }

  // Longest time on feet
  bests.push({
    label: 'Longest Time',
    entries: top3(activities, (a, b) => b.moving_time - a.moving_time).map((a) => ({ value: formatDuration(a.moving_time), pace: formatPace(a.average_speed), sub: a.name, activity: a })),
  });

  return bests;
}
