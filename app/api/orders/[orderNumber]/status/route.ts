import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { statusSchema } from '@/lib/validation';
import { ERR } from '@/lib/errors';

// PATCH /api/orders/[orderNumber]/status — role-checked status changes.
// NOTE: the [orderNumber] segment here carries the order UUID (id), because
// Next.js requires the same dynamic segment name at this level as the
// tracking route. RLS scopes the read/update (restaurant owns the order /
// courier assigned or claiming a 'preparing' order / admin), and the DB
// trigger enforces legal transitions + writes the audit row (F02/F18).
export async function PATCH(req: Request, { params }: { params: { orderNumber: string } }) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: ERR.update }, { status: 400 });
    const supabase = createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: ERR.forbidden }, { status: 401 });
    const { data: profile } = await supabase.from('dlv_profiles').select('role').eq('id', user.id).maybeSingle();
    const role = (profile as { role?: string } | null)?.role;
    if (!role || role === 'customer') return NextResponse.json({ error: ERR.forbidden }, { status: 403 });
    const { data: order } = await supabase.from('dlv_orders').select('id,status,restaurant_id,courier_id').eq('id', params.orderNumber).maybeSingle();
    if (!order) return NextResponse.json({ error: ERR.notFound }, { status: 404 });
    const o = order as { id: string; status: string; restaurant_id: string | null; courier_id: string | null };
    if (role === 'restaurant') {
      const { data: resto } = await supabase.from('dlv_restaurants').select('id').eq('id', o.restaurant_id).eq('owner_id', user.id).maybeSingle();
      if (!resto) return NextResponse.json({ error: ERR.forbidden }, { status: 403 });
      if (!['confirmed', 'preparing', 'cancelled'].includes(parsed.data.status)) {
        return NextResponse.json({ error: ERR.update }, { status: 400 });
      }
    }
    if (role === 'courier') {
      const isClaim = o.status === 'preparing' && o.courier_id === null && parsed.data.status === 'on_the_way';
      const isMine = o.courier_id === user.id && parsed.data.status === 'delivered';
      if (!isClaim && !isMine) return NextResponse.json({ error: ERR.forbidden }, { status: 403 });
    }
    const patch: Record<string, unknown> = { status: parsed.data.status };
    if (role === 'courier' && o.status === 'preparing') patch.courier_id = user.id;
    const { data: updated, error } = await supabase.from('dlv_orders').update(patch).eq('id', params.orderNumber).select('id,order_number,status').maybeSingle();
    if (error || !updated) {
      console.error('status update failed', error?.message);
      return NextResponse.json({ error: ERR.update }, { status: 400 });
    }
    return NextResponse.json(updated);
  } catch (e) {
    console.error('PATCH status error', e);
    return NextResponse.json({ error: ERR.update }, { status: 500 });
  }
}
