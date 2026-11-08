import Link from 'next/link';
import { Restaurant } from '@/lib/supabase';
import { formatDT } from '@/lib/format';
import SafeImage from './SafeImage';
import FavoriteButton from './FavoriteButton';
export default function RestaurantCard({ r }: { r: Restaurant }) {
  const soon = r.is_confirmed_partner === false;
  return (<Link href={`/restaurant/${r.slug}`} className="block bg-white rounded-2xl overflow-hidden shadow hover:shadow-lg transition">
    <div className="relative aspect-[16/9] bg-gradient-to-br from-[#FFC244] via-[#ff9d2e] to-[#1A1A1A]">
      <SafeImage src={r.image_url} alt={r.name} className="absolute inset-0 w-full h-full object-cover" />
      <span className="absolute top-3 left-3 bg-white rounded-full px-3 py-1 text-xs font-bold">{r.category}</span>
      <span className="absolute top-3 right-3"><FavoriteButton type="restaurant" id={r.id} label={r.name} /></span>
      {soon && <span className="absolute bottom-3 left-3 bg-[#1A1A1A] text-[#FFC244] rounded-full px-3 py-1 text-xs font-bold">Bientôt — partenariat en cours</span>}
    </div>
    <div className="p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-lg leading-tight">{r.name}</h3>
        {r.rating != null && <span className="flex items-center gap-1 text-sm font-bold shrink-0"><svg width="16" height="16" viewBox="0 0 24 24" fill="#FFC244" stroke="#1A1A1A" strokeWidth="1"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" /></svg>{Number(r.rating).toFixed(1)}</span>}
      </div>
      <p className="text-sm text-gray-500 line-clamp-1 mt-1">{r.description ?? ''}</p>
      <p className="text-sm mt-3 flex flex-wrap gap-x-3 gap-y-1">
        <span>{r.delivery_time_min ?? 20}–{r.delivery_time_max ?? 40} min</span>
        <span>Livraison {formatDT(r.delivery_fee ?? 0)}</span>
        <span>Min. {formatDT(r.min_order ?? 0)}</span>
      </p>
    </div>
  </Link>);
}
