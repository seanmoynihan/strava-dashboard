'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { formatDistance, formatDuration, formatPace, formatDate } from '@/lib/format';
import type { Activity, Split } from '@/lib/types';

const RouteMap = dynamic(() => import('./RouteMap'), { ssr: false });

export default function RunDetail({ activity }: { activity: Activity }) {
  const splits: Split[] = activity.splits_metric ?? [];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <Link href="/runs" className="text-sm text-stone-400 hover:text-stone-600">← All runs</Link>
        <h1 className="text-2xl font-bold text-stone-900 mt-2">{activity.name}</h1>
        <p className="text-stone-400 text-sm">{formatDate(activity.start_date_local)}</p>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Distance" value={formatDistance(activity.distance)} />
        <StatCard label="Time" value={formatDuration(activity.moving_time)} />
        <StatCard label="Avg Pace" value={formatPace(activity.average_speed)} />
        <StatCard label="Elevation" value={`↑ ${Math.round(activity.total_elevation_gain)}m`} />
        {activity.average_heartrate && (
          <StatCard label="Avg HR" value={`${Math.round(activity.average_heartrate)} bpm`} />
        )}
        {activity.max_heartrate && (
          <StatCard label="Max HR" value={`${Math.round(activity.max_heartrate)} bpm`} />
        )}
        <StatCard label="Best Pace" value={formatPace(activity.max_speed)} />
        <StatCard label="Elapsed" value={formatDuration(activity.elapsed_time)} />
      </div>

      {/* Map */}
      {activity.map_polyline ? (
        <RouteMap polyline={activity.map_polyline} />
      ) : (
        <div className="w-full h-48 bg-stone-100 rounded-2xl flex items-center justify-center text-stone-400 text-sm">
          No route data
        </div>
      )}

      {/* Splits */}
      {splits.length > 0 && (
        <div>
          <h2 className="font-semibold text-stone-800 mb-3">Splits</h2>
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-stone-400 uppercase">km</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-stone-400 uppercase">Pace</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-stone-400 uppercase">Time</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-stone-400 uppercase">Elev</th>
                </tr>
              </thead>
              <tbody>
                {splits.map((s, i) => (
                  <tr key={i} className={i < splits.length - 1 ? 'border-b border-stone-50' : ''}>
                    <td className="px-4 py-2.5 font-medium text-stone-700">{s.split}</td>
                    <td className="px-4 py-2.5 text-right text-stone-800 font-mono">{formatPace(s.average_speed)}</td>
                    <td className="px-4 py-2.5 text-right text-stone-500">{formatDuration(s.moving_time)}</td>
                    <td className="px-4 py-2.5 text-right text-stone-400 text-xs">
                      {s.elevation_difference >= 0 ? '↑' : '↓'}{Math.abs(Math.round(s.elevation_difference))}m
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl px-4 py-3">
      <p className="text-xs text-stone-400">{label}</p>
      <p className="text-lg font-bold text-stone-900 mt-0.5">{value}</p>
    </div>
  );
}
