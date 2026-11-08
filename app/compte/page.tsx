'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { OrderRow } from '@/lib/supabase';
import { formatDT, STATUS_LABELS } from '@/lib/format';
import { ERR } from '@/lib/errors';
import Link from 'next/link';

// The profile row is created server-side by the DB trigger on auth.users
// (role hardcoded 'customer'); the browser never inserts a profile (F05).
export default function ComptePage() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [fullName, setFullName] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null); const [userId, setUserId] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]); const [msg, setMsg] = useState(''); const [mode, setMode] = useState<'login' | 'signup'>('login');
  useEffect(() => { (async () => { const sb = createClient(); const { data } = await sb.auth.getUser(); if (data.user) { setUserEmail(data.user.email ?? null); setUserId(data.user.id); } })(); }, []);
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const sb = createClient();
        const { data } = await sb.from('dlv_orders').select('*, dlv_restaurants(name)').eq('customer_id', userId).order('created_at', { ascending: false }).limit(20);
        setOrders((data as OrderRow[]) ?? []);
      } catch { setOrders([]); }
    })();
  }, [userId]);
  async function auth(e: React.FormEvent) {
    e.preventDefault(); setMsg('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setMsg('E-mail invalide.'); return; }
    if (mode === 'signup' && password.length < 8) { setMsg('Mot de passe : 8 caractères minimum.'); return; }
    try {
      const sb = createClient();
      if (mode === 'login') {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const { data } = await sb.auth.getUser();
        setUserEmail(data.user?.email ?? null); setUserId(data.user?.id ?? null); setMsg('Connexion réussie.');
      } else {
        const { error } = await sb.auth.signUp({ email, password, options: { data: { full_name: fullName || null } } });
        if (error) throw error;
        setMsg('Compte créé. Vérifiez votre e-mail si une confirmation est demandée, puis connectez-vous.');
      }
    } catch { setMsg(ERR.auth); }
  }
  async function logout() { const sb = createClient(); await sb.auth.signOut(); setUserEmail(null); setUserId(null); setOrders([]); }
  if (!userEmail) return (<div className="max-w-md mx-auto px-4 py-12">
    <h1 className="text-2xl font-extrabold">Mon compte</h1>
    <div className="flex gap-2 mt-6"><button onClick={() => setMode('login')} className={`flex-1 py-2 rounded-full font-bold ${mode === 'login' ? 'bg-[#1A1A1A] text-white' : 'bg-white'}`}>Connexion</button><button onClick={() => setMode('signup')} className={`flex-1 py-2 rounded-full font-bold ${mode === 'signup' ? 'bg-[#1A1A1A] text-white' : 'bg-white'}`}>Inscription</button></div>
    <form onSubmit={auth} className="bg-white rounded-2xl p-5 mt-4 space-y-3">
      {mode === 'signup' && <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nom complet" maxLength={100} className="w-full border rounded-xl px-4 py-3 outline-none" />}
      <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mail" className="w-full border rounded-xl px-4 py-3 outline-none" />
      <input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe (8 caractères minimum)" className="w-full border rounded-xl px-4 py-3 outline-none" />
      <button className="w-full bg-[#FFC244] font-bold py-3 rounded-full">{mode === 'login' ? 'Se connecter' : 'Créer un compte'}</button>
      {msg && <p className="text-sm text-center">{msg}</p>}
    </form>
    <p className="text-sm text-center mt-4"><Link href="/devenir-partenaire" className="underline">Vous êtes restaurateur ? Devenir partenaire</Link></p></div>);
  return (<div className="max-w-3xl mx-auto px-4 py-8">
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-extrabold">Mon compte</h1><p className="text-gray-500">{userEmail}</p></div><button onClick={logout} className="bg-white shadow px-4 py-2 rounded-full font-bold text-sm">Déconnexion</button></div>
    <h2 className="font-bold text-lg mt-8">Historique des commandes</h2>
    {orders.length === 0 ? <p className="bg-white rounded-2xl p-6 mt-3 text-gray-500">Aucune commande pour le moment.</p> : <div className="space-y-3 mt-3">{orders.map(o => (<Link key={o.id} href={`/suivi/${o.order_number}`} className="block bg-white rounded-2xl p-4 shadow-sm"><div className="flex justify-between"><span className="font-bold">{o.order_number}</span><span className="font-bold">{formatDT(o.total)}</span></div><p className="text-sm text-gray-500">{o.dlv_restaurants?.name ?? ''} · {STATUS_LABELS[o.status] ?? o.status} · {new Date(o.created_at).toLocaleDateString('fr-FR')}</p></Link>))}</div>}
    <p className="mt-6 text-sm"><Link href="/commandes" className="underline">Toutes mes commandes</Link> · <Link href="/menu" className="underline">Menu et paramètres</Link></p>
  </div>);
}
