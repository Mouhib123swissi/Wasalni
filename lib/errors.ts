// Generic user-facing messages (F15): never surface raw Supabase/Postgres errors.
export const ERR = {
  order: 'Impossible de passer la commande. Vérifiez vos informations et réessayez.',
  auth: 'Erreur d’authentification. Vérifiez vos identifiants.',
  load: 'Impossible de charger les données. Réessayez.',
  update: 'Impossible de mettre à jour. Réessayez.',
  notFound: 'Commande introuvable. Vérifiez le numéro.',
  forbidden: 'Accès refusé.',
  rateLimited: 'Trop de commandes en peu de temps. Attendez quelques minutes.',
  partner: 'Impossible d’envoyer la demande. Vérifiez vos informations.',
} as const;
export function genericError(): string { return ERR.order; }
