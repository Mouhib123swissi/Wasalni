export function formatDT(n: number | string | null | undefined): string {
  const v = typeof n === 'string' ? parseFloat(n) : (n ?? 0);
  if (isNaN(v)) return '0.000 DT';
  return v.toFixed(3) + ' DT';
}
export const STATUS_LABELS: Record<string, string> = {
  received: 'Reçue', confirmed: 'Confirmée', preparing: 'En préparation',
  on_the_way: 'En route', delivered: 'Livrée', cancelled: 'Annulée',
};
export const STATUS_STEPS = ['received', 'confirmed', 'preparing', 'on_the_way', 'delivered'];
export const CATEGORIES = ['Tout', 'Restaurant', 'Fast-food', 'Pizza', 'Café', 'Épicerie', 'Pharmacie', 'Boulangerie'];
export const PARTNER_CATEGORIES = ['Restaurant', 'Fast-food', 'Pizza', 'Café', 'Café / Fast-food', 'Café-restaurant', 'Plats tunisiens', 'Plats / Pizzeria', 'Plats traditionnels', 'Épicerie', 'Pharmacie', 'Boulangerie', 'Boulangerie / Pâtisserie'];
