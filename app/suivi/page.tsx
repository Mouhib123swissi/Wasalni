'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ERR } from '@/lib/errors';

// Guest tracking lookup: order number + phone → tracking token → /suivi/N?token=T
export default function SuiviSearch() {
  const [num, setNum] = useState(''); const [phone, setPhone] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const res = await fetch('/api/orders/lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_number: num.trim(), phone: phone.trim() }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error();
      router.push(`/suivi/${(data as { order_number: string }).order_number}?token=${(data as { tracking_token: string }).tracking_token}`);
    } catch { setError(ERR.notFound); setBusy(false); }
  }
  return (<div className="max-w-xl mx-auto px-4 py-12"><h1 className="text-2xl font-extrabold">Suivre ma commande</h1>
    <p className="text-sm text-gray-500 mt-2">Entrez le numéro de commande et le téléphone utilisé lors de la commande.</p>
    <form onSubmit={submit} className="bg-white rounded-2xl p-5 mt-6 space-y-3">
      <div><label className="font-semibold text-sm">Numéro de commande</label>
      <input value={num} onChange={e => setNum(e.target.value)} placeholder="WS-…" className="w-full border rounded-xl px-4 py-3 outline-none" /></div>
      <div><label className="font-semibold text-sm">Téléphone</label>
      <input value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" placeholder="20 123 456" className="w-full border rounded-xl px-4 py-3 outline-none" /></div>
      {error && <p className="text-red-600 text-sm font-semibold">{error}</p>}
      <button disabled={busy} className="w-full bg-[#1A1A1A] text-white font-bold py-3 rounded-full disabled:opacity-50">{busy ? 'Recherche…' : 'Suivre'}</button>
    </form>
    <p className="text-sm text-center mt-4"><Link href="/commandes" className="underline">Voir mes commandes</Link></p></div>);
}
