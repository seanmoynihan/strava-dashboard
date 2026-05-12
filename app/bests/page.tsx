'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Activity } from '@/lib/types';
import { formatDistance, formatDuration, formatPace, formatDate } from '@/lib/format';

interface Best {
  label: string;
  value: string;
  sub: string;
  activity: Activity;
  pace?: string;
  time?: string;
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
            <Link
              key={b.label}
              href={`/runs/${b.activity.id}`}
              className="bg-white border border-stone-200 rounded-2xl px-5 py-4 hover:border-orange-300 hover:shadow-sm transition-all"
            >
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">{b.label}</p>
              <p className="text-2xl font-bold text-stone-900 mt-1">{b.value}</p>
              {(b.pace || b.time) && (
                <div className="flex gap-3 mt-1">
                  {b.pace && <span className="text-xs text-stone-500">{b.pace}</span>}
                  {b.time && <span className="text-xs text-stone-500">{b.time}</span>}
                </div>
              )}
              <p className="text-xs text-stone-400 mt-1">{b.sub} · {formatDate(b.activity.start_date_local)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function computeBests(activities: Activity[]): Best[] {
  if (!activities.length) return [];
  const bests: Best[] = [];

  // Longest run
  const longest = [...activities].sort((a, b) => b.distance - a.distance)[0];
  bests.push({ label: 'Longest Run', value: formatDistance(longest.distance), pace: formatPace(longest.average_speed), time: formatDuration(longest.moving_time), sub: longest.name, activity: longest });

  // Fastest pace (runs ≥ 3km)
  const longEnough = activities.filter((a) => a.distance >= 3000);
  if (longEnough.length) {
    const fastest = [...longEnough].sort((a, b) => b.average_speed - a.average_speed)[0];
    bests.push({ label: 'Fastest Avg Pace', value: formatPace(fastest.average_speed), time: formatDuration(fastest.moving_time), sub: fastest.name, activity: fastest });
  }

  // Fastest 5K (runs ≥ 5km, best pace)
  const over5k = activities.filter((a) => a.distance >= 5000);
  if (over5k.length) {
    const best5k = [...over5k].sort((a, b) => b.average_speed - a.average_speed)[0];
    bests.push({ label: 'Best 5K Pace', value: formatPace(best5k.average_speed), time: formatDuration(Math.round(5000 / best5k.average_speed)), sub: best5k.name, activity: best5k });
  }

  // Fastest 10K (runs ≥ 10km, best pace)
  const over10k = activities.filter((a) => a.distance >= 10000);
  if (over10k.length) {
    const best10k = [...over10k].sort((a, b) => b.average_speed - a.average_speed)[0];
    bests.push({ label: 'Best 10K Pace', value: formatPace(best10k.average_speed), time: formatDuration(Math.round(10000 / best10k.average_speed)), sub: best10k.name, activity: best10k });
  }

  // Fastest 10 Miler (runs ≥ 16093m)
  const over10mi = activities.filter((a) => a.distance >= 16093);
  if (over10mi.length) {
    const best10mi = [...over10mi].sort((a, b) => b.average_speed - a.average_speed)[0];
    bests.push({ label: 'Best 10 Mile Pace', value: formatPace(best10mi.average_speed), time: formatDuration(Math.round(16093 / best10mi.average_speed)), sub: best10mi.name, activity: best10mi });
  }

  // Fastest Half Marathon (runs ≥ 21097m)
  const overHalf = activities.filter((a) => a.distance >= 21097);
  if (overHalf.length) {
    const bestHalf = [...overHalf].sort((a, b) => b.average_speed - a.average_speed)[0];
    bests.push({ label: 'Best Half Marathon Pace', value: formatPace(bestHalf.average_speed), time: formatDuration(Math.round(21097 / bestHalf.average_speed)), sub: bestHalf.name, activity: bestHalf });
  }

  // Most elevation
  const mostElev = [...activities].sort((a, b) => b.total_elevation_gain - a.total_elevation_gain)[0];
  if (mostElev.total_elevation_gain > 0) {
    bests.push({ label: 'Most Elevation', value: `↑ ${Math.round(mostElev.total_elevation_gain)}m`, sub: mostElev.name, activity: mostElev });
  }

  // Longest time on feet
  const longestTime = [...activities].sort((a, b) => b.moving_time - a.moving_time)[0];
  bests.push({ label: 'Longest Time', value: formatDuration(longestTime.moving_time), pace: formatPace(longestTime.average_speed), sub: longestTime.name, activity: longestTime });

  return bests;
}
