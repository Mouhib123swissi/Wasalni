'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { getStoredCity, setStoredCity, CITIES } from '@/lib/city';

export default function MenuPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [city, setCity] = useState('Sidi Bouzid');
  const router = useRouter();
  useEffect(() => {
    setCity(getStoredCity());
    (async () => { const sb = createClient(); const { data } = await sb.auth.getUser(); setEmail(data.user?.email ?? null); })();
  }, []);
  async function logout() { const sb = createClient(); await sb.auth.signOut(); setEmail(null); router.push('/'); }
  const onCity = (v: string) => { setCity(v); setStoredCity(v); };
  return (<div className="max-w-3xl mx-auto px-4 py-8">
    <h1 className="text-2xl sm:text-3xl font-extrabold">Menu</h1>
    <div className="bg-white rounded-2xl divide-y mt-6 overflow-hidden">
      <Link href="/compte" className="flex items-center justify-between p-4"><span><span className="font-bold block">Mon compte</span><span className="text-sm text-gray-500">{email ?? 'Se connecter / créer un compte'}</span></span><span>›</span></Link>
      <Link href="/favoris" className="flex items-center justify-between p-4"><span className="font-bold">Mes favoris</span><span>›</span></Link>
      <Link href="/commandes" className="flex items-center justify-between p-4"><span className="font-bold">Mes commandes</span><span>›</span></Link>
      <Link href="/suivi" className="flex items-center justify-between p-4"><span className="font-bold">Suivre une commande</span><span>›</span></Link>
    </div>
    <h2 className="font-bold text-lg mt-8">Ville de livraison</h2>
    <div className="bg-white rounded-2xl p-4 mt-3 flex flex-wrap gap-2">
      {CITIES.map((c) => (
        <button key={c.name} disabled={!c.available} onClick={() => onCity(c.name)} className={`px-4 py-2 rounded-full font-bold ${city === c.name ? 'bg-[#FFC244]' : 'bg-gray-100'} ${!c.available ? 'opacity-50 cursor-not-allowed' : ''}`}>
          {c.name}{!c.available ? ' — Bientôt' : ''}
        </button>
      ))}
    </div>
    <h2 className="font-bold text-lg mt-8">Partenaires</h2>
    <div className="bg-white rounded-2xl divide-y mt-3 overflow-hidden">
      <Link href="/devenir-partenaire" className="flex items-center justify-between p-4"><span><span className="font-bold block">Devenir partenaire</span><span className="text-sm text-gray-500">Restaurant, café, pâtisserie à Sidi Bouzid ? Rejoignez Wasalni.</span></span><span>›</span></Link>
      <Link href="/resto" className="flex items-center justify-between p-4"><span className="font-bold">Espace restaurant</span><span>›</span></Link>
      <Link href="/livreur" className="flex items-center justify-between p-4"><span className="font-bold">Espace livreur</span><span>›</span></Link>
      <Link href="/admin" className="flex items-center justify-between p-4"><span className="font-bold">Administration</span><span>›</span></Link>
    </div>
    <h2 className="font-bold text-lg mt-8">Aide & informations</h2>
    <div className="bg-white rounded-2xl divide-y mt-3 overflow-hidden">
      <div className="p-4"><p className="font-bold">À propos</p><p className="text-sm text-gray-500 mt-1">Wasalni livre vos plats préférés à Sidi Bouzid. Paiement en espèces ou par carte à la livraison. Livraison gratuite dès 50 DT selon la zone.</p></div>
      <div className="p-4"><p className="font-bold">Aide</p><p className="text-sm text-gray-500 mt-1">Pour suivre une commande, utilisez son numéro et le téléphone de la commande. Pour toute question, contactez le restaurant directement depuis la page de suivi.</p></div>
    </div>
    {email && <button onClick={() => void logout()} className="w-full mt-8 bg-white shadow font-bold py-3 rounded-full text-red-600">Déconnexion</button>}
  </div>);
}
