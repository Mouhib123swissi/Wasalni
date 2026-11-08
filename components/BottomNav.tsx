'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/lib/cart';

// Mobile bottom nav — TawTaw's NAV STRUCTURE only (Accueil / Favoris /
// Panier / Commandes / Menu). Wasalni keeps its own yellow #FFC244 + dark
// charcoal brand. Hidden on desktop and on the staff dashboards.
const ITEMS: { href: string; label: string; icon: string; center?: boolean }[] = [
  { href: '/', label: 'Accueil', icon: 'M3 10.5 12 3l9 7.5V21h-6v-6h-6v6H3z' },
  { href: '/favoris', label: 'Favoris', icon: 'M12 21s-7.5-4.9-9.7-9.2C.7 8.6 2.6 5 6 5c2 0 3.4 1.1 4.2 2.3L12 9l1.8-1.7C14.6 6.1 16 5 18 5c3.4 0 5.3 3.6 3.7 6.8C19.5 16.1 12 21 12 21z' },
  { href: '/panier', label: 'Panier', icon: '', center: true },
  { href: '/commandes', label: 'Commandes', icon: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01' },
  { href: '/menu', label: 'Menu', icon: 'M4 6h16M4 12h16M4 18h16' },
];

const HIDDEN_PREFIXES = ['/admin', '/resto', '/livreur'];

export default function BottomNav() {
  const pathname = usePathname();
  const { count } = useCart();
  if (HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) return null;
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-white border-t shadow-[0_-4px_16px_rgba(0,0,0,0.08)] pb-[env(safe-area-inset-bottom,0px)]" aria-label="Navigation principale">
      <div className="grid grid-cols-5 h-[68px] items-end">
        {ITEMS.map((item) => {
          if (item.center) {
            const active = pathname === '/panier' || pathname === '/checkout';
            return (
              <Link key={item.href} href={item.href} aria-label="Panier" className="flex justify-center">
                <span className={`relative -translate-y-4 w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-4 border-white ${active ? 'bg-[#1A1A1A] text-[#FFC244]' : 'bg-[#FFC244] text-[#1A1A1A]'}`}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
                  {count > 0 && <span className="absolute -top-1 -right-1 bg-[#1A1A1A] text-white text-[11px] font-bold min-w-5 h-5 px-1 rounded-full flex items-center justify-center">{count}</span>}
                </span>
              </Link>
            );
          }
          const active = item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${active ? 'text-[#1A1A1A]' : 'text-gray-400'}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill={item.href === '/favoris' && active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon} /></svg>
              {item.label}
              {active && <span className="w-1.5 h-1.5 rounded-full bg-[#FFC244]" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
