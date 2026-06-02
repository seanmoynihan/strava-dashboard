'use client';

import { useState, useEffect } from 'react';
import type { Activity } from '@/lib/types';

/* ─── Types ─────────────────────────────────────────────── */
interface WeightEntry { id: number; date: string; kg: number }

/* ─── Riegel race-time prediction ───────────────────────── */
// T2 = T1 × (D2/D1)^1.06
function predictTime(refDistM: number, refTimeSec: number, targetDistM: number): number {
  return refTimeSec * Math.pow(targetDistM / refDistM, 1.06);
}

function secToHms(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function paceStr(timeSec: number, distM: number): string {
  const secPerKm = timeSec / (distM / 1000);
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')} /km`;
}

interface RacePrediction { label: string; distM: number; time: string; pace: string }

function computePredictions(activities: Activity[]): RacePrediction[] | null {
  // Find best speed for each reference distance
  const refs: Array<{ minDist: number; dist: number; label: string }> = [
    { minDist: 5000, dist: 5000, label: '5K' },
    { minDist: 8000, dist: 8047, label: '5 Mile' },
    { minDist: 9500, dist: 10000, label: '10K' },
  ];

  let refDistM = 0, refTimeSec = 0;
  for (const r of refs) {
    const pool = activities.filter(a => a.distance >= r.minDist);
    if (!pool.length) continue;
    const best = pool.reduce((a, b) => b.average_speed > a.average_speed ? b : a);
    refDistM = r.dist;
    refTimeSec = r.dist / best.average_speed;
    break;
  }
  if (!refDistM) return null;

  const targets = [
    { label: '5K', distM: 5000 },
    { label: '5 Mile', distM: 8047 },
    { label: '10K', distM: 10000 },
    { label: '10 Mile', distM: 16093 },
    { label: 'Half Marathon', distM: 21097 },
    { label: 'Marathon', distM: 42195 },
  ];

  return targets.map(t => {
    const timeSec = predictTime(refDistM, refTimeSec, t.distM);
    return { label: t.label, distM: t.distM, time: secToHms(timeSec), pace: paceStr(timeSec, t.distM) };
  });
}

/* ─── Training zone paces ───────────────────────────────── */
interface Zone { label: string; pace: string; description: string; colour: string }

function computeZones(activities: Activity[]): Zone[] | null {
  const over5k = activities.filter(a => a.distance >= 5000);
  if (!over5k.length) return null;
  const best5k = over5k.reduce((a, b) => b.average_speed > a.average_speed ? b : a);
  const racePaceSecPerKm = 1000 / best5k.average_speed;

  const zones: Array<{ label: string; offsetSec: number; rangeLabel: string; desc: string; colour: string }> = [
    { label: 'Easy / Recovery', offsetSec: 90, rangeLabel: '+75–105s', desc: 'Conversational pace. Most of your weekly mileage should be here.', colour: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    { label: 'Aerobic / Long Run', offsetSec: 60, rangeLabel: '+45–75s', desc: 'Steady effort. Use for long runs and base building.', colour: 'bg-blue-100 text-blue-800 border-blue-200' },
    { label: 'Tempo / Threshold', offsetSec: 15, rangeLabel: '+10–20s', desc: 'Comfortably hard — you can speak a few words. 20–40 min at this pace.', colour: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    { label: 'Interval (VO₂ max)', offsetSec: 0, rangeLabel: '5K race pace', desc: '3–5 min reps with equal rest. Builds aerobic power.', colour: 'bg-orange-100 text-orange-800 border-orange-200' },
    { label: 'Repetition / Speed', offsetSec: -12, rangeLabel: '−10–15s', desc: 'Short fast reps (200–400m) with full recovery. Builds raw speed.', colour: 'bg-red-100 text-red-800 border-red-200' },
  ];

  return zones.map(z => {
    const sPerKm = racePaceSecPerKm + z.offsetSec;
    const m = Math.floor(sPerKm / 60);
    const s = Math.round(sPerKm % 60);
    return { label: z.label, pace: `${m}:${String(s).padStart(2, '0')} /km`, description: z.desc, colour: z.colour };
  });
}

/* ─── Interval workout suggestions ─────────────────────── */
interface Workout { name: string; structure: string; purpose: string }

function computeWorkouts(activities: Activity[]): Workout[] | null {
  const over5k = activities.filter(a => a.distance >= 5000);
  if (!over5k.length) return null;
  const best5k = over5k.reduce((a, b) => b.average_speed > a.average_speed ? b : a);
  const raceSec = 5000 / best5k.average_speed;
  const raceMin = Math.floor(raceSec / 60);
  const raceSecs = Math.round(raceSec % 60);
  const p5k = `${raceMin}:${String(raceSecs).padStart(2, '0')} /km`;

  const tempoSec = 5000 / best5k.average_speed + 15;
  const tMin = Math.floor(tempoSec / 60);
  const tSec = Math.round(tempoSec % 60);
  const pTempo = `${tMin}:${String(tSec).padStart(2, '0')} /km`;

  const repSec = Math.max(60, 5000 / best5k.average_speed - 12);
  const rMin = Math.floor(repSec / 60);
  const rSec = Math.round(repSec % 60);
  const pRep = `${rMin}:${String(rSec).padStart(2, '0')} /km`;

  return [
    { name: '5 × 1000m Intervals', structure: `5 reps of 1km @ ${p5k} · 90s rest between`, purpose: 'Build VO₂ max and 5K/10K speed' },
    { name: '8 × 400m Reps', structure: `8 reps of 400m @ ${pRep} · 2 min rest between`, purpose: 'Develop leg speed and running economy' },
    { name: '3 × 2km Tempo', structure: `3 reps of 2km @ ${pTempo} · 3 min jog rest`, purpose: 'Raise lactate threshold and 10K fitness' },
    { name: '20 min Tempo Run', structure: `Continuous 20 min @ ${pTempo} after warm-up`, purpose: 'Classic threshold session — improves sustained pace' },
    { name: 'Fartlek — 6 × 3 min', structure: `6 × 3 min hard (${p5k}) / 2 min easy, embedded in easy run`, purpose: 'Unstructured speed work, great for variety' },
    { name: 'Pyramid Intervals', structure: `400m → 800m → 1200m → 800m → 400m @ ${p5k} · equal rest`, purpose: 'Varied stimulus, builds confidence at race pace' },
  ];
}

/* ─── Weight chart (inline SVG) ─────────────────────────── */
function WeightChart({ entries }: { entries: WeightEntry[] }) {
  if (entries.length < 2) return null;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const kgs = sorted.map(e => e.kg);
  const minKg = Math.min(...kgs) - 1;
  const maxKg = Math.max(...kgs) + 1;
  const W = 600, H = 140, PAD = 32;

  const x = (i: number) => PAD + (i / (sorted.length - 1)) * (W - PAD * 2);
  const y = (kg: number) => PAD + ((maxKg - kg) / (maxKg - minKg)) * (H - PAD * 2);

  const points = sorted.map((e, i) => `${x(i)},${y(e.kg)}`).join(' ');
  const areaPoints = `${x(0)},${H - PAD} ${points} ${x(sorted.length - 1)},${H - PAD}`;

  const startKg = sorted[0].kg;
  const endKg = sorted[sorted.length - 1].kg;
  const diff = endKg - startKg;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-stone-400">
        <span>{sorted[0].date}</span>
        <span className={`font-semibold ${diff < 0 ? 'text-emerald-600' : diff > 0 ? 'text-red-500' : 'text-stone-500'}`}>
          {diff < 0 ? '▼' : diff > 0 ? '▲' : '='} {Math.abs(diff).toFixed(1)} kg
        </span>
        <span>{sorted[sorted.length - 1].date}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => (
          <line key={t} x1={PAD} y1={PAD + t * (H - PAD * 2)} x2={W - PAD} y2={PAD + t * (H - PAD * 2)} stroke="#e7e5e4" strokeWidth="1" />
        ))}
        {/* Area fill */}
        <polygon points={areaPoints} fill="#FC4C02" fillOpacity="0.08" />
        {/* Line */}
        <polyline points={points} fill="none" stroke="#FC4C02" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {/* Dots */}
        {sorted.map((e, i) => (
          <circle key={e.id} cx={x(i)} cy={y(e.kg)} r="4" fill="white" stroke="#FC4C02" strokeWidth="2" />
        ))}
        {/* Y labels */}
        {[minKg + 1, Math.round((minKg + maxKg) / 2), maxKg - 1].map(kg => (
          <text key={kg} x={PAD - 4} y={y(kg) + 4} textAnchor="end" fontSize="10" fill="#a8a29e">{kg}</text>
        ))}
      </svg>
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────── */
export default function RecommendationsPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [weight, setWeight] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKg, setNewKg] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/activities').then(r => r.json()),
      fetch('/api/weight').then(r => r.json()),
    ]).then(([acts, w]) => {
      setActivities(Array.isArray(acts) ? acts : []);
      setWeight(Array.isArray(w) ? w : []);
      setLoading(false);
    });
  }, []);

  const predictions = computePredictions(activities);
  const zones = computeZones(activities);
  const workouts = computeWorkouts(activities);
  const latestWeight = weight[0]?.kg ?? null;

  async function addWeight() {
    const kg = parseFloat(newKg);
    if (!newKg || isNaN(kg)) return;
    setSaving(true);
    const updated = await fetch('/api/weight', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: newDate, kg }) }).then(r => r.json());
    setWeight(Array.isArray(updated) ? updated : weight);
    setNewKg('');
    setSaving(false);
  }

  async function deleteWeight(id: number) {
    const updated = await fetch('/api/weight', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).then(r => r.json());
    setWeight(Array.isArray(updated) ? updated : weight);
  }

  if (loading) return (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-stone-100 rounded-2xl animate-pulse" />)}
    </div>
  );

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-stone-900">Recommendations</h1>

      {/* ── Race Target Predictions ─────────────────────── */}
      <section className="space-y-3">
        <SectionHeader icon="🎯" title="Race Target Predictions" sub="Based on your best efforts via the Riegel formula" />
        {predictions ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {predictions.map(p => (
              <div key={p.label} className="bg-white border border-stone-200 rounded-2xl px-5 py-4">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">{p.label}</p>
                <p className="text-2xl font-bold text-stone-900 mt-1">{p.time}</p>
                <p className="text-sm text-stone-500 mt-0.5">{p.pace}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState text="Sync some runs to generate race predictions." />
        )}
      </section>

      {/* ── Training Zones ──────────────────────────────── */}
      <section className="space-y-3">
        <SectionHeader icon="⚡" title="Training Pace Zones" sub="Derived from your best 5K effort" />
        {zones ? (
          <div className="space-y-2">
            {zones.map(z => (
              <div key={z.label} className={`border rounded-2xl px-5 py-4 flex items-start gap-4 ${z.colour}`}>
                <div className="min-w-[120px]">
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{z.label}</p>
                  <p className="text-xl font-bold mt-0.5">{z.pace}</p>
                </div>
                <p className="text-sm opacity-80 mt-1">{z.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState text="Sync some runs to generate training zones." />
        )}
      </section>

      {/* ── Interval Workouts ───────────────────────────── */}
      <section className="space-y-3">
        <SectionHeader icon="🔁" title="Suggested Workouts" sub="Based on your current fitness level" />
        {workouts ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {workouts.map(w => (
              <div key={w.name} className="bg-white border border-stone-200 rounded-2xl px-5 py-4">
                <p className="font-semibold text-stone-900">{w.name}</p>
                <p className="text-sm text-stone-600 mt-1 font-mono">{w.structure}</p>
                <p className="text-xs text-stone-400 mt-2">{w.purpose}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState text="Sync some runs to generate workout suggestions." />
        )}
      </section>

      {/* ── Nutrition ───────────────────────────────────── */}
      <section className="space-y-3">
        <SectionHeader icon="🥗" title="Nutrition Guide" sub={latestWeight ? `Personalised for ${latestWeight} kg` : 'General guidelines for runners'} />
        <NutritionGuide weightKg={latestWeight} />
      </section>

      {/* ── Weight Tracker ──────────────────────────────── */}
      <section className="space-y-3">
        <SectionHeader icon="⚖️" title="Weight Tracker" sub="Log your weight to track progress over time" />
        <div className="bg-white border border-stone-200 rounded-2xl px-5 py-4 space-y-4">
          {/* Chart */}
          {weight.length >= 2 ? <WeightChart entries={weight} /> : (
            <p className="text-sm text-stone-400 text-center py-4">Add at least 2 entries to see your trend.</p>
          )}

          {/* Add entry */}
          <div className="flex gap-2 pt-2 border-t border-stone-100">
            <input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
            <input
              type="number"
              step="0.1"
              placeholder="Weight (kg)"
              value={newKg}
              onChange={e => setNewKg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addWeight()}
              className="flex-1 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
            <button
              onClick={addWeight}
              disabled={saving || !newKg}
              className="px-4 py-2 bg-[#FC4C02] text-white text-sm font-medium rounded-xl hover:bg-[#e04400] disabled:opacity-50 transition-colors"
            >
              {saving ? '…' : 'Add'}
            </button>
          </div>

          {/* History */}
          {weight.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {weight.map((e, i) => {
                const prev = weight[i + 1];
                const diff = prev ? e.kg - prev.kg : null;
                return (
                  <div key={e.id} className="flex items-center justify-between text-sm py-1.5 border-b border-stone-50 last:border-0">
                    <span className="text-stone-500">{e.date}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-stone-800">{e.kg} kg</span>
                      {diff !== null && (
                        <span className={`text-xs font-medium ${diff < 0 ? 'text-emerald-600' : diff > 0 ? 'text-red-500' : 'text-stone-400'}`}>
                          {diff < 0 ? '▼' : diff > 0 ? '▲' : '—'} {Math.abs(diff).toFixed(1)}
                        </span>
                      )}
                      <button onClick={() => deleteWeight(e.id)} className="text-stone-300 hover:text-red-400 transition-colors text-xs">✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* ─── Small components ──────────────────────────────────── */
function SectionHeader({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <h2 className="text-lg font-bold text-stone-900">{title}</h2>
        <p className="text-sm text-stone-400">{sub}</p>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="bg-white border border-stone-200 rounded-2xl px-5 py-8 text-center text-stone-400 text-sm">{text}</div>;
}

function NutritionGuide({ weightKg }: { weightKg: number | null }) {
  const protein = weightKg ? `${Math.round(weightKg * 1.6)}–${Math.round(weightKg * 1.8)}g` : '1.6–1.8g/kg body weight';
  const carbs = weightKg ? `${Math.round(weightKg * 5)}–${Math.round(weightKg * 7)}g` : '5–7g/kg';
  const carbsHard = weightKg ? `${Math.round(weightKg * 7)}–${Math.round(weightKg * 10)}g` : '7–10g/kg';

  const panels = [
    {
      title: 'Daily Protein',
      value: protein,
      detail: 'Prioritise lean sources: chicken, fish, eggs, Greek yoghurt, legumes. Split across meals to maximise muscle repair.',
      colour: 'border-l-4 border-l-blue-400',
    },
    {
      title: 'Carbohydrates',
      value: `${carbs} (easy days) · ${carbsHard} (hard/long days)`,
      detail: 'Oats, rice, sweet potato, wholegrain bread, fruit. Fuel long runs with fast carbs (banana, white rice, energy gels).',
      colour: 'border-l-4 border-l-orange-400',
    },
    {
      title: 'Pre-Run (1–2 hrs before)',
      value: 'Light carb-focused meal',
      detail: 'Toast + banana, porridge, or rice cakes. Avoid high-fat/high-fibre foods. Stay hydrated — 500ml water 2 hrs before.',
      colour: 'border-l-4 border-l-yellow-400',
    },
    {
      title: 'Post-Run Recovery (within 45 min)',
      value: 'Protein + fast carbs',
      detail: 'Chocolate milk, yoghurt + fruit, eggs on toast, or a protein shake with banana. Targets ~3:1 carb:protein ratio.',
      colour: 'border-l-4 border-l-emerald-400',
    },
    {
      title: 'Hydration',
      value: weightKg ? `~${(weightKg * 0.033).toFixed(1)}L/day baseline` : '~2.5–3L/day',
      detail: 'Add 500–750ml per hour of running. Electrolytes matter on runs over 60 min — sodium, potassium, magnesium.',
      colour: 'border-l-4 border-l-cyan-400',
    },
    {
      title: 'Foods to Limit',
      value: 'Ultra-processed, alcohol, excess sugar',
      detail: 'These impair recovery and sleep quality. Alcohol within 24hrs of a hard session significantly blunts adaptation.',
      colour: 'border-l-4 border-l-red-300',
    },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {panels.map(p => (
        <div key={p.title} className={`bg-white border border-stone-200 rounded-2xl px-5 py-4 ${p.colour}`}>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">{p.title}</p>
          <p className="text-sm font-bold text-stone-800 mt-1">{p.value}</p>
          <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">{p.detail}</p>
        </div>
      ))}
    </div>
  );
}
