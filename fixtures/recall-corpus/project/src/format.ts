export function formatCents(cents: number): string {
  return `${(cents / 100).toFixed(2)} EUR`;
}

export function formatLegacyId(id: number): string {
  return `LEG-${id.toString().padStart(6, "0")}`;
}
