import { z } from 'zod';

// Tunisian phone: +216 optional, then 2, 5, 7 or 9 + 7 digits. Prefix 4 is NOT valid.
export const tunisianPhone = z.string().transform((s) => s.replace(/[\s-]/g, '')).pipe(
  z.string().regex(/^(\+216)?[2579]\d{7}$/, 'Numéro de téléphone tunisien invalide'),
);

export const checkoutSchema = z.object({
  customer_name: z.string().trim().min(2, 'Nom trop court').max(100, 'Nom trop long'),
  customer_phone: tunisianPhone,
  address: z.string().trim().min(5, 'Adresse trop courte').max(300, 'Adresse trop longue'),
  zone_id: z.string().uuid('Zone invalide'),
  restaurant_id: z.string().uuid('Restaurant invalide'),
  items: z.array(z.object({
    dish_id: z.string().uuid('Plat invalide'),
    qty: z.number().int().min(1).max(20),
  })).min(1, 'Panier vide').max(20),
  payment_method: z.enum(['cash', 'card_on_delivery']),
  notes: z.string().max(500, 'Notes trop longues').optional().nullable(),
});

export const dishSchema = z.object({
  name: z.string().trim().min(2, 'Nom trop court').max(120, 'Nom trop long'),
  price: z.number().min(0.1, 'Prix invalide').max(999.999, 'Prix trop élevé'),
  category_id: z.string().uuid().nullable().optional(),
  description: z.string().max(300).optional().nullable(),
});

export const partnerRequestSchema = z.object({
  restaurant_name: z.string().trim().min(2).max(120),
  owner_name: z.string().trim().min(2).max(100),
  phone: tunisianPhone,
  quartier: z.string().trim().max(120).optional().nullable(),
  category: z.enum(['Restaurant', 'Fast-food', 'Pizza', 'Café', 'Café / Fast-food', 'Café-restaurant', 'Plats tunisiens', 'Plats / Pizzeria', 'Plats traditionnels', 'Épicerie', 'Pharmacie', 'Boulangerie', 'Boulangerie / Pâtisserie']),
  message: z.string().max(1000).optional().nullable(),
});

export const signupSchema = z.object({
  email: z.string().email('E-mail invalide'),
  password: z.string().min(8, 'Mot de passe : 8 caractères minimum'),
  full_name: z.string().trim().max(100).optional(),
});

export const statusSchema = z.object({
  status: z.enum(['confirmed', 'preparing', 'on_the_way', 'delivered', 'cancelled']),
});
