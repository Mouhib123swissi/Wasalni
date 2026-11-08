import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { supabase as anon } from '@/lib/supabase';
import { partnerRequestSchema } from '@/lib/validation';
import { ERR } from '@/lib/errors';

// POST /api/partner-requests — public partner signup (anon insert, RLS forces
// status='pending'). GET — admin only, lists requests.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = partnerRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? ERR.partner }, { status: 400 });
  }
  const v = parsed.data;
  const { data, error } = await anon.from('dlv_partner_requests').insert({
    restaurant_name: v.restaurant_name,
    owner_name: v.owner_name,
    phone: v.phone,
    quartier: v.quartier ?? null,
    category: v.category,
    message: v.message ?? null,
    status: 'pending',
  }).select('id').maybeSingle();
  if (error || !data) {
    console.error('partner request failed', error?.message);
    return NextResponse.json({ error: ERR.partner }, { status: 500 });
  }
  return NextResponse.json({ id: (data as { id: string }).id }, { status: 201 });
}

export async function GET() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: ERR.forbidden }, { status: 401 });
  const { data: profile } = await supabase.from('dlv_profiles').select('role').eq('id', user.id).maybeSingle();
  if ((profile as { role?: string } | null)?.role !== 'admin') {
    return NextResponse.json({ error: ERR.forbidden }, { status: 403 });
  }
  const { data, error } = await supabase.from('dlv_partner_requests').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: ERR.load }, { status: 500 });
  return NextResponse.json({ requests: data ?? [] });
}
