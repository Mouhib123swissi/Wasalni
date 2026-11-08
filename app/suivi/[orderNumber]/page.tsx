'use client';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { formatDT, STATUS_LABELS, STATUS_STEPS } from '@/lib/format';
import { ERR } from '@/lib/errors';

type TrackingOrder = {
  id: string; order_number: string; status: string; restaurant_name: string | null;
  items: { name: string; price: number; qty: number }[]; subtotal: number; delivery_fee: number;
  total: number; payment_method: string; address: string | null; created_at: string;
};

// Tracking is token-gated (F07): the page fetches /api/orders/[number]?token=
// and polls every 15 s. No direct table read, no realtime subscription.
export default function SuiviPage() {
  const params = useParams(); const orderNumber = params.orderNumber as string;
  const search = useSearchParams(); const token = search.get('token') ?? '';
  const [order, setOrder] = useState<TrackingOrder | null>(null); const [error, setError] = useState('');
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
    const id = setInterval(fetchOrder, 15000);
    return () => { cancelled = true; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber, token]);
  if (error && !order) return (<div className="max-w-3xl mx-auto px-4 py-8"><div className="bg-white rounded-2xl p-10 text-center"><p className="font-bold text-lg">{error}</p><Link href="/commandes" className="inline-block mt-4 bg-[#FFC244] font-bold px-6 py-3 rounded-full">Retrouver ma commande</Link></div></div>);
  if (!order) return <div className="max-w-3xl mx-auto px-4 py-8"><p>Chargement de votre commande…</p></div>;
  const stepIdx = order.status === 'cancelled' ? -1 : STATUS_STEPS.indexOf(order.status);
  return (<div className="max-w-3xl mx-auto px-4 py-8">
    <h1 className="text-2xl sm:text-3xl font-extrabold">Suivi de commande</h1>
    <p className="text-gray-500 mt-1">Commande {order.order_number} · {order.restaurant_name ?? 'Restaurant'}</p>
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
