'use client';

import { useEffect, useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';

interface Props {
  encoded: string;
}

export default function MiniMap({ encoded }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const initialised = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Lazy-init via IntersectionObserver — only load when card is visible
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || initialised.current) return;
        initialised.current = true;
        observer.disconnect();
        initMap();
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encoded]);

  async function initMap() {
    const el = containerRef.current;
    if (!el) return;

    const L = (await import('leaflet')).default;
    await import('leaflet/dist/leaflet.css');
    if (!containerRef.current) return;

    const polylineLib = (await import('@mapbox/polyline')).default;
    const coords = polylineLib.decode(encoded).map(([lat, lng]) => [lat, lng] as [number, number]);
    if (coords.length < 2) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    const line = L.polyline(coords, { color: '#FC4C02', weight: 3 }).addTo(map);
    map.fitBounds(line.getBounds(), { padding: [8, 8] });
  }

  return (
    <div
      ref={containerRef}
      className="shrink-0 w-56 h-40 rounded-xl overflow-hidden border border-stone-200 bg-stone-100"
    />
  );
}
