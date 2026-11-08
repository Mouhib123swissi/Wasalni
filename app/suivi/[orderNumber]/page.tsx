'use client';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { formatDT, STATUS_LABELS, STATUS_STEPS } from '@/lib/format';
import { ERR } from '@/lib/errors';
import { createClient } from '@/lib/supabase-client';

// Leaflet needs the browser: never SSR the map.
const DeliveryMap = dynamic(() => import('@/components/DeliveryMap'), { ssr: false, loading: () => <div className="w-full rounded-2xl border bg-gray-50 p-4 text-sm text-gray-500" style={{ height: 260 }}>Chargement de la carte…</div> });

type TrackingOrder = {
  id: string; order_number: string; status: string; restaurant_name: string | null;
  items: { name: string; price: number; qty: number }[]; subtotal: number; delivery_fee: number;
  total: number; payment_method: string; address: string | null; created_at: string;
  // v3 (from get_order_tracking): coordinates, null when unknown.
  restaurant_lat: number | null; restaurant_lng: number | null;
  delivery_lat: number | null; delivery_lng: number | null;
  courier_lat: number | null; courier_lng: number | null; courier_updated_at: string | null;
};

function formatAgo(updatedAt: string | null, now: number): string {
  if (!updatedAt) return '';
  const s = Math.max(0, Math.floor((now - new Date(updatedAt).getTime()) / 1000));
  if (s < 5) return "à l'instant";
  if (s < 60) return `il y a ${s} s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `il y a ${m} min` : `il y a ${Math.floor(m / 60)} h`;
}

// Tracking is token-gated (F07): the page fetches /api/orders/[number]?token=
// and polls every 15 s. No direct table read, no realtime subscription.
export default function SuiviPage() {
  const params = useParams(); const orderNumber = params.orderNumber as string;
  const search = useSearchParams(); const token = search.get('token') ?? '';
  const [order, setOrder] = useState<TrackingOrder | null>(null); const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  // Tick so "mise à jour il y a Xs" stays fresh without re-fetching.
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(t); }, []);
  useEffect(() => {
    let cancelled = false;
    async function fetchOrder() {
      try {
        const qs = token ? `?token=${encodeURIComponent(token)}` : '';
        const res = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}${qs}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error();
        if (!cancelled) { setOrder(data as TrackingOrder); setError(''); }
      } catch { if (!cancelled && !order) setError(ERR.notFound); }
    }
    fetchOrder();
    // Poll every 10 s: the fallback that keeps tracking working for guests.
    const id = setInterval(fetchOrder, 10000);
    return () => { cancelled = true; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber, token]);
  // Realtime courier position (logged-in viewers only). Guests rely on the
  // 10 s poll above. If the table is not in the realtime publication the
  // subscription silently does nothing and polling still covers it.
  useEffect(() => {
    if (!order?.id) return;
    let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null;
    let sbRef: ReturnType<typeof createClient> | null = null;
    let cancelled = false;
    (async () => {
      try {
        const sb = createClient();
        sbRef = sb;
        const { data: { session } } = await sb.auth.getSession();
        if (cancelled || !session) return;
        channel = sb.channel(`courier-pos-${order.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'dlv_courier_positions', filter: `order_id=eq.${order.id}` }, (payload) => {
            const row = payload.new as { lat?: number; lng?: number; updated_at?: string } | null;
            if (row && typeof row.lat === 'number' && typeof row.lng === 'number') {
              setOrder((prev) => prev ? { ...prev, courier_lat: row.lat!, courier_lng: row.lng!, courier_updated_at: row.updated_at ?? new Date().toISOString() } : prev);
            }
          })
          .subscribe();
      } catch { /* realtime is a bonus; polling is the fallback */ }
    })();
    return () => { cancelled = true; if (channel && sbRef) { try { sbRef.removeChannel(channel); } catch {} } };
  }, [order?.id]);
  if (error && !order) return (<div className="max-w-3xl mx-auto px-4 py-8"><div className="bg-white rounded-2xl p-10 text-center"><p className="font-bold text-lg">{error}</p><Link href="/commandes" className="inline-block mt-4 bg-[#FFC244] font-bold px-6 py-3 rounded-full">Retrouver ma commande</Link></div></div>);
  if (!order) return <div className="max-w-3xl mx-auto px-4 py-8"><p>Chargement de votre commande…</p></div>;
  const stepIdx = order.status === 'cancelled' ? -1 : STATUS_STEPS.indexOf(order.status);
  return (<div className="max-w-3xl mx-auto px-4 py-8">
    <h1 className="text-2xl sm:text-3xl font-extrabold">Suivi de commande</h1>
    <p className="text-gray-500 mt-1">Commande {order.order_number} · {order.restaurant_name ?? 'Restaurant'}</p>
    {['confirmed', 'preparing', 'on_the_way', 'delivered'].includes(order.status) && (
      <div className="bg-white rounded-2xl shadow-sm mt-6 p-5">
        <h2 className="font-bold mb-3">Suivi en direct</h2>
        <DeliveryMap
          height={280}
          restaurant={(order.restaurant_lat != null && order.restaurant_lng != null) ? { lat: Number(order.restaurant_lat), lng: Number(order.restaurant_lng), name: order.restaurant_name } : null}
          customer={(order.delivery_lat != null && order.delivery_lng != null) ? { lat: Number(order.delivery_lat), lng: Number(order.delivery_lng) } : null}
          courier={(order.courier_lat != null && order.courier_lng != null) ? { lat: Number(order.courier_lat), lng: Number(order.courier_lng), updatedAt: order.courier_updated_at } : null}
        />
        {order.courier_lat != null && order.courier_lng != null ? (
          <p className="text-sm text-gray-600 mt-3">📍 Position du livreur mise à jour {formatAgo(order.courier_updated_at, now)}.</p>
        ) : order.status === 'on_the_way' ? (
          <p className="text-sm text-gray-500 mt-3">Le livreur n’a pas encore partagé sa position — elle apparaîtra ici dès qu’il active le partage.</p>
        ) : (
          <p className="text-sm text-gray-500 mt-3">La position du livreur apparaîtra ici dès qu’il sera en route.</p>
        )}
      </div>
    )}
    {order.status === 'cancelled' ? (<div className="bg-red-50 border border-red-200 rounded-2xl p-5 mt-6"><p className="font-bold text-red-700">Commande annulée</p><p className="text-sm text-red-600 mt-1">Cette commande a été annulée. Contactez le restaurant si besoin.</p></div>)
    : (<div className="bg-white rounded-2xl shadow-sm mt-6 p-5">
      <ol className="space-y-4">{STATUS_STEPS.map((s, i) => (<li key={s} className="flex items-center gap-3">
        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i <= stepIdx ? 'bg-[#FFC244]' : 'bg-gray-100 text-gray-400'}`}>{i < stepIdx ? '✓' : i + 1}</span>
        <span className={i <= stepIdx ? 'font-bold' : 'text-gray-400'}>{STATUS_LABELS[s]}</span>
        {i === stepIdx && <span className="text-xs bg-[#FFC244] rounded-full px-2 py-0.5 font-bold">Étape actuelle</span>}
      </li>))}</ol>
    </div>)}
    <div className="bg-white rounded-2xl shadow-sm mt-4 p-5">
      <h2 className="font-bold mb-3">Détails</h2>
      {(order.items ?? []).map((it, i) => (<p key={i} className="flex justify-between text-sm py-1"><span>{it.qty} × {it.name}</span><span>{formatDT(it.price * it.qty)}</span></p>))}
      <p className="flex justify-between text-sm py-1 border-t mt-2 pt-2"><span>Livraison</span><span>{formatDT(order.delivery_fee)}</span></p>
      <p className="flex justify-between font-extrabold"><span>Total</span><span>{formatDT(order.total)}</span></p>
      <p className="text-sm text-gray-500 mt-3">Livraison à : {order.address ?? ''}</p>
      <p className="text-sm text-gray-500">Paiement : {order.payment_method === 'cash' ? 'Espèces à la livraison' : 'Carte à la livraison'}</p>
      <p className="text-sm text-gray-500">Statut : {STATUS_LABELS[order.status] ?? order.status}</p>
    </div>
  </div>);
}
