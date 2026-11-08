'use client';
import { useState } from 'react';
import Link from 'next/link';
import { PARTNER_CATEGORIES } from '@/lib/format';
import { ERR } from '@/lib/errors';

export default function DevenirPartenairePage() {
  const [restaurantName, setRestaurantName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [quartier, setQuartier] = useState('');
  const [category, setCategory] = useState(PARTNER_CATEGORIES[0]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    if (restaurantName.trim().length < 2 || ownerName.trim().length < 2) { setError('Veuillez remplir le nom du restaurant et le vôtre.'); return; }
    if (!/^(\+216)?[2579]\d{7}$/.test(phone.replace(/[\s-]/g, ''))) { setError('Numéro de téléphone tunisien invalide.'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/partner-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ restaurant_name: restaurantName.trim(), owner_name: ownerName.trim(), phone: phone.trim(), quartier: quartier.trim() || null, category, message: message.trim() || null }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || ERR.partner);
      setDone(true);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : ERR.partner); }
    setBusy(false);
  }
  if (done) return (<div className="max-w-xl mx-auto px-4 py-12"><div className="bg-white rounded-2xl p-10 text-center"><p className="font-extrabold text-xl">Demande envoyée !</p><p className="text-gray-500 text-sm mt-2">Merci ! Notre équipe va examiner votre demande et vous contacter par téléphone pour confirmer votre menu et activer votre restaurant.</p><Link href="/" className="inline-block mt-6 bg-[#FFC244] font-bold px-6 py-3 rounded-full">Retour à l’accueil</Link></div></div>);
  return (<div className="max-w-xl mx-auto px-4 py-8">
    <h1 className="text-2xl sm:text-3xl font-extrabold">Devenir partenaire</h1>
    <p className="text-gray-500 mt-2 text-sm">Vous avez un restaurant, un café ou une pâtisserie à Sidi Bouzid ? Rejoignez Wasalni : vos plats livrés chez vos clients. Votre demande est examinée par notre équipe avant activation.</p>
    <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm mt-6 p-5 space-y-4">
      <div><label className="font-semibold text-sm">Nom du restaurant</label><input required value={restaurantName} onChange={e => setRestaurantName(e.target.value)} maxLength={120} className="w-full mt-1 border rounded-xl px-4 py-3 outline-none" placeholder="Ex. Café du Centre" /></div>
      <div><label className="font-semibold text-sm">Votre nom (propriétaire)</label><input required value={ownerName} onChange={e => setOwnerName(e.target.value)} maxLength={100} className="w-full mt-1 border rounded-xl px-4 py-3 outline-none" placeholder="Votre nom complet" /></div>
      <div><label className="font-semibold text-sm">Téléphone</label><input required value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" className="w-full mt-1 border rounded-xl px-4 py-3 outline-none" placeholder="20 123 456" /></div>
      <div><label className="font-semibold text-sm">Quartier</label><input value={quartier} onChange={e => setQuartier(e.target.value)} maxLength={120} className="w-full mt-1 border rounded-xl px-4 py-3 outline-none" placeholder="Ex. Centre-ville, El Wouroud…" /></div>
      <div><label className="font-semibold text-sm">Catégorie</label><select value={category} onChange={e => setCategory(e.target.value)} className="w-full mt-1 border rounded-xl px-4 py-3 bg-white outline-none">{PARTNER_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
      <div><label className="font-semibold text-sm">Message (optionnel)</label><textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={1000} rows={3} className="w-full mt-1 border rounded-xl px-4 py-3 outline-none" placeholder="Vos spécialités, vos horaires…" /></div>
      {error && <p className="text-red-600 text-sm font-semibold">{error}</p>}
      <button disabled={busy} className="w-full bg-[#FFC244] font-bold py-4 rounded-full disabled:opacity-50">{busy ? 'Envoi…' : 'Envoyer ma demande'}</button>
    </form>
  </div>);
}
