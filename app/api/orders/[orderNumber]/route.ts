import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { ERR } from '@/lib/errors';

// GET /api/orders/[orderNumber]?token=… — token-gated tracking (F07).
// Without a valid tracking token (or ownership via the session) nothing is
// returned. No phone/e-mail is ever included in the response.
export async function GET(req: Request, { params }: { params: { orderNumber: string } }) {
  const token = new URL(req.url).searchParams.get('token') ?? null;
  const supabase = createServerSupabase();
  const { data, error } = await supabase.rpc('get_order_tracking', {
    p_order_number: params.orderNumber,
    p_token: token,
  });
  if (error || !data) {
    return NextResponse.json({ error: ERR.notFound }, { status: 404 });
  }
  return NextResponse.json(data);
}
