'use client';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from './supabase-client';

export type FavTarget = 'restaurant' | 'dish';
const LS_KEY = 'wasalni-favorites';
type FavEntry = { type: FavTarget; id: string };

function lsRead(): FavEntry[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') as FavEntry[]; } catch { return []; }
}
function lsWrite(list: FavEntry[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch {}
}

// Favorites: persisted in Supabase (dlv_favorites) when logged in,
// localStorage fallback for guests. Heart state is keyed `type:id`.
export function useFavorites() {
  const [userId, setUserId] = useState<string | null>(null);
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sb = createClient();
      const { data } = await sb.auth.getUser();
      const uid = data.user?.id ?? null;
      if (cancelled) return;
      setUserId(uid);
      if (uid) {
        const { data: rows } = await sb.from('dlv_favorites').select('target_type,target_id');
        if (!cancelled) setFavs(new Set(((rows as { target_type: string; target_id: string }[] | null) ?? []).map((r) => `${r.target_type}:${r.target_id}`)));
      } else {
        if (!cancelled) setFavs(new Set(lsRead().map((f) => `${f.type}:${f.id}`)));
      }
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const isFav = useCallback((type: FavTarget, id: string) => favs.has(`${type}:${id}`), [favs]);

  const toggle = useCallback(async (type: FavTarget, id: string) => {
    const key = `${type}:${id}`;
    const next = new Set(favs);
    if (next.has(key)) next.delete(key); else next.add(key);
    setFavs(next); // optimistic
    if (userId) {
      const sb = createClient();
      if (favs.has(key)) {
        await sb.from('dlv_favorites').delete().eq('user_id', userId).eq('target_type', type).eq('target_id', id);
      } else {
        const { error } = await sb.from('dlv_favorites').insert({ user_id: userId, target_type: type, target_id: id });
        if (error) setFavs(favs); // revert on failure
      }
    } else {
      const list = lsRead();
      if (favs.has(key)) lsWrite(list.filter((f) => !(f.type === type && f.id === id)));
      else lsWrite([...list, { type, id }]);
    }
  }, [favs, userId]);

  return { favs, isFav, toggle, ready, userId };
}
