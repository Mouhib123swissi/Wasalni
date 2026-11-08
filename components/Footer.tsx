'use client';
import Link from 'next/link';
import { useRole } from '@/lib/useRole';

// Footer staff links are role-gated: each role sees only its own workspace
// link; guests and clients see none of them.
export default function Footer() {
  const { role } = useRole();
  const staffLink = role === 'admin'
    ? { href: '/admin', label: 'Admin' }
    : role === 'restaurant'
    ? { href: '/resto', label: 'Espace restaurant' }
    : role === 'courier'
    ? { href: '/livreur', label: 'Espace livreur' }
    : null;
  return (<footer className="bg-[#1A1A1A] text-white mt-16">
    <div className="max-w-6xl mx-auto px-4 py-10 grid gap-6 sm:grid-cols-3">
      <div><p className="text-xl font-extrabold">Wasalni <span className="text-[#FFC244]">— Livraison à Sidi Bouzid</span></p>
      <p className="text-sm text-gray-400 mt-2">Vos plats préférés, livrés rapidement partout à Sidi Bouzid. Tunis arrive bientôt.</p></div>
      <div><p className="font-bold mb-2">Zones desservies</p><p className="text-sm text-gray-400">Centre-ville, El Wouroud, Cité Ennour, El Khadra, Ouled Chelbi, Frayjia, Hay Enouamer, El Filahi et plus</p>
      {staffLink && <p className="text-sm text-gray-400 mt-2"><Link href={staffLink.href} className="underline">{staffLink.label}</Link></p>}</div>
      <div><p className="font-bold mb-2">Paiement</p><p className="text-sm text-gray-400">Paiement en espèces à la livraison. Carte à la livraison disponible. Paiement en ligne bientôt disponible.</p></div>
    </div>
    <div className="border-t border-gray-800 py-4 text-center text-xs text-gray-500">© 2026 Wasalni — Livraison à Sidi Bouzid</div>
  </footer>);
}
