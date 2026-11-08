'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-client';

// UI-level gate only — real enforcement is middleware.ts + RLS.
// role: when set, the logged-in user's dlv_profiles.role must match.
export default function RequireAuth({ children, title, role }: { children: React.ReactNode; title: string; role?: 'admin' | 'restaurant' | 'courier' }) {
  const [state, setState] = useState<'loading' | 'authed' | 'guest' | 'denied'>('loading');
  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data } = await sb.auth.getUser();
      if (!data.user) { setState('guest'); return; }
      if (!role) { setState('authed'); return; }
      const { data: p } = await sb.from('dlv_profiles').select('role').eq('id', data.user.id).maybeSingle();
      setState((p as { role?: string } | null)?.role === role ? 'authed' : 'denied');
    })();
  }, [role]);
  if (state === 'loading') return <div className="max-w-3xl mx-auto px-4 py-12"><p>Chargement…</p></div>;
  if (state === 'guest') return (<div className="max-w-md mx-auto px-4 py-12"><h1 className="text-2xl font-extrabold">{title}</h1><div className="bg-white rounded-2xl p-8 mt-6 text-center"><p>Connectez-vous pour accéder à cet espace.</p><Link href="/compte" className="inline-block mt-4 bg-[#FFC244] font-bold px-6 py-3 rounded-full">Se connecter</Link></div></div>);
  if (state === 'denied') return (<div className="max-w-md mx-auto px-4 py-12"><h1 className="text-2xl font-extrabold">{title}</h1><div className="bg-white rounded-2xl p-8 mt-6 text-center"><p className="font-bold">Accès refusé.</p><p className="text-sm text-gray-500 mt-2">Votre compte n’a pas le rôle nécessaire pour cet espace.</p><Link href="/" className="inline-block mt-4 bg-[#FFC244] font-bold px-6 py-3 rounded-full">Retour à l’accueil</Link></div></div>);
  return <>{children}</>;
}
