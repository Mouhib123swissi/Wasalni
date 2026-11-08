'use client';
import { useEffect, useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import { createClient } from '@/lib/supabase-client';
import { OrderRow, Restaurant, PartnerRequest } from '@/lib/supabase';
import { formatDT, STATUS_LABELS } from '@/lib/format';
import { ERR } from '@/lib/errors';

export default function AdminPage() { return <RequireAuth title="Administration" role="admin"><AdminInner /></RequireAuth>; }

function AdminInner() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [requests, setRequests] = useState<PartnerRequest[]>([]);
  const [toConfirm, setToConfirm] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState('');

  async function load() {
    const sb = createClient();
    try {
      const [o, r, d] = await Promise.all([
        sb.from('dlv_orders').select('*, dlv_restaurants(name)').order('created_at', { ascending: false }).limit(50),
        sb.from('dlv_restaurants').select('*').order('name'),
        sb.from('dlv_dishes').select('restaurant_id').eq('is_to_be_confirmed', true),
      ]);
      setOrders((o.data as OrderRow[]) ?? []);
      setRestaurants((r.data as Restaurant[]) ?? []);
      const counts: Record<string, number> = {};
      (((d.data as { restaurant_id: string }[] | null) ?? []).forEach((x) => { counts[x.restaurant_id] = (counts[x.restaurant_id] ?? 0) + 1; }));
      setToConfirm(counts);
      const res = await fetch('/api/partner-requests');
      const j = await res.json().catch(() => ({}));
      if (res.ok) setRequests(((j as { requests: PartnerRequest[] }).requests ?? []));
    } catch { setOrders([]); setRestaurants([]); }
  }
  useEffect(() => { void load(); }, []);

  const revenue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0);
  const delivered = orders.filter(o => o.status === 'delivered').length;
  const sbRestaurants = restaurants.filter((r) => r.city === 'Sidi Bouzid');

  async function toggleResto(r: Restaurant) {
    const sb = createClient();
    await sb.from('dlv_restaurants').update({ active: !r.active }).eq('id', r.id);
    setRestaurants(prev => prev.map(x => x.id === r.id ? { ...x, active: !x.active } : x));
  }
  async function toggleConfirmed(r: Restaurant) {
    const sb = createClient();
    await sb.from('dlv_restaurants').update({ is_confirmed_partner: !(r.is_confirmed_partner ?? true) }).eq('id', r.id);
    setRestaurants(prev => prev.map(x => x.id === r.id ? { ...x, is_confirmed_partner: !(x.is_confirmed_partner ?? true) } : x));
  }
  async function approve(req: PartnerRequest) {
    setMsg('');
    const res = await fetch(`/api/partner-requests/${req.id}/approve`, { method: 'POST' });
    if (!res.ok) { setMsg(ERR.update); return; }
    await load();
  }
  async function reject(req: PartnerRequest) {
    const sb = createClient();
    await sb.from('dlv_partner_requests').update({ status: 'rejected' }).eq('id', req.id);
    await load();
  }

  return (<div className="max-w-5xl mx-auto px-4 py-8">
    <h1 className="text-2xl sm:text-3xl font-extrabold">Administration</h1>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
      <div className="bg-white rounded-2xl p-4"><p className="text-sm text-gray-500">Commandes</p><p className="text-2xl font-extrabold">{orders.length}</p></div>
      <div className="bg-white rounded-2xl p-4"><p className="text-sm text-gray-500">Revenu</p><p className="text-2xl font-extrabold">{formatDT(revenue)}</p></div>
      <div className="bg-white rounded-2xl p-4"><p className="text-sm text-gray-500">Restaurants</p><p className="text-2xl font-extrabold">{restaurants.length}</p></div>
      <div className="bg-white rounded-2xl p-4"><p className="text-sm text-gray-500">Livrées</p><p className="text-2xl font-extrabold">{delivered}</p></div>
    </div>

    <h2 className="font-bold text-lg mt-8">Demandes de partenariat ({requests.filter((r) => r.status === 'pending').length} en attente)</h2>
    {msg && <p className="text-red-600 text-sm mt-2">{msg}</p>}
    <div className="space-y-3 mt-3">
      {requests.length === 0 && <p className="bg-white rounded-2xl p-6 text-gray-500">Aucune demande pour le moment.</p>}
      {requests.map(req => (<div key={req.id} className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex flex-wrap justify-between gap-2"><span className="font-bold">{req.restaurant_name}</span><span className="text-sm font-bold">{req.status === 'pending' ? 'En attente' : req.status === 'approved' ? 'Approuvée' : 'Refusée'}</span></div>
        <p className="text-sm text-gray-500">{req.owner_name} · {req.phone} · {req.quartier ?? ''} · {req.category}</p>
        {req.message && <p className="text-sm text-gray-500 mt-1">« {req.message} »</p>}
        {req.status === 'pending' && <div className="flex gap-2 mt-3">
          <button onClick={() => void approve(req)} className="bg-[#FFC244] font-bold text-sm px-4 py-2 rounded-full">Approuver (activer le restaurant)</button>
          <button onClick={() => void reject(req)} className="bg-red-100 text-red-700 font-bold text-sm px-4 py-2 rounded-full">Refuser</button>
        </div>}
      </div>))}
    </div>

    <h2 className="font-bold text-lg mt-8">Commandes récentes</h2>
    <div className="bg-white rounded-2xl shadow-sm mt-3 overflow-x-auto"><table className="w-full text-sm min-w-[560px]"><thead><tr className="text-left border-b"><th className="p-3">N°</th><th className="p-3">Restaurant</th><th className="p-3">Client</th><th className="p-3">Total</th><th className="p-3">Statut</th></tr></thead><tbody>{orders.map(o => (<tr key={o.id} className="border-b last:border-0"><td className="p-3 font-bold">{o.order_number}</td><td className="p-3">{o.dlv_restaurants?.name ?? ''}</td><td className="p-3">{o.customer_name ?? ''}</td><td className="p-3">{formatDT(o.total)}</td><td className="p-3">{STATUS_LABELS[o.status] ?? o.status}</td></tr>))}</tbody></table></div>

    <h2 className="font-bold text-lg mt-8">Restaurants — Sidi Bouzid ({sbRestaurants.length})</h2>
    <div className="bg-white rounded-2xl divide-y mt-3">{sbRestaurants.map(r => (<div key={r.id} className="p-4 flex flex-wrap items-center justify-between gap-2">
      <span><span className="font-bold">{r.name}</span> <span className="text-sm text-gray-500">· {r.category} · {r.city}</span>
      {(toConfirm[r.id] ?? 0) > 0 && <span className="ml-2 text-xs font-bold bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">Menu à confirmer : {toConfirm[r.id]}</span>}
      {r.is_confirmed_partner === false && <span className="ml-2 text-xs font-bold bg-[#1A1A1A] text-[#FFC244] rounded-full px-2 py-0.5">Bientôt</span>}</span>
      <span className="flex gap-2">
        <button onClick={() => void toggleConfirmed(r)} className={`text-sm font-bold px-4 py-2 rounded-full ${r.is_confirmed_partner === false ? 'bg-[#FFC244]' : 'bg-gray-200'}`}>{r.is_confirmed_partner === false ? 'Confirmer le partenariat' : 'Partenaire confirmé'}</button>
        <button onClick={() => void toggleResto(r)} className={`text-sm font-bold px-4 py-2 rounded-full ${r.active ? 'bg-[#FFC244]' : 'bg-gray-200'}`}>{r.active ? 'Actif' : 'Inactif'}</button>
      </span></div>))}</div>

    <h2 className="font-bold text-lg mt-8">Restaurants — Tunis ({restaurants.length - sbRestaurants.length})</h2>
    <div className="bg-white rounded-2xl divide-y mt-3">{restaurants.filter((r) => r.city !== 'Sidi Bouzid').map(r => (<div key={r.id} className="p-4 flex flex-wrap items-center justify-between gap-2">
      <span><span className="font-bold">{r.name}</span> <span className="text-sm text-gray-500">· {r.category} · {r.city}</span>
      {(toConfirm[r.id] ?? 0) > 0 && <span className="ml-2 text-xs font-bold bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">Menu à confirmer : {toConfirm[r.id]}</span>}</span>
      <button onClick={() => void toggleResto(r)} className={`text-sm font-bold px-4 py-2 rounded-full ${r.active ? 'bg-[#FFC244]' : 'bg-gray-200'}`}>{r.active ? 'Actif' : 'Inactif'}</button></div>))}</div>
  </div>);
}
