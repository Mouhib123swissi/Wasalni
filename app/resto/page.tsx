'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import RequireAuth from '@/components/RequireAuth';
import { createClient } from '@/lib/supabase-client';
import { Restaurant, OrderRow, Dish, MenuCategory } from '@/lib/supabase';
import { formatDT, STATUS_LABELS } from '@/lib/format';
import { dishSchema } from '@/lib/validation';
import { ERR } from '@/lib/errors';

export default function RestoPage() { return <RequireAuth title="Espace restaurant" role="restaurant"><RestoInner /></RequireAuth>; }

function RestoInner() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [noRestaurant, setNoRestaurant] = useState(false);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]); const [cats, setCats] = useState<MenuCategory[]>([]);
  const [msg, setMsg] = useState(''); const [newName, setNewName] = useState(''); const [newPrice, setNewPrice] = useState(''); const [newCat, setNewCat] = useState('');

  async function load(sb: ReturnType<typeof createClient>, restaurantId: string) {
    try {
      const [o, d, c] = await Promise.all([
        sb.from('dlv_orders').select('*, dlv_restaurants(name)').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(50),
        sb.from('dlv_dishes').select('*').eq('restaurant_id', restaurantId).order('name'),
        sb.from('dlv_menu_categories').select('*').eq('restaurant_id', restaurantId).order('sort_order'),
      ]);
      setOrders((o.data as OrderRow[]) ?? []); setDishes((d.data as Dish[]) ?? []); setCats((c.data as MenuCategory[]) ?? []);
    } catch { setOrders([]); setDishes([]); }
  }
  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      const { data: p } = await sb.from('dlv_profiles').select('restaurant_id').eq('id', user.id).maybeSingle();
      const rid = (p as { restaurant_id?: string | null } | null)?.restaurant_id;
      if (!rid) { setNoRestaurant(true); return; }
      const { data: r } = await sb.from('dlv_restaurants').select('*').eq('id', rid).maybeSingle();
      if (!r) { setNoRestaurant(true); return; }
      setRestaurant(r as Restaurant);
      await load(sb, rid);
    })();
  }, []);

  const today = new Date().toDateString();
  const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === today);
  const revenue = todayOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0);
  const toConfirm = dishes.filter((d) => d.is_to_be_confirmed).length;

  async function setStatus(o: OrderRow, status: string) {
    setMsg('');
    try {
      const res = await fetch(`/api/orders/${o.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      if (!res.ok) throw new Error();
      if (restaurant) await load(createClient(), restaurant.id);
    } catch { setMsg(ERR.update); }
  }
  async function toggleDish(d: Dish) {
    if (!restaurant) return;
    const sb = createClient();
    await sb.from('dlv_dishes').update({ available: !d.available }).eq('id', d.id);
    await load(sb, restaurant.id);
  }
  async function confirmDish(d: Dish) {
    if (!restaurant) return;
    const sb = createClient();
    await sb.from('dlv_dishes').update({ is_to_be_confirmed: false }).eq('id', d.id);
    await load(sb, restaurant.id);
  }
  async function deleteDish(id: string) {
    if (!restaurant) return;
    if (!window.confirm('Supprimer ce plat ?')) return;
    const sb = createClient();
    await sb.from('dlv_dishes').delete().eq('id', id);
    await load(sb, restaurant.id);
  }
  async function addDish(e: React.FormEvent) {
    e.preventDefault(); setMsg('');
    if (!restaurant) return;
    const parsed = dishSchema.safeParse({ name: newName, price: parseFloat(newPrice), category_id: newCat || null });
    if (!parsed.success) { setMsg(parsed.error.issues[0]?.message ?? 'Plat invalide.'); return; }
    const sb = createClient();
    const { error } = await sb.from('dlv_dishes').insert({ restaurant_id: restaurant.id, category_id: parsed.data.category_id ?? null, name: parsed.data.name, price: parsed.data.price, available: true, popular: false });
    if (error) { setMsg('Impossible d’ajouter le plat.'); return; }
    setNewName(''); setNewPrice('');
    await load(sb, restaurant.id);
  }
  const nextStatus: Record<string, string> = { confirmed: 'preparing', preparing: 'on_the_way' };
  if (noRestaurant) return (<div className="max-w-3xl mx-auto px-4 py-8"><h1 className="text-2xl font-extrabold">Espace restaurant</h1><div className="bg-white rounded-2xl p-8 mt-6 text-center"><p className="font-bold">Aucun restaurant lié à votre compte.</p><p className="text-sm text-gray-500 mt-2">Votre compte n’est pas encore rattaché à un restaurant. Si vous venez de vous inscrire comme partenaire, l’administrateur doit encore lier votre compte — ou envoyez une demande.</p><Link href="/devenir-partenaire" className="inline-block mt-4 bg-[#FFC244] font-bold px-6 py-3 rounded-full">Devenir partenaire</Link></div></div>);
  if (!restaurant) return <div className="max-w-5xl mx-auto px-4 py-8"><p>Chargement…</p></div>;
  return (<div className="max-w-5xl mx-auto px-4 py-8">
    <h1 className="text-2xl sm:text-3xl font-extrabold">Espace restaurant</h1>
    <p className="text-gray-500 mt-1">{restaurant.name} · {restaurant.city ?? ''}{restaurant.is_confirmed_partner === false ? ' · Bientôt (commande désactivée)' : ''}</p>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
      <div className="bg-white rounded-2xl p-4"><p className="text-sm text-gray-500">Commandes aujourd’hui</p><p className="text-2xl font-extrabold">{todayOrders.length}</p></div>
      <div className="bg-white rounded-2xl p-4"><p className="text-sm text-gray-500">Revenu aujourd’hui</p><p className="text-2xl font-extrabold">{formatDT(revenue)}</p></div>
      <div className="bg-white rounded-2xl p-4"><p className="text-sm text-gray-500">Plats au menu</p><p className="text-2xl font-extrabold">{dishes.length}</p></div>
      <div className="bg-white rounded-2xl p-4"><p className="text-sm text-gray-500">Menu à confirmer</p><p className="text-2xl font-extrabold">{toConfirm}</p></div>
    </div>
    <h2 className="font-bold text-lg mt-8">Commandes du jour</h2>
    <div className="space-y-3 mt-3">{todayOrders.length === 0 && <p className="bg-white rounded-2xl p-6 text-gray-500">Aucune commande aujourd’hui.</p>}
    {orders.map(o => (<div key={o.id} className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex flex-wrap justify-between gap-2"><span className="font-bold">{o.order_number} — {o.customer_name ?? ''}</span><span className="font-bold">{formatDT(o.total)}</span></div>
      <p className="text-sm text-gray-500">{(o.items ?? []).map(i => `${i.qty}× ${i.name}`).join(', ')} · {STATUS_LABELS[o.status] ?? o.status} · {o.customer_phone ?? ''}</p>
      <div className="flex flex-wrap gap-2 mt-3">
        {o.status === 'received' && (<><button onClick={() => void setStatus(o, 'confirmed')} className="bg-[#FFC244] font-bold text-sm px-4 py-2 rounded-full">Accepter</button><button onClick={() => void setStatus(o, 'cancelled')} className="bg-red-100 text-red-700 font-bold text-sm px-4 py-2 rounded-full">Refuser</button></>)}
        {nextStatus[o.status] && <button onClick={() => void setStatus(o, nextStatus[o.status])} className="bg-[#1A1A1A] text-white font-bold text-sm px-4 py-2 rounded-full">Passer à : {STATUS_LABELS[nextStatus[o.status]]}</button>}
      </div></div>))}</div>
    {msg && <p className="text-red-600 text-sm mt-3">{msg}</p>}
    <h2 className="font-bold text-lg mt-8">Menu</h2>
    <form onSubmit={(e) => void addDish(e)} className="bg-white rounded-2xl p-4 mt-3 flex flex-col sm:flex-row gap-2">
      <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nom du plat" maxLength={120} className="flex-1 border rounded-xl px-3 py-2 outline-none" />
      <input value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="Prix (DT)" inputMode="decimal" className="w-full sm:w-28 border rounded-xl px-3 py-2 outline-none" />
      <select value={newCat} onChange={e => setNewCat(e.target.value)} className="border rounded-xl px-3 py-2 bg-white"><option value="">Sans catégorie</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <button className="bg-[#FFC244] font-bold px-4 py-2 rounded-full">Ajouter</button>
    </form>
    <div className="bg-white rounded-2xl divide-y mt-3">{dishes.map(d => (<div key={d.id} className="p-3 flex items-center justify-between gap-2"><span className={d.available ? '' : 'line-through text-gray-400'}>{d.name} — {formatDT(d.price)}{d.is_to_be_confirmed && <span className="ml-2 text-xs font-bold bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">Menu à confirmer</span>}</span><span className="flex flex-wrap gap-2"><button onClick={() => void toggleDish(d)} className="text-sm font-bold bg-gray-100 px-3 py-1 rounded-full">{d.available ? 'Désactiver' : 'Activer'}</button>{d.is_to_be_confirmed && <button onClick={() => void confirmDish(d)} className="text-sm font-bold bg-[#FFC244] px-3 py-1 rounded-full">Confirmer</button>}<button onClick={() => void deleteDish(d.id)} className="text-sm font-bold text-red-600">Supprimer</button></span></div>))}</div>
  </div>);
}
