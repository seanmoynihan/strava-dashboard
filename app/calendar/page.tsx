'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import type { Activity, PlannedActivity } from '@/lib/types';
import { formatDistance, formatDuration, formatPace } from '@/lib/format';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function mondayIndex(d: Date) { return (d.getDay() + 6) % 7; }
function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function toKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function kmColour(km: number) {
  if (km < 5)  return 'bg-green-100 border-green-300 text-green-800';
  if (km < 10) return 'bg-green-300 border-green-400 text-green-900';
  if (km < 21) return 'bg-green-500 border-green-600 text-white';
  return 'bg-green-700 border-green-800 text-white';
}

// ── Add / Edit modal ────────────────────────────────────────────────
interface ModalProps {
  date: string;
  onSave: (p: Omit<PlannedActivity, 'id' | 'created_at'>) => void;
  onClose: () => void;
}
function AddModal({ date, onSave, onClose }: ModalProps) {
  const [type, setType] = useState<'run' | 'strength'>('run');
  const [title, setTitle] = useState('');
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      date,
      type,
      title: title.trim(),
      notes: notes.trim() || undefined,
      distance_km: distance ? parseFloat(distance) : undefined,
      duration_minutes: duration ? parseInt(duration) : undefined,
    });
  }

  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-stone-800">Plan activity</h3>
            <p className="text-xs text-stone-400 mt-0.5">{displayDate}</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">✕</button>
        </div>

        {/* Type toggle */}
        <div className="flex rounded-xl border border-stone-200 overflow-hidden text-sm">
          {(['run', 'strength'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={`flex-1 py-2 capitalize font-medium transition-colors ${type === t ? (t === 'run' ? 'bg-orange-500 text-white' : 'bg-indigo-500 text-white') : 'text-stone-500 hover:bg-stone-50'}`}>
              {t === 'run' ? '🏃 Run' : '🏋️ Strength'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input required value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder={type === 'run' ? 'e.g. Easy 5K' : 'e.g. Upper body'}
            className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />

          <div className="flex gap-2">
            {type === 'run' && (
              <input value={distance} onChange={(e) => setDistance(e.target.value)}
                type="number" min="0" step="0.1" placeholder="Distance (km)"
                className="flex-1 px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            )}
            <input value={duration} onChange={(e) => setDuration(e.target.value)}
              type="number" min="0" placeholder="Duration (min)"
              className="flex-1 px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>

          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)" rows={2}
            className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />

          <button type="submit"
            className={`w-full py-2 rounded-xl text-white text-sm font-medium transition-colors ${type === 'run' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-indigo-500 hover:bg-indigo-600'}`}>
            Save
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Day detail panel ────────────────────────────────────────────────
interface DayPanelProps {
  date: string;
  runs: Activity[];
  planned: PlannedActivity[];
  onAdd: () => void;
  onDelete: (id: number) => void;
  onClose: () => void;
}
function DayPanel({ date, runs, planned, onAdd, onDelete, onClose }: DayPanelProps) {
  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-stone-800">{displayDate}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">✕</button>
        </div>

        {runs.map((a) => (
          <Link key={a.id} href={`/runs/${a.id}`} onClick={onClose}
            className="block bg-orange-50 border border-orange-200 rounded-xl p-3 hover:bg-orange-100 transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-sm">🏃</span>
              <p className="font-medium text-stone-800 text-sm">{a.name}</p>
            </div>
            <div className="flex gap-4 mt-1 text-xs text-stone-500">
              <span>{formatDistance(a.distance)}</span>
              <span>{formatDuration(a.moving_time)}</span>
              <span>{formatPace(a.average_speed)}</span>
            </div>
          </Link>
        ))}

        {planned.map((p) => (
          <div key={p.id} className={`border rounded-xl p-3 ${p.type === 'run' ? 'bg-orange-50 border-orange-200' : 'bg-indigo-50 border-indigo-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">{p.type === 'run' ? '🏃' : '🏋️'}</span>
                <p className="font-medium text-stone-800 text-sm">{p.title}</p>
                <span className="text-xs bg-white border rounded-full px-2 py-0.5 text-stone-500">Planned</span>
              </div>
              <button onClick={() => onDelete(p.id)} className="text-stone-300 hover:text-red-400 text-xs transition-colors">✕</button>
            </div>
            {(p.distance_km || p.duration_minutes || p.notes) && (
              <div className="flex gap-3 mt-1 text-xs text-stone-500">
                {p.distance_km && <span>{p.distance_km} km</span>}
                {p.duration_minutes && <span>{p.duration_minutes} min</span>}
                {p.notes && <span className="truncate">{p.notes}</span>}
              </div>
            )}
          </div>
        ))}

        <button onClick={onAdd}
          className="w-full py-2 rounded-xl border-2 border-dashed border-stone-200 text-stone-400 hover:border-orange-300 hover:text-orange-500 text-sm transition-colors">
          + Add planned activity
        </button>
      </div>
    </div>
  );
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Weekly summary row ──────────────────────────────────────────────
interface WeekRowProps {
  weekNum: number;
  days: string[];        // YYYY-MM-DD keys
  runsByDay: Map<string, Activity[]>;
  plannedByDay: Map<string, PlannedActivity[]>;
  onCopyWeek: (items: Omit<PlannedActivity, 'id' | 'created_at'>[]) => Promise<void>;
}
function WeekRow({ weekNum, days, runsByDay, plannedByDay, onCopyWeek }: WeekRowProps) {
  const runs = days.flatMap((d) => runsByDay.get(d) ?? []);
  const planned = days.flatMap((d) => plannedByDay.get(d) ?? []);
  const km = runs.reduce((s, a) => s + a.distance / 1000, 0);
  const strengthCount = planned.filter((p) => p.type === 'strength').length;
  const plannedRuns = planned.filter((p) => p.type === 'run').length;
  const [copying, setCopying] = useState(false);

  async function handleCopy() {
    if (planned.length === 0) return;
    setCopying(true);
    const shifted = planned.map(({ type, title, notes, distance_km, duration_minutes, date }) => ({
      date: shiftDate(date, 7),
      type, title,
      ...(notes !== undefined && { notes }),
      ...(distance_km !== undefined && { distance_km }),
      ...(duration_minutes !== undefined && { duration_minutes }),
    }));
    await onCopyWeek(shifted);
    setCopying(false);
  }

  return (
    <div className="bg-white border border-stone-200 rounded-2xl px-5 py-4 flex items-center gap-6 flex-wrap">
      <div className="w-16">
        <p className="text-xs text-stone-400 uppercase tracking-wide">Week {weekNum}</p>
        <p className="text-xs text-stone-400 mt-0.5">
          {new Date(days[0] + 'T00:00:00').toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })}
        </p>
      </div>
      <div className="flex gap-5 flex-1 flex-wrap">
        <Pill label="Runs" value={runs.length} colour="orange" />
        <Pill label="km" value={km > 0 ? km.toFixed(1) : '—'} colour="orange" />
        {plannedRuns > 0 && <Pill label="Planned runs" value={plannedRuns} colour="orange-outline" />}
        {strengthCount > 0 && <Pill label="Strength" value={strengthCount} colour="indigo" />}
        {runs.length === 0 && planned.length === 0 && <span className="text-xs text-stone-300">Rest week</span>}
      </div>
      {planned.length > 0 && (
        <button
          onClick={handleCopy}
          disabled={copying}
          className="text-xs text-stone-400 hover:text-orange-500 border border-stone-200 hover:border-orange-300 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 shrink-0"
        >
          {copying ? 'Copying…' : 'Copy to next week →'}
        </button>
      )}
    </div>
  );
}
function Pill({ label, value, colour }: { label: string; value: string | number; colour: string }) {
  const cls = colour === 'orange' ? 'bg-orange-50 text-orange-800 border-orange-200'
    : colour === 'indigo' ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
    : 'border-dashed border-orange-300 text-orange-700';
  return (
    <div className={`border rounded-xl px-3 py-1.5 text-center min-w-12 ${cls}`}>
      <p className="text-base font-bold leading-none">{value}</p>
      <p className="text-xs mt-0.5 opacity-70">{label}</p>
    </div>
  );
}

interface ProgressBarProps {
  label: string;
  actual: number;
  planned: number;
  unit: string;
  formatActual?: (v: number) => string;
  formatPlanned?: (v: number) => string;
}
function ProgressBar({ label, actual, planned, unit, formatActual, formatPlanned }: ProgressBarProps) {
  const pct = planned > 0 ? Math.min((actual / planned) * 100, 100) : 0;
  const over = planned > 0 && actual > planned;
  const noTarget = planned === 0;
  const fmtA = formatActual ? formatActual(actual) : actual.toFixed(0);
  const fmtP = formatPlanned ? formatPlanned(planned) : planned.toFixed(0);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-stone-700">{label}</span>
        <span className="text-stone-500">
          {noTarget ? (
            <span className="text-stone-400 text-xs">No target set</span>
          ) : (
            <><span className={`font-semibold ${over ? 'text-green-600' : 'text-stone-800'}`}>{fmtA}</span>
            <span className="text-stone-400"> / {fmtP} {unit}</span></>
          )}
        </span>
      </div>
      <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
        {!noTarget && (
          <div
            className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-green-500' : pct >= 75 ? 'bg-green-500' : pct >= 40 ? 'bg-green-400' : 'bg-green-300'}`}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
      {!noTarget && (
        <div className="flex justify-between text-xs text-stone-400">
          <span>{Math.round(pct)}% of target</span>
          {over && <span className="text-green-600 font-medium">Target hit! 🎉</span>}
        </div>
      )}
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────
export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [activities, setActivities] = useState<Activity[]>([]);
  const [planned, setPlanned] = useState<PlannedActivity[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [addingDate, setAddingDate] = useState<string | null>(null);

  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  const load = useCallback(async () => {
    const [acts, plan] = await Promise.all([
      fetch('/api/activities').then((r) => r.json()),
      fetch(`/api/planned?month=${monthKey}`).then((r) => r.json()),
    ]);
    setActivities(Array.isArray(acts) ? acts : []);
    setPlanned(Array.isArray(plan) ? plan : []);
  }, [monthKey]);

  useEffect(() => { load(); }, [load]);

  const runsByDay = useMemo(() => {
    const map = new Map<string, Activity[]>();
    for (const a of activities) {
      const k = a.start_date_local.slice(0, 10);
      map.set(k, [...(map.get(k) ?? []), a]);
    }
    return map;
  }, [activities]);

  const plannedByDay = useMemo(() => {
    const map = new Map<string, PlannedActivity[]>();
    for (const p of planned) {
      map.set(p.date, [...(map.get(p.date) ?? []), p]);
    }
    return map;
  }, [planned]);

  // Build calendar cells
  const totalDays = daysInMonth(year, month);
  const firstDow = mondayIndex(new Date(year, month, 1));
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: totalDays }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  // Build weeks for summary
  const weeks = useMemo(() => {
    const result: { weekNum: number; days: string[] }[] = [];
    for (let i = 0; i < cells.length; i += 7) {
      const days = cells.slice(i, i + 7).filter(Boolean).map((d) => toKey(year, month, d as number));
      if (days.length) result.push({ weekNum: result.length + 1, days });
    }
    return result;
  }, [cells, year, month]);

  function prevMonth() { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); }
  function nextMonth() { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); }

  const todayKey = toKey(now.getFullYear(), now.getMonth(), now.getDate());
  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-IE', { month: 'long', year: 'numeric' });
  const monthRuns = activities.filter((a) => a.start_date_local.startsWith(monthKey));
  const monthKm = monthRuns.reduce((s, a) => s + a.distance / 1000, 0);
  const actualRunDays = new Set(monthRuns.map((a) => a.start_date_local.slice(0, 10))).size;
  const strengthCount = planned.filter((p) => p.type === 'strength').length;
  const plannedRunItems = planned.filter((p) => p.type === 'run');
  const plannedDistanceKm = plannedRunItems.reduce((s, p) => s + (p.distance_km ?? 0), 0);
  const plannedRunDays = new Set(plannedRunItems.map((p) => p.date)).size;

  async function savePlanned(data: Omit<PlannedActivity, 'id' | 'created_at'>) {
    await fetch('/api/planned', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    setAddingDate(null);
    setSelectedDate(data.date);
    load();
  }

  async function deletePlanned(id: number) {
    await fetch(`/api/planned/${id}`, { method: 'DELETE' });
    load();
  }

  async function copyWeek(items: Omit<PlannedActivity, 'id' | 'created_at'>[]) {
    await Promise.all(items.map((item) =>
      fetch('/api/planned', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) })
    ));
    load();
  }

  const selectedRuns = selectedDate ? (runsByDay.get(selectedDate) ?? []) : [];
  const selectedPlanned = selectedDate ? (plannedByDay.get(selectedDate) ?? []) : [];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900">Calendar</h1>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="px-3 py-1.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 text-sm">←</button>
          <span className="font-semibold text-stone-800 w-40 text-center">{monthLabel}</span>
          <button onClick={nextMonth} className="px-3 py-1.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 text-sm">→</button>
        </div>
      </div>

      {/* Monthly summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white border border-stone-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-stone-900">{monthRuns.length}</p>
          <p className="text-xs text-stone-400 mt-1">Runs</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-stone-900">{monthKm.toFixed(0)}</p>
          <p className="text-xs text-stone-400 mt-1">km</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-indigo-600">{strengthCount}</p>
          <p className="text-xs text-stone-400 mt-1">Strength</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-stone-900">{planned.filter(p => p.type === 'run').length}</p>
          <p className="text-xs text-stone-400 mt-1">Planned</p>
        </div>
      </div>

      {/* Monthly progress */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-5">
        <h2 className="font-semibold text-stone-800 text-sm">Monthly progress</h2>
        <ProgressBar
          label="Distance"
          actual={monthKm}
          planned={plannedDistanceKm}
          unit="km"
          formatActual={(v) => v.toFixed(1)}
          formatPlanned={(v) => v.toFixed(1)}
        />
        <ProgressBar
          label="Days run"
          actual={actualRunDays}
          planned={plannedRunDays}
          unit="days"
        />
      </div>

      {/* Calendar grid */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-7 border-b border-stone-100">
          {DAYS.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-stone-400 uppercase tracking-wide">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (!day) return <div key={`e-${i}`} className="aspect-square border-b border-r border-stone-50 last:border-r-0" />;

            const key = toKey(year, month, day);
            const runs = runsByDay.get(key) ?? [];
            const pItems = plannedByDay.get(key) ?? [];
            const km = runs.reduce((s, a) => s + a.distance / 1000, 0);
            const isToday = key === todayKey;
            const hasStrength = pItems.some((p) => p.type === 'strength');
            const hasPlannedRun = pItems.some((p) => p.type === 'run');
            const isPast = key < todayKey;
            const isMiss = hasPlannedRun && km === 0 && isPast;
            const isUpcoming = hasPlannedRun && km === 0 && !isPast;

            let cellColour = '';
            let textColour = isToday ? 'text-orange-500' : isPast ? 'text-stone-700' : 'text-stone-300';
            if (km > 0) {
              cellColour = `${kmColour(km)} border`;
              textColour = '';
            } else if (isMiss) {
              cellColour = 'bg-red-100 border border-red-300';
              textColour = 'text-red-700';
            } else if (isUpcoming) {
              cellColour = 'bg-yellow-100 border border-yellow-300';
              textColour = 'text-yellow-800';
            }

            return (
              <button key={key} onClick={() => setSelectedDate(key)}
                className={`
                  relative aspect-square border-b border-r border-stone-100 last:border-r-0
                  flex flex-col items-center justify-center gap-0.5 p-1 transition-all hover:opacity-80
                  ${cellColour || 'hover:bg-stone-50'}
                  ${isToday && km === 0 && !hasPlannedRun ? 'ring-2 ring-inset ring-orange-400' : ''}
                `}
              >
                <span className={`text-sm font-semibold leading-none ${textColour}`}>
                  {day}
                </span>
                {km > 0 && <span className="text-xs font-medium opacity-90 leading-none">{km.toFixed(1)}</span>}
                {/* Strength indicator */}
                {hasStrength && (
                  <div className="flex gap-0.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-yellow-100 border border-yellow-300" />Planned</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-100 border border-green-300" />Run &lt; 5 km</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-300 border border-green-400" />5–10 km</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-500 border border-green-600" />10–21 km</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-700 border border-green-800" />21+ km</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-100 border border-red-300" />Miss</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-indigo-400" />Strength</div>
      </div>

      {/* Weekly summaries */}
      <div className="space-y-2">
        <h2 className="font-semibold text-stone-800">Weekly breakdown</h2>
        {weeks.map(({ weekNum, days }) => (
          <WeekRow key={weekNum} weekNum={weekNum} days={days} runsByDay={runsByDay} plannedByDay={plannedByDay} onCopyWeek={copyWeek} />
        ))}
      </div>

      {/* Day panel */}
      {selectedDate && !addingDate && (
        <DayPanel
          date={selectedDate}
          runs={selectedRuns}
          planned={selectedPlanned}
          onAdd={() => { setAddingDate(selectedDate); setSelectedDate(null); }}
          onDelete={async (id) => { await deletePlanned(id); load(); }}
          onClose={() => setSelectedDate(null)}
        />
      )}

      {/* Add modal */}
      {addingDate && (
        <AddModal date={addingDate} onSave={savePlanned} onClose={() => setAddingDate(null)} />
      )}
    </div>
  );
}
