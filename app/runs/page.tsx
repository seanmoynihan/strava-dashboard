'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { Activity } from '@/lib/types';
import { formatDistance, formatDuration, formatPace, formatDate } from '@/lib/format';
import MiniMap from './MiniMap';

export default function RunsPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [ungeocodedCount, setUngeocodedCount] = useState(0);
  const [geocoding, setGeocoding] = useState(false);

  const loadActivities = useCallback(async (q = '') => {
    const url = q ? `/api/activities?q=${encodeURIComponent(q)}` : '/api/activities';
    const data = await fetch(url).then((r) => r.json());
    setActivities(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    loadActivities().then(() => setLoading(false));
    fetch('/api/geocode').then((r) => r.json()).then((d) => setUngeocodedCount(d.remaining ?? 0));
  }, [loadActivities]);

  // Debounced search
  useEffect(() => {
    if (!query) { loadActivities(); return; }
    setSearching(true);
    const t = setTimeout(() => {
      loadActivities(query).then(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query, loadActivities]);

  async function sync() {
    setSyncing(true);
    await fetch('/api/sync', { method: 'POST' });
    await loadActivities(query);
    const d = await fetch('/api/geocode').then((r) => r.json());
    setUngeocodedCount(d.remaining ?? 0);
    setSyncing(false);
  }

  async function geocodeBatch() {
    setGeocoding(true);
    const d = await fetch('/api/geocode', { method: 'POST' }).then((r) => r.json());
    setUngeocodedCount(d.remaining ?? 0);
    await loadActivities(query);
    setGeocoding(false);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Runs</h1>
          <p className="text-stone-500 text-sm mt-1">{activities.length} runs</p>
        </div>
        <button
          onClick={sync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-[#FC4C02] text-white text-sm font-medium rounded-xl hover:bg-[#e04400] disabled:opacity-50 transition-colors"
        >
          {syncing ? (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity={0.25} />
              <path d="M21 12a9 9 0 01-9 9" strokeLinecap="round" />
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {syncing ? 'Syncing…' : 'Sync'}
        </button>
      </div>

      {/* Search + geocode */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
          {searching && (
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity={0.25} />
              <path d="M21 12a9 9 0 01-9 9" strokeLinecap="round" />
            </svg>
          )}
          <input
            type="text"
            placeholder="Search by road name or activity name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
          />
        </div>
        {ungeocodedCount > 0 && (
          <button
            onClick={geocodeBatch}
            disabled={geocoding}
            title={`${ungeocodedCount} runs not yet geocoded`}
            className="flex items-center gap-2 px-3 py-2 border border-stone-200 rounded-xl text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {geocoding ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity={0.25} />
                <path d="M21 12a9 9 0 01-9 9" strokeLinecap="round" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {geocoding ? 'Geocoding…' : `Geocode routes (${ungeocodedCount})`}
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-stone-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-4xl mb-3">🏃</p>
          <p className="font-medium">{query ? 'No runs match that search' : 'No runs yet'}</p>
          <p className="text-sm mt-1">{query ? 'Try a different road or activity name.' : 'Click Sync to fetch your activities from Strava.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((a) => (
            <Link
              key={a.id}
              href={`/runs/${a.id}`}
              className="block bg-white border border-stone-200 rounded-2xl px-5 py-4 hover:border-orange-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-stone-900 truncate">{a.name}</p>
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-stone-300 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">{formatDate(a.start_date_local)}</p>
                  {a.location_names && (
                    <p className="text-xs text-stone-400 mt-1 truncate">📍 {a.location_names}</p>
                  )}
                </div>
                {a.map_polyline && <MiniMap encoded={a.map_polyline} />}
              </div>
              <div className="flex gap-6 mt-3">
                <Stat label="Distance" value={formatDistance(a.distance)} />
                <Stat label="Time" value={formatDuration(a.moving_time)} />
                <Stat label="Pace" value={formatPace(a.average_speed)} />
                {a.total_elevation_gain > 0 && (
                  <Stat label="Elevation" value={`↑ ${Math.round(a.total_elevation_gain)}m`} />
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-stone-400">{label}</p>
      <p className="text-sm font-semibold text-stone-800 mt-0.5">{value}</p>
    </div>
  );
}
