'use client';
import { useEffect, useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import { createClient } from '@/lib/supabase-client';
import { OrderRow } from '@/lib/supabase';
import { formatDT, STATUS_LABELS } from '@/lib/format';
import { ERR } from '@/lib/errors';

export default function LivreurPage() { return <RequireAuth title="Espace livreur" role="courier"><LivreurInner /></RequireAuth>; }

function LivreurInner() {
  const [orders, setOrders] = useState<OrderRow[]>([]); const [userId, setUserId] = useState<string | null>(null); const [msg, setMsg] = useState('');
  async function load() {
    const sb = createClient();
    const { data } = await sb.from('dlv_orders').select('*, dlv_restaurants(name)').in('status', ['preparing', 'on_the_way', 'delivered']).order('created_at', { ascending: false }).limit(50);
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
    {mine.map(o => (<div key={o.id} className="bg-white rounded-2xl p-4 shadow-sm"><div className="flex justify-between"><span className="font-bold">{o.order_number} — {o.dlv_restaurants?.name ?? ''}</span><span className="font-bold">{formatDT(o.total)}</span></div><p className="text-sm text-gray-500">{o.address ?? ''} · {STATUS_LABELS[o.status]}</p><button onClick={() => void setStatus(o, 'delivered')} className="mt-3 bg-[#1A1A1A] text-white font-bold text-sm px-4 py-2 rounded-full">Marquer livrée</button></div>))}</div>
  </div>);
}
