import { createBrowserClient } from '@supabase/ssr';
// Cookie-based browser client: the session lives in cookies so that
// middleware.ts (server-side) can read it and enforce role gates.
// This is the ONLY client used by 'use client' components for auth.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder',
  );
}
