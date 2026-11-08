import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Role-based gates (F03). Enforcement lives here + in RLS; the dashboard
// pages only render UI. Session comes from cookies (see lib/supabase-client).
const GATES: { prefix: string; role: string }[] = [
  { prefix: '/admin', role: 'admin' },
  { prefix: '/resto', role: 'restaurant' },
  { prefix: '/livreur', role: 'courier' },
];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder',
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    },
  );
  const gate = GATES.find((g) => req.nextUrl.pathname === g.prefix || req.nextUrl.pathname.startsWith(g.prefix + '/'));
  if (!gate) return res;
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    const url = req.nextUrl.clone();
    url.pathname = '/compte';
    url.searchParams.set('next', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  const { data: profile } = await supabase.from('dlv_profiles').select('role').eq('id', data.user.id).maybeSingle();
  if ((profile as { role?: string } | null)?.role !== gate.role) {
    const url = req.nextUrl.clone();
    url.pathname = '/compte';
    url.searchParams.set('denied', '1');
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = { matcher: ['/admin/:path*', '/resto/:path*', '/livreur/:path*'] };
