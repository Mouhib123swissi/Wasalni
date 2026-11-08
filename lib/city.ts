export const DEFAULT_CITY = 'Sidi Bouzid';
export const CITIES = [
  { name: 'Sidi Bouzid', available: true },
  { name: 'Tunis', available: false, note: 'Bientôt' },
] as const;
export function getStoredCity(): string {
  try { return localStorage.getItem('wasalni-city') || DEFAULT_CITY; } catch { return DEFAULT_CITY; }
}
export function setStoredCity(city: string) {
  try { localStorage.setItem('wasalni-city', city); } catch {}
}
