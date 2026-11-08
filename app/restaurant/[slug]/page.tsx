export const dynamic = 'force-dynamic';
export const revalidate = 0; // never serve a cached restaurant/menu (Data Cache survives redeploys)
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase, Restaurant, Dish, MenuCategory } from '@/lib/supabase';
import { formatDT } from '@/lib/format';
import SafeImage from '@/components/SafeImage';
import RestaurantMenu from '@/components/RestaurantMenu';
export default async function RestaurantPage({ params }: { params: { slug: string } }) {
  let restaurant: Restaurant | null = null; let categories: MenuCategory[] = []; let dishes: Dish[] = [];
  try {
    const { data } = await supabase.from('dlv_restaurants').select('*').eq('slug', params.slug).eq('active', true).maybeSingle();
    restaurant = data as Restaurant | null;
    if (restaurant) {
      const [c, d] = await Promise.all([
        supabase.from('dlv_menu_categories').select('*').eq('restaurant_id', restaurant.id).order('sort_order'),
        supabase.from('dlv_dishes').select('*').eq('restaurant_id', restaurant.id).order('name'),
      ]);
      categories = (c.data as MenuCategory[]) ?? []; dishes = (d.data as Dish[]) ?? [];
    }
  } catch {}
  if (!restaurant) return notFound();
  return (<div>
    <div className="relative h-56 sm:h-72 bg-gradient-to-br from-[#FFC244] via-[#ff9d2e] to-[#1A1A1A]">
      <SafeImage src={restaurant.image_url} alt={restaurant.name} className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative max-w-6xl mx-auto px-4 h-full flex flex-col justify-end pb-6 text-white">
        <Link href="/" className="text-sm underline mb-2 w-fit">← Retour</Link>
        <h1 className="text-3xl sm:text-4xl font-extrabold">{restaurant.name}</h1>
        {restaurant.is_confirmed_partner === false && <p className="mt-2"><span className="bg-[#FFC244] text-[#1A1A1A] rounded-full px-3 py-1 text-xs font-bold">Bientôt — partenariat en cours, commande désactivée</span></p>}
        <p className="text-gray-200 mt-1">{restaurant.description ?? ''}</p>
        <p className="text-sm mt-2">{restaurant.category}{restaurant.rating != null ? ` · ${Number(restaurant.rating).toFixed(1)}` : ''} · {restaurant.delivery_time_min ?? 20}–{restaurant.delivery_time_max ?? 40} min · Livraison {formatDT(restaurant.delivery_fee ?? 0)} · Min. {formatDT(restaurant.min_order ?? 0)}</p>
        {restaurant.opening_hours && <p className="text-sm text-gray-300">Horaires : {restaurant.opening_hours}</p>}
      </div>
    </div>
    <RestaurantMenu restaurant={restaurant} categories={categories} dishes={dishes} />
  </div>);
}
