'use client';

import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import type { Activity } from '@/lib/types';
import { formatPace } from '@/lib/format';

type Period = 'weekly' | 'monthly';

export default function StatsPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [period, setPeriod] = useState<Period>('weekly');
  const [year, setYear] = useState<number | 'all'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/activities').then((r) => r.json()).then((d) => {
      setActivities(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  }, []);

  const years = useMemo(() => {
    const set = new Set(activities.map((a) => new Date(a.start_date_local).getFullYear()));
    return [...set].sort((a, b) => b - a);
  }, [activities]);

  const filtered = useMemo(
    () => year === 'all' ? activities : activities.filter((a) => new Date(a.start_date_local).getFullYear() === year),
    [activities, year]
  );

  const mileageData = buildMileageData(filtered, period);
  const paceData = buildPaceData(filtered, period);
  const totalKm = filtered.reduce((s, a) => s + a.distance, 0) / 1000;
  const totalRuns = filtered.length;
  const avgPace = filtered.length ? filtered.reduce((s, a) => s + a.average_speed, 0) / filtered.length : 0;

  const { bestWeekKm, bestWeekLabel } = useMemo(() => {
    const map = new Map<string, { km: number; label: string }>();
    for (const a of filtered) {
      const key = weekSortKey(a.start_date_local);
      const label = weekLabel(a.start_date_local);
      const entry = map.get(key) ?? { km: 0, label };
      entry.km += a.distance / 1000;
      map.set(key, entry);
    }
    let best = { km: 0, label: '—' };
    for (const v of map.values()) if (v.km > best.km) best = v;
    return { bestWeekKm: best.km, bestWeekLabel: best.label };
  }, [filtered]);

  const { bestMonthKm, bestMonthLabel } = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of filtered) {
      const key = monthLabel(a.start_date_local);
      map.set(key, (map.get(key) ?? 0) + a.distance / 1000);
    }
    let best = { km: 0, label: '—' };
    for (const [label, km] of map.entries()) if (km > best.km) best = { km, label };
    return { bestMonthKm: best.km, bestMonthLabel: best.label };
  }, [filtered]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <h1 className="text-2xl font-bold text-stone-900">Stats</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Year filter */}
          <div className="flex rounded-xl border border-stone-200 overflow-hidden text-sm">
            <button
              onClick={() => setYear('all')}
              className={`px-3 py-1.5 transition-colors ${year === 'all' ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-50'}`}
            >
              All
            </button>
            {years.map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`px-3 py-1.5 transition-colors ${year === y ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-50'}`}
              >
                {y}
              </button>
            ))}
          </div>
          {/* Period toggle */}
          <div className="flex rounded-xl border border-stone-200 overflow-hidden text-sm">
            {(['weekly', 'monthly'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 capitalize transition-colors ${period === p ? 'bg-orange-500 text-white' : 'text-stone-500 hover:bg-stone-50'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-stone-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-stone-900">{totalRuns}</p>
          <p className="text-xs text-stone-400 mt-1">Runs</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-stone-900">{totalKm.toFixed(0)}</p>
          <p className="text-xs text-stone-400 mt-1">Total km</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-stone-900">{avgPace ? formatPace(avgPace).replace(' /km', '') : '—'}</p>
          <p className="text-xs text-stone-400 mt-1">Avg Pace</p>
        </div>
        <div className="bg-white border border-orange-100 rounded-2xl p-4 text-center col-span-1">
          <p className="text-2xl font-bold text-orange-600">{bestWeekKm > 0 ? bestWeekKm.toFixed(1) : '—'}</p>
          <p className="text-xs text-stone-400 mt-1">Best week km</p>
          {bestWeekLabel !== '—' && <p className="text-xs text-stone-300 mt-0.5">{bestWeekLabel}</p>}
        </div>
        <div className="bg-white border border-orange-100 rounded-2xl p-4 text-center col-span-2">
          <p className="text-2xl font-bold text-orange-600">{bestMonthKm > 0 ? bestMonthKm.toFixed(1) : '—'}</p>
          <p className="text-xs text-stone-400 mt-1">Best month km</p>
          {bestMonthLabel !== '—' && <p className="text-xs text-stone-300 mt-0.5">{bestMonthLabel}</p>}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-48 bg-stone-100 rounded-2xl animate-pulse" />
          <div className="h-48 bg-stone-100 rounded-2xl animate-pulse" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-stone-400 py-12">No runs for this period.</p>
      ) : (
        <>
          {/* Mileage chart */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5">
            <h2 className="font-semibold text-stone-800 mb-4">{period === 'weekly' ? 'Weekly' : 'Monthly'} Mileage (km)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={mileageData} barSize={period === 'weekly' ? 12 : 20}>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} width={35} />
                <Tooltip formatter={(v) => [`${Number(v).toFixed(1)} km`, 'Distance']} contentStyle={{ borderRadius: 12, border: '1px solid #e7e5e4', fontSize: 12 }} />
                <Bar dataKey="km" fill="#FC4C02" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pace trend */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5">
            <h2 className="font-semibold text-stone-800 mb-4">Avg Pace Trend (min/km)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={paceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis
                  tick={{ fontSize: 11, fill: '#a8a29e' }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  tickFormatter={(v: number) => {
                    const m = Math.floor(v / 60);
                    const s = Math.round(v % 60);
                    return `${m}:${String(s).padStart(2, '0')}`;
                  }}
                  domain={['auto', 'auto']}
                  reversed
                />
                <Tooltip
                  formatter={(v) => {
                    const n = Number(v);
                    const m = Math.floor(n / 60);
                    const s = Math.round(n % 60);
                    return [`${m}:${String(s).padStart(2, '0')} /km`, 'Avg Pace'];
                  }}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e7e5e4', fontSize: 12 }}
                />
                <Line type="monotone" dataKey="secsPerKm" stroke="#FC4C02" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

function getMondayOf(iso: string): Date {
  const d = new Date(iso);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - day - 3); // Monday = Thursday - 3
  return d;
}

function weekLabel(iso: string): string {
  const d = new Date(iso);
  const day = d.getDay() || 7;
  // Get Monday of this week
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day - 1));
  return monday.toLocaleDateString('en-IE', { day: 'numeric', month: 'short' });
}

// Sort key for weeks (for correct ordering)
function weekSortKey(iso: string): string {
  const d = new Date(iso);
  const day = d.getDay() || 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day - 1));
  return monday.toISOString().split('T')[0];
}

function monthLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IE', { month: 'short', year: '2-digit' });
}

