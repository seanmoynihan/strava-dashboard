'use client';

import { useEffect, useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';

interface Props {
  polyline: string;
}

export default function RouteMap({ polyline }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    if (!containerRef.current || !polyline) return;
    let cancelled = false;

    async function init() {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (cancelled || !containerRef.current) return;

      // Prevent double-init (React StrictMode fires effects twice in dev)
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const polylineLib = (await import('@mapbox/polyline')).default;
      const coords = polylineLib.decode(polyline).map(([lat, lng]) => [lat, lng] as [number, number]);

      const map = L.map(containerRef.current, { zoomControl: true, attributionControl: false });
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

      const line = L.polyline(coords, { color: '#FC4C02', weight: 3 }).addTo(map);
      L.circleMarker(coords[0], { radius: 6, color: '#22c55e', fillColor: '#22c55e', fillOpacity: 1 }).addTo(map);
      L.circleMarker(coords[coords.length - 1], { radius: 6, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 1 }).addTo(map);

      map.fitBounds(line.getBounds(), { padding: [20, 20] });
    }

    init();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [polyline]);

  return <div ref={containerRef} className="w-full h-72 rounded-2xl overflow-hidden border border-stone-200" />;
}
