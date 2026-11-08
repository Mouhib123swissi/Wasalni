'use client';
import { Dish, MenuCategory, Restaurant } from '@/lib/supabase';
import { formatDT } from '@/lib/format';
import { useCart } from '@/lib/cart';
import SafeImage from './SafeImage';
import FavoriteButton from './FavoriteButton';
export default function RestaurantMenu({ restaurant, categories, dishes }: { restaurant: Restaurant; categories: MenuCategory[]; dishes: Dish[] }) {
  const { addItem, items } = useCart();
  const qtyOf = (id: string) => items.find(i => i.dishId === id)?.qty ?? 0;
  const orderingDisabled = restaurant.is_confirmed_partner === false;
  const uncategorised = dishes.filter(d => !d.category_id);
  const groups: { name: string; dishes: Dish[] }[] = categories.map(c => ({ name: c.name, dishes: dishes.filter(d => d.category_id === c.id) }));
  if (uncategorised.length) groups.push({ name: 'Autres', dishes: uncategorised });
  return (<div className="max-w-6xl mx-auto px-4 pb-10">
    {orderingDisabled && (<div className="bg-[#1A1A1A] text-white rounded-2xl p-5 mt-6">
      <p className="font-extrabold">Bientôt disponible</p>
      <p className="text-sm text-gray-300 mt-1">Ce restaurant n’est pas encore partenaire Wasalni : son menu est en cours de confirmation. La commande sera activée dès que le partenariat est confirmé. Vous pouvez déjà l’ajouter à vos favoris.</p>
    </div>)}
    {groups.filter(g => g.dishes.length).map(g => (<section key={g.name} className="mt-8">
      <h2 className="text-xl font-extrabold">{g.name}</h2>
      <div className="grid gap-4 sm:grid-cols-2 mt-3">
        {g.dishes.map(d => (<div key={d.id} className="bg-white rounded-2xl p-4 shadow-sm flex gap-3">
          <div className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-[#FFC244] to-[#1A1A1A]">
            <SafeImage src={d.image_url} alt={d.name} className="absolute inset-0 w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between gap-2"><h3 className="font-bold">{d.name}</h3><span className="font-bold text-sm shrink-0">{formatDT(d.price)}</span></div>
            <p className="text-sm text-gray-500 line-clamp-2">{d.description ?? ''}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {d.popular && <span className="inline-block text-xs font-bold bg-[#FFC244] rounded-full px-2 py-0.5">Populaire</span>}
              {d.is_to_be_confirmed && <span className="inline-block text-xs font-bold bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">Menu à confirmer</span>}
            </div>
            <div className="mt-2 flex items-center gap-2">
              {orderingDisabled ? <span className="text-sm text-gray-400 font-semibold">Commande bientôt disponible</span>
              : d.available ? (<>
                <button onClick={() => addItem({ dishId: d.id, name: d.name, price: Number(d.price), restaurantId: restaurant.id, restaurantName: restaurant.name }, () => window.confirm('Votre panier contient des articles d\u2019un autre restaurant. Vider le panier et recommencer ?'))} className="bg-[#FFC244] font-bold text-sm px-4 py-2 rounded-full">Ajouter</button>
                {qtyOf(d.id) > 0 && <span className="text-sm font-bold">x{qtyOf(d.id)} dans le panier</span>}
              </>) : <span className="text-sm text-gray-400 font-semibold">Indisponible</span>}
              <FavoriteButton type="dish" id={d.id} label={d.name} />
            </div>
          </div>
        </div>))}
      </div>
    </section>))}
    {dishes.length === 0 && <p className="bg-white rounded-2xl p-8 text-center mt-8 text-gray-500">Menu bientôt disponible pour ce restaurant.</p>}
  </div>);
}
