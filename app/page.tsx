export const dynamic = 'force-dynamic';
export const revalidate = 0; // never serve a cached catalog (Data Cache survives redeploys)
import { supabase, Restaurant, Zone } from '@/lib/supabase';
import HomeClient from '@/components/HomeClient';
async function getData(): Promise<{ restaurants: Restaurant[]; zones: Zone[] }> {
  try {
    const [r, z] = await Promise.all([
      supabase.from('dlv_restaurants').select('*').eq('active', true).order('rating', { ascending: false }),
      supabase.from('dlv_zones').select('*').eq('active', true).order('name'),
    ]);
    return { restaurants: (r.data as Restaurant[]) ?? [], zones: (z.data as Zone[]) ?? [] };
  } catch { return { restaurants: [], zones: [] }; }
}
export default async function Home() {
  const { restaurants, zones } = await getData();
  return <HomeClient restaurants={restaurants} zones={zones} />;
}
