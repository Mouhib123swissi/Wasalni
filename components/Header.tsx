'use client';
import Link from 'next/link';
import { useCart } from '@/lib/cart';
export function Logo() {
  return (<Link href="/" className="flex items-center gap-2">
    <span className="w-9 h-9 rounded-xl bg-[#FFC244] flex items-center justify-center">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#1A1A1A"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>
    </span>
    <span className="text-2xl font-extrabold tracking-tight">Wasalni</span>
  </Link>);
}
export default function Header() {
  const { count } = useCart();
  return (<header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b shadow-sm">
    <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
      <Logo />
      <nav className="hidden sm:flex items-center gap-6 text-sm font-medium">
        <Link href="/" className="hover:text-yellow-600">Accueil</Link>
        <Link href="/favoris" className="hover:text-yellow-600">Favoris</Link>
        <Link href="/commandes" className="hover:text-yellow-600">Commandes</Link>
        <Link href="/suivi" className="hover:text-yellow-600">Suivi</Link>
        <Link href="/menu" className="hover:text-yellow-600">Menu</Link>
      </nav>
      <Link href="/panier" className="relative bg-[#1A1A1A] text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        Panier
        {count > 0 && <span className="absolute -top-2 -right-2 bg-[#FFC244] text-[#1A1A1A] text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">{count}</span>}
      </Link>
    </div>
  </header>);
}
