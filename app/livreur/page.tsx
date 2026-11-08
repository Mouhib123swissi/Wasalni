'use client';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import RequireAuth from '@/components/RequireAuth';
import { createClient } from '@/lib/supabase-client';
import { OrderRow } from '@/lib/supabase';
import { formatDT, STATUS_LABELS } from '@/lib/format';
import { ERR } from '@/lib/errors';

// Leaflet needs the browser: never SSR the map.
const DeliveryMap = dynamic(() => import('@/components/DeliveryMap'), { ssr: false, loading: () => <div className="w-full rounded-2xl border bg-gray-50 p-4 text-sm text-gray-500" style={{ height: 240 }}>Chargement de la carte…</div> });

export default function LivreurPage() { return <RequireAuth title="Espace livreur" role="courier"><LivreurInner /></RequireAuth>; }

// Haversine distance in metres.
function distM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000; const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat); const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const GEO_DENIED_MSG = 'Position non partagée : accès à la localisation refusé — le suivi de statut continue de fonctionner';

function CourierCard({ order, onMarkDelivered }: { order: OrderRow; onMarkDelivered: (o: OrderRow) => Promise<void> }) {
  const [sharing, setSharing] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [ownPos, setOwnPos] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState('');
  const [simNote, setSimNote] = useState('');
  const watchIdRef = useRef<number | null>(null);
  const simTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSentRef = useRef<{ lat: number; lng: number; at: number } | null>(null);
  const simTRef = useRef(0);

  const resto = order.dlv_restaurants;
  const restoPt = (resto?.lat != null && resto?.lng != null) ? { lat: Number(resto.lat), lng: Number(resto.lng), name: resto.name } : null;
  const customerPt = (order.delivery_lat != null && order.delivery_lng != null) ? { lat: Number(order.delivery_lat), lng: Number(order.delivery_lng) } : null;
  const hasRoute = !!(restoPt && customerPt);

  async function upsert(lat: number, lng: number, accuracy: number | null) {
    try {
      const sb = createClient();
      await sb.rpc('upsert_courier_position', { p_order_id: order.id, p_lat: lat, p_lng: lng, p_accuracy: accuracy });
    } catch { /* position sharing is best-effort; status flow keeps working */ }
  }

  function stopWatch() {
    if (watchIdRef.current != null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
  }
  function stopSim() {
    if (simTimerRef.current != null) clearInterval(simTimerRef.current);
    simTimerRef.current = null;
  }
  function stopAll() { stopWatch(); stopSim(); setSharing(false); setSimulating(false); }

  // Auto-stop when the order leaves "in progress" (e.g. marked delivered):
  // unmount cleanup clears the watch and the simulation timer.
  useEffect(() => () => { stopWatch(); stopSim(); }, []);

  function startSharing() {
    setGeoError('');
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError('Position non partagée : la géolocalisation n’est pas disponible sur cet appareil — le suivi de statut continue de fonctionner');
      return;
    }
    setSharing(true);
    lastSentRef.current = null;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setOwnPos({ lat: latitude, lng: longitude });
        // Throttle: at most 1 update per 10 s, or when moved > 20 m.
        const last = lastSentRef.current;
        const now = Date.now();
        if (last && now - last.at < 10000 && distM(last.lat, last.lng, latitude, longitude) < 20) return;
        lastSentRef.current = { lat: latitude, lng: longitude, at: now };
        void upsert(latitude, longitude, accuracy ?? null);
      },
      (err) => {
        stopWatch(); setSharing(false);
        setGeoError(err.code === err.PERMISSION_DENIED ? GEO_DENIED_MSG : 'Position non partagée : localisation indisponible — le suivi de statut continue de fonctionner');
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
  }

  function toggleSharing() {
    if (sharing) { stopWatch(); setSharing(false); return; }
    if (simulating) { stopSim(); setSimulating(false); }
    startSharing();
  }

  function toggleSim() {
    if (simulating) { stopSim(); setSimulating(false); setSimNote(''); return; }
    if (!hasRoute) { setSimNote('Simulation impossible : les positions du restaurant et du client sont inconnues pour cette commande.'); return; }
    if (sharing) { stopWatch(); setSharing(false); }
    setGeoError(''); setSimNote('');
    setSimulating(true);
    simTRef.current = 0;
    const start = restoPt!; const end = customerPt!;
    const step = () => {
      simTRef.current = Math.min(1, simTRef.current + 0.05);
      const t = simTRef.current;
      const lat = start.lat + (end.lat - start.lat) * t;
      const lng = start.lng + (end.lng - start.lng) * t;
      setOwnPos({ lat, lng });
      void upsert(lat, lng, null);
      if (t >= 1 && simTimerRef.current != null) { clearInterval(simTimerRef.current); simTimerRef.current = null; setSimulating(false); }
    };
    step();
    simTimerRef.current = setInterval(step, 5000);
  }

  async function handleDelivered() {
    stopAll();
    await onMarkDelivered(order);
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex justify-between"><span className="font-bold">{order.order_number} — {resto?.name ?? ''}</span><span className="font-bold">{formatDT(order.total)}</span></div>
      <p className="text-sm text-gray-500">{order.address ?? ''} · {STATUS_LABELS[order.status]}</p>
      <div className="mt-3">
        <DeliveryMap height={240} restaurant={restoPt} customer={customerPt} courier={ownPos ? { ...ownPos, updatedAt: new Date().toISOString() } : null} />
        {!restoPt && <p className="text-xs text-gray-500 mt-2">Position du restaurant inconnue.</p>}
        {!customerPt && <p className="text-xs text-gray-500 mt-2">Position du client inconnue (adresse textuelle uniquement).</p>}
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        <button onClick={toggleSharing} className={`font-bold text-sm px-4 py-2 rounded-full ${sharing ? 'bg-red-100 text-red-700' : 'bg-[#FFC244]'}`}>
          {sharing ? 'Arrêter le partage de position' : 'Partager ma position'}
        </button>
        <button onClick={toggleSim} className={`font-bold text-sm px-4 py-2 rounded-full border ${simulating ? 'bg-red-100 text-red-700 border-red-200' : 'bg-white border-gray-300'}`}>
          {simulating ? 'Arrêter la simulation (démo)' : 'Simuler le déplacement (démo)'}
        </button>
      </div>
      {sharing && <p className="text-xs text-green-700 mt-2">● Partage de position actif — votre position est envoyée au client (max 1 fois / 10 s).</p>}
      {simulating && <p className="text-xs text-amber-700 mt-2">Démo : position simulée le long du trajet restaurant → client (1 point / 5 s). Aucune position GPS réelle n’est utilisée.</p>}
      {simNote && <p className="text-xs text-gray-500 mt-2">{simNote}</p>}
      {geoError && <p className="text-xs text-red-600 mt-2">{geoError}</p>}
      <button onClick={() => void handleDelivered()} className="mt-3 bg-[#1A1A1A] text-white font-bold text-sm px-4 py-2 rounded-full">Marquer livrée</button>
    </div>
  );
}

