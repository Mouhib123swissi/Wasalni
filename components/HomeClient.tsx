'use client';
import { useEffect, useMemo, useState } from 'react';
import { Restaurant, Zone } from '@/lib/supabase';
import { CATEGORIES } from '@/lib/format';
import { CITIES, DEFAULT_CITY, getStoredCity, setStoredCity } from '@/lib/city';
import RestaurantCard from './RestaurantCard';

function matchCategory(r: Restaurant, cat: string): boolean {
  if (cat === 'Tout') return true;
  const c = r.category;
  if (cat === 'Pizza') return c.includes('Pizza') || c.includes('Pizzeria');
  if (cat === 'Café') return c.includes('Café');
  if (cat === 'Restaurant') return c.includes('Restaurant') || c.includes('Plats');
  if (cat === 'Boulangerie') return c.includes('Boulangerie');
  return c === cat;
}

export default function HomeClient({ restaurants, zones }: { restaurants: Restaurant[]; zones: Zone[] }) {
  const [cat, setCat] = useState('Tout');
  const [q, setQ] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [city, setCity] = useState(DEFAULT_CITY);
  useEffect(() => {
    try { setZoneId(localStorage.getItem('wasalni-zone') ?? ''); } catch {}
    setCity(getStoredCity());
  }, []);
  const onZone = (v: string) => { setZoneId(v); try { localStorage.setItem('wasalni-zone', v); } catch {} };
  const onCity = (v: string) => { setCity(v); setStoredCity(v); setZoneId(''); try { localStorage.removeItem('wasalni-zone'); } catch {} };
  const cityZones = useMemo(() => zones.filter((z) => (z.city ?? 'Tunis') === city), [zones, city]);
  const filtered = useMemo(() => restaurants.filter(r => {
    if ((r.city ?? 'Tunis') !== city) return false;
    if (!matchCategory(r, cat)) return false;
    if (zoneId && r.zone_id !== zoneId) return false;
    if (q && !(r.name.toLowerCase().includes(q.toLowerCase()) || (r.description ?? '').toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  }), [restaurants, cat, q, zoneId, city]);
  const soonCount = useMemo(() => filtered.filter((r) => r.is_confirmed_partner === false).length, [filtered]);
  return (<>
    <section className="bg-[#1A1A1A] text-white">
      <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight max-w-2xl">Livraison de vos plats préférés à <span className="text-[#FFC244]">{city}</span></h1>
        <p className="text-gray-300 mt-3 max-w-xl">Restaurants, fast-food, cafés et pâtisseries — livrés chez vous, partout à {city}.</p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 max-w-2xl">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un restaurant ou un plat…" className="flex-1 rounded-full px-5 py-3 text-[#1A1A1A] outline-none" />
          <select value={zoneId} onChange={e => onZone(e.target.value)} className="rounded-full px-5 py-3 text-[#1A1A1A] outline-none bg-white">
            <option value="">Toutes les zones</option>
            {cityZones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm">
          <span className="text-gray-400">Ville :</span>
          {CITIES.map((c) => (
            <button key={c.name} disabled={!c.available} onClick={() => onCity(c.name)}
              className={`px-4 py-2 rounded-full font-bold ${city === c.name ? 'bg-[#FFC244] text-[#1A1A1A]' : 'bg-white/10 text-white'} ${!c.available ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {c.name}{!c.available ? ' — Bientôt' : ''}
            </button>
          ))}
        </div>
      </div>
    </section>
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {CATEGORIES.map(c => (<button key={c} onClick={() => setCat(c)} className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold ${cat === c ? 'bg-[#1A1A1A] text-white' : 'bg-white shadow'}`}>{c}</button>))}
      </div>
      {soonCount > 0 && <p className="text-sm text-gray-500 mt-2">Les restaurants avec le badge « Bientôt » arrivent très vite : leurs menus sont en cours de confirmation, la commande sera activée dès leur partenariat confirmé.</p>}
      {filtered.length === 0 ? (<div className="bg-white rounded-2xl p-10 text-center mt-6"><p className="font-bold text-lg">Aucun restaurant trouvé</p><p className="text-gray-500 text-sm mt-1">Essayez une autre catégorie ou une autre zone.</p></div>)
      : (<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 mt-4">{filtered.map(r => <RestaurantCard key={r.id} r={r} />)}</div>)}
    </div>
  </>);
}
