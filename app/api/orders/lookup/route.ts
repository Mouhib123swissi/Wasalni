import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { z } from 'zod';
import { ERR } from '@/lib/errors';

// POST /api/orders/lookup — guest order lookup by order number + phone.
// Returns only the tracking token (never PII) so the guest can open tracking.
const schema = z.object({
  order_number: z.string().trim().min(3).max(30),
  phone: z.string().trim().min(8).max(20),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: ERR.notFound }, { status: 400 });
  const supabase = createServerSupabase();
  const { data, error } = await supabase.rpc('lookup_order_by_phone', {
    p_order_number: parsed.data.order_number,
    p_phone: parsed.data.phone,
  });
  if (error || !data) return NextResponse.json({ error: ERR.notFound }, { status: 404 });
  return NextResponse.json(data);
}