function LivreurInner() {
  const [orders, setOrders] = useState<OrderRow[]>([]); const [userId, setUserId] = useState<string | null>(null); const [msg, setMsg] = useState('');
  async function load() {
    const sb = createClient();
    // v3: also fetch restaurant lat/lng + order delivery lat/lng for the map.
    const { data } = await sb.from('dlv_orders').select('*, dlv_restaurants(name, lat, lng)').in('status', ['preparing', 'on_the_way', 'delivered']).order('created_at', { ascending: false }).limit(50);
    setOrders((data as OrderRow[]) ?? []);
  }
  useEffect(() => { (async () => { const sb = createClient(); const { data } = await sb.auth.getUser(); setUserId(data.user?.id ?? null); await load(); })(); }, []);
  const available = orders.filter(o => o.status === 'preparing');
  const mine = orders.filter(o => o.status === 'on_the_way' && o.courier_id === userId);
  const deliveredMine = orders.filter(o => o.status === 'delivered' && o.courier_id === userId);
  const earnings = deliveredMine.reduce((s, o) => s + Number(o.delivery_fee ?? 0), 0);
  async function setStatus(o: OrderRow, status: string) {
    setMsg('');
    try {
      const res = await fetch(`/api/orders/${o.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      if (!res.ok) throw new Error();
      await load();
    } catch { setMsg(ERR.update); }
  }
  return (<div className="max-w-4xl mx-auto px-4 py-8">
    <h1 className="text-2xl sm:text-3xl font-extrabold">Espace livreur</h1>
    <div className="grid grid-cols-2 gap-4 mt-6">
      <div className="bg-white rounded-2xl p-4"><p className="text-sm text-gray-500">Livraisons terminées</p><p className="text-2xl font-extrabold">{deliveredMine.length}</p></div>
      <div className="bg-white rounded-2xl p-4"><p className="text-sm text-gray-500">Gains (frais de livraison)</p><p className="text-2xl font-extrabold">{formatDT(earnings)}</p></div>
    </div>
    {msg && <p className="text-red-600 text-sm mt-3">{msg}</p>}
    <h2 className="font-bold text-lg mt-8">Prêtes à récupérer</h2>
    <div className="space-y-3 mt-3">{available.length === 0 && <p className="bg-white rounded-2xl p-6 text-gray-500">Aucune commande prête pour le moment.</p>}
    {available.map(o => (<div key={o.id} className="bg-white rounded-2xl p-4 shadow-sm"><div className="flex justify-between"><span className="font-bold">{o.order_number} — {o.dlv_restaurants?.name ?? ''}</span><span className="font-bold">{formatDT(o.total)}</span></div><p className="text-sm text-gray-500">{o.address ?? ''} · {o.customer_name ?? ''} · {o.customer_phone ?? ''}</p><button onClick={() => void setStatus(o, 'on_the_way')} className="mt-3 bg-[#FFC244] font-bold text-sm px-4 py-2 rounded-full">Accepter la livraison</button></div>))}</div>
    <h2 className="font-bold text-lg mt-8">Mes livraisons en cours</h2>
    <div className="space-y-3 mt-3">{mine.length === 0 && <p className="bg-white rounded-2xl p-6 text-gray-500">Aucune livraison en cours.</p>}
    {mine.map(o => (<CourierCard key={o.id} order={o} onMarkDelivered={(ord) => setStatus(ord, 'delivered')} />))}</div>
  </div>);
}
