'use client';
import { useEffect, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';

// Shared live-delivery map (v3). Leaflet is loaded dynamically inside the
// effect only (never imported at module level), and every page that uses
// this component loads it with next/dynamic ssr:false. Markers are pure
// L.divIcon divs — Leaflet's default marker images are never used (they
// break under bundling). Tiles: OpenStreetMap, free, no API key.
// CSP note: next.config.js allows img-src https://tile.openstreetmap.org.

export const SIDI_BOUZID_CENTER = { lat: 35.03, lng: 9.48 };

export type MapPoint = { lat: number; lng: number };
export type RestaurantPoint = MapPoint & { name?: string | null };
export type CourierPoint = MapPoint & { updatedAt?: string | null };

export type DeliveryMapProps = {
  restaurant?: RestaurantPoint | null;
  customer?: MapPoint | null;
  courier?: CourierPoint | null;
  /** Map height in px (default 260). Width is 100% — responsive at 390px. */
  height?: number;
  /** When true, a tap/click on the map drops a pin and calls onPick. */
  interactive?: boolean;
  onPick?: (lat: number, lng: number) => void;
  /** The pin dropped in interactive mode. */
  pick?: MapPoint | null;
  /** Preferred centre (e.g. selected zone centroid); defaults to Sidi Bouzid. */
  center?: MapPoint | null;
};

function valid(p: MapPoint | null | undefined): p is MapPoint {
  return !!p && Number.isFinite(p.lat) && Number.isFinite(p.lng)
    && p.lat >= -90 && p.lat <= 90 && p.lng >= -180 && p.lng <= 180;
}

function pinIcon(L: typeof Leaflet, kind: 'restaurant' | 'customer' | 'courier' | 'pick', label?: string) {
  const styles: Record<string, { bg: string; fg: string; glyph: string; size: number }> = {
    restaurant: { bg: '#FFC244', fg: '#1A1A1A', glyph: '🍽', size: 34 },
    customer: { bg: '#1A1A1A', fg: '#FFC244', glyph: '⌂', size: 34 },
    courier: { bg: '#16A34A', fg: '#FFFFFF', glyph: '●', size: 22 },
    pick: { bg: '#DC2626', fg: '#FFFFFF', glyph: '📍', size: 34 },
  };
  const s = styles[kind];
  const html = kind === 'courier'
    ? `<div style="position:relative;width:${s.size}px;height:${s.size}px"><span style="position:absolute;inset:-6px;border-radius:9999px;background:${s.bg};opacity:.35;animation:wasalni-ping 1.6s cubic-bezier(0,0,.2,1) infinite"></span><span style="position:relative;display:flex;align-items:center;justify-content:center;width:${s.size}px;height:${s.size}px;border-radius:9999px;background:${s.bg};color:${s.fg};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);font-size:11px">●</span></div>`
    : `<div title="${(label ?? '').replace(/"/g, '')}" style="display:flex;align-items:center;justify-content:center;width:${s.size}px;height:${s.size}px;border-radius:9999px 9999px 9999px 0;transform:rotate(-45deg);background:${s.bg};color:${s.fg};border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);font-size:17px"><span style="transform:rotate(45deg);line-height:1">${s.glyph}</span></div>`;
  return L.divIcon({ html, className: 'wasalni-div-icon', iconSize: [s.size, s.size], iconAnchor: kind === 'courier' ? [s.size / 2, s.size / 2] : [s.size / 2, s.size], popupAnchor: [0, -s.size / 2] });
}

export default function DeliveryMap({ restaurant, customer, courier, height = 260, interactive = false, onPick, pick, center }: DeliveryMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const layerRef = useRef<Leaflet.LayerGroup | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const hasRestaurant = valid(restaurant);
  const hasCustomer = valid(customer);
  const hasCourier = valid(courier);
  const hasPick = valid(pick);
  const markerCount = [hasRestaurant, hasCustomer, hasCourier, hasPick].filter(Boolean).length;

  // Init the map once.
  useEffect(() => {
    let cancelled = false;
    let map: Leaflet.Map | null = null;
    (async () => {
      try {
        const L = await import('leaflet');
        if (cancelled || !containerRef.current) return;
        const c = valid(center) ? center! : SIDI_BOUZID_CENTER;
        map = L.map(containerRef.current, { scrollWheelZoom: !interactive, dragging: true, zoomControl: true, attributionControl: true }).setView([c.lat, c.lng], 13);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);
        layerRef.current = L.layerGroup().addTo(map);
        if (interactive) {
          map.on('click', (e: Leaflet.LeafletMouseEvent) => {
            onPickRef.current?.(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
          });
        }
        mapRef.current = map;
        setReady(true);
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
      if (map) { map.remove(); map = null; }
      mapRef.current = null; layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render markers / polyline whenever the points change.
  useEffect(() => {
    if (!ready || !mapRef.current || !layerRef.current) return;
    let cancelled = false;
    (async () => {
      const L = await import('leaflet');
      if (cancelled) return;
      const map = mapRef.current!;
      const layer = layerRef.current!;
      layer.clearLayers();
      const pts: [number, number][] = [];
      if (hasRestaurant) {
        L.marker([restaurant!.lat, restaurant!.lng], { icon: pinIcon(L, 'restaurant', restaurant!.name ?? 'Restaurant') })
          .bindPopup(restaurant!.name ? `<b>${restaurant!.name}</b><br/>Restaurant` : 'Restaurant').addTo(layer);
        pts.push([restaurant!.lat, restaurant!.lng]);
      }
      if (hasCustomer) {
        L.marker([customer!.lat, customer!.lng], { icon: pinIcon(L, 'customer', 'Votre adresse') })
          .bindPopup('Votre adresse de livraison').addTo(layer);
        pts.push([customer!.lat, customer!.lng]);
      }
      if (hasCourier) {
        L.marker([courier!.lat, courier!.lng], { icon: pinIcon(L, 'courier') })
          .bindPopup('Livreur').addTo(layer);
        pts.push([courier!.lat, courier!.lng]);
      }
      if (hasPick) {
        L.marker([pick!.lat, pick!.lng], { icon: pinIcon(L, 'pick', 'Votre position') })
          .bindPopup('Votre position').addTo(layer);
        pts.push([pick!.lat, pick!.lng]);
      }
      if (hasRestaurant && hasCourier && hasCustomer) {
        L.polyline([[restaurant!.lat, restaurant!.lng], [courier!.lat, courier!.lng], [customer!.lat, customer!.lng]], { color: '#16A34A', weight: 4, dashArray: '2 6' }).addTo(layer);
      } else if (hasRestaurant && hasCustomer) {
        L.polyline([[restaurant!.lat, restaurant!.lng], [customer!.lat, customer!.lng]], { color: '#FFC244', weight: 3, dashArray: '6 6', opacity: 0.8 }).addTo(layer);
      }
      if (pts.length > 1) map.fitBounds(L.latLngBounds(pts), { padding: [24, 24] });
      else if (pts.length === 1) map.setView(pts[0], 15);
      else map.setView([SIDI_BOUZID_CENTER.lat, SIDI_BOUZID_CENTER.lng], 13);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, restaurant?.lat, restaurant?.lng, restaurant?.name, customer?.lat, customer?.lng, courier?.lat, courier?.lng, pick?.lat, pick?.lng]);

  const missing: string[] = [];
  if (!hasRestaurant) missing.push('restaurant');
  if (!hasCustomer) missing.push('adresse de livraison');

  return (
    <div>
      <style>{`@keyframes wasalni-ping{0%{transform:scale(1);opacity:.35}80%,100%{transform:scale(1.9);opacity:0}} .wasalni-div-icon{background:transparent;border:none} .leaflet-container{font-family:inherit}`}</style>
      {loadError ? (
        <div className="w-full rounded-2xl border bg-white p-4 text-sm text-gray-500" style={{ height }}>
          Carte indisponible pour le moment — le suivi de statut continue de fonctionner.
        </div>
      ) : (
        <div ref={containerRef} style={{ height, width: '100%' }} className="rounded-2xl overflow-hidden border z-0" role="img" aria-label="Carte de livraison" />
      )}
      {markerCount === 0 && !loadError && (
        <p className="text-xs text-gray-500 mt-2">Aucune position disponible pour le moment — la carte affiche Sidi Bouzid.</p>
      )}
      {markerCount > 0 && missing.length > 0 && (
        <p className="text-xs text-gray-500 mt-2">Position du {missing.join(' et de l’')} non disponible — la carte affiche les positions connues.</p>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
        <span><span className="inline-block w-2.5 h-2.5 rounded-full align-middle mr-1" style={{ background: '#FFC244' }} />Restaurant</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-full align-middle mr-1" style={{ background: '#1A1A1A' }} />Votre adresse</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-full align-middle mr-1" style={{ background: '#16A34A' }} />Livreur</span>
      </div>
    </div>
  );
}
