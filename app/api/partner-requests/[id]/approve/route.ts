import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { ERR } from '@/lib/errors';

// POST /api/partner-requests/[id]/approve — admin only.
// Creates the restaurant (active + confirmed partner) and marks the request
// approved, linked to the new restaurant. The partner's login account is
// created separately by the admin and linked as owner.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: ERR.forbidden }, { status: 401 });
  const { data: profile } = await supabase.from('dlv_profiles').select('role').eq('id', user.id).maybeSingle();
  if ((profile as { role?: string } | null)?.role !== 'admin') {
    return NextResponse.json({ error: ERR.forbidden }, { status: 403 });
  }
  const { data: pr } = await supabase.from('dlv_partner_requests').select('*').eq('id', params.id).maybeSingle();
  if (!pr) return NextResponse.json({ error: ERR.notFound }, { status: 404 });
  const r = pr as { restaurant_name: string; category: string; status: string; phone: string; quartier: string | null; restaurant_id: string | null };
  if (r.status !== 'pending') return NextResponse.json({ error: 'Demande déjà traitée.' }, { status: 400 });
  if (r.restaurant_id) {
    await supabase.from('dlv_restaurants').update({ active: true, is_confirmed_partner: true }).eq('id', r.restaurant_id);
    await supabase.from('dlv_partner_requests').update({ status: 'approved' }).eq('id', params.id);
    return NextResponse.json({ restaurant_id: r.restaurant_id });
  }
  const slug = r.restaurant_name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + Date.now().toString(36);
  const { data: resto, error } = await supabase.from('dlv_restaurants').insert({
    name: r.restaurant_name, slug, description: null, category: r.category,
    zone_id: null, image_url: null, rating: null, delivery_time_min: 20, delivery_time_max: 35,
    min_order: 5, delivery_fee: 2.5, opening_hours: '10:00 - 23:00',
    active: true, city: 'Sidi Bouzid', is_confirmed_partner: true,
    phone: r.phone, address: r.quartier,
  }).select('id').maybeSingle();
  if (error || !resto) {
    console.error('approve: restaurant insert failed', error?.message);
    return NextResponse.json({ error: ERR.update }, { status: 500 });
  }
  await supabase.from('dlv_partner_requests').update({ status: 'approved', restaurant_id: (resto as { id: string }).id }).eq('id', params.id);
  return NextResponse.json({ restaurant_id: (resto as { id: string }).id });
}
