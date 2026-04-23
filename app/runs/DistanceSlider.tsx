'use client';

import { useRef } from 'react';

interface Props {
  min: number;
  max: number;
  low: number;
  high: number;
  onChange: (low: number, high: number) => void;
}

export default function DistanceSlider({ min, max, low, high, onChange }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);

  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const leftPct = pct(low);
  const rightPct = pct(high);

  function onLow(e: React.ChangeEvent<HTMLInputElement>) {
    const v = Math.min(Number(e.target.value), high - 1);
    onChange(v, high);
  }

  function onHigh(e: React.ChangeEvent<HTMLInputElement>) {
    const v = Math.max(Number(e.target.value), low + 1);
    onChange(low, v);
  }

  return (
    <div className="bg-white border border-stone-200 rounded-2xl px-5 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Distance</span>
        <span className="text-sm font-semibold text-stone-800">
          {low} – {high === max ? `${high}+` : high} km
        </span>
      </div>

      <div ref={trackRef} className="relative h-5 flex items-center">
        {/* Track background */}
        <div className="absolute inset-x-0 h-1.5 bg-stone-200 rounded-full" />
        {/* Active range */}
        <div
          className="absolute h-1.5 bg-[#FC4C02] rounded-full"
          style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
        />

        {/* Low thumb */}
        <input
          type="range"
          min={min}
          max={max}
          value={low}
          onChange={onLow}
          className="absolute inset-0 w-full appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#FC4C02] [&::-webkit-slider-thumb]:shadow-sm [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[#FC4C02]"
          style={{ zIndex: low > max - 10 ? 5 : 3 }}
        />
        {/* High thumb */}
        <input
          type="range"
          min={min}
          max={max}
          value={high}
          onChange={onHigh}
          className="absolute inset-0 w-full appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#FC4C02] [&::-webkit-slider-thumb]:shadow-sm [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[#FC4C02]"
          style={{ zIndex: 4 }}
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