function buildMileageData(activities: Activity[], period: Period) {
  if (period === 'weekly') {
    const map = new Map<string, { km: number; sortKey: string }>();
    for (const a of activities) {
      const label = weekLabel(a.start_date_local);
      const sortKey = weekSortKey(a.start_date_local);
      const entry = map.get(label) ?? { km: 0, sortKey };
      entry.km += a.distance / 1000;
      map.set(label, entry);
    }
    return [...map.entries()]
      .sort((a, b) => a[1].sortKey.localeCompare(b[1].sortKey))
      .slice(-20)
      .map(([label, { km }]) => ({ label, km: parseFloat(km.toFixed(2)) }));
  }

  const map = new Map<string, number>();
  for (const a of activities) {
    const key = monthLabel(a.start_date_local);
    map.set(key, (map.get(key) ?? 0) + a.distance / 1000);
  }
  return [...map.entries()].map(([label, km]) => ({ label, km: parseFloat(km.toFixed(2)) }));
}

function buildPaceData(activities: Activity[], period: Period) {
  if (period === 'weekly') {
    const map = new Map<string, { speeds: number[]; sortKey: string }>();
    for (const a of activities) {
      if (!a.average_speed) continue;
      const label = weekLabel(a.start_date_local);
      const sortKey = weekSortKey(a.start_date_local);
      const entry = map.get(label) ?? { speeds: [], sortKey };
      entry.speeds.push(a.average_speed);
      map.set(label, entry);
    }
    return [...map.entries()]
      .sort((a, b) => a[1].sortKey.localeCompare(b[1].sortKey))
      .slice(-20)
      .map(([label, { speeds }]) => ({
        label,
        secsPerKm: parseFloat((speeds.reduce((a, b) => a + 1000 / b, 0) / speeds.length).toFixed(1)),
      }));
  }

  const map = new Map<string, number[]>();
  for (const a of activities) {
    if (!a.average_speed) continue;
    const key = monthLabel(a.start_date_local);
    const arr = map.get(key) ?? [];
    arr.push(1000 / a.average_speed);
    map.set(key, arr);
  }
  return [...map.entries()].map(([label, vals]) => ({
    label,
    secsPerKm: parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)),
  }));
}
