'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-client';
import { supabase, Restaurant, Dish } from '@/lib/supabase';
import { useFavorites } from '@/lib/favorites';
import { formatDT } from '@/lib/format';
import RestaurantCard from '@/components/RestaurantCard';
import FavoriteButton from '@/components/FavoriteButton';

export default function FavorisPage() {
  const { favs, ready, userId } = useFavorites();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [restNames, setRestNames] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!ready) return;
    const restIds = [...favs].filter((k) => k.startsWith('restaurant:')).map((k) => k.slice(11));
    const dishIds = [...favs].filter((k) => k.startsWith('dish:')).map((k) => k.slice(5));
    (async () => {
      if (restIds.length) {
        const { data } = await supabase.from('dlv_restaurants').select('*').in('id', restIds);
        setRestaurants((data as Restaurant[]) ?? []);
      } else setRestaurants([]);
      if (dishIds.length) {
        const { data } = await supabase.from('dlv_dishes').select('*').in('id', dishIds);
        const list = (data as Dish[]) ?? [];
        setDishes(list);
        if (list.length) {
          const { data: rs } = await supabase.from('dlv_restaurants').select('id,name').in('id', [...new Set(list.map((d) => d.restaurant_id))]);
          setRestNames(Object.fromEntries(((rs as { id: string; name: string }[] | null) ?? []).map((r) => [r.id, r.name])));
        }
      } else setDishes([]);
    })();
  }, [favs, ready]);
  return (<div className="max-w-6xl mx-auto px-4 py-8">
    <h1 className="text-2xl sm:text-3xl font-extrabold">Mes favoris</h1>
    <p className="text-gray-500 mt-1 text-sm">{userId ? 'Synchronisés avec votre compte.' : 'Enregistrés sur cet appareil. Connectez-vous pour les synchroniser.'}</p>
    {restaurants.length === 0 && dishes.length === 0 ? (
      <div className="bg-white rounded-2xl p-10 text-center mt-6"><p className="font-bold text-lg">Aucun favori pour le moment</p><p className="text-gray-500 text-sm mt-1">Touchez le cœur sur un restaurant ou un plat pour le retrouver ici.</p><Link href="/" className="inline-block mt-4 bg-[#FFC244] font-bold px-6 py-3 rounded-full">Découvrir les restaurants</Link></div>
    ) : (<>
      {restaurants.length > 0 && (<><h2 className="font-bold text-lg mt-8">Restaurants</h2><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 mt-3">{restaurants.map((r) => <RestaurantCard key={r.id} r={r} />)}</div></>)}
      {dishes.length > 0 && (<><h2 className="font-bold text-lg mt-8">Plats</h2><div className="bg-white rounded-2xl divide-y mt-3">{dishes.map((d) => (<div key={d.id} className="p-4 flex items-center justify-between gap-3"><div><p className="font-bold">{d.name}</p><p className="text-sm text-gray-500">{restNames[d.restaurant_id] ?? ''} · {formatDT(d.price)}</p></div><FavoriteButton type="dish" id={d.id} label={d.name} /></div>))}</div></>)}
    </>)}
  </div>);
}
