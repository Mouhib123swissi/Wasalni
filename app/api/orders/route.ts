import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { checkoutSchema } from '@/lib/validation';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { ERR } from '@/lib/errors';

// POST /api/orders — creates an order. Prices/totals are NEVER trusted from
// the browser: the create_order RPC re-fetches dish prices from the DB,
// recomputes subtotal/delivery_fee/total, checks min_order and generates the
// order number + tracking token server-side (F06/F07/F12/F17).
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? ERR.order }, { status: 400 });
    }
    const supabase = createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    const key = `order:${clientIp(req)}:${user?.id ?? 'guest'}`;
    const rl = rateLimit(key);
    if (!rl.ok) {
      return NextResponse.json({ error: ERR.rateLimited }, { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } });
    }
    const v = parsed.data;
    const { data, error } = await supabase.rpc('create_order', {
      p_customer_name: v.customer_name,
      p_customer_phone: v.customer_phone,
      p_customer_email: user?.email ?? null,
      p_address: v.address,
      p_zone_id: v.zone_id,
      p_restaurant_id: v.restaurant_id,
      p_items: v.items,
      p_payment_method: v.payment_method,
      p_notes: v.notes ?? null,
    });
    if (error || !data) {
      console.error('create_order failed', error?.message ?? 'no data');
      return NextResponse.json({ error: ERR.order }, { status: 400 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    console.error('POST /api/orders error', e);
    return NextResponse.json({ error: ERR.order }, { status: 500 });
  }
}

// GET /api/orders — the logged-in customer's own order history (RLS-scoped).
export async function GET() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: ERR.forbidden }, { status: 401 });
  const { data, error } = await supabase.from('dlv_orders')
    .select('*, dlv_restaurants(name)')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) return NextResponse.json({ error: ERR.load }, { status: 500 });
  return NextResponse.json({ orders: data ?? [] });
}
