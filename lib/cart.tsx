'use client';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
export const MAX_QTY = 20;
export type CartItem = { dishId: string; name: string; price: number; qty: number; restaurantId: string; restaurantName: string };
type CartCtx = { items: CartItem[]; restaurantId: string | null; restaurantName: string | null; addItem: (item: Omit<CartItem,'qty'>, confirmClear?: () => boolean) => void; removeItem: (dishId: string) => void; setQty: (dishId: string, qty: number) => void; clear: () => void; count: number; subtotal: number };
const Ctx = createContext<CartCtx | null>(null);
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { try { const raw = localStorage.getItem('wasalni-cart'); if (raw) setItems(JSON.parse(raw)); } catch {} setLoaded(true); }, []);
  useEffect(() => { if (loaded) { try { localStorage.setItem('wasalni-cart', JSON.stringify(items)); } catch {} } }, [items, loaded]);
  const restaurantId = items[0]?.restaurantId ?? null;
  const restaurantName = items[0]?.restaurantName ?? null;
  const addItem: CartCtx['addItem'] = (item, confirmClear) => {
    setItems(prev => {
      if (prev.length && prev[0].restaurantId !== item.restaurantId) {
        if (confirmClear && !confirmClear()) return prev;
        return [{ ...item, qty: 1 }];
      }
      const ex = prev.find(i => i.dishId === item.dishId);
      if (ex) return prev.map(i => i.dishId === item.dishId ? { ...i, qty: Math.min(MAX_QTY, i.qty + 1) } : i);
      return [...prev, { ...item, qty: 1 }];
    });
  };
  const removeItem = (dishId: string) => setItems(p => p.filter(i => i.dishId !== dishId));
  const setQty = (dishId: string, qty: number) => setItems(p => qty <= 0 ? p.filter(i => i.dishId !== dishId) : p.map(i => i.dishId === dishId ? { ...i, qty: Math.min(MAX_QTY, qty) } : i));
  const clear = () => setItems([]);
  const count = useMemo(() => items.reduce((s, i) => s + i.qty, 0), [items]);
  const subtotal = useMemo(() => items.reduce((s, i) => s + i.qty * i.price, 0), [items]);
  return <Ctx.Provider value={{ items, restaurantId, restaurantName, addItem, removeItem, setQty, clear, count, subtotal }}>{children}</Ctx.Provider>;
}
export function useCart() { const c = useContext(Ctx); if (!c) throw new Error('useCart must be used inside CartProvider'); return c; }
