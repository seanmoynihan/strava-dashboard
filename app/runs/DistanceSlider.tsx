'use client';

import { useRef, useCallback } from 'react';

interface Props {
  min: number;
  max: number;
  low: number;
  high: number;
  onChange: (low: number, high: number) => void;
}

export default function DistanceSlider({ min, max, low, high, onChange }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const activeThumb = useRef<'low' | 'high' | null>(null);
  const latestLow = useRef(low);
  const latestHigh = useRef(high);
  latestLow.current = low;
  latestHigh.current = high;

  const pct = (v: number) => ((v - min) / (max - min)) * 100;

  const valFromEvent = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return min;
    const rect = track.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(min + p * (max - min));
  }, [min, max]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const val = valFromEvent(e.clientX);
    const distLow = Math.abs(val - latestLow.current);
    const distHigh = Math.abs(val - latestHigh.current);
    activeThumb.current = distLow <= distHigh ? 'low' : 'high';

    // Move immediately on click
    if (activeThumb.current === 'low') {
      onChange(Math.min(val, latestHigh.current - 1), latestHigh.current);
    } else {
      onChange(latestLow.current, Math.max(val, latestLow.current + 1));
    }

    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }, [valFromEvent, onChange]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!activeThumb.current) return;
    const val = valFromEvent(e.clientX);
    if (activeThumb.current === 'low') {
      onChange(Math.min(val, latestHigh.current - 1), latestHigh.current);
    } else {
      onChange(latestLow.current, Math.max(val, latestLow.current + 1));
    }
  }, [valFromEvent, onChange]);

  const onPointerUp = useCallback(() => {
    activeThumb.current = null;
  }, []);

  return (
    <div className="bg-white border border-stone-200 rounded-2xl px-5 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Distance</span>
        <span className="text-sm font-semibold text-stone-800">
          {low} – {high === max ? `${high}+` : high} km
        </span>
      </div>

      <div
        ref={trackRef}
        className="relative h-5 flex items-center cursor-pointer select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Track background */}
        <div className="absolute inset-x-0 h-1.5 bg-stone-200 rounded-full" />
        {/* Active range */}
        <div
          className="absolute h-1.5 bg-[#FC4C02] rounded-full"
          style={{ left: `${pct(low)}%`, right: `${100 - pct(high)}%` }}
        />
        {/* Low thumb */}
        <div
          className="absolute w-4 h-4 rounded-full bg-white border-2 border-[#FC4C02] shadow-sm -translate-x-1/2"
          style={{ left: `${pct(low)}%` }}
        />
        {/* High thumb */}
        <div
          className="absolute w-4 h-4 rounded-full bg-white border-2 border-[#FC4C02] shadow-sm -translate-x-1/2"
          style={{ left: `${pct(high)}%` }}
        />
      </div>

      {/* Tick labels */}
      <div className="flex justify-between text-xs text-stone-400">
        <span>{min} km</span>
        <span>{Math.round((min + max) / 2)} km</span>
        <span>{max}+ km</span>
      </div>
    </div>
  );
}
