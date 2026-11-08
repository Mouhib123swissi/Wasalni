'use client';
import Link from 'next/link';
import { useCart } from '@/lib/cart';
import { formatDT } from '@/lib/format';
export default function PanierPage() {
  const { items, restaurantName, setQty, removeItem, subtotal, clear } = useCart();
  return (<div className="max-w-3xl mx-auto px-4 py-8">
    <h1 className="text-2xl sm:text-3xl font-extrabold">Votre panier</h1>
    {restaurantName && <p className="text-gray-500 mt-1">{restaurantName}</p>}
    {items.length === 0 ? (<div className="bg-white rounded-2xl p-10 text-center mt-6"><p className="font-bold text-lg">Votre panier est vide</p><p className="text-gray-500 text-sm mt-1">Découvrez nos restaurants et ajoutez vos plats préférés.</p><Link href="/" className="inline-block mt-4 bg-[#FFC244] font-bold px-6 py-3 rounded-full">Voir les restaurants</Link></div>)
    : (<>
      <div className="bg-white rounded-2xl shadow-sm mt-6 divide-y">
        {items.map(i => (<div key={i.dishId} className="p-4 flex items-center justify-between gap-3">
          <div><p className="font-bold">{i.name}</p><p className="text-sm text-gray-500">{formatDT(i.price)}</p></div>
          <div className="flex items-center gap-2">
            <button aria-label="Moins" onClick={() => setQty(i.dishId, i.qty - 1)} className="w-8 h-8 rounded-full bg-gray-100 font-bold">−</button>
            <span className="w-6 text-center font-bold">{i.qty}</span>
            <button aria-label="Plus" onClick={() => setQty(i.dishId, i.qty + 1)} className="w-8 h-8 rounded-full bg-[#FFC244] font-bold">+</button>
            <button onClick={() => removeItem(i.dishId)} className="text-sm text-red-600 ml-2">Retirer</button>
          </div>
          <p className="font-bold w-24 text-right">{formatDT(i.price * i.qty)}</p>
        </div>))}
      </div>
      <div className="bg-white rounded-2xl shadow-sm mt-4 p-4 space-y-2">
        <p className="flex justify-between"><span>Sous-total</span><span className="font-bold">{formatDT(subtotal)}</span></p>
        <p className="flex justify-between text-gray-500"><span>Frais de livraison</span><span>Calculés à l’étape suivante selon votre zone</span></p>
        <button onClick={clear} className="text-sm text-red-600">Vider le panier</button>
      </div>
      <Link href="/checkout" className="block text-center mt-6 bg-[#1A1A1A] text-white font-bold py-4 rounded-full">Commander — {formatDT(subtotal)}</Link>
    </>)}
  </div>);
}
