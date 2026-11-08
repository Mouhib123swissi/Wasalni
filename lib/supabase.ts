import { createClient, SupabaseClient } from '@supabase/supabase-js';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder';
// Anon client: public reads only (catalog, zones). Used by server components.
// NEVER put a service_role key here — the app uses no service_role key at all;
// privileged work goes through SECURITY DEFINER RPCs in Postgres.
// NOTE: fetch uses cache:'no-store' — Next.js Data Cache persists across
// Vercel deployments, and a cached v1 catalog response (10 Tunis restaurants,
// pre-migration, no city column) was served to the v2 home page. Fresh data
// only; this app is small and must never show stale catalog data.
export const supabase: SupabaseClient = createClient(url, anon, {
  global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
});
export type Zone = { id: string; name: string; delivery_fee: number; free_delivery_over: number; active: boolean; city?: string | null; lat?: number | null; lng?: number | null };
export type Restaurant = { id: string; name: string; slug: string; description: string | null; category: string; zone_id: string | null; image_url: string | null; rating: number | null; delivery_time_min: number | null; delivery_time_max: number | null; min_order: number | null; delivery_fee: number | null; opening_hours: string | null; active: boolean; city?: string | null; is_confirmed_partner?: boolean | null; owner_id?: string | null; phone?: string | null; address?: string | null; lat?: number | null; lng?: number | null };
export type Dish = { id: string; restaurant_id: string; category_id: string | null; name: string; description: string | null; price: number; image_url: string | null; popular: boolean; available: boolean; is_to_be_confirmed?: boolean | null };
export type MenuCategory = { id: string; restaurant_id: string; name: string; sort_order: number | null };
export type OrderItem = { dish_id?: string; name: string; price: number; qty: number };
export type OrderRow = { id: string; order_number: string; customer_id: string | null; customer_name: string | null; customer_phone: string | null; customer_email: string | null; address: string | null; zone_id: string | null; restaurant_id: string | null; items: OrderItem[]; subtotal: number; delivery_fee: number; total: number; payment_method: string; status: string; notes: string | null; courier_id: string | null; created_at: string; updated_at: string | null; tracking_token?: string | null; delivery_lat?: number | null; delivery_lng?: number | null; dlv_restaurants?: { name: string; lat?: number | null; lng?: number | null } | null };
// Live courier position (v3): one row per order in dlv_courier_positions,
// upserted by the assigned courier via the upsert_courier_position RPC.
export type CourierPosition = { order_id: string; courier_id: string | null; lat: number; lng: number; accuracy: number | null; updated_at: string };
export type Profile = { id: string; role: 'customer' | 'restaurant' | 'courier' | 'admin'; full_name: string | null; phone: string | null; restaurant_id: string | null };
export type Favorite = { id: string; user_id: string; target_type: 'restaurant' | 'dish'; target_id: string; created_at: string };
export type PartnerRequest = { id: string; restaurant_name: string; owner_name: string; phone: string; quartier: string | null; category: string; message: string | null; status: 'pending' | 'approved' | 'rejected'; restaurant_id: string | null; created_at: string };
export type OrderEvent = { id: string; order_id: string; actor_id: string | null; from_status: string | null; to_status: string; created_at: string };
