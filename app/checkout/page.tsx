'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/lib/cart';
import { supabase, Zone } from '@/lib/supabase';
import { formatDT } from '@/lib/format';
import { ERR } from '@/lib/errors';
import { getStoredCity } from '@/lib/city';

// Checkout posts to /api/orders only. The browser NEVER sends prices or
// totals: the server re-fetches dish prices and recomputes everything.
export default function CheckoutPage() {
  const { items, restaurantId, restaurantName, subtotal, clear } = useCart();
  const router = useRouter();
  const [zones, setZones] = useState<Zone[]>([]);
  const [name, setName] = useState(''); const [phone, setPhone] = useState('');
  const [address, setAddress] = useState(''); const [zoneId, setZoneId] = useState('');
  const [notes, setNotes] = useState(''); const [payment, setPayment] = useState<'cash' | 'card_on_delivery'>('cash');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { (async () => { try { const { data } = await supabase.from('dlv_zones').select('*').eq('active', true).order('name'); const city = getStoredCity(); setZones(((data as Zone[]) ?? []).filter((z) => (z.city ?? 'Tunis') === city)); const saved = localStorage.getItem('wasalni-zone'); if (saved) setZoneId(saved); } catch {} })(); }, []);
  const zone = zones.find(z => z.id === zoneId);
  const deliveryFee = !zone ? 0 : (subtotal >= Number(zone.free_delivery_over ?? 0) && Number(zone.free_delivery_over ?? 0) > 0 ? 0 : Number(zone.delivery_fee ?? 0));
  const total = subtotal + deliveryFee;
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    if (!items.length) { setError('Votre panier est vide.'); return; }
    if (!restaurantId) { setError(ERR.order); return; }
    if (!/^(\+216)?[2579]\d{7}$/.test(phone.replace(/[\s-]/g, ''))) { setError('Numéro de téléphone tunisien invalide (ex. 20 123 456 ou +216 20 123 456).'); return; }
    if (name.trim().length < 2 || name.trim().length > 100 || address.trim().length < 5 || address.trim().length > 300 || !zoneId) { setError('Veuillez remplir le nom, l’adresse et la zone.'); return; }
    if (notes.length > 500) { setError('Notes trop longues (500 caractères maximum).'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: name.trim(), customer_phone: phone.trim(), address: address.trim(),
          zone_id: zoneId, restaurant_id: restaurantId,
          items: items.map(i => ({ dish_id: i.dishId, qty: i.qty })),
          payment_method: payment, notes: notes.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || ERR.order);
      clear();
      router.push(`/suivi/${(data as { order_number: string }).order_number}?token=${(data as { tracking_token: string }).tracking_token}`);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : ERR.order); setBusy(false); }
  }
  if (items.length === 0) return (<div className="max-w-3xl mx-auto px-4 py-8"><div className="bg-white rounded-2xl p-10 text-center"><p className="font-bold text-lg">Votre panier est vide</p><Link href="/" className="inline-block mt-4 bg-[#FFC244] font-bold px-6 py-3 rounded-full">Voir les restaurants</Link></div></div>);
  return (<div className="max-w-3xl mx-auto px-4 py-8">
    <h1 className="text-2xl sm:text-3xl font-extrabold">Finaliser la commande</h1>
    {restaurantName && <p className="text-gray-500 mt-1">{restaurantName}</p>}
    <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm mt-6 p-5 space-y-4">
      <div><label className="font-semibold text-sm">Nom complet</label><input required value={name} onChange={e => setName(e.target.value)} maxLength={100} className="w-full mt-1 border rounded-xl px-4 py-3 outline-none focus:border-yellow-500" placeholder="Votre nom" /></div>
      <div><label className="font-semibold text-sm">Téléphone</label><input required value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" className="w-full mt-1 border rounded-xl px-4 py-3 outline-none focus:border-yellow-500" placeholder="20 123 456" /></div>
      <div><label className="font-semibold text-sm">Adresse de livraison</label><input required value={address} onChange={e => setAddress(e.target.value)} maxLength={300} className="w-full mt-1 border rounded-xl px-4 py-3 outline-none focus:border-yellow-500" placeholder="Rue, immeuble, quartier…" /></div>
      <div><label className="font-semibold text-sm">Zone</label><select required value={zoneId} onChange={e => setZoneId(e.target.value)} className="w-full mt-1 border rounded-xl px-4 py-3 bg-white outline-none"><option value="">Choisir une zone…</option>{zones.map(z => <option key={z.id} value={z.id}>{z.name} — {formatDT(z.delivery_fee)}{Number(z.free_delivery_over) > 0 ? ` (gratuite dès ${formatDT(z.free_delivery_over)})` : ''}</option>)}</select></div>
      <div><label className="font-semibold text-sm">Notes (optionnel)</label><textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={500} className="w-full mt-1 border rounded-xl px-4 py-3 outline-none" rows={2} placeholder="Instructions pour le livreur…" /></div>
      <fieldset><legend className="font-semibold text-sm">Paiement</legend>
        <label className="flex items-center gap-3 border rounded-xl px-4 py-3 mt-2 cursor-pointer"><input type="radio" name="pay" checked={payment === 'cash'} onChange={() => setPayment('cash')} /> Espèces à la livraison</label>
        <label className="flex items-center gap-3 border rounded-xl px-4 py-3 mt-2 cursor-pointer"><input type="radio" name="pay" checked={payment === 'card_on_delivery'} onChange={() => setPayment('card_on_delivery')} /> Carte à la livraison</label>
        <p className="text-xs text-gray-500 mt-2">Paiement en ligne bientôt disponible.</p>
      </fieldset>
      <div className="border-t pt-3 space-y-1 text-sm">
        <p className="flex justify-between"><span>Sous-total</span><span>{formatDT(subtotal)}</span></p>
        <p className="flex justify-between"><span>Livraison{zone && deliveryFee === 0 && Number(zone.free_delivery_over) > 0 ? ' (gratuite)' : ''}</span><span>{formatDT(deliveryFee)}</span></p>
        <p className="flex justify-between font-extrabold text-base"><span>Total</span><span>{formatDT(total)}</span></p>
        <p className="text-xs text-gray-400">Le total est recalculé par le serveur à partir des prix du menu.</p>
      </div>
      {error && <p className="text-red-600 text-sm font-semibold">{error}</p>}
      <button disabled={busy} className="w-full bg-[#1A1A1A] text-white font-bold py-4 rounded-full disabled:opacity-50">{busy ? 'Envoi…' : `Confirmer la commande — ${formatDT(total)}`}</button>
    </form>
  </div>);
}
