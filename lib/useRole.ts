'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';

// Single source of truth for the logged-in user's role, read from their own
// dlv_profiles row — the same source middleware.ts uses. The DB stores the
// client role as 'customer' (not 'client').
export type AppRole = 'admin' | 'restaurant' | 'courier' | 'customer';

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: 'Administrateur',
  restaurant: 'Restaurant',
  courier: 'Livreur',
  customer: 'Client',
};

// Where each role lands after login.
export const ROLE_HOME: Record<AppRole, string> = {
  admin: '/admin',
  restaurant: '/resto',
  courier: '/livreur',
  customer: '/',
};

function normalizeRole(r: string | null | undefined): AppRole | null {
  if (r === 'admin' || r === 'restaurant' || r === 'courier') return r;
  if (r === 'customer' || r === 'client') return 'customer';
  return null;
}

export async function fetchOwnRole(): Promise<AppRole | null> {
  const sb = createClient();
  const { data } = await sb.auth.getUser();
  if (!data.user) return null;
  const { data: p } = await sb.from('dlv_profiles').select('role').eq('id', data.user.id).maybeSingle();
  return normalizeRole((p as { role?: string } | null)?.role);
}

export function useRole() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await fetchOwnRole();
      if (alive) { setRole(r); setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);
  return { role, loading };
}
