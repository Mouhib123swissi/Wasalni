'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { OrderRow } from '@/lib/supabase';
import { formatDT, STATUS_LABELS } from '@/lib/format';
import { useCart } from '@/lib/cart';
import { ERR } from '@/lib/errors';

type Tracking = { order_number: string; tracking_token: string; status: string; total: number; items: { dish_id?: string; name: string; price: number; qty: number }[]; restaurant_id: string | null; restaurant_name: string | null };

export default function CommandesPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [num, setNum] = useState(''); const [phone, setPhone] = useState('');
  const [guestOrder, setGuestOrder] = useState<Tracking | null>(null);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const { addItem, items } = useCart();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data } = await sb.auth.getUser();
      setLoggedIn(!!data.user);
      if (data.user) {
        const res = await fetch('/api/orders');
        const j = await res.json().catch(() => ({}));
        if (res.ok) setOrders(((j as { orders: OrderRow[] }).orders ?? []));
      }
    })();
  }, []);

  async function lookup(e: React.FormEvent) {
    e.preventDefault(); setError(''); setBusy(true); setGuestOrder(null);
    try {
      const res = await fetch('/api/orders/lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_number: num.trim(), phone: phone.trim() }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error();
      const t = await fetch(`/api/orders/${encodeURIComponent((data as Tracking).order_number)}?token=${encodeURIComponent((data as Tracking).tracking_token)}`);
      const full = await t.json().catch(() => ({}));
      if (!t.ok) throw new Error();
      setGuestOrder(full as Tracking);
    } catch { setError(ERR.notFound); }
    setBusy(false);
  }

  async function reorder(o: { items: { dish_id?: string; name: string; price: number; qty: number }[]; restaurant_id: string | null; restaurant_name: string | null }) {
    if (!o.restaurant_id) return;
    let first = items.length === 0;
    for (const it of o.items ?? []) {
      if (!it.dish_id) continue;
      for (let i = 0; i < it.qty; i++) {
        addItem({ dishId: it.dish_id, name: it.name, price: Number(it.price), restaurantId: o.restaurant_id, restaurantName: o.restaurant_name ?? '' },
          first ? () => window.confirm('Votre panier contient des articles d’un autre restaurant. Vider le panier et recommencer ?') : undefined);
        first = false;
      }
    }
    router.push('/panier');
  }

  return (<div className="max-w-3xl mx-auto px-4 py-8">
    <h1 className="text-2xl sm:text-3xl font-extrabold">Mes commandes</h1>
    {loggedIn === null ? <p className="mt-6">Chargement…</p> : loggedIn ? (
      orders.length === 0 ? <p className="bg-white rounded-2xl p-6 mt-6 text-gray-500">Aucune commande pour le moment.</p>
      : <div className="space-y-3 mt-6">{orders.map(o => (
        <div key={o.id} className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between"><span className="font-bold">{o.order_number}</span><span className="font-bold">{formatDT(o.total)}</span></div>
          <p className="text-sm text-gray-500">{o.dlv_restaurants?.name ?? ''} · {STATUS_LABELS[o.status] ?? o.status} · {new Date(o.created_at).toLocaleDateString('fr-FR')}</p>
          <div className="flex gap-2 mt-3">
            <Link href={`/suivi/${o.order_number}`} className="bg-[#FFC244] font-bold text-sm px-4 py-2 rounded-full">Suivre</Link>
            <button onClick={() => void reorder({ items: o.items, restaurant_id: o.restaurant_id, restaurant_name: o.dlv_restaurants?.name ?? null })} className="bg-gray-100 font-bold text-sm px-4 py-2 rounded-full">Commander à nouveau</button>
          </div>
        </div>))}
      </div>
    ) : (<>
      <p className="text-gray-500 mt-2 text-sm">Connectez-vous pour voir votre historique, ou retrouvez une commande avec son numéro et votre téléphone.</p>
      <p className="mt-4"><Link href="/compte" className="bg-[#FFC244] font-bold px-6 py-3 rounded-full inline-block">Se connecter</Link></p>
      <form onSubmit={lookup} className="bg-white rounded-2xl p-5 mt-6 space-y-3">
        <h2 className="font-bold">Retrouver une commande (invité)</h2>
        <input value={num} onChange={e => setNum(e.target.value)} placeholder="Numéro de commande (WS-…)" className="w-full border rounded-xl px-4 py-3 outline-none" />
        <input value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" placeholder="Téléphone utilisé pour la commande" className="w-full border rounded-xl px-4 py-3 outline-none" />
        {error && <p className="text-red-600 text-sm font-semibold">{error}</p>}
        <button disabled={busy} className="w-full bg-[#1A1A1A] text-white font-bold py-3 rounded-full disabled:opacity-50">{busy ? 'Recherche…' : 'Retrouver'}</button>
      </form>
      {guestOrder && (<div className="bg-white rounded-2xl p-4 shadow-sm mt-4">
        <div className="flex justify-between"><span className="font-bold">{guestOrder.order_number}</span><span className="font-bold">{formatDT(guestOrder.total)}</span></div>
        <p className="text-sm text-gray-500">{guestOrder.restaurant_name ?? ''} · {STATUS_LABELS[guestOrder.status] ?? guestOrder.status}</p>
        <div className="flex gap-2 mt-3">
          <Link href={`/suivi/${guestOrder.order_number}?token=${guestOrder.tracking_token}`} className="bg-[#FFC244] font-bold text-sm px-4 py-2 rounded-full">Suivre</Link>
          <button onClick={() => void reorder(guestOrder)} className="bg-gray-100 font-bold text-sm px-4 py-2 rounded-full">Commander à nouveau</button>
        </div>
      </div>)}
    </>)}
  </div>);
}
