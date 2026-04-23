'use client';

import { useMemo } from 'react';
import polyline from '@mapbox/polyline';

interface Props {
  encoded: string;
  width?: number;
  height?: number;
}

export default function MiniMap({ encoded, width = 120, height = 72 }: Props) {
  const path = useMemo(() => {
    try {
      const coords = polyline.decode(encoded);
      if (coords.length < 2) return null;

      const lats = coords.map(([lat]) => lat);
      const lngs = coords.map(([, lng]) => lng);
      const minLat = lats.reduce((a, b) => Math.min(a, b));
      const maxLat = lats.reduce((a, b) => Math.max(a, b));
      const minLng = lngs.reduce((a, b) => Math.min(a, b));
      const maxLng = lngs.reduce((a, b) => Math.max(a, b));

      const pad = 6;
      const innerW = width - pad * 2;
      const innerH = height - pad * 2;

      const latRange = maxLat - minLat || 1e-6;
      const lngRange = maxLng - minLng || 1e-6;

      // Uniform scale — pick the axis that would overflow first
      const scale = Math.min(innerW / lngRange, innerH / latRange);

      // Centre the route in the box
      const scaledW = lngRange * scale;
      const scaledH = latRange * scale;
      const offsetX = pad + (innerW - scaledW) / 2;
      const offsetY = pad + (innerH - scaledH) / 2;

      const toX = (lng: number) => offsetX + (lng - minLng) * scale;
      const toY = (lat: number) => offsetY + (maxLat - lat) * scale; // invert Y

      return coords
        .map(([lat, lng], i) => `${i === 0 ? 'M' : 'L'}${toX(lng).toFixed(1)},${toY(lat).toFixed(1)}`)
        .join(' ');
    } catch {
      return null;
    }
  }, [encoded, width, height]);

  if (!path) return null;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0 rounded-xl overflow-hidden bg-stone-100"
    >
      <path d={path} fill="none" stroke="#FC4C02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
