import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
// Server-side client (Route Handlers / Server Components / middleware-adjacent
// code). Reads the session from cookies; never uses a service_role key.
export function createServerSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder',
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch { /* called from a Server Component: cookies are read-only there */ }
        },
      },
    },
  );
}
