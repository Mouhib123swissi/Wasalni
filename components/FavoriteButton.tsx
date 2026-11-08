'use client';
import { useFavorites, type FavTarget } from '@/lib/favorites';

export default function FavoriteButton({ type, id, label }: { type: FavTarget; id: string; label: string }) {
  const { isFav, toggle, ready } = useFavorites();
  const fav = isFav(type, id);
  return (
    <button
      type="button"
      aria-label={fav ? `Retirer ${label} des favoris` : `Ajouter ${label} aux favoris`}
      aria-pressed={fav}
      disabled={!ready}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); void toggle(type, id); }}
      className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center shadow ${fav ? 'bg-[#FFC244]' : 'bg-white/90'}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill={fav ? '#1A1A1A' : 'none'} stroke="#1A1A1A" strokeWidth="2"><path d="M12 21s-7.5-4.9-9.7-9.2C.7 8.6 2.6 5 6 5c2 0 3.4 1.1 4.2 2.3L12 9l1.8-1.7C14.6 6.1 16 5 18 5c3.4 0 5.3 3.6 3.7 6.8C19.5 16.1 12 21 12 21z" /></svg>
    </button>
  );
}
